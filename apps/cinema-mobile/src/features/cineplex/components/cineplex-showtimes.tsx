import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/theme/colors";
import { EmptyView, ErrorView, LoadingView } from "@/shared/ui/state-views";
import { useCineplexShowtimes } from "../hooks/use-cineplex-showtimes";
import type { CineplexShowtimeItem } from "../types/cineplex.types";
import { formatTime, getNextDays } from "../utils/cineplex.utils";

interface Props {
  cineplexId: number;
  /** Lọc theo một phim (tuỳ chọn), map sang query movieId. */
  movieId?: string;
  onSelectShowtime: (showtime: CineplexShowtimeItem) => void;
}

export function CineplexShowtimes({ cineplexId, movieId, onSelectShowtime }: Props) {
  const days = useMemo(() => getNextDays(7), []);
  const [date, setDate] = useState(days[0].key);
  const { data: groups, isPending, isError, error, refetch } =
    useCineplexShowtimes(cineplexId, { date, movieId });

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Lịch chiếu</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.days}>
          {days.map((d) => {
            const selected = d.key === date;
            return (
              <Pressable
                key={d.key}
                onPress={() => setDate(d.key)}
                style={[styles.day, selected && styles.daySelected]}
              >
                <Text style={[styles.dayWeek, selected && styles.dayTextOn]}>
                  {d.weekday}
                </Text>
                <Text style={[styles.dayLabel, selected && styles.dayTextOn]}>
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {isPending && <LoadingView />}
      {isError && <ErrorView message={error.message} onRetry={() => refetch()} />}
      {groups && groups.length === 0 && (
        <EmptyView
          title="Chưa có suất chiếu trong ngày này"
          subtitle="Chọn ngày khác hoặc quay lại sau."
        />
      )}

      {groups?.map((group) => (
        <View key={group.movieId} style={styles.movie}>
          <View style={styles.poster}>
            {group.posterUrl ? (
              <Image
                source={{ uri: group.posterUrl }}
                style={styles.posterImg}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.posterImg, styles.noPoster]}>
                <Ionicons name="film-outline" size={22} color={colors.subtle} />
              </View>
            )}
          </View>

          <View style={styles.info}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{group.movieTitle}</Text>
              {group.ageRating ? (
                <View style={styles.age}>
                  <Text style={styles.ageText}>{group.ageRating}</Text>
                </View>
              ) : null}
            </View>
            {group.durationMinutes > 0 && (
              <Text style={styles.duration}>{group.durationMinutes} phút</Text>
            )}
            <View style={styles.times}>
              {group.showtimes.map((s) => (
                <Pressable
                  key={s.showtimeId}
                  onPress={() => onSelectShowtime(s)}
                  style={({ pressed }) => [styles.time, pressed && styles.timePressed]}
                >
                  <Text style={styles.timeText}>{formatTime(s.startTime)}</Text>
                  {s.auditoriumName ? (
                    <Text style={styles.room}>{s.auditoriumName}</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.lg },
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
  daySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayWeek: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  dayLabel: { color: colors.muted, fontSize: 14, fontWeight: "800", marginTop: 2 },
  dayTextOn: { color: colors.text },
  movie: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  poster: {
    width: 72,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: colors.border,
  },
  posterImg: { width: 72, height: 108 },
  noPoster: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 6 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flexShrink: 1, color: colors.text, fontSize: 15, fontWeight: "800" },
  age: {
    backgroundColor: "rgba(239,68,68,0.2)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  ageText: { color: colors.primary, fontSize: 10, fontWeight: "800" },
  duration: { color: colors.muted, fontSize: 12 },
  times: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
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
