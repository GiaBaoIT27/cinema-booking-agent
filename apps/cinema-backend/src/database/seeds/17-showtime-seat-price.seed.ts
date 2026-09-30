import { DataSource } from 'typeorm';
import { Showtime } from '#modules/showtimes/domain/entities/showtime.entity.js';
import { SeatType } from '#modules/seat-types/entities/seat-type.entity.js';
import { PriceRule } from '#modules/showtimes/domain/entities/price-rules.entity.js';
import { ShowtimeSeatPrice } from '#modules/showtimes/domain/entities/showtime-seat-price.entity.js';
import { DayType } from '#src/modules/showtimes/domain/enums/day-type.enum.js';

export class ShowtimeSeatPriceSeeder {
  async run(dataSource: DataSource): Promise<void> {
    console.log('Khởi chạy quy trình Seeding Showtime Seat Prices...');
    const showtimeRepo = dataSource.getRepository(Showtime);
    const seatTypeRepo = dataSource.getRepository(SeatType);
    const priceRuleRepo = dataSource.getRepository(PriceRule);
    const showtimeSeatPriceRepo = dataSource.getRepository(ShowtimeSeatPrice);

    const showtimes = await showtimeRepo.find({
      relations: {
        auditorium: {
          seats: {
            seatType: true,
          },
        },
      },
    });

    const seatTypes = await seatTypeRepo.find();
    if (showtimes.length === 0 || seatTypes.length === 0) {
      console.log('Không có suất chiếu hoặc loại ghế để tạo giá vé.');
      return;
    }

    for (const showtime of showtimes) {
      // Xác định DayType
      const dayFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'short',
      });
      const dayOfWeekStr = dayFormatter.format(showtime.startTime);
      const dayType =
        dayOfWeekStr === 'Sun' || dayOfWeekStr === 'Sat'
          ? DayType.WEEKEND
          : DayType.WEEKDAY;

      // Xác định chuỗi thời gian
      const timeFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const showtimeStr = timeFormatter.format(showtime.startTime);

      // Tra cứu base price
      const rule = await priceRuleRepo
        .createQueryBuilder('pr')
        .where('pr.projectionType = :projectionType', {
          projectionType: showtime.projectionType,
        })
        .andWhere('pr.dayType = :dayType', { dayType })
        .andWhere('(pr.cineplexId = :cineplexId OR pr.cineplexId IS NULL)', {
          cineplexId: showtime.auditorium?.cineplexId,
        })
        .andWhere(
          'pr.startTime <= :showtimeStr AND pr.endTime > :showtimeStr',
          {
            showtimeStr,
          },
        )
        .orderBy('pr.cineplexId IS NULL', 'ASC')
        .addOrderBy('pr.basePrice', 'DESC')
        .getOne();

      const basePrice = rule ? rule.basePrice : 100000;

      // Thu thập các loại ghế của phòng chiếu này
      const currentSeatTypes = new Map<string, SeatType>();
      for (const seat of showtime.auditorium?.seats ?? []) {
        if (seat.seatType && !currentSeatTypes.has(String(seat.seatTypeId))) {
          currentSeatTypes.set(String(seat.seatTypeId), seat.seatType);
        }
      }

      // Khởi tạo/Cập nhật giá
      for (const [seatTypeIdStr, seatType] of currentSeatTypes) {
        const finalPrice = Math.round(
          basePrice * Number(seatType.priceMultiplier ?? 1) +
            Number(seatType.surchargeAmount ?? 0),
        );

        const existingPrice = await showtimeSeatPriceRepo.findOne({
          where: {
            showtimeId: showtime.id.toString(),
            seatTypeId: seatTypeIdStr,
          },
        });

        if (!existingPrice) {
          const newPrice = showtimeSeatPriceRepo.create({
            showtimeId: showtime.id.toString(),
            seatTypeId: seatTypeIdStr,
            finalPrice,
            isOverridden: false,
          });
          await showtimeSeatPriceRepo.save(newPrice);
          console.log(
            `+ Đã tạo bảng giá cho Suất chiếu ${showtime.id} - Loại ghế ${seatType.code}: ${finalPrice}`,
          );
        } else if (!existingPrice.isOverridden) {
          existingPrice.finalPrice = finalPrice;
          await showtimeSeatPriceRepo.save(existingPrice);
          console.log(
            `~ Đã cập nhật bảng giá cho Suất chiếu ${showtime.id} - Loại ghế ${seatType.code}: ${finalPrice}`,
          );
        }
      }
    }
    console.log('Hoàn thành Seeding Showtime Seat Prices thành công!');
  }
}
