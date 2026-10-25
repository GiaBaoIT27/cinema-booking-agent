import { Injectable, Inject } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';
import {
  SHOWTIME_REPOSITORY,
  type IShowtimeRepository,
} from '../../domain/repositories/showtime.repository.interface.js';

@Injectable()
export class ShowtimeSchedulingService {
  constructor(
    @Inject(SHOWTIME_REPOSITORY)
    private readonly showtimeRepository: IShowtimeRepository,
  ) {}

  /**
   * Validate thời gian bắt đầu
   */
  validateStartTime(startTime: Date): void {
    if (startTime <= new Date()) {
      throw new BusinessException(
        ErrorCode.INVALID_START_TIME,
        'Thời gian bắt đầu suất chiếu phải lớn hơn thời điểm hiện tại',
      );
    }
  }

  /**
   * Tính thời gian kết thúc = startTime + durationMinutes + cleaningMinutes
   */
  calculateEndTime(
    startTime: Date,
    durationMinutes: number,
    cleaningMinutes = 15,
  ): Date {
    const totalMinutes = durationMinutes + cleaningMinutes;
    return new Date(startTime.getTime() + totalMinutes * 60 * 1000);
  }

  /**
   * Kiểm tra trùng lịch chiếu tại phòng chiếu [S1, E1] và [S2, E2]
   */
  async assertNoOverlapping(
    auditoriumId: string,
    startTime: Date,
    endTime: Date,
    excludeShowtimeId?: string,
  ): Promise<void> {
    const overlapping = await this.showtimeRepository.findOverlapping(
      auditoriumId,
      startTime,
      endTime,
      excludeShowtimeId,
    );

    if (overlapping) {
      // Giữ nguyên contract HTTP 409 Conflict của API trùng lịch chiếu
      throw new BusinessException(
        ErrorCode.SHOWTIME_SCHEDULE_OVERLAP,
        'Khung thời gian suất chiếu bị trùng lấp với một suất chiếu khác tại cùng phòng chiếu',
        HttpStatus.CONFLICT,
      );
    }
  }
}
