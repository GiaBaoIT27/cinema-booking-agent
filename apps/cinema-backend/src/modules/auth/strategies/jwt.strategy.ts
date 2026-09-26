//Bóc tách JWT từ Header Authorization (Bearer). Phần quan trọng nhất là trích xuất mảng permissions từ payload để nạp vào đối tượng user cho PermissionsGuard kiểm tra.
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Thêm tham số thứ hai cho hàm get để chỉ định giá trị bắt buộc (infer kiểu string chính xác)
      secretOrKey: configService.get<string>('jwt.accessSecret', {
        infer: true,
      }) as string,
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException({
        message: 'Mã xác thực không hợp lệ hoặc đã hết hạn.',
        errorCode: 'UNAUTHORIZED_ACCESS',
      });
    }

    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };
  }
}
