import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { MovieShowtimes } from "@/features/movie/components/movie-showtimes";
import { TrailerModal } from "@/features/movie/components/trailer-modal";
import { useMovieDetail } from "@/features/movie/hooks/use-movies";
import { resolveTrailer } from "@/features/movie/utils/trailer";
import { ErrorView, LoadingView } from "@/shared/ui/state-views";
import { colors, radius, spacing } from "@/theme/colors";

export default function MovieDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: movie,
    isPending,
    isError,
    error,
    refetch,
  } = useMovieDetail(id);
  const [trailerOpen, setTrailerOpen] = useState(false);

  const trailer = useMemo(
    () => resolveTrailer(movie?.trailerUrl),
    [movie?.trailerUrl],
  );

  if (isPending) return <LoadingView />;
  if (isError)
    return <ErrorView message={error.message} onRetry={() => refetch()} />;

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <Stack.Screen options={{ title: movie.title }} />

        <View style={styles.top}>
          <View style={styles.posterBox}>
            {movie.posterUrl ? (
              <Image
                source={{ uri: movie.posterUrl }}
                style={styles.poster}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.poster, styles.noPoster]}>
                <Ionicons name="film-outline" size={36} color={colors.subtle} />
              </View>
            )}
            {trailer ? (
              <Pressable
                onPress={() => setTrailerOpen(true)}
                style={styles.playOverlay}
                accessibilityLabel="Xem trailer"
              >
                <View style={styles.playBtn}>
                  <Ionicons name="play" size={22} color={colors.text} />
                </View>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.meta}>
            <Text style={styles.title}>{movie.title}</Text>
            {movie.ageRating ? (
              <Text style={styles.chip}>{movie.ageRating}</Text>
            ) : null}
            {movie.durationMinutes ? (
              <Text style={styles.muted}>
                Thời lượng: {movie.durationMinutes} phút
              </Text>
            ) : null}
            {movie.releaseDate ? (
              <Text style={styles.muted}>
                Khởi chiếu: {movie.releaseDate.slice(0, 10)}
              </Text>
            ) : null}
            {trailer ? (
              <Pressable
                onPress={() => setTrailerOpen(true)}
                style={styles.trailerBtn}
              >
                <Ionicons
                  name="play-circle-outline"
                  size={18}
                  color={colors.text}
                />
                <Text style={styles.trailerText}>Xem trailer</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {movie.genres && movie.genres.length > 0 && (
          <View style={styles.genres}>
            {movie.genres.map((g) => (
              <Text key={g.id} style={styles.genre}>
                {g.name}
              </Text>
            ))}
          </View>
        )}

        {movie.description ? (
          <View style={styles.block}>
            <Text style={styles.heading}>Nội dung</Text>
            <Text style={styles.body}>{movie.description}</Text>
          </View>
        ) : null}

        {movie.director ? (
          <Text style={styles.muted}>Đạo diễn: {movie.director}</Text>
        ) : null}
        {movie.cast ? (
          <Text style={styles.muted}>Diễn viên: {movie.cast}</Text>
        ) : null}

        <MovieShowtimes
          movieId={String(movie.id)}
          onSelectShowtime={(s) =>
            router.push({
              pathname: "/booking/[showtimeId]",
              params: { showtimeId: String(s.showtimeId) },
            })
          }
          onSelectCineplex={(cineplexId) =>
            router.push({
              pathname: "/cineplexes/[id]",
              params: { id: String(cineplexId) },
            })
          }
        />
      </ScrollView>

      <TrailerModal
        visible={trailerOpen}
        title={movie.title}
        source={trailer}
        onClose={() => setTrailerOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  top: { flexDirection: "row", gap: spacing.lg },
  posterBox: {
    width: 120,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  poster: { width: 120, aspectRatio: 2 / 3 },
  noPoster: { alignItems: "center", justifyContent: "center" },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 3,
    backgroundColor: "rgba(239,68,68,0.9)",
  },
  meta: { flex: 1, gap: 6 },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  chip: {
    alignSelf: "flex-start",
    color: colors.primary,
    backgroundColor: "rgba(239,68,68,0.2)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
  },
  muted: { color: colors.muted, fontSize: 13 },
  trailerBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  trailerText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  genres: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  genre: {
    color: colors.text,
    fontSize: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: "hidden",
  },
  block: { gap: spacing.sm },
  heading: { color: colors.text, fontSize: 16, fontWeight: "800" },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21 },
});
