"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Seat } from "../../seats/components/seat-selection-map";
import * as holdState from "../utils/hold-state";
import { earliestExpiry } from "../utils/hold-flow";
import { promotionService } from "@/features/promotions/services/promotion.service";

/** Thông tin món F&B được lưu lại lúc khách chọn (không phụ thuộc danh sách mock) */
export interface ComboInfo {
  name: string;
  price: number;
}

export interface BookingState {
  movieTitle: string;
  ageRating: string;
  format: string;
  cinemaName: string;
  cinemaAddress: string;
  showtime: string;
  date: string;
  hall: string;
  /** Suất chiếu đang đặt vé (từ ?showtimeId= ở bước chọn ghế) */
  showtimeId: string;
  selectedSeats: Seat[];
  /** Hạn giữ theo từng ghế: id ghế → epoch ms (theo đồng hồ trình duyệt) */
  holdExpiries: Record<string, number>;
  selectedCombos: Record<string, number>;
  /** id món → tên và giá tại thời điểm chọn */
  comboInfo: Record<string, ComboInfo>;
  discountCode: string;
  discountAmount: number;
  paymentMethod: string;
}

interface BookingContextType extends BookingState {
  /** true khi đã nạp xong dữ liệu từ sessionStorage (chỉ có ở trình duyệt) */
  isHydrated: boolean;
  ticketCount: number;
  ticketPrice: number;
  comboPrice: number;
  totalPrice: number;
  comboDescription: string;
  /** Hạn giữ sớm nhất trong các ghế đang giữ; null = chưa giữ ghế nào */
  holdExpiresAt: number | null;
  setSelectedSeats: (seats: Seat[], showtimeId?: string) => void;
  /** Ghi nhận một ghế vừa giữ thành công trên server */
  addHeldSeat: (seat: Seat, showtimeId: string, expiresAt: number) => void;
  /** Bỏ một ghế đã trả khỏi danh sách đang giữ */
  removeHeldSeat: (seatId: string) => void;
  /** Xóa toàn bộ ghế đang giữ khỏi context */
  clearHolds: () => void;
  updateComboQuantity: (
    comboId: string,
    delta: number,
    info?: ComboInfo,
  ) => void;
  /** Hỏi backend số tiền giảm của mã; không tự tính ở frontend */
  applyVoucher: (
    code: string,
  ) => Promise<{ success: boolean; message: string }>;
  removeVoucher: () => void;
  setPaymentMethod: (method: string) => void;
  resetBooking: () => void;
}

const DEFAULT_BOOKING_STATE: BookingState = {
  movieTitle: "NGHỈ HÈ SỢ NGHỈ HƯU",
  ageRating: "T13",
  format: "2D LỒNG TIẾNG",
  cinemaName: "CGV Satra Quận 6 (TP.HCM)",
  cinemaAddress:
    "Tầng 6, TTTM Satra Võ Văn Kiệt, 1466 Võ Văn Kiệt, Phường 1, Quận 6, TP.HCM",
  showtime: "19:45",
  date: "Thứ Ba, 25/08/2026",
  hall: "04",
  showtimeId: "",
  selectedSeats: [],
  holdExpiries: {},
  selectedCombos: {},
  comboInfo: {},
  discountCode: "",
  discountAmount: 0,
  paymentMethod: "vnpay",
};

/** Giỏ hàng đổi thì mã đã kiểm tra không còn đúng → bỏ mã */
const NO_VOUCHER = { discountCode: "", discountAmount: 0 } as const;

const STORAGE_KEY = "cinema_booking_state_v2";

