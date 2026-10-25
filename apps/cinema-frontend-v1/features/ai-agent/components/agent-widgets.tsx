"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Armchair,
  Clock,
  Film,
  LogIn,
  Popcorn,
  Ticket,
  CreditCard,
} from "lucide-react";
import type { AgentWidget } from "../types/agent.type";
import { isSafeUrl } from "../utils/chat-reducer";

/** Trang đăng nhập */
const LOGIN_PATH = "/login";

const vnd = (n: number) => `${n.toLocaleString("vi-VN")} VNĐ`;

function useSecondsLeft(iso: string): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const end = new Date(iso).getTime();
  return Number.isNaN(end) ? 0 : Math.max(0, Math.ceil((end - now) / 1000));
}

const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const card =
  "mt-2 rounded-xl border border-[#EF4444]/40 bg-[#111827] p-3 text-left shadow-lg space-y-2.5";
const label =
  "flex items-center gap-1.5 text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider";

interface Props {
  widget: AgentWidget;
  /** Gửi một câu thay khách (khách bấm vào lựa chọn) */
  onSend: (text: string) => void;
  /** Gọi khi khách rời khỏi khung chat để đi tới trang khác */
  onNavigate: () => void;
  disabled?: boolean;
}

function Countdown({ iso, prefix }: { iso: string; prefix: string }) {
  const left = useSecondsLeft(iso);
  return (
    <p
      className={`flex items-center gap-1 text-[11px] ${left === 0 ? "text-[#EF4444]" : "text-[#F59E0B]"}`}
    >
      <Clock size={12} />
      {left === 0 ? "Đã hết thời gian" : `${prefix} ${mmss(left)}`}
    </p>
  );
}

function PaymentButton({ url, expiresAt }: { url: string; expiresAt: string }) {
  const left = useSecondsLeft(expiresAt);
  const usable = left > 0 && isSafeUrl(url);
  return (
    <button
      type="button"
      disabled={!usable}
      onClick={() => window.location.assign(url)}
      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#EF4444] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#F87171] active:scale-[0.98] disabled:opacity-40"
    >
      <CreditCard size={14} />
      {left === 0 ? "Đơn đã hết hạn" : "Thanh toán qua VNPay"}
    </button>
  );
}

