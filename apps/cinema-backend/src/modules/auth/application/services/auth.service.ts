import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from '../dto/login.dto.js';
import { RegisterDto } from '../dto/register.dto.js';

import { UsersFacade } from '#modules/users/public-api/users.facade.js';
import { PERMISSION_RESOLVER } from '#src/common/interfaces/permission-resolver.interface.js';
import type { IPermissionResolver } from '#src/common/interfaces/permission-resolver.interface.js';

import { TokenRevocationService } from './token-revocation.service.js';
import { AUTH_REDIS_KEYS } from '../../infrastructure/auth-redis.constant.js';
import { RedisService } from '#src/core/redis/redis.service.js';
import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersFacade: UsersFacade,
    @Inject(PERMISSION_RESOLVER)
    private readonly permissionResolver: IPermissionResolver,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly tokenRevocationService: TokenRevocationService,
  ) {}

  async register(registerDto: RegisterDto) {
    return this.usersFacade.registerCustomer(registerDto);
  }

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // 1. Tìm kiếm User theo email hoặc phone_number (include passwordHash)
    let user = await this.usersFacade.findByEmail(username, true);
    if (!user) {
      user = await this.usersFacade.findByPhone(username, true);
    }

    // 2. Kiểm tra Tồn tại & Khớp Mật khẩu (Chống User Enumeration Attack)
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new BusinessException(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'Tài khoản hoặc mật khẩu không chính xác.',
      );
    }

    // 3. Kiểm tra Trạng thái Tài khoản (Account Status Gatekeeper)
    if (user.status === 'BLOCKED') {
      throw new BusinessException(
        ErrorCode.AUTH_ACCOUNT_BLOCKED,
        'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
      );
    }

    if (user.status === 'UNVERIFIED') {
      throw new BusinessException(
        ErrorCode.ACCOUNT_UNVERIFIED,
        'Tài khoản chưa được kích hoạt. Vui lòng xác thực OTP.',
      );
    }

    // Use RbacFacade to fetch permissions and cineplex scopes
    const permissions = await this.permissionResolver.getUserPermissions(
      user.id,
    );
    const roles = await this.permissionResolver.getUserRoles(user.id);
    const cineplexScopes = await this.permissionResolver.getUserCineplexScopes(
      user.id,
    );
    const cineplexId =
      cineplexScopes.length > 0 ? String(cineplexScopes[0]) : null;

    // Tạo jti (JWT ID) duy nhất cho mỗi Access Token để hỗ trợ Blacklist khi Logout
    const accessJti = randomUUID();
    const refreshJti = randomUUID();
    const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 ngày

    // 5. Khởi tạo Cặp Tokens
    const payload = {
      sub: user.id,
      email: user.email,
      roles: roles.length > 0 ? roles : ['CUSTOMER'],
      permissions: permissions,
      cineplexId: cineplexId,
      jti: accessJti,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn:
        this.configService.get<string>('jwt.accessTokenExpires') ||
        ('30m' as any),
    });

    // 2. Tạo Refresh Token (7 ngày)
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, jti: refreshJti },
      {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn:
          this.configService.get<string>('jwt.refreshTokenExpires') ||
          ('7d' as any),
      },
    );

    // 3. Lưu Refresh Token (hoặc JTI của nó) vào Redis
    const redisKey = AUTH_REDIS_KEYS.REFRESH_TOKEN(user.id, refreshJti);
    await this.redisService.set(redisKey, refreshToken, REFRESH_TTL_SECONDS);

    // 6. Trả về đúng cấu trúc data cần bọc
    return {
      tokenType: 'Bearer',
      accessToken,
      expiresIn: 1800, // 30 phút tính bằng giây
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        membershipTier: user.membershipTier,
        roles: roles.length > 0 ? roles : ['CUSTOMER'],
        permissions: permissions,
        cineplexId: cineplexId ? Number(cineplexId) : null,
      },
    };
  }

  // Đăng xuất 1 phiên làm việc bằng cách đưa JTI của Token vào Blacklist
  async logout(accessToken: string): Promise<void> {
    try {
      const decoded = await this.jwtService.verifyAsync(accessToken, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });

      if (decoded?.jti && decoded?.exp) {
        await this.tokenRevocationService.blacklistToken(
          decoded.jti,
          decoded.exp,
        );
      }
    } catch {
      throw new BusinessException(
        ErrorCode.AUTH_TOKEN_INVALID,
        'Token không hợp lệ hoặc đã hết hạn.',
      );
    }
  }
}
