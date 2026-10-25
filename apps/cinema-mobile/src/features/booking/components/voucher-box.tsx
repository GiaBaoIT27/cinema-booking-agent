import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, radius, spacing } from "@/theme/colors";

interface Props {
  appliedCode?: string;
  onApply: (code: string) => Promise<{ success: boolean; message: string }>;
  onRemove: () => void;
}

export function VoucherBox({ appliedCode, onApply, onRemove }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const apply = async () => {
    if (loading) return;
    setLoading(true);
    const res = await onApply(input);
    setLoading(false);
    setFeedback({ ok: res.success, text: res.message });
    if (res.success) setInput("");
  };

  if (appliedCode) {
    return (
      <View style={styles.applied}>
        <View style={styles.flex}>
          <Text style={styles.code}>{appliedCode}</Text>
          {feedback?.ok ? (
            <Text style={styles.ok}>{feedback.text}</Text>
          ) : (
            <Text style={styles.ok}>Đã áp dụng mã giảm giá</Text>
          )}
        </View>
        <Pressable
          onPress={() => {
            setFeedback(null);
            onRemove();
          }}
          hitSlop={8}
        >
          <Text style={styles.remove}>Bỏ mã</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Nhập mã giảm giá"
          placeholderTextColor={colors.subtle}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={() => void apply()}
        />
        <Pressable
          onPress={() => void apply()}
          disabled={loading || input.trim().length === 0}
          style={[
            styles.btn,
            (loading || input.trim().length === 0) && styles.btnOff,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.btnText}>Áp dụng</Text>
          )}
        </Pressable>
      </View>
      {feedback && !feedback.ok ? (
        <Text style={styles.error}>{feedback.text}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: spacing.sm },
  row: { flexDirection: "row", gap: spacing.sm },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 14,
  },
  btn: {
    minWidth: 92,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  btnOff: { opacity: 0.5 },
  btnText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  error: { color: colors.danger, fontSize: 12 },
  applied: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.4)",
    backgroundColor: "rgba(52,211,153,0.08)",
  },
  code: { color: colors.text, fontWeight: "800", fontSize: 14 },
  ok: { color: colors.success, fontSize: 12, marginTop: 2 },
  remove: { color: colors.danger, fontWeight: "700", fontSize: 13 },
});
