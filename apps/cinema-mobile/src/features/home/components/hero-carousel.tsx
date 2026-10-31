import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type { MovieListItem } from "@/features/movie/types/movie.types";
import { colors, radius, spacing } from "@/theme/colors";

interface Props {
  movies: MovieListItem[];
  onPressMovie: (movie: MovieListItem) => void;
}

/** Banner phim nổi bật, vuốt ngang từng trang. */
export function HeroCarousel({ movies, onPressMovie }: Props) {
  const { width } = useWindowDimensions();
  const height = Math.round(width * 1.15);
  const [index, setIndex] = useState(0);

  if (movies.length === 0) return null;

  return (
    <View>
      <FlatList
        data={movies}
        keyExtractor={(m) => String(m.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <Pressable onPress={() => onPressMovie(item)} style={{ width, height }}>
            {item.posterUrl ? (
              <Image source={{ uri: item.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.noImage]}>
                <Ionicons name="film-outline" size={56} color={colors.subtle} />
              </View>
            )}
            <View style={styles.shade} />
            <View style={styles.info}>
              <View style={styles.meta}>
                {item.ageRating ? <Text style={styles.age}>{item.ageRating}</Text> : null}
                {item.durationMinutes ? <Text style={styles.metaText}>{item.durationMinutes} phút</Text> : null}
                {item.genres && item.genres.length > 0 ? (
                  <Text style={styles.metaText} numberOfLines={1}>
                    {item.genres.slice(0, 2).join(", ")}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.cta}>
                <Text style={styles.ctaText}>Mua vé ngay</Text>
              </View>
            </View>
          </Pressable>
        )}
      />
      {movies.length > 1 ? (
        <View style={styles.dots}>
          {movies.map((m, i) => (
            <View key={m.id} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  noImage: { alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(8,12,21,0.45)" },
  info: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingBottom: 36, gap: 8, backgroundColor: "rgba(8,12,21,0.6)" },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  age: {
    color: colors.text,
    backgroundColor: "rgba(217,119,6,0.9)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
  },
  metaText: { flexShrink: 1, color: "#D1D5DB", fontSize: 12, fontWeight: "600" },
  title: { color: colors.text, fontSize: 24, fontWeight: "900", textTransform: "uppercase" },
  cta: { alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  ctaText: { color: colors.text, fontSize: 14, fontWeight: "800" },
  dots: { position: "absolute", bottom: 12, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.35)" },
  dotOn: { width: 18, backgroundColor: colors.primary },
});
