import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, DataSource, In, MoreThan } from 'typeorm';
// import { EventEmitter2 } from '@nestjs/event-emitter';
import { Auditorium } from '../entities/auditorium.entity.js';
import { Cineplex } from '../entities/cineplex.entity.js';
import { Seat } from '../entities/seat.entity.js';
import { Showtime } from '#modules/showtimes/domain/entities/showtime.entity.js';
import { SeatType } from '#modules/seat-types/entities/seat-type.entity.js';
import { AuditoriumStatus } from '../enums/auditorium-status.enum.js';
import { ShowtimeStatus } from '#src/modules/showtimes/domain/enums/showtime-status.enum.js';
import { ShowtimesCancelledEvent } from '#modules/showtimes/events/showtime-cancelled.event.js';
import { RedisService } from '#src/core/redis/redis.service.js';
import {
  GetAuditoriumsQueryDto,
  AuditoriumStatusFilter,
} from '../dto/auditoriums/query-auditoriums.dto.js';
import { CreateAuditoriumDto } from '../dto/auditoriums/create-auditorium.dto.js';
import { UpdateAuditoriumDto } from '../dto/auditoriums/update-auditorium.dto.js';
import { UpdateAuditoriumStatusDto } from '../dto/auditoriums/update-auditorium-status.dto.js';
import {
  CreateSeatLayoutDto,
  CreateSeatLayoutItemDto,
} from '../dto/auditoriums/create-seat-layout.dto.js';
import {
  AUDITORIUM_REDIS_KEYS,
  AUDITORIUM_CACHE_TTL,
  SEATS_CACHE_TTL,
} from '../constants/auditorium-redis.constant.js';

@Injectable()
export class AuditoriumService {
  private readonly logger = new Logger(AuditoriumService.name);

