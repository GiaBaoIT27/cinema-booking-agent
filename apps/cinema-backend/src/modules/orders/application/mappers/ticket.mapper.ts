import { Ticket } from '../../domain/entities/ticket.entity.js';
import type {
  SeatLabelRef,
  ShowtimeDisplayRef,
} from '../ports/ticket-display-lookup.port.js';

/** GET /tickets – ghép vé (của orders) với thông tin hiển thị lấy từ module khác. */
export function toTicketListResponse(
  tickets: Ticket[],
  showtimes: ShowtimeDisplayRef[],
  seats: SeatLabelRef[],
  total: number,
  page: number,
  limit: number,
) {
  const showtimeById = new Map(showtimes.map((s) => [s.showtimeId, s]));
  const seatNumberById = new Map(seats.map((s) => [s.seatId, s.seatNumber]));

  return {
    data: tickets.map((ticket) => {
      const showtime = showtimeById.get(ticket.showtimeId);
      return {
        ticketCode: ticket.ticketCode,
        orderId: Number(ticket.orderId),
        showtimeId: Number(ticket.showtimeId),
        movieTitle: showtime?.movieTitle ?? null,
        auditoriumName: showtime?.auditoriumName ?? null,
        seatNumber: seatNumberById.get(ticket.seatId) ?? null,
        price: Number(ticket.price),
        status: ticket.status,
        startTime: showtime?.startTime ?? null,
        checkedInAt: ticket.checkedInAt,
      };
    }),
    pagination: {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
