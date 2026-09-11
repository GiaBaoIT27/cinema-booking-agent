import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { User } from '../users/entities/user.entity.js';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserStatus } from '../users/enums/user-status.enum.js';
import { MembershipTier } from '../users/enums/membership-tier.enum.js';
import { TokenRevocationService } from './services/token-revocation.service.js';
import { AUTH_REDIS_KEYS } from './constants/auth-redis.constant.js';
import { RedisService } from '#src/common/redis/redis.service.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly tokenRevocationService: TokenRevocationService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { fullName, email, phoneNumber, password, dateOfBirth } = registerDto;

    // 1. Kiểm tra duy nhất Email (Uniqueness Checks)
    const emailExists = await this.userRepository.findOne({ where: { email } });
    if (emailExists) {
      throw new ConflictException({
        message: 'Địa chỉ email này đã được đăng ký sử dụng trong hệ thống.',
        errorCode: 'EMAIL_ALREADY_EXISTS',
      });
    }

    // 2. Kiểm tra duy nhất Số điện thoại
    const phoneExists = await this.userRepository.findOne({
      where: { phoneNumber },
    });
    if (phoneExists) {
      throw new ConflictException({
        message: 'Số điện thoại này đã được đăng ký sử dụng trong hệ thống.',
        errorCode: 'PHONE_ALREADY_EXISTS',
      });
    }

    // 3. Thực hiện Hash mật khẩu bằng Bcrypt với Cost Factor 12
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Khởi tạo bản ghi và thực hiện ghi vào DB (Đảm bảo bỏ password_hash khỏi output trả về)
    const newUser = this.userRepository.create({
      fullName,
      email,
      phoneNumber,
      passwordHash: hashedPassword,
      dateOfBirth: new Date(dateOfBirth),
      status: UserStatus.ACTIVE,
      membershipTier: MembershipTier.MEMBER,
      loyaltyPoints: 0,
    });

    const savedUser = await this.userRepository.save(newUser);

    // 5. Trả về cấu trúc dữ liệu sạch (Đã ẩn password_hash)
    return {
      id: savedUser.id,
      fullName: savedUser.fullName,
      email: savedUser.email,
      phoneNumber: savedUser.phoneNumber,
      dateOfBirth: savedUser.dateOfBirth,
      membershipTier: savedUser.membershipTier,
      loyaltyPoints: savedUser.loyaltyPoints,
      status: savedUser.status,
      createdAt: savedUser.createdAt,
    };
  }

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // 1. Tìm kiếm User theo email hoặc phone_number
    const user = await this.userRepository.findOne({
      where: [{ email: username }, { phoneNumber: username }],
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        passwordHash: true,
        status: true,
        membershipTier: true,
      },
    });

    // 2. Kiểm tra Tồn tại & Khớp Mật khẩu (Chống User Enumeration Attack)
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException({
        message: 'Tài khoản hoặc mật khẩu không chính xác.',
        errorCode: 'INVALID_CREDENTIALS', // Trả về mã lỗi chung như bạn đặc tả
      });
    }

    // 3. Kiểm tra Trạng thái Tài khoản (Account Status Gatekeeper)
    if (user.status === 'BLOCKED') {
      throw new ForbiddenException({
        message:
          'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
        errorCode: 'ACCOUNT_BLOCKED',
      });
    }

    if (user.status === 'UNVERIFIED') {
      throw new ForbiddenException({
        message: 'Tài khoản chưa được kích hoạt. Vui lòng xác thực OTP.',
        errorCode: 'ACCOUNT_UNVERIFIED',
      });
    }

    // 4. Trích xuất Roles & Permissions (Giả định load dữ liệu quan hệ từ RbacModule)
    const roles = ['CUSTOMER']; // Thường lấy từ user.roles
    const permissions = ['movies:read']; // Thường lấy từ logic kết nối Role-Permission

    // Tạo jti (JWT ID) duy nhất cho mỗi Access Token để hỗ trợ Blacklist khi Logout
    const accessJti = randomUUID();
    const refreshJti = randomUUID();
    const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 ngày

    // 5. Khởi tạo Cặp Tokens
    const payload = {
      sub: user.id,
      email: user.email,
      roles: roles,
      permissions: permissions,
      // cineplexId: user.cineplexId
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
        roles: roles,
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
      throw new UnauthorizedException({
        errorCode: 'INVALID_TOKEN',
        message: 'Token không hợp lệ hoặc đã hết hạn.',
      });
    }
  }

  // Khóa tài khoản và thu hồi TẤT CẢ Token hiện có của User
  async blockUser(userId: string): Promise<void> {
    await this.userRepository.update(userId, { status: UserStatus.BLOCKED });
    await this.tokenRevocationService.revokeAllUserTokens(userId);
  }
}
