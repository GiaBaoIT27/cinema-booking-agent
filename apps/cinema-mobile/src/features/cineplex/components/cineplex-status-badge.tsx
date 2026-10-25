import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import {
  CINEPLEX_STATUS_LABEL,
  type CineplexStatus,
} from "../types/cineplex.types";

const TONE: Record<CineplexStatus, { bg: string; fg: string }> = {
  ACTIVE: { bg: "rgba(52,211,153,0.15)", fg: colors.success },
  MAINTENANCE: { bg: "rgba(251,191,36,0.15)", fg: colors.warning },
  CLOSED: { bg: "rgba(251,113,133,0.15)", fg: colors.danger },
};

export function CineplexStatusBadge({ status }: { status: CineplexStatus }) {
  const tone = TONE[status];
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, { color: tone.fg }]}>
        {CINEPLEX_STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  text: { fontSize: 11, fontWeight: "700" },
});
