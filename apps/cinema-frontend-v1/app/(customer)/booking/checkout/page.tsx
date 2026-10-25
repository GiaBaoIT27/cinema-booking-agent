"use client";

import { BookingStepper } from "@/features/booking/components/booking-stepper";
import { PaymentMethods } from "@/features/booking/components/payment-methods";
import {
  BookingSummaryCard,
  type BookingSummaryData,
} from "@/features/booking/components/booking-summary-card";
import { BookingHydrationGate } from "@/features/booking/components/booking-hydration-gate";
import { useBooking } from "@/features/booking/context/booking-context";
import { useCheckout } from "@/features/booking/hooks/use-checkout";

export default function CheckoutPage() {
  return (
    <BookingHydrationGate>
      <CheckoutContent />
    </BookingHydrationGate>
  );
}

function CheckoutContent() {
  const {
    movieTitle,
    ageRating,
    format,
    cinemaName,
    cinemaAddress,
    showtime,
    date,
    hall,
    selectedSeats,
    comboDescription,
    ticketPrice,
    comboPrice,
    discountAmount,
    discountCode,
    paymentMethod,
    setPaymentMethod,
    applyVoucher,
    removeVoucher,
  } = useBooking();

  const { submit, isSubmitting, error } = useCheckout();

  const seatType = selectedSeats.some((s) => s.type === "vip")
    ? "VIP"
    : selectedSeats.some((s) => s.type === "couple")
      ? "Ghế Đôi"
      : "Thường";

  const bookingSummaryData: BookingSummaryData = {
    movieTitle,
    ageRating,
    format,
    cinemaName,
    cinemaAddress,
    showtime,
    date,
    hall,
    ticketCount: selectedSeats.length,
    seatType,
    seats: selectedSeats.map((s) => s.label),
    comboDescription,
    ticketPrice,
    comboPrice,
    discountPrice: discountAmount,
    discountCode,
  };

  return (
    <div className="min-h-screen bg-[#080C15] pb-20 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <h1 className="text-xl font-black uppercase tracking-tight sm:text-2xl">
          Trang Thanh Toán
        </h1>

        <BookingStepper currentStep={3} />

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <PaymentMethods
              selectedMethod={paymentMethod}
              onSelectMethod={setPaymentMethod}
              appliedVoucherCode={discountCode}
              onVoucherApply={applyVoucher}
              onVoucherRemove={removeVoucher}
            />
          </div>

          <div className="lg:col-span-5">
            <BookingSummaryCard
              summary={bookingSummaryData}
              onConfirm={submit}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
