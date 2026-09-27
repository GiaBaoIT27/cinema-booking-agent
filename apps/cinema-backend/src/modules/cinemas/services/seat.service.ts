import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Seat } from '../entities/seat.entity.js';
import { SeatType } from '#modules/seat-types/entities/seat-type.entity.js';
import { UpdateSeatDto } from '../dto/seats/update-seat.dto.js';

@Injectable()
export class SeatsService {
  constructor(
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    @InjectRepository(SeatType)
    private readonly seatTypeRepository: Repository<SeatType>,
  ) {}

  // GET api/v1/seats/:id
  async findOne(id: number): Promise<Seat> {
    const seat = await this.seatRepository.findOne({
      where: { id: id.toString() },
    });

    if (!seat) {
      throw new NotFoundException({
        errorCode: 'SEAT_NOT_FOUND',
        message: `Không tìm thấy thông tin chi tiết vị trí ghế với ID = ${id}`,
      });
    }

    return seat;
  }

  // POST api/v1/seats
  async update(id: number, updateSeatDto: UpdateSeatDto): Promise<Seat> {
    // 1. Kiểm tra sự tồn tại của ghế vật lý (404 Not Found)
    const seat = await this.seatRepository.findOne({
      where: { id: id.toString() },
    });

    if (!seat) {
      throw new NotFoundException({
        errorCode: 'SEAT_NOT_FOUND',
        message: `Không tìm thấy thông tin vị trí ghế với ID = ${id}`,
      });
    }

    const { seatTypeId, seatNumber, coordX, coordY } = updateSeatDto;

    // 2. Kiểm tra song song: Loại ghế (FK) và Ràng buộc trùng lặp (Unique Matrix Constraints)
    const [seatTypeExists, duplicateNumber, duplicateCoords] =
      await Promise.all([
        this.seatTypeRepository.findOne({
          where: { id: seatTypeId.toString() },
          select: { id: true },
        }),
        this.seatRepository.findOne({
          where: {
            auditoriumId: seat.auditoriumId,
            seatNumber,
            id: Not(id.toString()),
          },
          select: { id: true },
        }),
        this.seatRepository.findOne({
          where: {
            auditoriumId: seat.auditoriumId,
            coordX,
            coordY,
            id: Not(id.toString()),
          },
          select: { id: true },
        }),
      ]);

    // Validate Loại ghế tồn tại
    if (!seatTypeExists) {
      throw new BadRequestException({
        errorCode: 'SEAT_TYPE_NOT_FOUND',
        message: `Loại ghế (seatTypeId = ${seatTypeId}) không tồn tại trên hệ thống`,
      });
    }

    // Validate trùng mã ghế trong phòng (uk_seats_auditorium_seat_number)
    if (duplicateNumber) {
      throw new ConflictException({
        errorCode: 'DUPLICATE_SEAT_NUMBER',
        message: `Mã ghế '${seatNumber}' đã được sử dụng trong phòng chiếu này`,
      });
    }

    // Validate trùng tọa độ ma trận UI (uk_seats_auditorium_coords)
    if (duplicateCoords) {
      throw new ConflictException({
        errorCode: 'DUPLICATE_GRID_COORDINATES',
        message: `Tọa độ Grid (X: ${coordX}, Y: ${coordY}) đã bị chiếm dụng bởi một ghế khác trong phòng này`,
      });
    }

    // 3. Thực hiện gán dữ liệu cập nhật
    Object.assign(seat, updateSeatDto);

    // 4. Lưu lại vào DB
    return await this.seatRepository.save(seat);
  }
}
