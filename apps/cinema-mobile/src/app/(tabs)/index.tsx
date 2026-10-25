import { useMemo, useState } from "react";
import { FlatList, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { MovieCard } from "@/features/movie/components/movie-card";
import { useMovies } from "@/features/movie/hooks/use-movies";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { EmptyView, ErrorView, LoadingView } from "@/shared/ui/state-views";
import { colors, radius, spacing } from "@/theme/colors";

export default function MoviesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim());

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMovies({ search: debounced || undefined, limit: 12 });

  const movies = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  return (
    <View style={styles.container}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Tìm phim..."
        placeholderTextColor={colors.subtle}
        style={styles.search}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      {isPending ? (
        <LoadingView />
      ) : isError ? (
        <ErrorView message={error.message} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(m) => String(m.id)}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <MovieCard
              movie={item}
              onPress={() =>
                router.push({ pathname: "/movies/[id]", params: { id: String(item.id) } })
              }
            />
          )}
          ListEmptyComponent={<EmptyView title="Không tìm thấy phim phù hợp" />}
          ListFooterComponent={isFetchingNextPage ? <LoadingView /> : undefined}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={() => refetch()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  search: {
    height: 44,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 15,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  column: { gap: spacing.lg },
});
