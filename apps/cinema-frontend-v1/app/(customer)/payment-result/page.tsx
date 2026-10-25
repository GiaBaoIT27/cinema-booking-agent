"use client";

import { use, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, Ticket } from "lucide-react";
import { BookingSuccessCard } from "@/features/booking/components/booking-success-card";
import { useBooking } from "@/features/booking/context/booking-context";
import { useOrderResult } from "@/features/booking/hooks/use-order-result";
import {
  PENDING_ORDER_KEY,
  clearPendingOrder,
  type PendingOrder,
} from "@/features/booking/utils/pending-order";
import { orderService } from "@/features/orders/services/order.service";

type SearchParams = Promise<{
  status?: string;
  txnRef?: string;
  code?: string;
}>;

/** Mã lỗi VNPay thường gặp */
const VNPAY_MESSAGES: Record<string, string> = {
  "24": "Bạn đã hủy giao dịch trên cổng thanh toán.",
  "11": "Giao dịch hết thời gian chờ thanh toán.",
  "51": "Tài khoản không đủ số dư để thực hiện giao dịch.",
  "65": "Tài khoản đã vượt quá hạn mức giao dịch trong ngày.",
  "75": "Ngân hàng thanh toán đang bảo trì.",
};

const subscribeNoop = () => () => {};
const readPendingRaw = () => {
  try {
    return sessionStorage.getItem(PENDING_ORDER_KEY);
  } catch {
    return null;
  }
};

export default function PaymentResultPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { status, code, txnRef } = use(searchParams);
  const router = useRouter();
  const { resetBooking } = useBooking();
  const gatewaySuccess = status === "success";

  // Đọc đơn đang chờ từ sessionStorage mà không gây lệch hydration
  const rawPending = useSyncExternalStore(
    subscribeNoop,
    readPendingRaw,
    () => null,
  );
  const pending = useMemo<PendingOrder | null>(() => {
    if (!rawPending) return null;
    try {
      return JSON.parse(rawPending) as PendingOrder;
    } catch {
      return null;
    }
  }, [rawPending]);

  const { order, isLoading, error } = useOrderResult(
    pending?.orderId ?? null,
    txnRef,
    gatewaySuccess,
  );

  const isPaid = order?.status === "PAID";

  // Thanh toán xong: dọn giỏ hàng và đơn đang chờ
  useEffect(() => {
    if (isPaid) {
      clearPendingOrder();
      resetBooking();
    }
  }, [isPaid, resetBooking]);

  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleCancelOrder = async () => {
    if (!pending) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await orderService.cancelOrder(pending.orderId);
      clearPendingOrder();
      resetBooking();
      router.push("/");
    } catch (e) {
      setCancelError(
        e instanceof Error ? e.message : "Không thể hủy đơn hàng.",
      );
      setIsCancelling(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-[#080C15] px-4 py-12 text-white">
      <div className="mx-auto max-w-xl space-y-6 rounded-xl border border-[#1F2937] bg-[#111827] p-6 sm:p-8">
        {children}
      </div>
    </div>
  );

  if (isLoading) {
    return shell(
      <p className="text-center text-sm text-slate-300">
        Đang xác nhận kết quả thanh toán...
      </p>,
    );
  }

  // Thanh toán thành công và đơn đã PAID
  if (isPaid && order) {
    return (
      <div className="min-h-screen bg-[#080C15] px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-8">
          <BookingSuccessCard
            orderCode={order.orderCode}
            tickets={order.tickets}
            finalAmount={order.pricing.finalAmount}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#1F2937] bg-[#111827] px-6 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#1F2937]"
            >
              <Home size={16} />
              <span>Về Trang Chủ</span>
            </Link>
            <Link
              href="/user/tickets"
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#EF4444] px-6 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#F87171]"
            >
              <Ticket size={16} />
              <span>Xem Vé Của Tôi</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Cổng báo thành công nhưng server chưa ghi nhận
  if (gatewaySuccess) {
    return shell(
      <>
        <h1 className="text-center text-xl font-black uppercase text-[#F59E0B]">
          Đang xử lý thanh toán
        </h1>
        <p className="text-center text-sm text-slate-300">
          {error ??
            (order
              ? `Giao dịch đã được ghi nhận nhưng đơn ${order.orderCode} đang ở trạng thái ${order.status}. Vui lòng tải lại trang sau ít giây.`
              : "Giao dịch đã được ghi nhận bên cổng thanh toán nhưng chưa xác định được đơn hàng. Vui lòng tải lại trang sau ít giây.")}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full rounded-lg bg-[#EF4444] py-3 text-xs font-bold uppercase text-white hover:bg-[#F87171]"
        >
          Tải lại
        </button>
      </>,
    );
  }

  // Thanh toán thất bại / bị hủy
  const reason =
    (code && VNPAY_MESSAGES[code]) || "Giao dịch không thành công.";
  const canRetry = order?.status === "PENDING" || (!order && pending !== null);

  return shell(
    <>
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-black uppercase text-red-400">
          Thanh toán thất bại
        </h1>
        <p className="text-sm text-slate-300">{reason}</p>
        {order && order.status !== "PENDING" && (
          <p className="text-xs text-slate-400">
            Đơn {order.orderCode} đã ở trạng thái {order.status}. Vui lòng đặt
            vé lại.
          </p>
        )}
      </div>

      {cancelError && (
        <p className="text-center text-xs text-red-400">{cancelError}</p>
      )}

      <div className="space-y-2">
        {canRetry && (
          <Link
            href="/booking/checkout"
            className="block rounded-lg bg-[#EF4444] py-3 text-center text-xs font-bold uppercase text-white hover:bg-[#F87171]"
          >
            Thanh toán lại
          </Link>
        )}
        {canRetry && (
          <button
            type="button"
            disabled={isCancelling}
            onClick={handleCancelOrder}
            className="w-full rounded-lg border border-[#374151] py-3 text-xs font-bold uppercase text-slate-200 hover:bg-white/5 disabled:opacity-50"
          >
            {isCancelling ? "Đang hủy..." : "Hủy đơn & chọn lại"}
          </button>
        )}
        {!canRetry && (
          <Link
            href="/"
            className="block rounded-lg bg-[#EF4444] py-3 text-center text-xs font-bold uppercase text-white hover:bg-[#F87171]"
          >
            Về trang chủ
          </Link>
        )}
      </div>
    </>,
  );
}
