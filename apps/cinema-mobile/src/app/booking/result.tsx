import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TicketQr } from "@/features/booking/components/ticket-qr";
import { useOrderStatus } from "@/features/orders/hooks/use-order-status";
import { orderService } from "@/features/orders/services/order.service";
import { PAYMENT_RETURN_URL } from "@/features/payments/config";
import { paymentService } from "@/features/payments/services/payment.service";
import { openPaymentPage } from "@/features/payments/utils/open-payment";
import { useSeatLabels } from "@/features/seats/hooks/use-seat-labels";
import { useBookingStore } from "@/store/booking.store";
import { Button } from "@/shared/ui/button";
import { ErrorView, LoadingView } from "@/shared/ui/state-views";
import { colors, radius, spacing } from "@/theme/colors";

const formatVnd = (n: number) => `${Number(n).toLocaleString("vi-VN")} đ`;

export default function BookingResultScreen() {
  const router = useRouter();
  const { orderId: param, source } = useLocalSearchParams<{
    orderId: string;
    source?: string;
  }>();
  // Mở từ danh sách "Vé của tôi": cho phép quay lại, không dọn giỏ đặt vé.
  const fromList = source === "orders";
  const homeLabel = fromList ? "Quay lại" : "Về trang chủ";
  const orderId = Number(param);

  const {
    data: order,
    isPending,
    isError,
    error,
    refetch,
    polling,
    checkAgain,
  } = useOrderStatus(orderId);
  const pendingOrder = useBookingStore((s) => s.pendingOrder);
  const [busy, setBusy] = useState(false);
  const [activeTicket, setActiveTicket] = useState(0);

  const status = order?.status;
  // Chi tiết đơn chỉ có seatId: tra nhãn ghế từ sơ đồ ghế của suất chiếu (nếu còn lấy được).
  const { data: seatLabelMap } = useSeatLabels(order?.showtimeId);

  // Đơn đã ngã ngũ (không còn chờ thanh toán): bỏ bản lưu tạm.
  useEffect(() => {
    if (status && status !== "PENDING")
      useBookingStore.getState().setPendingOrder(null);
  }, [status]);

  const goHome = () => {
    if (fromList) {
      router.back();
      return;
    }
    useBookingStore.getState().resetBooking();
    router.dismissAll();
    router.replace("/(tabs)");
  };

  const retryPayment = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const session = await paymentService.initiate({
        orderId,
        method: "VNPAY",
        ...(PAYMENT_RETURN_URL ? { returnUrl: PAYMENT_RETURN_URL } : {}),
      });
      await openPaymentPage(session.paymentUrl);
      checkAgain();
    } catch (e) {
      Alert.alert(
        "Không thể thanh toán",
        e instanceof Error ? e.message : "Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = () => {
    Alert.alert("Hủy đơn hàng?", "Ghế sẽ được nhả cho người khác.", [
      { text: "Không", style: "cancel" },
      {
        text: "Hủy đơn",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await orderService.cancelOrder(orderId);
            useBookingStore.getState().setPendingOrder(null);
            void refetch();
          } catch (e) {
            Alert.alert(
              "Không thể hủy đơn",
              e instanceof Error ? e.message : "Vui lòng thử lại.",
            );
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const header = (
    <Stack.Screen
      options={{
        title: "Kết quả đặt vé",
        headerBackVisible: fromList,
        gestureEnabled: fromList,
      }}
    />
  );

  if (isPending) {
    return (
      <View style={styles.container}>
        {header}
        <LoadingView />
      </View>
    );
  }
  if (isError) {
    return (
      <View style={styles.container}>
        {header}
        <ErrorView message={error.message} onRetry={() => refetch()} />
        <Button
          title={homeLabel}
          variant="outline"
          onPress={goHome}
          style={styles.homeBtn}
        />
      </View>
    );
  }

  const labels =
    pendingOrder?.orderId === orderId ? pendingOrder.seatLabels : seatLabelMap;
  const orderExpired = new Date(order.expiresAt).getTime() <= Date.now();

  if (order.status === "PAID") {
    const ticket =
      order.tickets[Math.min(activeTicket, order.tickets.length - 1)];
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {header}
        <Ionicons
          name="checkmark-circle"
          size={64}
          color={colors.success}
          style={styles.icon}
        />
        <Text style={styles.title}>Đặt vé thành công!</Text>
        <Text style={styles.sub}>
          Mã đơn <Text style={styles.strong}>{order.orderCode}</Text> · Tổng{" "}
          {formatVnd(order.pricing.finalAmount)}
        </Text>

        {order.tickets.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {order.tickets.map((t, i) => (
              <Pressable
                key={t.id}
                onPress={() => setActiveTicket(i)}
                style={[styles.chip, i === activeTicket && styles.chipOn]}
              >
                <Text
                  style={[
                    styles.chipText,
                    i === activeTicket && styles.chipTextOn,
                  ]}
                >
                  {labels?.[t.seatId]
                    ? `Ghế ${labels[t.seatId]}`
                    : `Vé ${i + 1}`}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {ticket ? (
          <TicketQr
            code={ticket.ticketCode}
            seatLabel={labels?.[ticket.seatId]}
          />
        ) : null}
        <Text style={styles.hint}>
          Đưa mã QR này cho nhân viên tại rạp để vào phòng chiếu.
        </Text>

        <Button title={homeLabel} onPress={goHome} />
      </ScrollView>
    );
  }

  if (order.status === "PENDING") {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {header}
        <Ionicons
          name="time-outline"
          size={64}
          color={colors.warning}
          style={styles.icon}
        />
        <Text style={styles.title}>
          {polling
            ? "Đang xác nhận thanh toán..."
            : "Chưa nhận được kết quả thanh toán"}
        </Text>
        <Text style={styles.sub}>
          Mã đơn <Text style={styles.strong}>{order.orderCode}</Text>
          {"\n"}
          {polling
            ? "Vui lòng đợi trong giây lát."
            : orderExpired
              ? "Đơn đã quá hạn thanh toán."
              : "Nếu bạn đã thanh toán, hãy kiểm tra lại. Nếu chưa, bạn có thể thanh toán tiếp."}
        </Text>
        <Button title="Kiểm tra lại" variant="outline" onPress={checkAgain} />
        {!orderExpired ? (
          <Button
            title="Thanh toán lại"
            onPress={() => void retryPayment()}
            loading={busy}
          />
        ) : null}
        {!orderExpired ? (
          <Button
            title="Hủy đơn"
            variant="outline"
            onPress={cancelOrder}
            disabled={busy}
          />
        ) : null}
        <Button title={homeLabel} variant="outline" onPress={goHome} />
      </ScrollView>
    );
  }

  const failText: Record<string, string> = {
    EXPIRED: "Đơn hàng đã hết hạn thanh toán.",
    CANCELLED: "Đơn hàng đã bị hủy.",
    REFUNDED: "Đơn hàng đã được hoàn tiền.",
  };
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {header}
      <Ionicons
        name="close-circle"
        size={64}
        color={colors.danger}
        style={styles.icon}
      />
      <Text style={styles.title}>Không thành công</Text>
      <Text style={styles.sub}>
        Mã đơn <Text style={styles.strong}>{order.orderCode}</Text>
        {"\n"}
        {failText[order.status] ?? `Trạng thái: ${order.status}`}
      </Text>
      <Button title={homeLabel} onPress={goHome} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  icon: { alignSelf: "center" },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  sub: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  strong: { color: colors.text, fontWeight: "800" },
  hint: { color: colors.muted, fontSize: 12, textAlign: "center" },
  chips: { gap: spacing.sm, justifyContent: "center", flexGrow: 1 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  chipTextOn: { color: colors.text },
  homeBtn: { margin: spacing.lg },
});
