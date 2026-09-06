import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  // Chặn đứng ứng dụng ngay lập tức nếu thiếu cấu hình bắt buộc ở môi trường Production
  if (
    process.env.NODE_ENV === 'production' &&
    (!accessSecret || !refreshSecret)
  ) {
    throw new Error(
      'Cấu hình mật mã JWT_ACCESS_SECRET và JWT_REFRESH_SECRET là bắt buộc tại Production!',
    );
  }

  return {
    accessSecret: accessSecret ?? 'default_access_secret_key_dev',
    accessTokenExpires: process.env.JWT_ACCESS_EXPIRES ?? '30m',
    refreshSecret: refreshSecret ?? 'default_refresh_secret_key_dev',
    refreshTokenExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  };
});
