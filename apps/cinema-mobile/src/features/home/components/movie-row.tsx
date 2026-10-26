import { FlatList, StyleSheet, View } from "react-native";
import { MovieCard } from "@/features/movie/components/movie-card";
import type { MovieListItem } from "@/features/movie/types/movie.types";
import { spacing } from "@/theme/colors";

const CARD_WIDTH = 132;

export function MovieRow({ movies, onPressMovie }: { movies: MovieListItem[]; onPressMovie: (m: MovieListItem) => void }) {
  return (
    <FlatList
      data={movies}
      keyExtractor={(m) => String(m.id)}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <MovieCard movie={item} onPress={() => onPressMovie(item)} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, gap: spacing.md },
  item: { width: CARD_WIDTH },
});
