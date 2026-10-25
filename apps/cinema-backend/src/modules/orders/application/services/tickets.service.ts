import { Injectable, Inject } from '@nestjs/common';

import { TICKET_REPOSITORY } from '../../domain/repositories/ticket.repository.interface.js';
import type { ITicketRepository } from '../../domain/repositories/ticket.repository.interface.js';
import { canViewAllTickets } from '../../domain/rules/order-rules.js';

import { TICKET_DISPLAY_LOOKUP } from '../ports/ticket-display-lookup.port.js';
import type { ITicketDisplayLookup } from '../ports/ticket-display-lookup.port.js';

import { QueryTicketsDto } from '../dto/query-tickets.dto.js';
import { toTicketListResponse } from '../mappers/ticket.mapper.js';

export interface TicketViewer {
  userId: string;
  permissions: string[];
}

@Injectable()
export class TicketsService {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: ITicketRepository,
    @Inject(TICKET_DISPLAY_LOOKUP)
    private readonly ticketDisplayLookup: ITicketDisplayLookup,
  ) {}

  // GET /api/v1/tickets
  async findAll(query: QueryTicketsDto, viewer: TicketViewer) {
    const { items, total } = await this.ticketRepository.search({
      // Không có quyền xem tất cả: chỉ thấy vé thuộc đơn hàng của chính mình
      ownerUserId: canViewAllTickets(viewer.permissions)
        ? undefined
        : viewer.userId,
      orderId: query.orderId?.toString(),
      showtimeId: query.showtimeId?.toString(),
      status: query.status,
      ticketCode: query.ticketCode,
      page: query.page,
      limit: query.limit,
    });

    const showtimeIds = [...new Set(items.map((ticket) => ticket.showtimeId))];
    const seatIds = [...new Set(items.map((ticket) => ticket.seatId))];

    const [showtimes, seats] = await Promise.all([
      this.ticketDisplayLookup.getShowtimeDisplayInfo(showtimeIds),
      this.ticketDisplayLookup.getSeatLabels(seatIds),
    ]);

    return toTicketListResponse(
      items,
      showtimes,
      seats,
      total,
      query.page,
      query.limit,
    );
  }
}
