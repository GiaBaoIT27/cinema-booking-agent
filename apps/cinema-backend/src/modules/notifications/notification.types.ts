export enum NotificationChannelType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}

export enum NotificationType {
  TICKET_CONFIRMATION = 'TICKET_CONFIRMATION',
  WELCOME = 'WELCOME',
  BOOKING_EXPIRED = 'BOOKING_EXPIRED',
}

export interface NotificationRecipient {
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
}

/** Mã QR sẽ được channel email render thành ảnh PNG và đính kèm inline (cid). */
export interface InlineQrCode {
  cid: string;
  data: string;
}

/**
 * Nội dung đã render xong. Template chạy lúc enqueue nên job trong Redis tự chứa
 * đủ dữ liệu; processor chỉ việc gửi, không cần biết template hay event nào.
 */
export interface NotificationContent {
  subject: string;
  /** Bản plain-text cho email (fallback khi client không hiển thị HTML). */
  text: string;
  html?: string;
  /** Nội dung ngắn cho SMS / push. */
  shortText: string;
  inlineQrCodes?: InlineQrCode[];
}

/** Dữ liệu của 1 job. Mỗi job = 1 kênh, để 1 kênh lỗi không kéo kênh khác retry theo. */
export interface NotificationJobData {
  type: NotificationType;
  channel: NotificationChannelType;
  recipient: NotificationRecipient;
  content: NotificationContent;
}

/** Strategy: mỗi kênh gửi tin implement interface này. */
export interface INotificationChannel {
  readonly type: NotificationChannelType;
  /** Kênh có đang bật theo cấu hình không. */
  isEnabled(): boolean;
  /** Người nhận có thông tin liên lạc cần thiết cho kênh này không. */
  canSend(recipient: NotificationRecipient): boolean;
  send(recipient: NotificationRecipient, content: NotificationContent): Promise<void>;
}

export const NOTIFICATION_CHANNELS = Symbol('NOTIFICATION_CHANNELS');
