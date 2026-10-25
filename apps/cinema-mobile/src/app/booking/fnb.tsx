import { useCallback, useEffect, useMemo } from "react";
import { Alert, SectionList, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  formatCountdown,
  useHoldCountdown,
} from "@/features/booking/hooks/use-hold-countdown";
import { FnbItemCard } from "@/features/fnb/components/fnb-item-card";
import { useFnbItems } from "@/features/fnb/hooks/use-fnb-items";
import type { FnbItem } from "@/features/fnb/types/fnb.types";
import { fnbPrice } from "@/features/fnb/utils/fnb-adapter";
import {
  selectComboCount,
  selectComboTotal,
  selectTicketTotal,
  useBookingStore,
} from "@/store/booking.store";
import { Button } from "@/shared/ui/button";
import { EmptyView, ErrorView, LoadingView } from "@/shared/ui/state-views";
import { colors, radius, spacing } from "@/theme/colors";

const formatVnd = (n: number) => `${n.toLocaleString("vi-VN")} đ`;

export default function FnbScreen() {
  const router = useRouter();
  const { showtimeId: param } = useLocalSearchParams<{ showtimeId: string }>();
  const showtimeId = Number(param);

  const heldShowtimeId = useBookingStore((s) => s.showtimeId);
  const seats = useBookingStore((s) => s.seats);
  const combos = useBookingStore((s) => s.combos);
  const ticketTotal = useBookingStore(selectTicketTotal);
  const comboTotal = useBookingStore(selectComboTotal);
  const comboCount = useBookingStore(selectComboCount);
  const changeCombo = useBookingStore((s) => s.changeCombo);
  const { hasHold, secondsLeft, isExpired } = useHoldCountdown();

  const { data, isPending, isError, error, refetch } = useFnbItems();

  const hasSeats = heldShowtimeId === showtimeId && seats.length > 0;

  // Hết hạn giữ ghế khi đang chọn món: quay lại bước chọn ghế (store đã được dọn).
  useEffect(() => {
    if (!isExpired) return;
    useBookingStore.getState().clearHolds();
    Alert.alert("Hết thời gian giữ ghế", "Vui lòng chọn lại ghế.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  }, [isExpired, router]);

  const onChange = useCallback(
    (item: FnbItem, delta: number) =>
      changeCombo(
        { id: item.id, name: item.name, price: fnbPrice(item) },
        delta,
      ),
    [changeCombo],
  );

  const sections = useMemo(
    () => (data?.groups ?? []).map((g) => ({ title: g.label, data: g.items })),
    [data],
  );

  const onContinue = () => router.push("/booking/checkout");

  if (!hasSeats) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Bắp nước" }} />
        <EmptyView
          title="Bạn chưa giữ ghế nào"
          subtitle="Hãy quay lại chọn ghế trước."
        />
        <Button
          title="Chọn ghế"
          onPress={() => router.back()}
          style={styles.full}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Chọn bắp nước" }} />

      <View style={styles.banner}>
        <Text style={styles.bannerSeats} numberOfLines={1}>
          Ghế: {seats.map((s) => s.label).join(", ")}
        </Text>
        {hasHold && !isExpired ? (
          <Text style={styles.timer}>
            Giữ ghế còn {formatCountdown(secondsLeft)}
          </Text>
        ) : null}
      </View>

      {isPending ? (
        <LoadingView />
      ) : isError ? (
        <ErrorView message={error.message} onRetry={() => refetch()} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <FnbItemCard
              item={item}
              quantity={combos[item.id]?.quantity ?? 0}
              onChange={onChange}
            />
          )}
          ListEmptyComponent={
            <EmptyView title="Hiện chưa có sản phẩm bắp nước nào" />
          }
        />
      )}

      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.line}>
            Vé ({seats.length}): {formatVnd(ticketTotal)}
          </Text>
          <Text style={styles.line}>
            Bắp nước{comboCount > 0 ? ` (${comboCount})` : ""}:{" "}
            {formatVnd(comboTotal)}
          </Text>
          <Text style={styles.total}>
            {formatVnd(ticketTotal + comboTotal)}
          </Text>
        </View>
        <Button
          title={comboCount > 0 ? "Tiếp tục" : "Bỏ qua"}
          onPress={onContinue}
          style={styles.cta}
        />
      </View>
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
  full: { alignSelf: "stretch" },
  banner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  bannerSeats: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "700" },
  timer: { color: colors.primaryLight, fontSize: 12, fontWeight: "700" },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sep: { height: spacing.md },
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
  footerInfo: { flex: 1, gap: 2 },
  line: { color: colors.muted, fontSize: 12 },
  total: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 2 },
  cta: { minWidth: 110 },
});
