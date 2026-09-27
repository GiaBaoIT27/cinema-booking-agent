import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { ApiSuccessMessage } from '#src/common/decorators/api-message.decorator.js';
import { CurrentUser } from '#src/common/decorators/current-user.decorator.js';
import { BookingService } from '../services/booking.service.js';
import { HoldSeatsDto } from '../dto/hold-seats.dto.js';
import { ReleaseSeatsDto } from '../dto/release-seats.dto.js';
// JwtStrategy trả về { userId, email, roles, permissions } - userId là string
@Controller('/bookings')
export class BookingsController {
  constructor(private readonly bookingService: BookingService) {}
  // 1. POST api/v1/bookings/hold - Giữ ghế
  @Post('hold')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiSuccessMessage('Giữ ghế thành công')
  holdSeats(@CurrentUser('userId') userId: string, @Body() dto: HoldSeatsDto) {
    return this.bookingService.holdSeats(userId, dto);
  }
  // 2. POST api/v1/bookings/release - Giải phóng ghế
  @Post('release')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  @ApiSuccessMessage('Lấy danh sách ghế đang giữ thành công')
  getMyHolds(@CurrentUser('userId') userId: string) {
    return this.bookingService.getMyHolds(userId);
  }
}
