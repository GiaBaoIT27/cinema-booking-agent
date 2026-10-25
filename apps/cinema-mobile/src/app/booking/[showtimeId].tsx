import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import {
  formatCountdown,
  useHoldCountdown,
} from "@/features/booking/hooks/use-hold-countdown";
import { bookingService } from "@/features/booking/services/booking.service";
import {
  releaseSeatsFlow,
  toggleSeatFlow,
} from "@/features/booking/utils/hold-flow";
import {
  ScreenBar,
  SeatGrid,
  SeatLegend,
} from "@/features/seats/components/seat-grid";
import { useShowtimeSeats } from "@/features/seats/hooks/use-showtime-seats";
import { markOwnHeldSeats } from "@/features/seats/utils/seat-adapter";
import type { Seat } from "@/features/seats/types/seat.types";
import { useAuthStore } from "@/store/auth.store";
import { selectTicketTotal, useBookingStore } from "@/store/booking.store";
import { Button } from "@/shared/ui/button";
import { EmptyView, ErrorView, LoadingView } from "@/shared/ui/state-views";
import { colors, radius, spacing } from "@/theme/colors";

const MAX_SEATS = 8;
const formatVnd = (n: number) => `${n.toLocaleString("vi-VN")} đ`;

export default function BookingScreen() {
  const router = useRouter();
  const { showtimeId: param } = useLocalSearchParams<{ showtimeId: string }>();
  const showtimeId = Number(param);
  const authStatus = useAuthStore((s) => s.status);

  if (authStatus === "loading") return <LoadingView />;
  if (authStatus === "unauthenticated") {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Bạn cần đăng nhập để đặt vé</Text>
        <Button
          title="Đăng nhập"
          onPress={() => router.push("/login")}
          style={styles.full}
        />
      </View>
    );
  }
  return <SeatSelection showtimeId={showtimeId} />;
}

