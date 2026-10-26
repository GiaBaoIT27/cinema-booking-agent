import { FlatList, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { colors, radius, spacing } from "@/theme/colors";
import type { PromoItem } from "../data/promotions";

export function PromoRow({ promos }: { promos: PromoItem[] }) {
  return (
    <FlatList
      data={promos}
      keyExtractor={(p) => p.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" transition={150} />
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.desc} numberOfLines={2}>
              {item.desc}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, gap: spacing.md },
  card: {
    width: 240,
    overflow: "hidden",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  image: { width: "100%", aspectRatio: 240 / 201 },
  body: { padding: spacing.md, gap: 4 },
  title: { color: colors.text, fontSize: 14, fontWeight: "800" },
  desc: { color: colors.muted, fontSize: 12, lineHeight: 16 },
});
