import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { EventNames } from '#src/common/constants/event-names.constant.js';
import type { OrderPaidEventPayload } from '#src/common/events/index.js';
import { ORDER_REPOSITORY } from '../../domain/repositories/order.repository.interface.js';
import type { IOrderRepository } from '../../domain/repositories/order.repository.interface.js';
import { TICKET_DISPLAY_LOOKUP } from '../ports/ticket-display-lookup.port.js';
import type { ITicketDisplayLookup } from '../ports/ticket-display-lookup.port.js';
import { FNB_CATALOG } from '../ports/fnb-catalog.port.js';
import type { IFnbCatalog } from '../ports/fnb-catalog.port.js';
import { CUSTOMER_LOOKUP } from '../ports/customer-lookup.port.js';
import type { ICustomerLookup } from '../ports/customer-lookup.port.js';

/** Phát integration event `order.paid` sau khi đơn đã được chốt PAID và sinh vé. */
export interface IOrderPaidPublisher {
  /** Không ném lỗi: thất bại chỉ được ghi log, không ảnh hưởng luồng thanh toán. */
  publish(orderId: string): Promise<void>;
}

export const ORDER_PAID_PUBLISHER = Symbol('ORDER_PAID_PUBLISHER');

@Injectable()
export class OrderPaidPublisher implements IOrderPaidPublisher {
  private readonly logger = new Logger(OrderPaidPublisher.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    @Inject(TICKET_DISPLAY_LOOKUP)
    private readonly display: ITicketDisplayLookup,
    @Inject(FNB_CATALOG)
    private readonly fnbCatalog: IFnbCatalog,
    @Inject(CUSTOMER_LOOKUP)
    private readonly customers: ICustomerLookup,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async publish(orderId: string): Promise<void> {
    try {
      const payload = await this.buildPayload(orderId);
      if (!payload) return;
      this.eventEmitter.emit(EventNames.ORDER_PAID, payload);
    } catch (error) {
      this.logger.error(
        `[OrderPaid] Không phát được event cho đơn ${orderId}: ${String(error)}`,
      );
    }
  }

  async buildPayload(orderId: string): Promise<OrderPaidEventPayload | null> {
    const order = await this.orderRepository.findByIdWithDetails(orderId);
    if (!order || !order.userId) return null;

    const customer = await this.customers.findById(order.userId);
    if (!customer) {
      this.logger.warn(`[OrderPaid] Không tìm thấy khách của đơn ${order.orderCode}`);
      return null;
    }

    const tickets = order.tickets ?? [];
    const seatIds = [
      ...new Set([
        ...(order.seatDetails ?? []).map((s) => s.seatId),
        ...tickets.map((t) => t.seatId),
      ]),
    ];
    const fnbDetails = order.fnbDetails ?? [];

    const [showtimes, seatLabels, fnbItems] = await Promise.all([
      this.display.getShowtimeDisplayInfo([order.showtimeId]),
      this.display.getSeatLabels(seatIds),
      fnbDetails.length
        ? this.fnbCatalog.findByIds([...new Set(fnbDetails.map((f) => f.fnbItemId))])
        : Promise.resolve([]),
    ]);

    const showtime = showtimes[0];
    const labelBySeatId = new Map(seatLabels.map((s) => [s.seatId, s.seatNumber]));
    const nameByFnbId = new Map(fnbItems.map((f) => [f.id, f.name]));
    const label = (seatId: string) => labelBySeatId.get(seatId) ?? seatId;

    return {
      orderId: String(order.id),
      orderCode: order.orderCode,
      userId: String(order.userId),
      customerName: customer.fullName,
      customerEmail: customer.email,
      customerPhone: customer.phoneNumber ?? undefined,
      movieTitle: showtime?.movieTitle ?? '',
      cineplexName: showtime?.cineplexName ?? '',
      auditoriumName: showtime?.auditoriumName ?? '',
      startTime: showtime ? new Date(showtime.startTime).toISOString() : '',
      seats: (order.seatDetails ?? []).map((s) => label(s.seatId)),
      fnbItems: fnbDetails.map((f) => ({
        name: nameByFnbId.get(String(f.fnbItemId)) ?? `#${f.fnbItemId}`,
        quantity: f.quantity,
      })),
      totalAmount: Math.round(Number(order.finalAmount)),
      paidAt: new Date().toISOString(),
      // Nội dung QR = mã vé, giống QR hiển thị trên web/mobile
      tickets: tickets.map((t) => ({
        ticketCode: t.ticketCode,
        seatCode: label(t.seatId),
        qrPayload: t.ticketCode,
      })),
    };
  }
}
