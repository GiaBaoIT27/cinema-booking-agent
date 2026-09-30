/**
 * Tiện ích xử lý ngày giờ theo timezone Asia/Ho_Chi_Minh (UTC+7).
 * Không import moment/dayjs — dùng Intl API có sẵn của Node.js.
 */

const VN_TZ = 'Asia/Ho_Chi_Minh';

/**
 * Trả về ngày hiện tại tại Việt Nam dưới dạng Date object (midnight UTC+7).
 */
export function nowInVietnam(): Date {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: VN_TZ }),
  );
}

/**
 * Format Date thành chuỗi ISO 8601 theo timezone Việt Nam.
 * @example '2024-07-20T20:30:00+07:00'
 */
export function toVietnamIsoString(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: VN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(' ', 'T')
    .concat('+07:00');
}

/**
 * Trả về chuỗi ngày dạng 'YYYY-MM-DD' theo giờ Việt Nam.
 * Dùng để group suất chiếu theo ngày.
 */
export function toVietnamDateString(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: VN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Kiểm tra xem một ngày có phải cuối tuần (Thứ 7, Chủ nhật) theo giờ Việt Nam không.
 * Dùng trong price-calculation.service để tra bảng DayType.
 */
export function isWeekendInVietnam(date: Date): boolean {
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: VN_TZ,
    weekday: 'short',
  }).format(date);
  return day === 'Sat' || day === 'Sun';
}

/**
 * Cộng thêm số giây vào một Date và trả về Date mới.
 * Dùng để tính expiresAt khi hold ghế.
 */
export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

/**
 * Cộng thêm số phút vào một Date và trả về Date mới.
 */
export function addMinutes(date: Date, minutes: number): Date {
  return addSeconds(date, minutes * 60);
}
