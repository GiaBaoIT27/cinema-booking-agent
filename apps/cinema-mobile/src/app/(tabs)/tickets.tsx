import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMyOrders } from "@/features/orders/hooks/use-my-orders";
import type { OrderListItem } from "@/features/orders/types/order.types";
import {
  matchesFilter,
  ORDER_FILTERS,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
  type OrderFilter,
} from "@/features/orders/utils/order-status";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/shared/ui/button";
import { EmptyView, ErrorView, LoadingView } from "@/shared/ui/state-views";
import { colors, radius, spacing } from "@/theme/colors";

const formatVnd = (n: number) => `${Number(n).toLocaleString("vi-VN")} đ`;
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
};

export default function TicketsScreen() {
  const router = useRouter();
  const authStatus = useAuthStore((s) => s.status);
  const authed = authStatus === "authenticated";
  const [filter, setFilter] = useState<OrderFilter>("ALL");

  const { data, isPending, isError, error, refetch, isRefetching } =
    useMyOrders(authed);

  // Mỗi lần mở tab: tải lại để thấy đơn mới / trạng thái mới sau thanh toán.
  useFocusEffect(
    useCallback(() => {
      if (authed) void refetch();
    }, [authed, refetch]),
  );

  const orders = useMemo(
    () => (data ?? []).filter((o) => matchesFilter(o, filter)),
    [data, filter],
  );

  if (authStatus === "loading") return <LoadingView />;
  if (!authed) {
    return (
      <View style={styles.center}>
        <Ionicons name="ticket-outline" size={56} color={colors.subtle} />
        <Text style={styles.title}>Đăng nhập để xem vé của bạn</Text>
        <Button
          title="Đăng nhập"
          onPress={() => router.push("/login")}
          style={styles.full}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {ORDER_FILTERS.map((f) => {
            const on = f.key === filter;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isPending ? (
        <LoadingView />
      ) : isError ? (
        <ErrorView message={error.message} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => String(o.orderId)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() =>
                router.push({
                  pathname: "/booking/result",
                  params: { orderId: String(item.orderId), source: "orders" },
                })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyView
              title={
                filter === "ALL" ? "Bạn chưa có vé nào" : "Không có đơn phù hợp"
              }
              subtitle={
                filter === "ALL"
                  ? "Đặt vé đầu tiên của bạn ở tab Phim."
                  : undefined
              }
            />
          }
          refreshing={isRefetching}
          onRefresh={() => refetch()}
        />
      )}
    </View>
  );
}

function OrderCard({
  order,
  onPress,
}: {
  order: OrderListItem;
  onPress: () => void;
}) {
  const color = ORDER_STATUS_COLOR[order.status];
  const payable =
    order.status === "PENDING" &&
    new Date(order.expiresAt).getTime() > Date.now();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.code}>{order.orderCode}</Text>
        <View style={[styles.badge, { borderColor: color }]}>
          <Text style={[styles.badgeText, { color }]}>
            {ORDER_STATUS_LABEL[order.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
      <View style={styles.cardBottom}>
        <Text style={styles.amount}>
          {formatVnd(order.pricing.finalAmount)}
        </Text>
        <Text style={styles.link}>
          {payable
            ? "Tiếp tục thanh toán"
            : order.status === "PAID"
              ? "Xem vé"
              : "Chi tiết"}
          {"  "}
          <Ionicons
            name="chevron-forward"
            size={12}
            color={colors.primaryLight}
          />
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  full: { alignSelf: "stretch" },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  filters: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
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
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    gap: 6,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cardPressed: { borderColor: colors.primary },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  code: { color: colors.text, fontSize: 15, fontWeight: "800" },
  badge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: "800" },
  date: { color: colors.muted, fontSize: 12 },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  amount: { color: colors.warning, fontSize: 16, fontWeight: "800" },
  link: { color: colors.primaryLight, fontSize: 12, fontWeight: "700" },
});
