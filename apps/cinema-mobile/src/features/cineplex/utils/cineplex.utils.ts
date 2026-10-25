import { Platform } from "react-native";

const pad = (n: number) => String(n).padStart(2, "0");

/** Date -> YYYY-MM-DD theo giờ địa phương (không dùng toISOString để tránh lệch múi giờ). */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Hôm nay + (count - 1) ngày tiếp theo. */
export function getNextDays(count = 7, from = new Date()) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    return {
      key: toDateKey(d),
      weekday:
        i === 0
          ? "Hôm nay"
          : d.toLocaleDateString("vi-VN", { weekday: "short" }),
      label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`,
    };
  });
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** iOS mở Apple Maps, nền tảng khác mở Google Maps. */
export function buildDirectionsUrl(lat: number, lng: number): string {
  return Platform.OS === "ios"
    ? `http://maps.apple.com/?daddr=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
