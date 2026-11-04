import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from '../../application/services/auth.service.js';
import { LoginDto } from '../../application/dto/login.dto.js';
import { RegisterDto } from '../../application/dto/register.dto.js';
import { Throttle } from '@nestjs/throttler';
import { Public } from '#src/common/decorators/public.decorator.js';

/** Chống dò mật khẩu / tạo tài khoản hàng loạt: 10 lần mỗi phút mỗi IP. */
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