  constructor(
    @InjectRepository(Auditorium)
    private readonly auditoriumRepository: Repository<Auditorium>,
    @InjectRepository(Cineplex)
    private readonly cineplexRepository: Repository<Cineplex>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    @InjectRepository(SeatType)
    private readonly seatTypeRepository: Repository<SeatType>,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  // GET api/v1/auditoriums
  async findAll(query: GetAuditoriumsQueryDto): Promise<any> {
    const { cineplexId, screenType, status, page, limit } = query;

    const queryStr = `cineplex=${cineplexId ?? 'all'}:screen=${screenType ?? 'all'}:status=${status || 'all'}:p=${page}:l=${limit}`;
    const cacheKey = AUDITORIUM_REDIS_KEYS.LIST(queryStr);

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const qb = this.auditoriumRepository
          .createQueryBuilder('a')
          .innerJoinAndSelect('a.cineplex', 'c');

        if (cineplexId) {
          qb.andWhere('a.cineplexId = :cineplexId', { cineplexId });
        }

        if (screenType) {
          qb.andWhere('a.screenType = :screenType', { screenType });
        }

        if (status && status !== AuditoriumStatusFilter.ALL) {
          qb.andWhere('a.status = :status', { status });
        }

        qb.orderBy('a.cineplexId', 'ASC')
          .addOrderBy('a.code', 'ASC')
          .skip((page - 1) * limit)
          .take(limit);

        const [auditoriums, totalElements] = await qb.getManyAndCount();

        // Chuẩn hóa đầu ra
        const items = auditoriums.map((aud) => ({
          id: Number(aud.id),
          cineplexId: Number(aud.cineplexId),
          cineplexName: aud.cineplex?.name || '',
          code: aud.code,
          name: aud.name,
          screenType: aud.screenType,
          audioType: aud.audioType,
          totalSeats: aud.totalSeats,
          status: aud.status,
          createdAt: aud.createdAt,
          updatedAt: aud.updatedAt,
        }));

        return {
          items,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            totalElements,
            totalPages: Math.ceil(totalElements / limit) || 1,
          },
        };
      },
      AUDITORIUM_CACHE_TTL,
    );
  }

  // GET api/v1/auditoriums/:id
  async findOne(id: number): Promise<any> {
    const cacheKey = AUDITORIUM_REDIS_KEYS.DETAIL(id);

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const auditorium = await this.auditoriumRepository
          .createQueryBuilder('a')
          .innerJoinAndSelect('a.cineplex', 'c')
          .where('a.id = :id', { id: String(id) })
          .getOne();

        if (!auditorium) {
          throw new NotFoundException({
            errorCode: 'AUDITORIUM_NOT_FOUND',
            message: `Không tìm thấy phòng chiếu với ID = ${id}`,
          });
        }

        return {
          id: auditorium.id,
          cineplex: {
            id: auditorium.cineplex.id,
            code: auditorium.cineplex.code,
            name: auditorium.cineplex.name,
          },
          code: auditorium.code,
          name: auditorium.name,
          screenType: auditorium.screenType,
          audioType: auditorium.audioType,
          totalSeats: auditorium.totalSeats,
          status: auditorium.status,
          createdAt: auditorium.createdAt,
          updatedAt: auditorium.updatedAt,
        };
      },
      AUDITORIUM_CACHE_TTL,
    );
  }

  // POST api/v1/auditoriums
  async create(dto: CreateAuditoriumDto): Promise<any> {
    // 1. Kiểm tra tồn tại của Cụm Rạp (FK Check)
    const cineplexExists = await this.cineplexRepository.exists({
      where: { id: dto.cineplexId.toString() },
    });

    if (!cineplexExists) {
      throw new NotFoundException({
        code: 'CINEPLEX_NOT_FOUND',
        message: `Không tìm thấy cụm rạp với ID = ${dto.cineplexId}`,
      });
    }

    // 2. Kiểm tra trùng mã phòng chiếu trong cùng 1 Cụm Rạp
    const isCodeExist = await this.auditoriumRepository.exists({
      where: {
        cineplexId: dto.cineplexId.toString(),
        code: dto.code,
      },
    });

    if (isCodeExist) {
      throw new ConflictException({
        code: 'DUPLICATE_AUDITORIUM_CODE',
        message: `Mã phòng chiếu '${dto.code}' đã tồn tại trong cụm rạp này`,
      });
    }

    // 3. Thực thi Insert DB
    const newAuditorium = this.auditoriumRepository.create({
      cineplexId: dto.cineplexId.toString(),
      code: dto.code,
      name: dto.name,
      screenType: dto.screenType,
      audioType: dto.audioType,
      totalSeats: dto.totalSeats,
      status: AuditoriumStatus.ACTIVE,
    });

    const savedAuditorium = await this.auditoriumRepository.save(newAuditorium);

    // 4. Vô hiệu hóa Cache danh sách phòng chiếu
    await Promise.all([
      this.redisService.delByPattern(AUDITORIUM_REDIS_KEYS.PATTERN_ALL),
      this.redisService.delByPattern(AUDITORIUM_REDIS_KEYS.PATTERN_CINEPLEXES),
    ]);

    return {
      id: Number(savedAuditorium.id),
      cineplexId: Number(savedAuditorium.cineplexId),
      code: savedAuditorium.code,
      name: savedAuditorium.name,
      screenType: savedAuditorium.screenType,
      audioType: savedAuditorium.audioType,
      totalSeats: Number(savedAuditorium.totalSeats),
      status: savedAuditorium.status,
      createdAt: savedAuditorium.createdAt,
      updatedAt: savedAuditorium.updatedAt,
    };
  }

  // UPDATE api/v1/auditoriums/:id
  async update(id: number, dto: UpdateAuditoriumDto): Promise<any> {
    // 1. Kiểm tra phòng chiếu có tồn tại hay không
    const auditorium = await this.auditoriumRepository.findOne({
      where: { id: id.toString() },
    });

    if (!auditorium) {
      throw new NotFoundException({
        code: 'AUDITORIUM_NOT_FOUND',
        message: `Không tìm thấy phòng chiếu với ID = ${id}`,
      });
    }

    // 2. Kiểm tra trùng code với các phòng chiếu khác trong cùng cụm rạp (id != :id)
    const isCodeExist = await this.auditoriumRepository.exists({
      where: {
        cineplexId: auditorium.cineplexId.toString(),
        code: dto.code,
        id: Not(id.toString()),
      },
    });

    if (isCodeExist) {
      throw new ConflictException({
        code: 'DUPLICATE_AUDITORIUM_CODE',
        message: `Mã phòng chiếu '${dto.code}' đã tồn tại trong cụm rạp này`,
      });
    }

    // 3. Tiến hành cập nhật DB
    auditorium.code = dto.code;
    auditorium.name = dto.name;
    auditorium.screenType = dto.screenType;
    auditorium.audioType = dto.audioType;
    auditorium.totalSeats = dto.totalSeats;

    const updatedAuditorium = await this.auditoriumRepository.save(auditorium);

    // 4. Evict Redis Cache phòng chiếu & cụm rạp
    await Promise.all([
      this.redisService.delByPattern(AUDITORIUM_REDIS_KEYS.PATTERN_ALL),
      this.redisService.delByPattern(AUDITORIUM_REDIS_KEYS.PATTERN_CINEPLEXES),
    ]);

    return {
      id: updatedAuditorium.id,
      cineplexId: updatedAuditorium.cineplexId,
      code: updatedAuditorium.code,
      name: updatedAuditorium.name,
      screenType: updatedAuditorium.screenType,
      audioType: updatedAuditorium.audioType,
      totalSeats: updatedAuditorium.totalSeats,
      status: updatedAuditorium.status,
      createdAt: updatedAuditorium.createdAt,
      updatedAt: updatedAuditorium.updatedAt,
    };
  }

  // PATCH api/v1/auditoriums/:id/status
  async updateStatus(id: number, dto: UpdateAuditoriumStatusDto): Promise<any> {
    const { status: newStatus, reason } = dto;

    // Danh sách ID các suất chiếu bị hủy (được dùng để phát Event sau khi Commit Transaction)
    let cancelledShowtimeIds: string[] = [];

    // 1. Thực thi Transaction đảm bảo tính toàn vẹn dữ liệu
    const updatedAuditorium = await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        // Find & Lock record phòng chiếu
        const auditorium = await transactionalEntityManager.findOne(
          Auditorium,
          {
            where: { id: id.toString() },
            lock: { mode: 'pessimistic_write' },
          },
        );

        if (!auditorium) {
          throw new NotFoundException({
            code: 'AUDITORIUM_NOT_FOUND',
            message: `Không tìm thấy phòng chiếu với ID = ${id}`,
          });
        }

        // 2. Nếu chuyển sang MAINTENANCE hoặc INACTIVE, bảo vệ & xử lý suất chiếu tương lai
        if (
          newStatus === AuditoriumStatus.MAINTENANCE ||
          newStatus === AuditoriumStatus.INACTIVE
        ) {
          const now = new Date();

          // Tìm các suất chiếu trong tương lai đang ở trạng thái SCHEDULED hoặc OPEN
          const affectedShowtimes = await transactionalEntityManager.find(
            Showtime,
            {
              where: {
                auditoriumId: id.toString(),
                startTime: MoreThan(now),
                status: In([ShowtimeStatus.SCHEDULED, ShowtimeStatus.OPEN]),
              },
              select: {
                id: true,
              },
            },
          );

          if (affectedShowtimes.length > 0) {
            cancelledShowtimeIds = affectedShowtimes.map((s) => s.id);

            // Cập nhật trạng thái tất cả suất chiếu ảnh hưởng sang CANCELLED
            await transactionalEntityManager.update(
              Showtime,
              { id: In(cancelledShowtimeIds) },
              {
                status: ShowtimeStatus.CANCELLED,
                updatedAt: new Date(),
              },
            );

            this.logger.warn(
              `Đã tự động hủy ${cancelledShowtimeIds.length} suất chiếu tương lai do phòng chiếu ID ${id} chuyển sang ${newStatus}`,
            );
          }
        }

        // 3. Cập nhật trạng thái phòng chiếu
        auditorium.status = newStatus;
        return transactionalEntityManager.save(auditorium);
      },
    );

    // 4. Bắn Event sang Notification/Payment Service ngoài Transaction
    // if (cancelledShowtimeIds.length > 0) {
    //   this.eventEmitter.emit(
    //     'showtimes.cancelled',
    //     new ShowtimesCancelledEvent(
    //       id,
    //       cancelledShowtimeIds,
    //       reason || `Phòng chiếu chuyển sang trạng thái ${newStatus}`,
    //     ),
    //   );
    // }

    // 5. Invalidate Redis Cache
    const evictionPromises: Promise<any>[] = [
      this.redisService.delByPattern(AUDITORIUM_REDIS_KEYS.PATTERN_ALL),
      this.redisService.delByPattern(AUDITORIUM_REDIS_KEYS.PATTERN_CINEPLEXES),
    ];

    if (cancelledShowtimeIds.length > 0) {
      evictionPromises.push(
        this.redisService.delByPattern(AUDITORIUM_REDIS_KEYS.PATTERN_SHOWTIMES),
      );
    }

    await Promise.all(evictionPromises);

    return {
      id: updatedAuditorium.id,
      code: updatedAuditorium.code,
      status: updatedAuditorium.status,
      reason: reason ?? null,
      updatedAt: updatedAuditorium.updatedAt,
    };
  }

  // GET api/v1/auditoriums/:id/seats
  async getSeatLayout(auditoriumId: number): Promise<any> {
    const cacheKey = AUDITORIUM_REDIS_KEYS.SEATS(auditoriumId);

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        // 1. Kiểm tra tồn tại phòng chiếu
        const exists = await this.auditoriumRepository.exists({
          where: { id: auditoriumId.toString() },
        });

        if (!exists) {
          throw new NotFoundException({
            code: 'AUDITORIUM_NOT_FOUND',
            message: `Không tìm thấy phòng chiếu với ID = ${auditoriumId}`,
          });
        }

        // 2. Query DB danh sách ghế & Join loại ghế
        const seats = await this.seatRepository.find({
          where: { auditoriumId: auditoriumId.toString() },
          relations: {
            seatType: true,
          },
          order: {
            coordY: 'ASC',
            coordX: 'ASC',
          },
        });

        // 3. Tính toán kích thước ma trận động & format dữ liệu
        let maxRowsY = 0;
        let maxColumnsX = 0;

        const mappedSeats = seats.map((seat) => {
          const endX = seat.coordX + (seat.gridSpan || 1);
          const endY = seat.coordY + 1;

          if (endX > maxColumnsX) maxColumnsX = endX;
          if (endY > maxRowsY) maxRowsY = endY;

          return {
            id: Number(seat.id),
            rowLabel: seat.rowLabel,
            columnNumber: seat.columnNumber,
            seatNumber: seat.seatNumber,
            coordinates: {
              x: seat.coordX,
              y: seat.coordY,
              gridSpan: seat.gridSpan,
            },
            seatType: {
              id: Number(seat.seatType.id),
              code: seat.seatType.code,
              name: seat.seatType.name,
              colorCode: seat.seatType.colorCode,
            },
            status: seat.status,
            createdAt: seat.createdAt,
            updatedAt: seat.updatedAt,
          };
        });

        return {
          auditoriumId: Number(auditoriumId),
          gridDimensions: {
            maxRowsY,
            maxColumnsX,
          },
          totalSeats: mappedSeats.length,
          seats: mappedSeats,
        };
      },
      SEATS_CACHE_TTL,
    );
  }

  // POST /api/v1/auditoriums/{auditorium_id}/seats/batch
  async configureSeatLayout(
    auditoriumId: number,
    dto: CreateSeatLayoutDto,
  ): Promise<any> {
    // 1. Kiểm tra sự tồn tại của phòng chiếu
    const auditorium = await this.auditoriumRepository.findOne({
      where: { id: auditoriumId.toString() },
      select: {
        id: true,
        totalSeats: true,
      },
    });

    if (!auditorium) {
      throw new NotFoundException({
        code: 'AUDITORIUM_NOT_FOUND',
        message: `Không tìm thấy phòng chiếu với ID = ${auditoriumId}`,
      });
    }

    // 2. Validate tồn tại của tất cả seatTypeId trong Payload (FK Check)
    const seatTypeIds = Array.from(
      new Set(dto.items.map((item) => item.seatTypeId)),
    );

    if (seatTypeIds.length > 0) {
      const existingSeatTypes = await this.seatTypeRepository.find({
        where: { id: In(seatTypeIds) },
        select: {
          id: true,
        },
      });

      if (existingSeatTypes.length !== seatTypeIds.length) {
        throw new BadRequestException({
          code: 'SEAT_TYPE_NOT_FOUND',
          message:
            'Một hoặc nhiều loại ghế (seatTypeId) gửi lên không tồn tại trong hệ thống',
        });
      }
    }

    // 3. Validate trùng lặp Tọa độ/Trùng Mã ghế ngay trên Payload
    this.validatePayloadCollisions(dto.items);

    // 4. Kiểm tra Tổng sức chứa quy đổi (Sum of gridSpan) với total_seats của phòng chiếu
    const totalRequestedCapacity = dto.items.reduce(
      (sum, item) => sum + (item.gridSpan || 1),
      0,
    );

    if (totalRequestedCapacity > auditorium.totalSeats) {
      throw new UnprocessableEntityException({
        code: 'EXCEEDS_MAX_AUDITORIUM_CAPACITY',
        message: `Tổng số ghế quy đổi (${totalRequestedCapacity}) vượt quá sức chứa thiết kế của phòng chiếu (${auditorium.totalSeats})`,
      });
    }

    // 5. Thực thi Transaction ghi DB
    let maxX = 0;
    let maxY = 0;

    await this.dataSource.transaction(async (transactionalEntityManager) => {
      // Nếu clearExisting = true, xóa toàn bộ sơ đồ ghế cũ
      if (dto.clearExisting) {
        await transactionalEntityManager.delete(Seat, {
          auditoriumId: auditoriumId.toString(),
        });
      }

      if (dto.items.length > 0) {
        const seatEntities = dto.items.map((item) => {
          const span = item.gridSpan || 1;
          const currentMaxX = item.coordX + span - 1;
          const currentMaxY = item.coordY;

          if (currentMaxX > maxX) maxX = currentMaxX;
          if (currentMaxY > maxY) maxY = currentMaxY;

          return transactionalEntityManager.create(Seat, {
            auditoriumId: auditoriumId.toString(),
            seatTypeId: item.seatTypeId.toString(),
            rowLabel: item.rowLabel,
            columnNumber: item.columnNumber,
            seatNumber: item.seatNumber,
            coordX: item.coordX,
            coordY: item.coordY,
            gridSpan: span,
            status: item.status,
          });
        });

        // Batch Insert hàng loạt bằng QueryBuilder/Chunking để tối ưu hiệu năng
        await transactionalEntityManager.insert(Seat, seatEntities);
      }
    });

    // 6. Xóa Redis Cache liên quan
    await Promise.all([
      this.redisService.del(AUDITORIUM_REDIS_KEYS.SEATS(auditoriumId)),
      this.redisService.del(AUDITORIUM_REDIS_KEYS.DETAIL(auditoriumId)),
      this.redisService.delByPattern(AUDITORIUM_REDIS_KEYS.PATTERN_ALL),
    ]);

    return {
      auditoriumId,
      totalSeatsConfigured: dto.items.length,
      gridBounds: {
        maxX,
        maxY,
      },
      status: 'SUCCESS',
      configuredAt: new Date(),
    };
  }

  // Kiểm tra va chạm tọa độ Grid (tính cả độ rộng gridSpan) và trùng lặp mã ghế
  private validatePayloadCollisions(items: CreateSeatLayoutItemDto[]): void {
    const seatNumbers = new Set<string>();
    const occupiedCoords = new Set<string>();

    for (const item of items) {
      // Kiểm tra trùng seatNumber
      if (seatNumbers.has(item.seatNumber)) {
        throw new UnprocessableEntityException({
          code: 'DUPLICATE_GRID_COORDINATES_IN_PAYLOAD',
          message: `Mã ghế '${item.seatNumber}' bị trùng lặp trong request payload`,
        });
      }
      seatNumbers.add(item.seatNumber);

      // Kiểm tra chồng lấp tọa độ X, Y dựa trên gridSpan
      const span = item.gridSpan || 1;
      for (let dx = 0; dx < span; dx++) {
        const coordKey = `${item.coordX + dx},${item.coordY}`;
        if (occupiedCoords.has(coordKey)) {
          throw new UnprocessableEntityException({
            code: 'DUPLICATE_GRID_COORDINATES_IN_PAYLOAD',
            message: `Tọa độ (X: ${item.coordX + dx}, Y: ${item.coordY}) bị trùng/chồng lấp trong ma trận gửi lên`,
          });
        }
        occupiedCoords.add(coordKey);
      }
    }
  }
}
