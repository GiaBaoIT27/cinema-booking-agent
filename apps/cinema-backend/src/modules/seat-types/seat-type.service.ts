import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, DataSource } from 'typeorm';
import { SeatType } from './entities/seat-type.entity.js';
import { CreateSeatTypeDto } from './dto/create-seat-type.dto.js';
import { UpdateSeatTypeDto } from './dto/update-seat-type.dto.js';
import { RedisService } from '#src/core/redis/redis.service.js';
import {
  SEAT_TYPE_REDIS_KEYS,
  SEAT_TYPE_CACHE_TTL,
} from './constants/seat-type-redis.constant.js';

@Injectable()
export class SeatTypeService {
  private readonly logger = new Logger(SeatTypeService.name);

  constructor(
    @InjectRepository(SeatType)
    private readonly seatTypeRepository: Repository<SeatType>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  // GET api/v1/seat-types
  async findAll(): Promise<SeatType[]> {
    return this.redisService.getOrSet(
      SEAT_TYPE_REDIS_KEYS.ALL,
      () =>
        this.seatTypeRepository.find({
          order: { displayOrder: 'ASC', id: 'ASC' },
        }),
      SEAT_TYPE_CACHE_TTL,
    );
  }

  // GET api/v1/seat-types/:id
  async findOne(id: number): Promise<SeatType> {
    const seatType = await this.redisService.getOrSet(
      SEAT_TYPE_REDIS_KEYS.DETAIL(id),
      () => this.seatTypeRepository.findOne({ where: { id: id.toString() } }),
      SEAT_TYPE_CACHE_TTL,
    );

    if (!seatType) {
      throw new NotFoundException({
        errorCode: 'SEAT_TYPE_NOT_FOUND',
        message: `Loại ghế với ID ${id} không tồn tại trên hệ thống`,
      });
    }

    return seatType;
  }

  // POST api/v1/seat-types
  async create(createDto: CreateSeatTypeDto): Promise<SeatType> {
    // 1. Kiểm tra định dạng Mã màu Hex (422 Unprocessable Entity)
    const hexRegex = /^#([A-Fa-f0-9]{6})$/;
    if (!hexRegex.test(createDto.colorCode)) {
      throw new UnprocessableEntityException({
        errorCode: 'INVALID_COLOR_CODE_FORMAT',
        message:
          'Mã màu Hex không đúng định dạng chuẩn (Ví dụ hợp lệ: #17A2B8)',
      });
    }

    // 2. Kiểm tra Cấu hình Giá (422 Unprocessable Entity)
    if (createDto.priceMultiplier < 1.0 || createDto.surchargeAmount < 0) {
      throw new UnprocessableEntityException({
        errorCode: 'INVALID_PRICE_CONFIGURATION',
        message:
          'Cấu hình giá không hợp lệ (priceMultiplier >= 1.0 và surchargeAmount >= 0)',
      });
    }

    // 3. Kiểm tra Trùng lặp Mã loại ghế (409 Conflict)
    const existingCode = await this.seatTypeRepository.findOne({
      where: { code: createDto.code },
      select: { id: true, code: true },
    });
    if (existingCode) {
      throw new ConflictException({
        errorCode: 'SEAT_TYPE_CODE_ALREADY_EXISTS',
        message: `Mã loại ghế '${createDto.code}' đã tồn tại trên hệ thống`,
      });
    }

    // 4. Khởi tạo & Lưu Entity
    const newSeatType = this.seatTypeRepository.create(createDto);
    const savedSeatType = await this.seatTypeRepository.save(newSeatType);

    // 5. Invalidate Cache danh sách khi có dữ liệu mới
    await this.redisService.del(SEAT_TYPE_REDIS_KEYS.ALL);
    return savedSeatType;
  }

  // PUT api/v1/seat-types
  async update(id: number, updateDto: UpdateSeatTypeDto): Promise<SeatType> {
    // 1. Kiểm tra tồn tại loại ghế (404 Not Found)
    const existingSeatType = await this.seatTypeRepository.findOne({
      where: { id: id.toString() },
    });
    if (!existingSeatType) {
      throw new NotFoundException({
        errorCode: 'SEAT_TYPE_NOT_FOUND',
        message: `Loại ghế với ID ${id} không tồn tại trên hệ thống`,
      });
    }

    // 2. Validate Mã màu Hex (422 Unprocessable Entity)
    const hexRegex = /^#([A-Fa-f0-9]{6})$/;
    if (!hexRegex.test(updateDto.colorCode)) {
      throw new UnprocessableEntityException({
        errorCode: 'INVALID_COLOR_CODE_FORMAT',
        message:
          'Mã màu Hex không đúng định dạng chuẩn (Ví dụ hợp lệ: #17A2B8)',
      });
    }

    // 3. Validate Cấu hình Giá (422 Unprocessable Entity)
    if (updateDto.priceMultiplier < 1.0 || updateDto.surchargeAmount < 0) {
      throw new UnprocessableEntityException({
        errorCode: 'INVALID_PRICE_CONFIGURATION',
        message:
          'Cấu hình giá không hợp lệ (priceMultiplier >= 1.0 và surchargeAmount >= 0)',
      });
    }

    // 4. Kiểm tra trùng lặp Code loại trừ ID hiện tại (409 Conflict)
    const codeConflict = await this.seatTypeRepository.findOne({
      where: { code: updateDto.code, id: Not(id.toString()) },
      select: { id: true, code: true },
    });
    if (codeConflict) {
      throw new ConflictException({
        errorCode: 'SEAT_TYPE_CODE_ALREADY_EXISTS',
        message: `Mã loại ghế '${updateDto.code}' đã được sử dụng bởi loại ghế khác`,
      });
    }

    // 5. Cập nhật dữ liệu & Lưu DB
    Object.assign(existingSeatType, updateDto);
    const updatedSeatType =
      await this.seatTypeRepository.save(existingSeatType);

    // 6. Invalidate cả Cache danh sách lẫn Cache chi tiết
    await this.redisService.del([
      SEAT_TYPE_REDIS_KEYS.ALL,
      SEAT_TYPE_REDIS_KEYS.DETAIL(id),
    ]);

    return updatedSeatType;
  }

  // DELETE api/v1/seat-types/:id
  async remove(id: number) {
    // 1. Kiểm tra tồn tại loại ghế (404 Not Found)
    const existingSeatType = await this.seatTypeRepository.findOne({
      where: { id: id.toString() },
    });
    if (!existingSeatType) {
      throw new NotFoundException({
        errorCode: 'SEAT_TYPE_NOT_FOUND',
        message: `Loại ghế với ID ${id} không tồn tại trên hệ thống`,
      });
    }

    // 2. Kiểm tra Ràng buộc Dữ liệu Vật lý (409 Conflict)
    const [{ count }] = await this.dataSource.query(
      `SELECT COUNT(*)::int as count FROM seats WHERE seat_type_id = $1`,
      [id],
    );

    if (count > 0) {
      throw new ConflictException({
        errorCode: 'SEAT_TYPE_HAS_ASSOCIATED_SEATS',
        message:
          'Không thể xóa loại ghế này vì đã liên kết với ghế vật lý trong phòng chiếu',
      });
    }

    // 3. Thực thi Xóa trong DB
    await this.seatTypeRepository.delete(id);

    // 4. Invalidate cả Cache danh sách lẫn Cache chi tiết
    await this.redisService.del([
      SEAT_TYPE_REDIS_KEYS.ALL,
      SEAT_TYPE_REDIS_KEYS.DETAIL(id),
    ]);

    // 5. Trả về Response theo đúng schema đặc tả
    return {
      deletedSeatTypeId: Number(id),
    };
  }
}
