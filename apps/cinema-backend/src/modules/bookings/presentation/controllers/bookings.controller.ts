import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import { ApiSuccessMessage } from '#src/common/decorators/api-message.decorator.js';
import { CurrentUser } from '#src/common/decorators/current-user.decorator.js';
import { BookingsService } from '../../application/services/bookings.service.js';
import { HoldSeatsDto } from '../../application/dto/hold-seats.dto.js';
import { ReleaseSeatsDto } from '../../application/dto/release-seats.dto.js';
// JwtStrategy trả về { userId, email, roles, permissions } - userId là string
@Controller('/bookings')
export class BookingsController {
  constructor(private readonly bookingService: BookingsService) {}
  // 1. POST api/v1/bookings/hold - Giữ ghế
  @Post('hold')
  @HttpCode(HttpStatus.OK)
  @ApiSuccessMessage('Giữ ghế thành công')
  holdSeats(@CurrentUser('userId') userId: string, @Body() dto: HoldSeatsDto) {
    return this.bookingService.holdSeats(userId, dto);
  }
  // 2. POST api/v1/bookings/release - Giải phóng ghế
  @Post('release')
  @HttpCode(HttpStatus.OK)
  @ApiSuccessMessage('Giải phóng ghế thành công')
  releaseSeats(
    @CurrentUser('userId') userId: string,
    @Body() dto: ReleaseSeatsDto,
  ) {
    return this.bookingService.releaseSeats(userId, dto);
  }
  // 3. GET api/v1/bookings/my-holds - Xem ghế đang giữ
  @Get('my-holds')
  @HttpCode(HttpStatus.OK)
  @ApiSuccessMessage('Lấy danh sách ghế đang giữ thành công')
  getMyHolds(@CurrentUser('userId') userId: string) {
    return this.bookingService.getMyHolds(userId);
  }
}
