import { memo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { colors } from "@/theme/colors";
import type { Seat, SeatMapLayout } from "../types/seat.types";

const GAP = 6;
const LABEL_W = 20;
const MIN_CELL = 30;
const MAX_CELL = 40;

interface Props {
  layout: SeatMapLayout;
  selectedIds: ReadonlySet<number>;
  pendingIds: ReadonlySet<number>;
  onToggle: (seat: Seat) => void;
}

const seatColor = (seat: Seat, selected: boolean) => {
  if (selected)
    return { bg: colors.primary, border: colors.primary, text: colors.text };
  if (seat.isBooked)
    return { bg: colors.card, border: colors.border, text: "#4B5563" };
  if (seat.type === "vip")
    return { bg: "#D97706", border: "#D97706", text: colors.text };
  if (seat.type === "couple")
    return { bg: "#EC4899", border: "#EC4899", text: colors.text };
  return { bg: "#2A324B", border: "#2A324B", text: colors.text };
};

const SeatCellView = memo(function SeatCellView({
  seat,
  selected,
  pending,
  left,
  top,
  width,
  height,
  onToggle,
}: {
  seat: Seat;
  selected: boolean;
  pending: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
  onToggle: (seat: Seat) => void;
}) {
  const c = seatColor(seat, selected);
  return (
    <Pressable
      disabled={seat.isBooked || pending}
      onPress={() => onToggle(seat)}
      accessibilityLabel={`Ghế ${seat.label}, ${seat.price.toLocaleString("vi-VN")} đồng`}
      style={[
        styles.seat,
        {
          left,
          top,
          width,
          height,
          backgroundColor: c.bg,
          borderColor: c.border,
        },
        seat.type === "couple" ? styles.rounded : styles.roundedTop,
        pending && styles.pending,
      ]}
    >
      <Text style={[styles.seatText, { color: c.text }]} numberOfLines={1}>
        {seat.label}
      </Text>
    </Pressable>
  );
});

/** Mỗi ghế đặt đúng hàng/cột (absolute); ghế đôi chiếm 2 cột; chỗ trống là lối đi. */
export function SeatGrid({ layout, selectedIds, pendingIds, onToggle }: Props) {
  const { width: screenW } = useWindowDimensions();
  const { columns, rowLabels, cells } = layout;
  if (columns === 0) return null;

  const fit = Math.floor(
    (screenW - 32 - LABEL_W * 2 - GAP * columns) / columns,
  );
  const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, fit));
  const step = cell + GAP;
  const gridW = columns * step - GAP;
  const gridH = rowLabels.length * step - GAP;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.hScroll}
    >
      <View style={styles.wrap}>
        <View style={{ width: LABEL_W, height: gridH }}>
          {rowLabels.map((r, i) => (
            <Text
              key={r}
              style={[
                styles.rowLabel,
                { top: i * step, height: cell, lineHeight: cell },
              ]}
            >
              {r}
            </Text>
          ))}
        </View>

        <View style={{ width: gridW, height: gridH }}>
          {cells.map(({ seat, row, col, span }) => (
            <SeatCellView
              key={seat.id}
              seat={seat}
              selected={selectedIds.has(seat.id)}
              pending={pendingIds.has(seat.id)}
              left={(col - 1) * step}
              top={row * step}
              width={span * cell + (span - 1) * GAP}
              height={cell}
              onToggle={onToggle}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

export function SeatLegend() {
  const items = [
    { label: "Thường", bg: "#2A324B", border: "#2A324B" },
    { label: "VIP", bg: "#D97706", border: "#D97706" },
    { label: "Đôi", bg: "#EC4899", border: "#EC4899" },
    { label: "Đang chọn", bg: colors.primary, border: colors.primary },
    { label: "Đã đặt", bg: colors.card, border: colors.border },
  ];
  return (
    <View style={styles.legend}>
      {items.map((i) => (
        <View key={i.label} style={styles.legendItem}>
          <View
            style={[
              styles.legendBox,
              { backgroundColor: i.bg, borderColor: i.border },
            ]}
          />
          <Text style={styles.legendText}>{i.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function ScreenBar({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.screenWrap}>
      <View style={styles.screen} />
      <Text style={styles.screenText}>MÀN HÌNH CHIẾU</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hScroll: {
    paddingHorizontal: 16,
    minWidth: "100%",
    justifyContent: "center",
  },
  wrap: { flexDirection: "row", gap: 0 },
  rowLabel: {
    position: "absolute",
    width: LABEL_W,
    textAlign: "center",
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  seat: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  roundedTop: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  rounded: { borderRadius: 8 },
  pending: { opacity: 0.5 },
  seatText: { fontSize: 10, fontWeight: "700" },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 16,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendBox: { width: 16, height: 14, borderRadius: 4, borderWidth: 1 },
  legendText: { color: colors.muted, fontSize: 11 },
  screenWrap: { alignItems: "center", gap: 6 },
  screen: {
    width: "70%",
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    opacity: 0.85,
  },
  screenText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  subtitle: { color: colors.subtle, fontSize: 11 },
});
