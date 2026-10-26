import { FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { colors, radius, spacing } from "@/theme/colors";
import type { NewsItem } from "../data/news";

export function NewsRow({ items }: { items: NewsItem[] }) {
  return (
    <FlatList
      data={items}
      keyExtractor={(n) => n.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Pressable
          disabled={!item.url}
          onPress={() => item.url && void Linking.openURL(item.url)}
          style={styles.card}
        >
          {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" /> : <View style={styles.image} />}
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            {item.summary ? (
              <Text style={styles.desc} numberOfLines={2}>
                {item.summary}
              </Text>
            ) : null}
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, gap: spacing.md },
  card: { width: 260, overflow: "hidden", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  image: { width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.border },
  body: { padding: spacing.md, gap: 4 },
  title: { color: colors.text, fontSize: 14, fontWeight: "800" },
  desc: { color: colors.muted, fontSize: 12, lineHeight: 16 },
});
