import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VoucherBox } from "@/features/booking/components/voucher-box";
import { useCheckout } from "@/features/booking/hooks/use-checkout";
import {
  formatCountdown,
  useHoldCountdown,
} from "@/features/booking/hooks/use-hold-countdown";
import { promotionService } from "@/features/promotions/services/promotion.service";
import { useBookingStore } from "@/store/booking.store";
import { Button } from "@/shared/ui/button";
import { EmptyView } from "@/shared/ui/state-views";
import { colors, radius, spacing } from "@/theme/colors";

const formatVnd = (n: number) => `${n.toLocaleString("vi-VN")} đ`;

type CartView = ReturnType<typeof readCart>;
function readCart() {
  const s = useBookingStore.getState();
  return {
    seats: s.seats,
    combos: Object.values(s.combos),
    voucher: s.voucher,
  };
}

/** Các phương thức hiển thị; backend hiện chỉ hỗ trợ VNPAY. */
const METHODS = [
  { id: "vnpay", name: "VNPay (ATM, thẻ, QR)", enabled: true },
  { id: "momo", name: "Ví MoMo", enabled: false },
  { id: "zalopay", name: "ZaloPay", enabled: false },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const seats = useBookingStore((s) => s.seats);
  const combos = useBookingStore((s) => s.combos);
  const voucher = useBookingStore((s) => s.voucher);
  const setVoucher = useBookingStore((s) => s.setVoucher);
  const { hasHold, secondsLeft, isExpired } = useHoldCountdown();
  const { submit, isSubmitting, error } = useCheckout();
  const [method, setMethod] = useState("vnpay");

  // Sau khi tạo đơn, giỏ trong store bị dọn; giữ bản cuối để màn này không nhấp nháy trống
  // trong lúc trình duyệt thanh toán đang mở.
  const last = useRef<CartView>(readCart());
  if (seats.length > 0) {
    last.current = { seats, combos: Object.values(combos), voucher };
  }
  const view = last.current;

  const ticketTotal = view.seats.reduce((n, s) => n + s.price, 0);
  const comboTotal = view.combos.reduce((n, c) => n + c.price * c.quantity, 0);
  const discount = view.voucher?.discount ?? 0;
  const total = Math.max(0, ticketTotal + comboTotal - discount);

  // Hết hạn giữ ghế khi chưa có đơn: về lại bước chọn ghế.
  useEffect(() => {
    if (!isExpired || useBookingStore.getState().pendingOrder) return;
    const showtimeId = useBookingStore.getState().showtimeId;
    useBookingStore.getState().clearHolds();
    Alert.alert("Hết thời gian giữ ghế", "Vui lòng chọn lại ghế.", [
      {
        text: "OK",
        onPress: () =>
          showtimeId !== null
            ? router.dismissTo({
                pathname: "/booking/[showtimeId]",
                params: { showtimeId: String(showtimeId) },
              })
            : router.back(),
      },
    ]);
  }, [isExpired, router]);

  const applyVoucher = useCallback(
    async (code: string) => {
      const normalized = code.trim().toUpperCase();
      if (!normalized)
        return { success: false, message: "Vui lòng nhập mã voucher." };
      const orderAmount = ticketTotal + comboTotal;
      if (orderAmount <= 0)
        return { success: false, message: "Bạn chưa chọn vé nào." };
      try {
        const res = await promotionService.validateVoucher({
          code: normalized,
          orderAmount,
        });
        const d = Math.min(
          Math.max(0, Number(res.discountAmount) || 0),
          orderAmount,
        );
        setVoucher({ code: normalized, discount: d });
        return { success: true, message: `Đã giảm ${formatVnd(d)}` };
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
    [ticketTotal, comboTotal, setVoucher],
  );

  const onPay = async () => {
    const orderId = await submit(method);
    if (orderId !== null) {
      router.replace({
        pathname: "/booking/result",
        params: { orderId: String(orderId) },
      });
    }
  };

  if (view.seats.length === 0) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Thanh toán" }} />
        <EmptyView
          title="Giỏ hàng trống"
          subtitle="Hãy chọn ghế trước khi thanh toán."
        />
        <Button
          title="Quay lại"
          onPress={() => router.back()}
          style={styles.full}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ title: "Thanh toán", gestureEnabled: !isSubmitting }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {hasHold && !isExpired ? (
          <Text style={styles.timer}>
            Giữ ghế còn {formatCountdown(secondsLeft)}
          </Text>
        ) : null}

        <Section title="Vé">
          <Row
            label={`Ghế ${view.seats.map((s) => s.label).join(", ")}`}
            value={formatVnd(ticketTotal)}
          />
        </Section>

        {view.combos.length > 0 ? (
          <Section title="Bắp nước">
            {view.combos.map((c) => (
              <Row
                key={c.id}
                label={`${c.quantity} × ${c.name}`}
                value={formatVnd(c.price * c.quantity)}
              />
            ))}
          </Section>
        ) : null}

        <Section title="Mã giảm giá">
          <VoucherBox
            appliedCode={view.voucher?.code}
            onApply={applyVoucher}
            onRemove={() => setVoucher(null)}
          />
        </Section>

        <Section title="Phương thức thanh toán">
          {METHODS.map((m) => {
            const on = method === m.id;
            return (
              <Pressable
                key={m.id}
                disabled={!m.enabled}
                onPress={() => setMethod(m.id)}
                style={[
                  styles.method,
                  on && styles.methodOn,
                  !m.enabled && styles.methodOff,
                ]}
              >
                <Ionicons
                  name={on ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={on ? colors.primary : colors.subtle}
                />
                <Text style={styles.methodText}>{m.name}</Text>
                {!m.enabled ? <Text style={styles.soon}>Sắp có</Text> : null}
              </Pressable>
            );
          })}
        </Section>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.flex}>
          {discount > 0 ? (
            <Text style={styles.discount}>Giảm {formatVnd(discount)}</Text>
          ) : null}
          <Text style={styles.total}>{formatVnd(total)}</Text>
        </View>
        <Button
          title="Thanh toán"
          onPress={() => void onPay()}
          loading={isSubmitting}
          style={styles.cta}
        />
      </View>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xl,
    justifyContent: "center",
    gap: spacing.md,
  },
  flex: { flex: 1 },
  full: { alignSelf: "stretch" },
  content: { padding: spacing.lg, gap: spacing.lg },
  timer: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  section: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  rowLabel: { flex: 1, color: colors.muted, fontSize: 13 },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: "700" },
  method: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodOn: { borderColor: colors.primary },
  methodOff: { opacity: 0.45 },
  methodText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "600" },
  soon: { color: colors.subtle, fontSize: 11 },
  error: { color: colors.danger, fontSize: 13, textAlign: "center" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  discount: { color: colors.success, fontSize: 12 },
  total: { color: colors.text, fontSize: 20, fontWeight: "800" },
  cta: { minWidth: 130 },
});