function SeatSelection({ showtimeId }: { showtimeId: number }) {
  const router = useRouter();
  const { data, isPending, isError, error, refetch } =
    useShowtimeSeats(showtimeId);

  const heldShowtimeId = useBookingStore((s) => s.showtimeId);
  const heldSeats = useBookingStore((s) => s.seats);
  const expiries = useBookingStore((s) => s.expiries);
  const total = useBookingStore(selectTicketTotal);
  const { addHeldSeat, removeHeldSeat, clearHolds } =
    useBookingStore.getState();
  const { hasHold, secondsLeft, isExpired } = useHoldCountdown();

  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const proceeding = useRef(false);

  // Quay lại từ bước bắp nước: lại là màn đang dùng, rời đi thì phải trả ghế.
  useFocusEffect(
    useCallback(() => {
      proceeding.current = false;
    }, []),
  );

  // Vào màn: nếu đang giữ ghế của suất khác hoặc ghế đã hết hạn thì trả lại.
  useEffect(() => {
    const st = useBookingStore.getState();
    if (st.seats.length === 0) return;
    const other = st.showtimeId !== null && st.showtimeId !== showtimeId;
    const stale = st.seats.some(
      (s) => (st.expiries[s.seatId] ?? 0) <= Date.now(),
    );
    if (!other && !stale) return;
    // Trả hết (lỗi như ghế đã hết hạn bị bỏ qua) rồi dọn store.
    if (st.showtimeId !== null) {
      void releaseSeatsFlow(
        bookingService,
        st.showtimeId,
        st.seats.map((s) => s.seatId),
      );
    }
    st.clearHolds();
  }, [showtimeId]);

  // Rời màn (quay lại) mà chưa sang bước thanh toán thì trả ghế đang giữ.
  useEffect(() => {
    return () => {
      if (proceeding.current) return;
      const st = useBookingStore.getState();
      if (st.showtimeId === showtimeId && st.seats.length > 0) {
        void releaseSeatsFlow(
          bookingService,
          showtimeId,
          st.seats.map((s) => s.seatId),
        );
        st.clearHolds();
      }
    };
  }, [showtimeId]);

  // Hết hạn giữ ghế: server đã tự nhả, chỉ cần dọn phía app.
  useEffect(() => {
    if (!isExpired) return;
    clearHolds();
    setMessage("Hết thời gian giữ ghế. Vui lòng chọn lại.");
    void refetch();
  }, [isExpired, clearHolds, refetch]);

  const selectedIds = useMemo(
    () =>
      new Set(
        heldShowtimeId === showtimeId ? heldSeats.map((s) => s.seatId) : [],
      ),
    [heldShowtimeId, showtimeId, heldSeats],
  );

  // Ghế mình đang giữ không còn AVAILABLE trên server: mở khóa để bỏ chọn được.
  const layout = useMemo(
    () => (data ? markOwnHeldSeats(data.layout, selectedIds) : null),
    [data, selectedIds],
  );

  const onToggle = useCallback(
    async (seat: Seat) => {
      if (pendingIds.size > 0) return;
      const isSelected = selectedIds.has(seat.id);
      if (!isSelected && selectedIds.size >= MAX_SEATS) {
        setMessage(`Chỉ được chọn tối đa ${MAX_SEATS} ghế.`);
        return;
      }
      setMessage(null);
      setPendingIds(new Set([seat.id]));
      const outcome = await toggleSeatFlow(bookingService, {
        showtimeId,
        seatId: seat.id,
        isSelected,
        expiresAt: expiries[seat.id],
      });
      setPendingIds(new Set());

      switch (outcome.kind) {
        case "held":
          addHeldSeat(
            showtimeId,
            {
              seatId: seat.id,
              label: seat.label,
              seatType: seat.type,
              price: seat.price,
            },
            outcome.expiresAt,
          );
          break;
        case "released":
          removeHeldSeat(seat.id);
          break;
        case "hold-failed":
          setMessage(outcome.message);
          void refetch(); // có thể người khác vừa giữ ghế này
          break;
        case "release-failed":
          setMessage("Không thể bỏ chọn ghế. Vui lòng thử lại.");
          break;
      }
    },
    [
      pendingIds,
      selectedIds,
      showtimeId,
      expiries,
      addHeldSeat,
      removeHeldSeat,
      refetch,
    ],
  );

  const onContinue = () => {
    proceeding.current = true; // sang bước bắp nước, giữ nguyên ghế
    router.push({
      pathname: "/booking/fnb",
      params: { showtimeId: String(showtimeId) },
    });
  };

  if (isPending) return <LoadingView />;
  if (isError)
    return <ErrorView message={error.message} onRetry={() => refetch()} />;

  const mine = heldShowtimeId === showtimeId ? heldSeats : [];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Chọn ghế" }} />

      <ScrollView contentContainerStyle={styles.content}>
        <ScreenBar
          subtitle={`${data.info.auditoriumName} · Còn ${data.info.availableSeats}/${data.info.totalSeats} ghế`}
        />
        {layout && layout.cells.length > 0 ? (
          <>
            <SeatGrid
              layout={layout}
              selectedIds={selectedIds}
              pendingIds={pendingIds}
              onToggle={onToggle}
            />
            <SeatLegend />
          </>
        ) : (
          <EmptyView title="Chưa có sơ đồ ghế cho suất chiếu này" />
        )}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.seatsText} numberOfLines={2}>
            {mine.length > 0
              ? mine.map((s) => s.label).join(", ")
              : "Chưa chọn ghế"}
          </Text>
          <Text style={styles.total}>{formatVnd(total)}</Text>
          {hasHold && !isExpired ? (
            <Text style={styles.timer}>
              Giữ ghế còn {formatCountdown(secondsLeft)}
            </Text>
          ) : null}
        </View>
        <Button
          title="Tiếp tục"
          onPress={onContinue}
          disabled={mine.length === 0}
          style={styles.cta}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingVertical: spacing.lg, gap: spacing.lg },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xl,
    justifyContent: "center",
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  full: { alignSelf: "stretch" },
  message: {
    color: colors.warning,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  footerInfo: { flex: 1, gap: 2 },
  seatsText: { color: colors.muted, fontSize: 12 },
  total: { color: colors.text, fontSize: 18, fontWeight: "800" },
  timer: { color: colors.primaryLight, fontSize: 12, fontWeight: "700" },
  cta: { minWidth: 120 },
});
