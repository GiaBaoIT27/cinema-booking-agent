import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CineplexShowtimes } from "@/features/cineplex/components/cineplex-showtimes";
import { CineplexStatusBadge } from "@/features/cineplex/components/cineplex-status-badge";
import { useCineplexDetail } from "@/features/cineplex/hooks/use-cineplex-detail";
import { buildDirectionsUrl } from "@/features/cineplex/utils/cineplex.utils";
import { Button } from "@/shared/ui/button";
import { ErrorView, LoadingView } from "@/shared/ui/state-views";
import { colors, spacing } from "@/theme/colors";

export default function CineplexDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cineplexId = Number(id);
  const { data: cineplex, isPending, isError, error, refetch } = useCineplexDetail(cineplexId);

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorView message={error.message} onRetry={() => refetch()} />;

  const fullAddress = [cineplex.address, cineplex.ward?.name, cineplex.province?.name]
    .filter(Boolean)
    .join(", ");
  const hasCoords = cineplex.latitude !== null && cineplex.longitude !== null;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: cineplex.name }} />

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{cineplex.name}</Text>
          <CineplexStatusBadge status={cineplex.status} />
        </View>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={16} color={colors.muted} />
          <Text style={styles.address}>{fullAddress}</Text>
        </View>

        <View style={styles.actions}>
          {cineplex.phoneNumber ? (
            <Button
              title="Gọi rạp"
              variant="outline"
              onPress={() => void Linking.openURL(`tel:${cineplex.phoneNumber}`)}
              style={styles.action}
            />
          ) : null}
          {hasCoords ? (
            <Button
              title="Chỉ đường"
              onPress={() =>
                void Linking.openURL(
                  buildDirectionsUrl(cineplex.latitude as number, cineplex.longitude as number),
                )
              }
              style={styles.action}
            />
          ) : null}
        </View>
      </View>

      <CineplexShowtimes
        cineplexId={cineplex.id}
        onSelectShowtime={(s) =>
          router.push({
            pathname: "/booking/[showtimeId]",
            params: { showtimeId: String(s.showtimeId) },
          })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl },
  header: { gap: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  address: { flex: 1, color: colors.muted, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: "row", gap: spacing.md },
  action: { flex: 1 },
});
