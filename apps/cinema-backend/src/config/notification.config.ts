import { registerAs } from '@nestjs/config';

export default registerAs('notification', () => ({
  brandName: process.env.APP_BRAND_NAME ?? 'Cinema',
  webBaseUrl: process.env.WEB_BASE_URL ?? 'http://localhost:3001',
  smsEnabled: process.env.NOTIFICATION_SMS_ENABLED === 'true',
  pushEnabled: process.env.NOTIFICATION_PUSH_ENABLED === 'true',
}));