const BookingContext = createContext<BookingContextType | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  // Server và lượt hydrate đầu tiên đều dùng giá trị mặc định để HTML khớp nhau;
  // dữ liệu lưu trong sessionStorage được nạp ngay sau đó
  const [state, setState] = useState<BookingState>(DEFAULT_BOOKING_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const cached = sessionStorage.getItem(STORAGE_KEY);
        if (cached) {
          setState({ ...DEFAULT_BOOKING_STATE, ...JSON.parse(cached) });
        }
      } catch {
        // Dùng giá trị mặc định
      }
      setIsHydrated(true);
    });
  }, []);

  // Lưu xuống sessionStorage (chỉ sau khi đã nạp, tránh ghi đè dữ liệu cũ bằng mặc định)
  useEffect(() => {
    if (!isHydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state, isHydrated]);

  const setSelectedSeats = useCallback((seats: Seat[], showtimeId?: string) => {
    setState((prev) => ({
      ...prev,
      ...NO_VOUCHER,
      selectedSeats: seats,
      showtimeId: showtimeId ?? prev.showtimeId,
    }));
  }, []);

  const addHeldSeat = useCallback(
    (seat: Seat, showtimeId: string, expiresAt: number) => {
      setState((prev) => ({
        ...holdState.addHeldSeat(prev, seat, showtimeId, expiresAt),
        ...NO_VOUCHER,
      }));
    },
    [],
  );

  const removeHeldSeat = useCallback((seatId: string) => {
    setState((prev) => ({
      ...holdState.removeHeldSeat(prev, seatId),
      ...NO_VOUCHER,
    }));
  }, []);

  const clearHolds = useCallback(() => {
    setState((prev) => holdState.clearHolds(prev));
  }, []);

  const updateComboQuantity = useCallback(
    (comboId: string, delta: number, info?: ComboInfo) => {
      setState((prev) => {
        const current = prev.selectedCombos[comboId] || 0;
        const next = Math.max(0, current + delta);
        const updatedCombos = { ...prev.selectedCombos };
        const updatedInfo = { ...prev.comboInfo };
        if (next === 0) {
          delete updatedCombos[comboId];
          delete updatedInfo[comboId];
        } else {
          updatedCombos[comboId] = next;
          if (info) updatedInfo[comboId] = info;
        }
        return {
          ...prev,
          ...NO_VOUCHER,
          selectedCombos: updatedCombos,
          comboInfo: updatedInfo,
        };
      });
    },
    [],
  );

  // Tính toán các giá trị tổng
  const ticketCount = state.selectedSeats.length;
  const ticketPrice = useMemo(() => {
    return state.selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  }, [state.selectedSeats]);

  const comboPrice = useMemo(() => {
    return Object.entries(state.selectedCombos).reduce((sum, [id, qty]) => {
      const info = state.comboInfo[id];
      return sum + (info ? info.price * qty : 0);
    }, 0);
  }, [state.selectedCombos, state.comboInfo]);

  const applyVoucher = useCallback(
    async (code: string) => {
      const normalized = code.trim().toUpperCase();
      if (!normalized) {
        return { success: false, message: "Vui lòng nhập mã voucher." };
      }
      const orderAmount = ticketPrice + comboPrice;
      if (orderAmount <= 0) {
        return { success: false, message: "Bạn chưa chọn vé nào." };
      }
      try {
        const result = await promotionService.validateVoucher({
          code: normalized,
          orderAmount,
        });
        const discount = Math.min(
          Math.max(0, Number(result.discountAmount) || 0),
          orderAmount,
        );
        setState((prev) => ({
          ...prev,
          discountCode: normalized,
          discountAmount: discount,
        }));
        return {
          success: true,
          message: `Áp dụng mã giảm giá ${discount.toLocaleString("vi-VN")} VNĐ thành công!`,
        };
      } catch (e) {
        return {
          success: false,
          message:
            e instanceof Error && e.message
              ? e.message
              : "Mã ưu đãi không hợp lệ hoặc đã hết lượt áp dụng.",
        };
      }
    },
    [ticketPrice, comboPrice],
  );

  const removeVoucher = useCallback(() => {
    setState((prev) => ({
      ...prev,
      discountCode: "",
      discountAmount: 0,
    }));
  }, []);

  const setPaymentMethod = useCallback((method: string) => {
    setState((prev) => ({ ...prev, paymentMethod: method }));
  }, []);

  const resetBooking = useCallback(() => {
    setState(DEFAULT_BOOKING_STATE);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const holdExpiresAt = useMemo(
    () => earliestExpiry(state.holdExpiries),
    [state.holdExpiries],
  );

  const totalPrice = Math.max(
    0,
    ticketPrice + comboPrice - state.discountAmount,
  );

  const comboDescription = useMemo(() => {
    const list = Object.entries(state.selectedCombos)
      .map(([id, qty]) => {
        const info = state.comboInfo[id];
        return info ? `${qty}x ${info.name}` : "";
      })
      .filter(Boolean);
    return list.length > 0 ? list.join(", ") : "Không chọn combo";
  }, [state.selectedCombos, state.comboInfo]);

  const value: BookingContextType = {
    ...state,
    isHydrated,
    ticketCount,
    ticketPrice,
    comboPrice,
    totalPrice,
    comboDescription,
    holdExpiresAt,
    setSelectedSeats,
    addHeldSeat,
    removeHeldSeat,
    clearHolds,
    updateComboQuantity,
    applyVoucher,
    removeVoucher,
    setPaymentMethod,
    resetBooking,
  };

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}
