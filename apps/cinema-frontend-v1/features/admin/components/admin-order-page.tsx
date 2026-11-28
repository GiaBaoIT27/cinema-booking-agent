"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ReceiptText, TrendingUp, Wallet } from "lucide-react";
import { useAuthStore } from "@/stores/use-auth-store";
import { usePaged } from "../hooks/use-paged";
import { adminShowtimeService, type Option } from "../services/admin-catalog.service";
import { adminOrderService } from "../services/admin-venue.service";
import { formatVnd } from "../utils/pagination";
import { formatDateTime } from "../utils/showtime-form";
import {
  CHANNEL_LABEL,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  type AdminOrderDetail,
  type AdminOrderRow,
  type OrderStatusType,
  type OrderSummary,
} from "../utils/order-admin";
import type { PageResult } from "../utils/pagination";
import {
  Badge,
  ClearFilters,
  Modal,
  Notice,
  PageHeader,
  Pager,
  SearchBox,
  Toolbar,
  errorText,
  filterClass,
  StatCards,
} from "./admin-ui";

const PAGE_SIZE = 15;

function StatusBadge({ status }: { status: string }) {
  const s = status as OrderStatusType;
  return <Badge tone={ORDER_STATUS_TONE[s] ?? "gray"}>{ORDER_STATUS_LABEL[s] ?? status}</Badge>;
}

