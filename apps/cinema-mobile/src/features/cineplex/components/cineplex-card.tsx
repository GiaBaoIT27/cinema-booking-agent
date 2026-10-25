import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/theme/colors";
import type { CineplexListItem } from "../types/cineplex.types";
import { formatDistance } from "../utils/cineplex.utils";
import { CineplexStatusBadge } from "./cineplex-status-badge";

interface Props {
  cineplex: CineplexListItem;
  onPress: () => void;
}

export function CineplexCard({ cineplex, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{cineplex.name}</Text>
        {cineplex.distanceKm !== null && (
          <View style={styles.distance}>
            <Text style={styles.distanceText}>
              {formatDistance(cineplex.distanceKm)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.row}>
        <Ionicons name="location-outline" size={15} color={colors.muted} />
        <Text style={styles.address}>{cineplex.address}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.row}>
          <Ionicons name="call-outline" size={14} color={colors.muted} />
          <Text style={styles.phone}>
            {cineplex.phoneNumber ?? "Chưa có số điện thoại"}
          </Text>
        </View>
        <CineplexStatusBadge status={cineplex.status} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pressed: { backgroundColor: colors.cardHover },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  name: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "700" },
  distance: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  distanceText: { color: colors.primaryLight, fontSize: 11, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  address: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 18 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  phone: { color: colors.muted, fontSize: 13 },
});
