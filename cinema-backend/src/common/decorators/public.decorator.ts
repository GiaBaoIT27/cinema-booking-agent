//Decorator này dùng để đánh dấu các API công khai (như Login, Register) giúp JwtAuthGuard biết và tự động bỏ qua kiểm tra Token.
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
