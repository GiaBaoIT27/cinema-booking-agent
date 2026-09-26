// Decorator dùng để khai báo thông báo (message) tùy chỉnh cho response thành công.
// TransformInterceptor sẽ đọc metadata này (ưu tiên cao nhất) để điền vào trường `message`.
import { SetMetadata } from '@nestjs/common';

export const API_SUCCESS_MESSAGE_KEY = 'apiSuccessMessage';
export const ApiSuccessMessage = (message: string) =>
  SetMetadata(API_SUCCESS_MESSAGE_KEY, message);
