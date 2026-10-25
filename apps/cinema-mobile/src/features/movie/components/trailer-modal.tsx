import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/theme/colors";
import type { TrailerSource } from "../utils/trailer";
import { TrailerPlayer } from "./trailer-player";

interface Props {
  visible: boolean;
  title: string;
  source: TrailerSource | null;
  onClose: () => void;
}

/** Player chỉ được mount khi modal mở, đóng là dừng và giải phóng video. */
export function TrailerModal({ visible, title, source, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            Trailer: {title}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityLabel="Đóng trailer"
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.stage}>
          {visible && source ? <TrailerPlayer source={source} /> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "800" },
  stage: { backgroundColor: "#000" },
});
