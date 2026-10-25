import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CineplexCard } from "@/features/cineplex/components/cineplex-card";
import { useCineplexes } from "@/features/cineplex/hooks/use-cineplexes";
import { useUserLocation } from "@/features/cineplex/hooks/use-user-location";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { EmptyView, ErrorView, LoadingView } from "@/shared/ui/state-views";
import { colors, radius, spacing } from "@/theme/colors";

const RADIUS_KM = 10;

export default function CineplexesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim());
  const { location, status: locationStatus, request, clear } = useUserLocation();

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
  } = useCineplexes({
    search: debounced || undefined,
    latitude: location?.latitude,
    longitude: location?.longitude,
    radiusKm: location ? RADIUS_KM : undefined,
    limit: 12,
  });

  const cineplexes = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const nearMe = location !== null;

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm theo tên hoặc địa chỉ rạp..."
          placeholderTextColor={colors.subtle}
          style={styles.search}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <Pressable
          onPress={nearMe ? clear : request}
          disabled={locationStatus === "loading"}
          style={[styles.near, nearMe && styles.nearOn]}
        >
          <Ionicons name="navigate-outline" size={16} color={colors.text} />
          <Text style={styles.nearText}>
            {locationStatus === "loading"
              ? "Đang định vị..."
              : nearMe
                ? `Gần tôi (${RADIUS_KM} km) · Tắt`
                : "Rạp gần tôi"}
          </Text>
        </Pressable>
        {locationStatus === "denied" && (
          <Text style={styles.warn}>
            Bạn đã từ chối quyền vị trí. Bật lại trong Cài đặt của điện thoại để tìm rạp gần bạn.
          </Text>
        )}
        {locationStatus === "error" && (
          <Text style={styles.danger}>Không thể xác định vị trí hiện tại.</Text>
        )}
      </View>

      {isPending ? (
        <LoadingView />
      ) : isError ? (
        <ErrorView message={error.message} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={cineplexes}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <CineplexCard
              cineplex={item}
              onPress={() =>
                router.push({ pathname: "/cineplexes/[id]", params: { id: String(item.id) } })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyView
              title="Không tìm thấy rạp phù hợp"
              subtitle="Thử đổi từ khóa hoặc tắt chế độ gần tôi."
            />
          }
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
  filters: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  search: {
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 15,
  },
  near: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  nearOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  nearText: { color: colors.text, fontWeight: "700", fontSize: 14 },
  warn: { color: colors.warning, fontSize: 12 },
  danger: { color: colors.danger, fontSize: 12 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
});
