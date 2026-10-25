import { Ticket } from '../entities/ticket.entity.js';
import { TicketStatus } from '../enums/ticket-status.enum.js';
import type { TransactionContext } from '../ports/transaction.port.js';

export interface NewTicketData {
  orderId: string;
  showtimeId: string;
  seatId: string;
  ticketCode: string;
  price: number;
  status: TicketStatus;
}

export interface TicketSearchCriteria {
  /** Có giá trị → chỉ lấy vé thuộc đơn hàng của user này. */
  ownerUserId?: string;
  orderId?: string;
  showtimeId?: string;
  status?: TicketStatus;
  /** Tìm gần đúng (ILIKE). */
  ticketCode?: string;
  page: number;
  limit: number;
}

export interface ITicketRepository {
  createMany(tickets: NewTicketData[], tx: TransactionContext): Promise<void>;

  /** Mới nhất trước. */
  search(
    criteria: TicketSearchCriteria,
  ): Promise<{ items: Ticket[]; total: number }>;
}

export const TICKET_REPOSITORY = Symbol('TICKET_REPOSITORY');
