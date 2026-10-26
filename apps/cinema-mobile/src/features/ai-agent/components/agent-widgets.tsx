import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { openPaymentPage } from "@/features/payments/utils/open-payment";
import { colors, radius } from "@/theme/colors";
import type { AgentWidget } from "../types/agent.types";
import { isSafeUrl } from "../utils/chat-reducer";

const vnd = (n: number) => `${Number(n).toLocaleString("vi-VN")} đ`;

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

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Ionicons name={icon} size={13} color={colors.warning} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Countdown({ iso, prefix }: { iso: string; prefix: string }) {
  const left = useSecondsLeft(iso);
  return (
    <View style={styles.row}>
      <Ionicons
        name="time-outline"
        size={12}
        color={left === 0 ? colors.primary : colors.warning}
      />
      <Text
        style={[
          styles.small,
          { color: left === 0 ? colors.primary : colors.warning },
        ]}
      >
        {left === 0 ? "Đã hết thời gian" : `${prefix} ${mmss(left)}`}
      </Text>
    </View>
  );
}

function PaymentButton({
  url,
  expiresAt,
  orderId,
}: {
  url: string;
  expiresAt: string;
  orderId: number;
}) {
  const router = useRouter();
  const left = useSecondsLeft(expiresAt);
  const [busy, setBusy] = useState(false);
  const usable = left > 0 && isSafeUrl(url) && !busy;

  const pay = async () => {
    setBusy(true);
    try {
      await openPaymentPage(url);
    } finally {
      setBusy(false);
    }
    // Kết quả thật do server quyết định: màn kết quả hỏi trạng thái đơn.
    router.push({
      pathname: "/booking/result",
      params: { orderId: String(orderId), source: "orders" },
    });
  };

  return (
    <Pressable
      disabled={!usable}
      onPress={() => void pay()}
      style={[styles.payBtn, !usable && styles.off]}
    >
      <Ionicons name="card-outline" size={14} color={colors.text} />
      <Text style={styles.payText}>
        {left === 0 ? "Đơn đã hết hạn" : "Thanh toán qua VNPay"}
      </Text>
    </Pressable>
  );
}

