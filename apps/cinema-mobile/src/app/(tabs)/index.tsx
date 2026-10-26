import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { HeroCarousel } from "@/features/home/components/hero-carousel";
import { AgentBanner } from "@/features/home/components/agent-banner";
import { MovieRow } from "@/features/home/components/movie-row";
import { NewsRow } from "@/features/home/components/news-row";
import { PromoRow } from "@/features/home/components/promo-row";
import { SectionHeader } from "@/features/home/components/section-header";
import { NEWS } from "@/features/home/data/news";
import { PROMOTIONS } from "@/features/home/data/promotions";
import { useMovies } from "@/features/movie/hooks/use-movies";
import type { MovieListItem } from "@/features/movie/types/movie.types";
import { useAuthStore } from "@/store/auth.store";
import { ErrorView, LoadingView } from "@/shared/ui/state-views";
import { colors, radius, spacing } from "@/theme/colors";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);
  const [refreshing, setRefreshing] = useState(false);

  const showing = useMovies({ status: "SHOWING", limit: 10 });
  const upcoming = useMovies({ status: "UPCOMING", limit: 10 });

  const showingMovies = useMemo(
    () => showing.data?.pages[0]?.items ?? [],
    [showing.data],
  );
  const upcomingMovies = useMemo(
    () => upcoming.data?.pages[0]?.items ?? [],
    [upcoming.data],
  );
  const heroMovies = useMemo(() => showingMovies.slice(0, 5), [showingMovies]);

  const openMovie = useCallback(
    (m: MovieListItem) =>
      router.push({ pathname: "/movies/[id]", params: { id: String(m.id) } }),
    [router],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([showing.refetch(), upcoming.refetch()]);
    setRefreshing(false);
  };

  const firstName = user?.fullName?.trim().split(/\s+/).pop();

  if (showing.isPending && upcoming.isPending) return <LoadingView />;
  if (showing.isError && upcoming.isError) {
    return (
      <ErrorView
        message={showing.error.message}
        onRetry={() => void onRefresh()}
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.greeting}>
        {authStatus === "authenticated" && firstName
          ? `Xin chào, ${firstName}!`
          : "Chào mừng đến rạp phim"}
      </Text>

      <View style={styles.quick}>
        <QuickAction
          icon="film-outline"
          label="Đặt vé"
          onPress={() => router.navigate("/(tabs)/movies")}
        />
        <QuickAction
          icon="location-outline"
          label="Rạp gần bạn"
          onPress={() => router.navigate("/(tabs)/cineplexes")}
        />
        <QuickAction
          icon="ticket-outline"
          label="Vé của tôi"
          onPress={() => router.navigate("/(tabs)/tickets")}
        />
      </View>

      <HeroCarousel movies={heroMovies} onPressMovie={openMovie} />
      <AgentBanner onPress={() => router.push("/agent")} />

      {showingMovies.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title="Phim đang chiếu"
            onSeeAll={() =>
              router.navigate({
                pathname: "/(tabs)/movies",
                params: { status: "SHOWING" },
              })
            }
          />
          <MovieRow movies={showingMovies} onPressMovie={openMovie} />
        </View>
      ) : null}

      {upcomingMovies.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title="Phim sắp chiếu"
            onSeeAll={() =>
              router.navigate({
                pathname: "/(tabs)/movies",
                params: { status: "UPCOMING" },
              })
            }
          />
          <MovieRow movies={upcomingMovies} onPressMovie={openMovie} />
        </View>
      ) : null}

      {PROMOTIONS.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Khuyến mãi & thành viên" />
          <PromoRow promos={PROMOTIONS} />
        </View>
      ) : null}

      {NEWS.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Tin tức" />
          <NewsRow items={NEWS} />
        </View>
      ) : null}
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
    >
      <Ionicons name={icon} size={22} color={colors.primaryLight} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xl * 2, gap: spacing.xl },
  greeting: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    paddingHorizontal: spacing.lg,
  },
  quick: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.md,
  },
  action: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  actionPressed: { borderColor: colors.primary },
  actionText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  section: {},
});
