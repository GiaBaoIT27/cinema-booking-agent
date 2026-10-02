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
      id: String(payload.sub),
      userId: String(payload.sub),
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      cineplexId: payload.cineplexId || null,
    };
  }
}
