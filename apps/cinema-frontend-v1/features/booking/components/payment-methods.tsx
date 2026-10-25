"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

interface PaymentOption {
  id: string;
  name: string;
  logo: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: "vnpay",
    name: "Thanh toán qua VN Pay",
    logo: "/images/payments/vnpay.png",
  },
  {
    id: "momo",
    name: "Thanh toán qua Momo",
    logo: "/images/payments/momo.png",
  },
  {
    id: "vcb",
    name: "Thanh toán qua Vietcombank",
    logo: "/images/payments/vcb.png",
  },
  {
    id: "vtb",
    name: "Thanh toán qua Vietinbank",
    logo: "/images/payments/vtb.png",
  },
];

interface PaymentMethodsProps {
  selectedMethod: string;
  onSelectMethod: (methodId: string) => void;
  appliedVoucherCode?: string;
  onVoucherApply: (
    code: string,
  ) => Promise<{ success: boolean; message: string }>;
  onVoucherRemove?: () => void;
}

export function PaymentMethods({
  selectedMethod,
  onSelectMethod,
  appliedVoucherCode,
  onVoucherApply,
  onVoucherRemove,
}: PaymentMethodsProps) {
  const [voucherInput, setVoucherInput] = useState<string>(
    appliedVoucherCode || "",
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({
    type: appliedVoucherCode ? "success" : null,
    message: appliedVoucherCode ? "Đã áp dụng mã giảm giá thành công!" : "",
  });

  const [isApplying, setIsApplying] = useState(false);

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) {
      setFeedback({
        type: "error",
        message: "Vui lòng nhập mã voucher trước khi áp dụng.",
      });
      return;
    }
    setIsApplying(true);
    const result = await onVoucherApply(voucherInput.trim());
    setIsApplying(false);
    setFeedback({
      type: result.success ? "success" : "error",
      message: result.message,
    });
  };

  const handleRemoveVoucher = () => {
    onVoucherRemove?.();
    setVoucherInput("");
    setFeedback({ type: null, message: "" });
  };

  return (
    <div className="space-y-6">
      {/* 1. Chọn phương thức thanh toán */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          Phương Thức Thanh Toán
        </h2>
        <div className="space-y-2.5">
          {PAYMENT_OPTIONS.map((item) => {
            const isSelected = selectedMethod === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectMethod(item.id)}
                className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                  isSelected
                    ? "border-[#EF4444] bg-[#111827] ring-1 ring-[#EF4444]"
                    : "border-[#1F2937] bg-[#111827]/80 hover:border-[#374151]"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="relative flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-white/5 p-1">
                    <span className="text-[10px] font-black uppercase text-[#EF4444]">
                      {item.id.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-200 sm:text-sm">
                    {item.name}
                  </span>
                </div>
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    isSelected
                      ? "border-[#EF4444] bg-[#EF4444] text-white"
                      : "border-[#374151] bg-transparent"
                  }`}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Mã giảm giá / Voucher */}
      <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            Mã Giảm Giá / Voucher
          </h2>
          {appliedVoucherCode && (
            <button
              type="button"
              onClick={handleRemoveVoucher}
              className="inline-flex items-center gap-1 text-[11px] text-[#EF4444] hover:underline"
            >
              <X size={12} />
              Gỡ mã
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={voucherInput}
            onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
            placeholder="Nhập mã voucher tại đây..."
            className="flex-1 rounded-lg border border-[#1F2937] bg-[#0B0F19] px-3.5 py-2 text-xs text-white placeholder-[#6B7280] focus:border-[#EF4444] focus:outline-none uppercase"
          />
          <button
            type="button"
            disabled={isApplying}
            onClick={handleApplyVoucher}
            className="rounded-lg bg-[#EF4444] px-5 py-2 text-xs font-bold uppercase text-white transition hover:bg-[#F87171] active:scale-95 disabled:opacity-50"
          >
            {isApplying ? "Đang kiểm tra..." : "Áp Dụng"}
          </button>
        </div>

        {/* Inline Feedback Message */}
        {feedback.message && (
          <p
            className={`text-xs font-medium ${
              feedback.type === "success" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {feedback.message}
          </p>
        )}
      </div>
    </div>
  );
}
