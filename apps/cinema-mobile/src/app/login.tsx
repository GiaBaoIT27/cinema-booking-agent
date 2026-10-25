import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/shared/ui/button";
import { colors, radius, spacing } from "@/theme/colors";

/** Backend yêu cầu mật khẩu tối thiểu 8 ký tự (LoginDto). */
const MIN_PASSWORD_LENGTH = 8;

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const status = useAuthStore((s) => s.status);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Đã đăng nhập rồi thì không hiện form đăng nhập nữa.
  // Đây cũng là nơi điều hướng duy nhất sau khi đăng nhập thành công,
  // tránh điều hướng 2 lần (guard + submit).
  useEffect(() => {
    if (status === "authenticated") router.replace("/(tabs)");
  }, [status, router]);

  const trimmed = username.trim();
  const canSubmit = trimmed.length > 0 && password.length > 0;

  const submit = async () => {
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      // Không tự điều hướng ở đây: `status` đổi sang "authenticated" sẽ kích hoạt
      // useEffect redirect ở trên (một nguồn điều hướng duy nhất).
      await login({ username: trimmed, password });
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        // Backend trả `errors: [{ field, message }]` cho lỗi validation (422).
        const next: Record<string, string> = {};
        for (const item of e.errors ?? []) {
          if (item.field && !next[item.field]) next[item.field] = item.message;
        }
        setFieldErrors(next);
      } else {
        setError(e instanceof Error ? e.message : "Đăng nhập thất bại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.title}>Đăng nhập</Text>
          <Text style={styles.sub}>
            Dùng email hoặc số điện thoại đã đăng ký.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email hoặc số điện thoại</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="vidu@example.com"
              placeholderTextColor={colors.subtle}
              style={[styles.input, fieldErrors.username ? styles.inputError : null]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              returnKeyType="next"
            />
            {fieldErrors.username ? (
              <Text style={styles.error}>{fieldErrors.username}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mật khẩu</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Tối thiểu 8 ký tự"
              placeholderTextColor={colors.subtle}
              style={[styles.input, fieldErrors.password ? styles.inputError : null]}
              secureTextEntry
              textContentType="password"
              onSubmitEditing={() => canSubmit && void submit()}
            />
            {fieldErrors.password ? (
              <Text style={styles.error}>{fieldErrors.password}</Text>
            ) : password.length > 0 && password.length < MIN_PASSWORD_LENGTH ? (
              <Text style={styles.hint}>
                Mật khẩu phải có ít nhất {MIN_PASSWORD_LENGTH} ký tự.
              </Text>
            ) : null}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title="Đăng nhập"
            onPress={() => void submit()}
            loading={loading}
            disabled={!canSubmit}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
  form: { gap: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  sub: { color: colors.muted, fontSize: 13, marginBottom: spacing.sm },
  field: { gap: spacing.xs },
  label: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  input: {
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 15,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 13 },
  hint: { color: colors.subtle, fontSize: 12 },
});
