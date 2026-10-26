import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MovieCard } from "@/features/movie/components/movie-card";
import { useMovies } from "@/features/movie/hooks/use-movies";
import type { MovieStatusType } from "@/features/movie/types/movie.types";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { EmptyView, ErrorView, LoadingView } from "@/shared/ui/state-views";
import { colors, radius, spacing } from "@/theme/colors";

const STATUS_TABS: { key: MovieStatusType | undefined; label: string }[] = [
  { key: undefined, label: "Tất cả" },
  { key: "SHOWING", label: "Đang chiếu" },
  { key: "UPCOMING", label: "Sắp chiếu" },
];

export default function MoviesScreen() {
  const router = useRouter();
  // Từ trang chủ bấm "Xem tất cả" có thể truyền sẵn ?status=SHOWING|UPCOMING.
  const { status: statusParam } = useLocalSearchParams<{ status?: string }>();
  const [status, setStatus] = useState<MovieStatusType | undefined>(
    statusParam === "SHOWING" || statusParam === "UPCOMING"
      ? statusParam
      : undefined,
  );
  useEffect(() => {
    if (statusParam === "SHOWING" || statusParam === "UPCOMING")
      setStatus(statusParam);
  }, [statusParam]);
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
  } = useMovies({ search: debounced || undefined, status, limit: 12 });

  const movies = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

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

      <View style={styles.tabs}>
        {STATUS_TABS.map((t) => {
          const on = t.key === status;
          return (
            <Pressable
              key={t.label}
              onPress={() => setStatus(t.key)}
              style={[styles.tab, on && styles.tabOn]}
            >
              <Text style={[styles.tabText, on && styles.tabTextOn]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

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
                router.push({
                  pathname: "/movies/[id]",
                  params: { id: String(item.id) },
                })
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
  tabs: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  tabTextOn: { color: colors.text },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  column: { gap: spacing.lg },
});
