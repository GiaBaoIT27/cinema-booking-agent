import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AgentWidgetView } from "@/features/ai-agent/components/agent-widgets";
import { ChatText } from "@/features/ai-agent/components/chat-text";
import { useAgentChat } from "@/features/ai-agent/hooks/use-agent-chat";
import type { ChatMessage } from "@/features/ai-agent/types/agent.types";
import { colors, radius, spacing } from "@/theme/colors";

const SUGGESTED_PROMPTS = [
  "Hôm nay có phim gì đang chiếu?",
  "Gợi ý cho mình phim hành động đang chiếu",
  "Mình muốn đặt 2 vé xem tối nay",
];

export default function AgentScreen() {
  const insets = useSafeAreaInsets();
  const { messages, isStreaming, send, stop, reset } = useAgentChat();
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Tự cuộn xuống tin mới nhất (cả khi chữ đang được stream về).
  useEffect(() => {
    const t = setTimeout(
      () => listRef.current?.scrollToEnd({ animated: true }),
      50,
    );
    return () => clearTimeout(t);
  }, [messages]);

  const submit = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    void send(text);
  };

  const onlyGreeting = messages.length === 1 && messages[0].id === "greeting";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 44 : 0}
    >
      <Stack.Screen
        options={{
          title: "Trợ lý AI",
          headerRight: () => (
            <Pressable
              onPress={reset}
              hitSlop={10}
              accessibilityLabel="Cuộc trò chuyện mới"
            >
              <Ionicons name="refresh-outline" size={22} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        renderItem={({ item }) => (
          <Bubble message={item} onSend={send} disabled={isStreaming} />
        )}
        ListFooterComponent={
          onlyGreeting ? (
            <View style={styles.suggestions}>
              {SUGGESTED_PROMPTS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => void send(p)}
                  style={styles.suggestion}
                >
                  <Text style={styles.suggestionText}>{p}</Text>
                </Pressable>
              ))}
            </View>
          ) : null
        }
      />

      <View
        style={[
          styles.composer,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={colors.subtle}
          style={styles.input}
          multiline
          maxLength={1000}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={submit}
        />
        {isStreaming ? (
          <Pressable
            onPress={stop}
            style={[styles.sendBtn, styles.stopBtn]}
            accessibilityLabel="Dừng"
          >
            <Ionicons name="square" size={16} color={colors.text} />
          </Pressable>
        ) : (
          <Pressable
            onPress={submit}
            disabled={input.trim().length === 0}
            style={[
              styles.sendBtn,
              input.trim().length === 0 && styles.sendOff,
            ]}
            accessibilityLabel="Gửi"
          >
            <Ionicons name="send" size={16} color={colors.text} />
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({
  message,
  onSend,
  disabled,
}: {
  message: ChatMessage;
  onSend: (t: string) => void;
  disabled: boolean;
}) {
  const user = message.sender === "user";
  return (
    <View style={[styles.msgRow, user && styles.msgRowUser]}>
      <View
        style={[styles.avatar, user ? styles.avatarUser : styles.avatarAgent]}
      >
        <Ionicons
          name={user ? "person" : "sparkles"}
          size={14}
          color={colors.text}
        />
      </View>
      <View style={[styles.bubbleCol, user && styles.bubbleColUser]}>
        {message.text ? (
          <View
            style={[
              styles.bubble,
              user ? styles.bubbleUser : styles.bubbleAgent,
            ]}
          >
            <ChatText
              text={message.text}
              color={user ? colors.text : "#E5E7EB"}
            />
          </View>
        ) : null}
        {message.status ? (
          <Text style={styles.status}>{message.status}</Text>
        ) : null}
        {message.widgets.map((w, i) => (
          <AgentWidgetView
            key={i}
            widget={w}
            onSend={onSend}
            disabled={disabled}
          />
        ))}
        {message.error ? (
          <Text style={styles.error}>{message.error}</Text>
        ) : null}
        <Text style={styles.time}>{message.timestamp}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.lg },
  msgRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  msgRowUser: { flexDirection: "row-reverse" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarUser: { backgroundColor: "#374151" },
  avatarAgent: { backgroundColor: colors.primary },
  bubbleCol: { flexShrink: 1, maxWidth: "86%" },
  bubbleColUser: { alignItems: "flex-end" },
  bubble: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16 },
  bubbleUser: { backgroundColor: colors.primary, borderTopRightRadius: 4 },
  bubbleAgent: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 4,
  },
  status: {
    color: colors.muted,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
  },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
  time: { color: colors.subtle, fontSize: 10, marginTop: 4 },
  suggestions: { gap: spacing.sm, marginTop: spacing.md },
  suggestion: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  suggestionText: { color: colors.text, fontSize: 13 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  stopBtn: { backgroundColor: "#374151" },
  sendOff: { opacity: 0.4 },
});
