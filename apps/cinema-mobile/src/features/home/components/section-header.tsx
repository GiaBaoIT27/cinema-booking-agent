import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/theme/colors";

export function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.link}>Xem tất cả</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
  link: { color: colors.primaryLight, fontSize: 13, fontWeight: "700" },
});
