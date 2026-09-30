import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Showtime } from '#modules/showtimes/domain/entities/showtime.entity.js';
import { ShowtimeSeat } from '#modules/showtimes/domain/entities/showtime-seat.entity.js';
import { ShowtimeSeatPrice } from '#modules/showtimes/domain/entities/showtime-seat-price.entity.js';
import { Seat } from '#modules/cinemas/entities/seat.entity.js';
import { BookingsController } from './controllers/bookings.controller.js';
import { BookingService } from './services/booking.service.js';
import { SeatLockService } from './services/seat-lock.service.js';
@Module({
  imports: [
    TypeOrmModule.forFeature([Showtime, ShowtimeSeat, ShowtimeSeatPrice, Seat]),
  ],
  controllers: [BookingsController],
  providers: [BookingService, SeatLockService],
  exports: [BookingService, SeatLockService],
})
export class BookingsModule {}