export function AdminOrderPage() {
  const me = useAuthStore((s) => s.user);
  const isSuperAdmin = (me?.roles ?? []).includes("SUPER_ADMIN");

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [cineplexId, setCineplexId] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [cineplexes, setCineplexes] = useState<Option[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (isSuperAdmin) adminShowtimeService.cineplexes().then(setCineplexes).catch(() => setCineplexes([]));
  }, [isSuperAdmin]);

  const { items, totalItems, totalPages, isLoading, error, data } = usePaged<
    AdminOrderRow,
    PageResult<AdminOrderRow> & { summary: OrderSummary }
  >([keyword, status, cineplexId, date, page].join("|"), () =>
    adminOrderService.list({
      page,
      limit: PAGE_SIZE,
      keyword: keyword || undefined,
      status: status || undefined,
      cineplexId: cineplexId || undefined,
      date: date || undefined,
    }),
  );
  const summary = data?.summary;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Đơn hàng"
        subtitle={isSuperAdmin ? "Toàn hệ thống" : "Chỉ đơn thuộc cụm rạp bạn phụ trách"}
      />

      <StatCards
        items={[
          { label: "Đơn khớp bộ lọc", value: isLoading ? undefined : totalItems, tone: "blue", icon: ReceiptText },
          { label: "Đã thanh toán", value: summary?.paidCount, tone: "green", icon: CheckCircle2, onClick: () => { setPage(1); setStatus("PAID"); }, active: status === "PAID" },
          { label: "Doanh thu đã thanh toán", value: summary ? formatVnd(summary.paidRevenue) : undefined, tone: "red", icon: Wallet },
          {
            label: "Giá trị TB / đơn",
            value: summary ? (summary.paidCount ? formatVnd(Math.round(summary.paidRevenue / summary.paidCount)) : "—") : undefined,
            tone: "amber",
            icon: TrendingUp,
            hint: "trên các đơn đã thanh toán",
          },
        ]}
      />

      <Toolbar>
        <SearchBox value={keyword} placeholder="Mã đơn, email hoặc SĐT khách..." onSearch={(v) => { setPage(1); setKeyword(v); }} />
        <select aria-label="Trạng thái" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className={filterClass}>
          <option value="">Tất cả trạng thái</option>
          {(Object.keys(ORDER_STATUS_LABEL) as OrderStatusType[]).map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
        </select>
        {isSuperAdmin && (
          <select aria-label="Cụm rạp" value={cineplexId} onChange={(e) => { setPage(1); setCineplexId(e.target.value); }} className={`${filterClass} max-w-60`}>
            <option value="">Tất cả cụm rạp</option>
            {cineplexes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <input aria-label="Ngày đặt" type="date" value={date} onChange={(e) => { setPage(1); setDate(e.target.value); }} className={filterClass} />
        <ClearFilters show={!!(keyword || status || cineplexId || date)} onClear={() => { setPage(1); setKeyword(""); setStatus(""); setCineplexId(""); setDate(""); }} />
      </Toolbar>

      {error && <Notice kind="error">Không tải được danh sách: {error}</Notice>}

      <div className="overflow-x-auto rounded-xl border border-[#1F2937]">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-[#0B0F19] text-left text-xs uppercase tracking-wide text-[#6B7280]">
            <tr>
              <th className="px-4 py-3">Mã đơn</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Suất chiếu</th>
              <th className="px-4 py-3 text-right">Ghế</th>
              <th className="px-4 py-3 text-right">Tổng tiền</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Đặt lúc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2937]">
            {isLoading && <tr><td colSpan={7} className="px-4 py-10 text-center text-[#6B7280]">Đang tải...</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-[#6B7280]">Không có đơn nào khớp bộ lọc.</td></tr>}
            {!isLoading &&
              items.map((o) => (
                <tr key={o.orderId} onClick={() => setSelected(o.orderId)} className="cursor-pointer hover:bg-[#0B0F19]/60">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-medium">{o.orderCode}</p>
                    <p className="text-xs text-[#6B7280]">{CHANNEL_LABEL[o.channel] ?? o.channel}{o.paymentMethod ? ` · ${o.paymentMethod}` : ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{o.customer.fullName}</p>
                    <p className="text-xs text-[#6B7280]">{o.customer.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[#D1D5DB]">
                    <p className="line-clamp-1">{o.showtime.movieTitle}</p>
                    <p className="text-xs text-[#6B7280]">{formatDateTime(o.showtime.startTime)} · {o.showtime.cineplexName}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-[#D1D5DB]">{o.seatCount}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatVnd(o.finalAmount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-xs text-[#9CA3AF]">{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Pager page={page} totalPages={totalPages} onChange={setPage} />

      {selected !== null && <OrderDetailModal orderId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function OrderDetailModal({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminOrderService
      .detail(orderId)
      .then((d) => !cancelled && setDetail(d))
      .catch((e: unknown) => !cancelled && setErr(errorText(e, "Không tải được đơn hàng")));
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <Modal title={detail ? `Đơn ${detail.orderCode}` : "Chi tiết đơn hàng"} onClose={onClose} wide>
      {err && <Notice kind="error">{err}</Notice>}
      {!detail && !err && <p className="text-sm text-[#9CA3AF]">Đang tải...</p>}
      {detail && (
        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={detail.status} />
            <span className="text-xs text-[#6B7280]">
              {CHANNEL_LABEL[detail.channel] ?? detail.channel} · đặt lúc {formatDateTime(detail.createdAt)}
              {detail.paidTxnRef ? ` · mã GD ${detail.paidTxnRef}` : ""}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[#6B7280]">Khách hàng</p>
              <p>{detail.customer.fullName}</p>
              <p className="text-xs text-[#9CA3AF]">{detail.customer.email} · {detail.customer.phoneNumber}</p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">Suất chiếu</p>
              <p>{detail.showtime.movieTitle}</p>
              <p className="text-xs text-[#9CA3AF]">{formatDateTime(detail.showtime.startTime)} · {detail.showtime.auditoriumName} · {detail.showtime.cineplexName}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-[#6B7280]">Ghế / vé</p>
            <div className="divide-y divide-[#1F2937] rounded-lg border border-[#1F2937]">
              {detail.seats.map((s) => (
                <div key={s.seatLabel} className="flex items-center justify-between px-3 py-2">
                  <span className="font-medium">{s.seatLabel}</span>
                  <span className="font-mono text-xs text-[#9CA3AF]">{s.ticketCode ?? "chưa xuất vé"}{s.ticketStatus ? ` · ${s.ticketStatus}` : ""}</span>
                  <span>{formatVnd(s.price)}</span>
                </div>
              ))}
            </div>
          </div>

          {detail.fnbItems.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-[#6B7280]">Bắp nước</p>
              <div className="divide-y divide-[#1F2937] rounded-lg border border-[#1F2937]">
                {detail.fnbItems.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2">
                    <span>{f.quantity} × {f.name}</span>
                    <span className="text-xs text-[#9CA3AF]">{f.status}</span>
                    <span>{formatVnd(f.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <dl className="space-y-1 border-t border-[#1F2937] pt-3">
            <Row label="Tiền vé" value={formatVnd(detail.subtotalTickets)} />
            <Row label="Bắp nước" value={formatVnd(detail.subtotalFnb)} />
            {detail.discountAmount > 0 && <Row label="Giảm giá" value={`− ${formatVnd(detail.discountAmount)}`} />}
            <Row label="Tổng thanh toán" value={formatVnd(detail.finalAmount)} strong />
          </dl>
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-base font-semibold" : "text-[#D1D5DB]"}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