export function AgentWidgetView({
  widget,
  onSend,
  onNavigate,
  disabled,
}: Props) {
  switch (widget.type) {
    case "MOVIE_LIST":
      return (
        <div className={card}>
          <div className={label}>
            <Film size={12} />
            <span>{widget.title}</span>
          </div>
          <div className="space-y-1.5">
            {widget.payload.movies.map((m) => (
              <button
                key={m.movieId}
                type="button"
                disabled={disabled}
                onClick={() => onSend(`Xem lịch chiếu phim ${m.title} hôm nay`)}
                className="flex w-full items-center justify-between rounded-lg border border-[#1F2937] bg-[#0B0F19] px-3 py-2 text-left transition hover:border-[#EF4444]/60 disabled:opacity-50"
              >
                <span>
                  <span className="block text-xs font-bold text-white">
                    {m.title}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF]">
                    {" "}
                    Thời lượng:
                    {m.durationMinutes} phút • Phân loại {m.ageRating}
                  </span>
                </span>
                <span className="text-[10px] font-semibold text-[#EF4444]">
                  Xem suất
                </span>
              </button>
            ))}
          </div>
        </div>
      );

    case "SHOWTIME_SELECTOR":
      return (
        <div className={card}>
          <div className={label}>
            <Clock size={12} />
            <span>{widget.title}</span>
          </div>
          {widget.payload.cinemas.length === 0 && (
            <p className="text-[11px] text-[#9CA3AF]">
              Chưa có suất chiếu trong ngày này.
            </p>
          )}
          {widget.payload.cinemas.map((c) => (
            <div key={c.cineplexId} className="space-y-1.5">
              <p className="text-[11px] font-bold text-slate-200">
                {c.cineplexName}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {c.showtimes.map((s) => (
                  <button
                    key={s.showtimeId}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onSend(
                        `Mình chọn suất ${s.startTime} (${s.projectionType}) tại ${c.cineplexName}`,
                      )
                    }
                    className="rounded-lg border border-[#374151] bg-[#0B0F19] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:border-[#EF4444] hover:bg-[#EF4444]/10 disabled:opacity-50"
                  >
                    {s.startTime}
                    <span className="ml-1 text-[9px] font-normal text-[#9CA3AF]">
                      {s.projectionType}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      );

    case "SEAT_MATRIX_SELECTOR": {
      const p = widget.payload;
      if (p.mode === "HELD") {
        return (
          <div className={card}>
            <div className={label}>
              <Armchair size={12} />
              <span>{widget.title}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {p.heldSeats.map((s) => (
                <span
                  key={s.seatId}
                  className="rounded bg-[#EF4444] px-2 py-0.5 text-[11px] font-bold text-white"
                >
                  {s.label}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-300">
              Tiền ghế: {vnd(p.totalSeatPrice)}
            </p>
            <Countdown iso={p.holdExpiresAt} prefix="Giữ ghế còn" />
          </div>
        );
      }
      return (
        <div className={card}>
          <div className={label}>
            <Armchair size={12} />
            <span>{widget.title}</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Còn <strong className="text-white">{p.availableSeats}</strong>/
            {p.totalSeats} ghế trống. Bạn cho mình biết số ghế muốn chọn nhé.
          </p>
          <Link
            href={`/booking/seat-selection?showtimeId=${p.showtimeId}`}
            onClick={onNavigate}
            className="inline-block text-[11px] font-semibold text-[#EF4444] hover:underline"
          >
            Hoặc tự chọn trên sơ đồ ghế →
          </Link>
        </div>
      );
    }

    case "FNB_SELECTOR":
      return (
        <div className={card}>
          <div className={label}>
            <Popcorn size={12} />
            <span>{widget.title}</span>
          </div>
          <div className="space-y-1.5">
            {widget.payload.items.map((i) => (
              <div
                key={i.fnbItemId}
                className="flex items-center justify-between gap-2 rounded-lg border border-[#1F2937] bg-[#0B0F19] px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-white">
                    {i.name}
                  </span>
                  <span className="text-[10px] text-[#F59E0B]">
                    {vnd(i.price)}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSend(`Thêm 1 ${i.name}`)}
                  className="shrink-0 rounded bg-[#EF4444] px-2 py-1 text-[10px] font-bold text-white hover:bg-[#F87171] disabled:opacity-50"
                >
                  Thêm
                </button>
              </div>
            ))}
          </div>
        </div>
      );

    case "PAYMENT_SUMMARY": {
      const p = widget.payload;
      return (
        <div className={card}>
          <div className={label}>
            <Ticket size={12} />
            <span>{widget.title}</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Ghế: {p.seats.join(", ")}
          </p>
          <div className="space-y-0.5 text-[11px] text-[#9CA3AF]">
            <div className="flex justify-between">
              <span>Tiền vé</span>
              <span className="text-white">
                {vnd(p.pricing.subtotalTickets)}
              </span>
            </div>
            {p.pricing.subtotalFnb > 0 && (
              <div className="flex justify-between">
                <span>Bắp nước</span>
                <span className="text-white">{vnd(p.pricing.subtotalFnb)}</span>
              </div>
            )}
            {p.pricing.discountAmount > 0 && (
              <div className="flex justify-between text-[#EF4444]">
                <span>Giảm giá</span>
                <span>-{vnd(p.pricing.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[#1F2937] pt-1 text-xs font-bold">
              <span className="text-white">Tổng</span>
              <span className="text-[#F59E0B]">
                {vnd(p.pricing.finalAmount)}
              </span>
            </div>
          </div>
          <Countdown iso={p.expiresAt} prefix="Đơn còn hiệu lực" />
          <PaymentButton url={p.paymentUrl} expiresAt={p.expiresAt} />
        </div>
      );
    }

    case "LOGIN_REQUIRED":
      return (
        <div className={card}>
          <div className={label}>
            <LogIn size={12} />
            <span>{widget.title}</span>
          </div>
          <p className="text-[11px] text-slate-300">{widget.payload.message}</p>
          <Link
            href={LOGIN_PATH}
            onClick={onNavigate}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-[#EF4444] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#F87171]"
          >
            <LogIn size={14} />
            Đăng nhập
          </Link>
        </div>
      );

    default:
      return null;
  }
}
