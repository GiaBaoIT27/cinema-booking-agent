import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "@/theme/colors";
import type { MovieListItem } from "../types/movie.types";

interface Props {
  movie: MovieListItem;
  onPress: () => void;
}

export function MovieCard({ movie, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.posterBox}>
        {movie.posterUrl ? (
          <Image
            source={{ uri: movie.posterUrl }}
            style={styles.poster}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={[styles.poster, styles.noPoster]}>
            <Ionicons name="film-outline" size={32} color={colors.subtle} />
          </View>
        )}
        {movie.ageRating ? (
          <View style={styles.age}>
            <Text style={styles.ageText}>{movie.ageRating}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {movie.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: 8 },
  posterBox: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  poster: { width: "100%", aspectRatio: 2 / 3 },
  noPoster: { alignItems: "center", justifyContent: "center" },
  age: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ageText: { color: colors.text, fontSize: 10, fontWeight: "800" },
  title: { color: colors.text, fontSize: 13, fontWeight: "700" },
});
