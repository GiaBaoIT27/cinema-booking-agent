//Xác thực Token JWT. Nếu API được gắn @Public(), Guard sẽ cho qua. Nếu không truyền Token hoặc Token hết hạn, Guard ném lỗi và tự động tích hợp mã errorCode nội bộ để Filter bóc tách.
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 1. Kiểm tra xem API này có được gắn decorator @Public() hay không
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 2. Nếu không Public, kích hoạt xác thực JWT mặc định của Passport
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // 3. Xử lý custom thông báo lỗi tường minh để gửi về Exception Filter
    if (err || !user) {
      throw new UnauthorizedException({
        message: 'Phiên làm việc đã hết hạn hoặc mã xác thực không hợp lệ.',
        errorCode: 'UNAUTHORIZED_ACCESS',
      });
    }
    return user;
  }
}
