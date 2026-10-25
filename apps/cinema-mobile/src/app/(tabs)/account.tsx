import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/shared/ui/button";
import { LoadingView } from "@/shared/ui/state-views";
import { colors, radius, spacing } from "@/theme/colors";

/** Nhãn hiển thị cho hạng thành viên (khớp enum MembershipTier của backend). */
const TIER_LABELS: Record<string, string> = {
  MEMBER: "Thành viên",
  VIP: "VIP",
  VVIP: "VVIP",
};

export default function AccountScreen() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const loadingProfile = useAuthStore((s) => s.loadingProfile);
  const profileError = useAuthStore((s) => s.profileError);
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const logout = useAuthStore((s) => s.logout);

  // Nạp lại hồ sơ khi mở màn hình (hồ sơ lấy từ `GET /users/me`).
  useEffect(() => {
    if (status === "authenticated" && !user) {
      void loadProfile();
    }
  }, [status, user, loadProfile]);

  if (status === "loading") return <LoadingView />;

  if (status === "unauthenticated") {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Ionicons name="person-circle-outline" size={64} color={colors.subtle} />
          <Text style={styles.title}>Bạn chưa đăng nhập</Text>
          <Text style={styles.sub}>Đăng nhập để đặt vé và xem vé của bạn.</Text>
          <Button title="Đăng nhập" onPress={() => router.push("/login")} style={styles.full} />
        </View>
      </View>
    );
  }

  const displayName = user?.fullName || "Tài khoản của bạn";
  const tierLabel = user ? TIER_LABELS[user.membershipTier] ?? user.membershipTier : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Ionicons name="person-circle" size={64} color={colors.primary} />
        <Text style={styles.title}>{displayName}</Text>
        {tierLabel ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{tierLabel}</Text>
          </View>
        ) : null}

        {loadingProfile ? (
          <Text style={styles.sub}>Đang tải hồ sơ...</Text>
        ) : (
          <View style={styles.info}>
            {user?.email ? (
              <InfoRow icon="mail-outline" label="Email" value={user.email} />
            ) : null}
            {user?.phoneNumber ? (
              <InfoRow icon="call-outline" label="Điện thoại" value={user.phoneNumber} />
            ) : null}
            {typeof user?.loyaltyPoints === "number" && user.loyaltyPoints > 0 ? (
              <InfoRow
                icon="star-outline"
                label="Điểm thưởng"
                value={`${user.loyaltyPoints} điểm`}
              />
            ) : null}
          </View>
        )}

        {profileError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{profileError}</Text>
            <Button
              title="Thử lại"
              variant="outline"
              onPress={() => void loadProfile()}
              style={styles.retry}
            />
          </View>
        ) : null}

        <Button
          title="Đăng xuất"
          variant="outline"
          onPress={() => void logout()}
          style={styles.full}
        />
      </View>
    </ScrollView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  card: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: spacing.sm },
  sub: { color: colors.muted, fontSize: 13, textAlign: "center" },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: "rgba(239,68,68,0.15)",
  },
  badgeText: { color: colors.primaryLight, fontSize: 12, fontWeight: "700" },
  info: { alignSelf: "stretch", gap: spacing.sm, marginTop: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowLabel: { color: colors.muted, fontSize: 13, width: 80 },
  rowValue: { color: colors.text, fontSize: 13, flex: 1 },
  errorBox: {
    alignSelf: "stretch",
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(251,113,133,0.3)",
    backgroundColor: "rgba(251,113,133,0.1)",
    gap: spacing.sm,
  },
  errorText: { color: colors.danger, fontSize: 13 },
  retry: { alignSelf: "flex-start" },
  full: { alignSelf: "stretch", marginTop: spacing.lg },
});
