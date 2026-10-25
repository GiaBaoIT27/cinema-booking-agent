import { StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { colors, radius, spacing } from "@/theme/colors";

/** QR vẽ ngay trên máy (không gửi mã vé ra dịch vụ ngoài). */
export function TicketQr({
  code,
  seatLabel,
}: {
  code: string;
  seatLabel?: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.qrBox}>
        <QRCode
          value={code}
          size={190}
          backgroundColor="#FFFFFF"
          color="#000000"
        />
      </View>
      {seatLabel ? <Text style={styles.seat}>Ghế {seatLabel}</Text> : null}
      <Text style={styles.code} selectable>
        {code}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  qrBox: { padding: 10, backgroundColor: "#FFFFFF", borderRadius: radius.md },
  seat: { color: colors.text, fontSize: 16, fontWeight: "800" },
  code: { color: colors.muted, fontSize: 12, letterSpacing: 1 },
});
