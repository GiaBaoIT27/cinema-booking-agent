import { StyleSheet, Text, View } from "react-native";

/** Hiển thị **in đậm** và gạch đầu dòng mà mô hình hay trả về, không cần thư viện markdown. */
function Inline({ text, style }: { text: string; style: object }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
          <Text key={i} style={styles.bold}>
            {part.slice(2, -2)}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

export function ChatText({ text, color }: { text: string; color: string }) {
  const base = { color, fontSize: 14, lineHeight: 20 };
  return (
    <View style={styles.wrap}>
      {text.split("\n").map((line, i) => {
        const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
        if (bullet) {
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={base}>•</Text>
              <View style={styles.flex}>
                <Inline text={bullet[1]} style={base} />
              </View>
            </View>
          );
        }
        return line.trim() === "" ? (
          <View key={i} style={styles.gap} />
        ) : (
          <Inline key={i} text={line} style={base} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  flex: { flex: 1 },
  bold: { fontWeight: "800", color: "#FFFFFF" },
  bulletRow: { flexDirection: "row", gap: 6 },
  gap: { height: 4 },
});
