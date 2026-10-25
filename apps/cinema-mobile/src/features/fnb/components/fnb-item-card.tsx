import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/theme/colors";
import type { FnbItem } from "../types/fnb.types";
import { fnbPrice } from "../utils/fnb-adapter";

interface Props {
  item: FnbItem;
  quantity: number;
  onChange: (item: FnbItem, delta: number) => void;
}

export const FnbItemCard = memo(function FnbItemCard({
  item,
  quantity,
  onChange,
}: Props) {
  return (
    <View style={[styles.card, quantity > 0 && styles.cardActive]}>
      <View style={styles.imageBox}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            contentFit="contain"
            transition={150}
          />
        ) : (
          <Ionicons name="fast-food-outline" size={32} color={colors.subtle} />
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          {item.description ? (
            <Text style={styles.desc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <Text style={styles.price}>
            {fnbPrice(item).toLocaleString("vi-VN")} đ
          </Text>
        </View>

        <View style={styles.stepper}>
          <Pressable
            onPress={() => onChange(item, -1)}
            disabled={quantity === 0}
            hitSlop={6}
            accessibilityLabel={`Giảm ${item.name}`}
            style={[styles.btn, quantity === 0 && styles.btnOff]}
          >
            <Ionicons name="remove" size={16} color={colors.text} />
          </Pressable>
          <Text style={styles.qty}>{quantity}</Text>
          <Pressable
            onPress={() => onChange(item, 1)}
            hitSlop={6}
            accessibilityLabel={`Thêm ${item.name}`}
            style={[styles.btn, styles.btnPlus]}
          >
            <Ionicons name="add" size={16} color={colors.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cardActive: { borderColor: colors.primary },
  imageBox: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0F19",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  info: { flex: 1, justifyContent: "space-between", gap: 6 },
  texts: { gap: 3 },
  name: { color: colors.text, fontSize: 14, fontWeight: "800" },
  desc: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  price: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },
  btn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.border,
  },
  btnPlus: { backgroundColor: colors.primary },
  btnOff: { opacity: 0.3 },
  qty: {
    minWidth: 20,
    textAlign: "center",
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
});
