import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/theme/colors";

/**
 * Lối vào trợ lý AI: biểu tượng nhấp nháy nhẹ bên trái, chữ ở giữa, mũi tên bên phải.
 * Đặt dưới HeroCarousel ở trang chủ.
 */
export function AgentBanner({ onPress }: { onPress: () => void }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Mở trợ lý AI"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
        <View style={styles.icon}>
          <Ionicons name="sparkles" size={20} color={colors.text} />
        </View>
      </View>

      <View style={styles.texts}>
        <Text style={styles.title}>Bạn cần hỗ trợ gì?</Text>
        <Text style={styles.sub}>Trợ lý AI giúp tìm phim và đặt vé</Text>
      </View>

      <Ionicons name="arrow-forward" size={20} color={colors.primaryLight} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.45)",
    backgroundColor: colors.card,
  },
  pressed: { opacity: 0.85 },
  iconWrap: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  texts: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 15, fontWeight: "800" },
  sub: { color: colors.muted, fontSize: 12 },
});
