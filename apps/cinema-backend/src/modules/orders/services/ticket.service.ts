import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../entities/ticket.entity.js';
import { Order } from '../entities/order.entity.js';
import { Showtime } from '#modules/showtimes/domain/entities/showtime.entity.js';
import { Movie } from '#modules/movies/entities/movie.entity.js';
import { Auditorium } from '#modules/cinemas/entities/auditorium.entity.js';
import { Seat } from '#modules/cinemas/entities/seat.entity.js';
import { GetTicketsQueryDto } from '../dto/get-tickets-query.dto.js';

export interface RequestUser {
  id: string | number;
  permissions?: string[];
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  async findAll(query: GetTicketsQueryDto, user: RequestUser): Promise<any> {
    const {
      orderId,
      showtimeId,
      status,
      ticketCode,
      page = 1,
      limit = 20,
    } = query;

    // 1. Kiểm tra phân quyền RBAC Data Scope
    const hasTicketViewPermission =
      user.permissions?.includes('ticket:view') ?? false;

    // 2. QueryBuilder kết nối thực thể chính xác thông qua Class Entity thay vì chuỗi cứng
    const qb = this.ticketRepository
      .createQueryBuilder('t')
      .innerJoin(Order, 'o', 't.order_id = o.id')
      .innerJoin(Showtime, 'st', 't.showtime_id = st.id')
      .innerJoin(Movie, 'm', 'st.movie_id = m.id')
      .innerJoin(Auditorium, 'a', 'st.auditorium_id = a.id')
      .innerJoin(Seat, 's', 't.seat_id = s.id');

    // 3. Phân cách luồng dữ liệu (Khách hàng thông thường chỉ thấy vé của mình)
    if (!hasTicketViewPermission) {
      qb.andWhere('o.user_id = :currentUserId', { currentUserId: user.id });
    }

    // 4. Áp dụng bộ lọc động nếu có (Dynamic Filters)
    if (orderId) {
      qb.andWhere('t.order_id = :orderId', { orderId });
    }
    if (showtimeId) {
      qb.andWhere('t.showtime_id = :showtimeId', { showtimeId });
    }
    if (status) {
      qb.andWhere('t.status = :status', { status });
    }
    if (ticketCode) {
      qb.andWhere('t.ticket_code ILIKE :ticketCode', {
        ticketCode: `%${ticketCode}%`,
      });
    }

    // 5. Đếm tổng số lượng phục vụ phân trang
    const totalItems = await qb.getCount();

    // 6. Lấy danh sách thô (getRawMany) để tối đa hóa hiệu năng hệ thống
    const offset = (page - 1) * limit;
    const rawItems = await qb
      .select([
        't.ticket_code AS "ticketCode"',
        't.order_id AS "orderId"',
        't.showtime_id AS "showtimeId"',
        't.price AS "price"',
        't.status AS "status"',
        't.checked_in_at AS "checkedInAt"',
        'm.title AS "movieTitle"',
        'a.name AS "auditoriumName"',
        's.seat_number AS "seatNumber"',
        'st.start_time AS "startTime"',
      ])
      .orderBy('t.created_at', 'DESC')
      .offset(offset)
      .limit(limit)
      .getRawMany();

    const totalPages = Math.ceil(totalItems / limit);

    // Trả ra plain object thô, nhường việc ép kiểu lại cho tầng Serialization của Controller
    return {
      data: rawItems,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }
}