interface Props {
  widget: AgentWidget;
  /** Gửi một câu thay khách (khách chạm vào lựa chọn) */
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function AgentWidgetView({ widget, onSend, disabled }: Props) {
  const router = useRouter();

  switch (widget.type) {
    case "MOVIE_LIST":
      return (
        <Card icon="film-outline" title={widget.title}>
          {widget.payload.movies.map((m) => (
            <Pressable
              key={m.movieId}
              disabled={disabled}
              onPress={() => onSend(`Xem lịch chiếu phim ${m.title} hôm nay`)}
              style={[styles.item, disabled && styles.off]}
            >
              <View style={styles.flex}>
                <Text style={styles.itemTitle}>{m.title}</Text>
                <Text style={styles.small}>
                  Thời lượng: {m.durationMinutes} phút • Phân loại {m.ageRating}
                </Text>
              </View>
              <Text style={styles.link}>Xem suất</Text>
            </Pressable>
          ))}
        </Card>
      );

    case "SHOWTIME_SELECTOR":
      return (
        <Card icon="time-outline" title={widget.title}>
          {widget.payload.cinemas.length === 0 ? (
            <Text style={styles.small}>Chưa có suất chiếu trong ngày này.</Text>
          ) : null}
          {widget.payload.cinemas.map((c) => (
            <View key={c.cineplexId} style={styles.gap}>
              <Text style={styles.cinema}>{c.cineplexName}</Text>
              <View style={styles.chips}>
                {c.showtimes.map((s) => (
                  <Pressable
                    key={s.showtimeId}
                    disabled={disabled}
                    onPress={() =>
                      onSend(
                        `Mình chọn suất ${s.startTime} (${s.projectionType}) tại ${c.cineplexName}`,
                      )
                    }
                    style={[styles.chip, disabled && styles.off]}
                  >
                    <Text style={styles.chipText}>
                      {s.startTime}{" "}
                      <Text style={styles.chipSub}>{s.projectionType}</Text>
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </Card>
      );

    case "SEAT_MATRIX_SELECTOR": {
      const p = widget.payload;
      if (p.mode === "HELD") {
        return (
          <Card icon="albums-outline" title={widget.title}>
            <View style={styles.chips}>
              {p.heldSeats.map((s) => (
                <Text key={s.seatId} style={styles.seatTag}>
                  {s.label}
                </Text>
              ))}
            </View>
            <Text style={styles.small}>Tiền ghế: {vnd(p.totalSeatPrice)}</Text>
            <Countdown iso={p.holdExpiresAt} prefix="Giữ ghế còn" />
          </Card>
        );
      }
      return (
        <Card icon="albums-outline" title={widget.title}>
          <Text style={styles.small}>
            Còn <Text style={styles.strong}>{p.availableSeats}</Text>/
            {p.totalSeats} ghế trống. Bạn cho mình biết số ghế muốn chọn nhé.
          </Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/booking/[showtimeId]",
                params: { showtimeId: String(p.showtimeId) },
              })
            }
          >
            <Text style={styles.link}>Hoặc tự chọn trên sơ đồ ghế →</Text>
          </Pressable>
        </Card>
      );
    }

    case "FNB_SELECTOR":
      return (
        <Card icon="fast-food-outline" title={widget.title}>
          {widget.payload.items.map((i) => (
            <View key={i.fnbItemId} style={styles.item}>
              <View style={styles.flex}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {i.name}
                </Text>
                <Text style={styles.price}>{vnd(i.price)}</Text>
              </View>
              <Pressable
                disabled={disabled}
                onPress={() => onSend(`Thêm 1 ${i.name}`)}
                style={[styles.addBtn, disabled && styles.off]}
              >
                <Text style={styles.addText}>Thêm</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      );

    case "PAYMENT_SUMMARY": {
      const p = widget.payload;
      return (
        <Card icon="ticket-outline" title={widget.title}>
          <Text style={styles.small}>Ghế: {p.seats.join(", ")}</Text>
          <View style={styles.gap}>
            <Line label="Tiền vé" value={vnd(p.pricing.subtotalTickets)} />
            {p.pricing.subtotalFnb > 0 ? (
              <Line label="Bắp nước" value={vnd(p.pricing.subtotalFnb)} />
            ) : null}
            {p.pricing.discountAmount > 0 ? (
              <Line
                label="Giảm giá"
                value={`-${vnd(p.pricing.discountAmount)}`}
                danger
              />
            ) : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tổng</Text>
              <Text style={styles.totalValue}>
                {vnd(p.pricing.finalAmount)}
              </Text>
            </View>
          </View>
          <Countdown iso={p.expiresAt} prefix="Đơn còn hiệu lực" />
          <PaymentButton
            url={p.paymentUrl}
            expiresAt={p.expiresAt}
            orderId={p.orderId}
          />
        </Card>
      );
    }

    case "LOGIN_REQUIRED":
      return (
        <Card icon="log-in-outline" title={widget.title}>
          <Text style={styles.small}>{widget.payload.message}</Text>
          <Pressable
            onPress={() => router.push("/login")}
            style={styles.payBtn}
          >
            <Ionicons name="log-in-outline" size={14} color={colors.text} />
            <Text style={styles.payText}>Đăng nhập</Text>
          </Pressable>
        </Card>
      );

    default:
      return null;
  }
}

function Line({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <View style={styles.lineRow}>
      <Text style={[styles.small, danger && { color: colors.primary }]}>
        {label}
      </Text>
      <Text style={[styles.lineValue, danger && { color: colors.primary }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    marginTop: 8,
    gap: 10,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
    backgroundColor: colors.card,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  small: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  strong: { color: colors.text, fontWeight: "800" },
  gap: { gap: 6 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#0B0F19",
  },
  itemTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  link: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  cinema: { color: "#E2E8F0", fontSize: 12, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#0B0F19",
  },
  chipText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  chipSub: { color: colors.muted, fontSize: 10, fontWeight: "400" },
  seatTag: {
    color: colors.text,
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
  },
  price: { color: colors.warning, fontSize: 11, marginTop: 2 },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addText: { color: colors.text, fontSize: 11, fontWeight: "800" },
  lineRow: { flexDirection: "row", justifyContent: "space-between" },
  lineValue: { color: colors.text, fontSize: 12 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  totalLabel: { color: colors.text, fontSize: 13, fontWeight: "800" },
  totalValue: { color: colors.warning, fontSize: 13, fontWeight: "800" },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  payText: { color: colors.text, fontSize: 13, fontWeight: "800" },
  off: { opacity: 0.45 },
});
