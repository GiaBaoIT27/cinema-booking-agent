import { create } from "zustand";
import type { HeldSeatItem } from "@/features/booking/types/booking.types";
import type { PendingOrder } from "@/features/booking/types/pending-order.types";

/** Món F&B đã chọn: lưu tên và giá tại lúc chọn. */
export interface SelectedCombo {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Voucher {
  code: string;
  discount: number;
}

interface BookingState {
  /** Suất chiếu đang giữ ghế (null = chưa giữ ghế nào) */
  showtimeId: number | null;
  seats: HeldSeatItem[];
  /** seatId → hạn giữ (epoch ms, theo đồng hồ điện thoại) */
  expiries: Record<number, number>;
  /** id món → món đã chọn */
  combos: Record<string, SelectedCombo>;
  /** Voucher đã được backend kiểm tra; đổi giỏ thì bỏ */
  voucher: Voucher | null;
  /** Đơn đã tạo, đang chờ thanh toán */
  pendingOrder: PendingOrder | null;

  addHeldSeat: (
    showtimeId: number,
    seat: HeldSeatItem,
    expiresAt: number,
  ) => void;
  removeHeldSeat: (seatId: number) => void;
  /** Hết hạn/trả ghế: bỏ cả món và voucher để giỏ không dở dang */
  clearHolds: () => void;
  changeCombo: (
    item: { id: string; name: string; price: number },
    delta: number,
  ) => void;
  setVoucher: (voucher: Voucher | null) => void;
  setPendingOrder: (order: PendingOrder | null) => void;
  /**
   * Đã có đơn: bỏ giỏ (ghế, hạn giữ, món, voucher) nhưng GIỮ pendingOrder.
   * Gọi trước khi rời các màn chọn ghế/bắp nước để chúng không trả ghế của đơn.
   */
  finishCart: () => void;
  /** Xoá tất cả, kể cả đơn đang chờ */
  resetBooking: () => void;
}

const EMPTY_CART = {
  showtimeId: null,
  seats: [] as HeldSeatItem[],
  expiries: {} as Record<number, number>,
  combos: {} as Record<string, SelectedCombo>,
  voucher: null,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...EMPTY_CART,
  pendingOrder: null,

  addHeldSeat(showtimeId, seat, expiresAt) {
    set((prev) => {
      // Đang giữ ghế của suất khác thì bắt đầu lại (lượt cũ được trả riêng).
      const same = prev.showtimeId === showtimeId;
      const seats = same
        ? prev.seats.filter((s) => s.seatId !== seat.seatId)
        : [];
      const expiries = same ? prev.expiries : {};
      return {
        showtimeId,
        seats: [...seats, seat],
        expiries: { ...expiries, [seat.seatId]: expiresAt },
        combos: same ? prev.combos : {},
        voucher: null,
      };
    });
  },

  removeHeldSeat(seatId) {
    set((prev) => {
      const expiries = { ...prev.expiries };
      delete expiries[seatId];
      const seats = prev.seats.filter((s) => s.seatId !== seatId);
      return {
        seats,
        expiries,
        showtimeId: seats.length > 0 ? prev.showtimeId : null,
        voucher: null,
      };
    });
  },

  clearHolds() {
    set({ ...EMPTY_CART });
  },

  changeCombo(item, delta) {
    set((prev) => {
      const current = prev.combos[item.id]?.quantity ?? 0;
      const quantity = Math.max(0, current + delta);
      const combos = { ...prev.combos };
      if (quantity === 0) delete combos[item.id];
      else combos[item.id] = { ...item, quantity };
      return { combos, voucher: null };
    });
  },

  setVoucher(voucher) {
    set({ voucher });
  },

  setPendingOrder(order) {
    set({ pendingOrder: order });
  },

  finishCart() {
    set({ ...EMPTY_CART });
  },

  resetBooking() {
    set({ ...EMPTY_CART, pendingOrder: null });
  },
}));

/** Hạn giữ sớm nhất trong các ghế đang giữ (null nếu không giữ ghế nào). */
export const selectHoldExpiresAt = (s: BookingState): number | null => {
  const values = Object.values(s.expiries);
  return values.length > 0 ? Math.min(...values) : null;
};

export const selectTicketTotal = (s: BookingState): number =>
  s.seats.reduce((sum, seat) => sum + seat.price, 0);

export const selectComboTotal = (s: BookingState): number =>
  Object.values(s.combos).reduce((sum, c) => sum + c.price * c.quantity, 0);

export const selectComboCount = (s: BookingState): number =>
  Object.values(s.combos).reduce((sum, c) => sum + c.quantity, 0);
