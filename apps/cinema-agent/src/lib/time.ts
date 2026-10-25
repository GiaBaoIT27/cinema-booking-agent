const TZ = "Asia/Ho_Chi_Minh";

/** Ngày YYYY-MM-DD theo giờ Việt Nam */
export function vnDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Giờ HH:mm theo giờ Việt Nam; trả nguyên chuỗi nếu không đọc được */
export function vnTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

/** Thứ trong tuần bằng tiếng Việt theo giờ Việt Nam */
export function vnWeekday(d: Date = new Date()): string {
  const idx = new Date(`${vnDate(d)}T00:00:00Z`).getUTCDay();
  return ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"][idx];
}
