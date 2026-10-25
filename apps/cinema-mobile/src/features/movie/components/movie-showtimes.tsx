import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  formatTime,
  getNextDays,
} from "@/features/cineplex/utils/cineplex.utils";
import { EmptyView, ErrorView, LoadingView } from "@/shared/ui/state-views";
import { colors, radius, spacing } from "@/theme/colors";
import { useMovieShowtimes } from "../hooks/use-movie-showtimes";
import type { MovieShowtimeItem } from "../types/movie.types";

interface Props {
  movieId: string;
  onSelectShowtime: (showtime: MovieShowtimeItem) => void;
  onSelectCineplex?: (cineplexId: number) => void;
}

export function MovieShowtimes({
  movieId,
  onSelectShowtime,
  onSelectCineplex,
}: Props) {
  const days = useMemo(() => getNextDays(7), []);
  const [date, setDate] = useState(days[0].key);
  const {
    data: groups,
    isPending,
    isError,
    error,
    refetch,
  } = useMovieShowtimes(movieId, date);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Lịch chiếu</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.days}>
          {days.map((d) => {
            const on = d.key === date;
            return (
              <Pressable
                key={d.key}
                onPress={() => setDate(d.key)}
                style={[styles.day, on && styles.dayOn]}
              >
                <Text style={[styles.dayWeek, on && styles.textOn]}>
                  {d.weekday}
                </Text>
                <Text style={[styles.dayLabel, on && styles.textOn]}>
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {isPending && <LoadingView />}
      {isError && (
        <ErrorView message={error.message} onRetry={() => refetch()} />
      )}
      {groups && groups.length === 0 && (
        <EmptyView
          title="Chưa có suất chiếu trong ngày này"
          subtitle="Chọn ngày khác hoặc quay lại sau."
        />
      )}

      {groups?.map((g) => (
        <View key={g.cineplexId} style={styles.card}>
          <Pressable
            disabled={!onSelectCineplex}
            onPress={() => onSelectCineplex?.(g.cineplexId)}
            style={styles.cineplexHead}
          >
            <Ionicons
              name="location-outline"
              size={16}
              color={colors.primary}
            />
            <View style={styles.flex}>
              <Text style={styles.cineplexName}>{g.cineplexName}</Text>
            </View>
            {onSelectCineplex ? (
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.subtle}
              />
            ) : null}
          </Pressable>

          <View style={styles.times}>
            {g.showtimes.map((s) => (
              <Pressable
                key={s.showtimeId}
                onPress={() => onSelectShowtime(s)}
                style={({ pressed }) => [
                  styles.time,
                  pressed && styles.timePressed,
                ]}
              >
                <Text style={styles.timeText}>{formatTime(s.startTime)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.lg },
  flex: { flex: 1 },
  heading: { color: colors.text, fontSize: 18, fontWeight: "800" },
  days: { flexDirection: "row", gap: spacing.sm },
  day: {
    minWidth: 72,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  dayOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayWeek: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  dayLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  textOn: { color: colors.text },
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cineplexHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  cineplexName: { color: colors.text, fontSize: 15, fontWeight: "800" },
  times: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  time: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  timePressed: { borderColor: colors.primary },
  timeText: { color: colors.text, fontSize: 14, fontWeight: "800" },
  room: { color: colors.muted, fontSize: 10, marginTop: 2 },
});
