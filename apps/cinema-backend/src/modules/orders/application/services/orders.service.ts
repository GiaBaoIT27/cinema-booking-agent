import { Injectable, Inject, Logger } from '@nestjs/common';

import { Order } from '../../domain/entities/order.entity.js';
import { OrderStatus } from '../../domain/enums/order-status.enum.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';
import { TicketStatus } from '../../domain/enums/ticket-status.enum.js';
import { UNIT_OF_WORK } from '../../domain/ports/transaction.port.js';
import type { IUnitOfWork } from '../../domain/ports/transaction.port.js';
import { ORDER_REPOSITORY } from '../../domain/repositories/order.repository.interface.js';
import type { IOrderRepository } from '../../domain/repositories/order.repository.interface.js';
import { TICKET_REPOSITORY } from '../../domain/repositories/ticket.repository.interface.js';
import type { ITicketRepository } from '../../domain/repositories/ticket.repository.interface.js';
import {
  calculateExpiresAt,
  calculateFinalAmount,
  generateOrderCode,
  generateTicketCode,
} from '../../domain/rules/order-rules.js';

import { SEAT_RESERVATION } from '../ports/seat-reservation.port.js';
import type { ISeatReservation } from '../ports/seat-reservation.port.js';
import { FNB_CATALOG } from '../ports/fnb-catalog.port.js';
import type { IFnbCatalog } from '../ports/fnb-catalog.port.js';
import { VOUCHER_CALCULATOR } from '../ports/voucher-calculator.port.js';
import type { IVoucherCalculator } from '../ports/voucher-calculator.port.js';

import { CreateOrderDto } from '../dto/create-order.dto.js';
import { FnbOrderItemDto } from '../dto/fnb-order-item.dto.js';
import type { OrderSnapshot } from '../dto/order-snapshot.dto.js';
import {
  toOrderCreatedResponse,
  toOrderListItem,
  toOrderDetail,
  toOrderCancelledResponse,
  toOrderSnapshot,
} from '../mappers/order.mapper.js';

import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';

const MY_ORDERS_LIMIT = 50;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: ITicketRepository,
    @Inject(SEAT_RESERVATION)
    private readonly seatReservation: ISeatReservation,
    @Inject(FNB_CATALOG)
    private readonly fnbCatalog: IFnbCatalog,
    @Inject(VOUCHER_CALCULATOR)
    private readonly voucherCalculator: IVoucherCalculator,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  private orderNotFound(orderId: string): BusinessException {
    return new BusinessException(
      ErrorCode.ORDER_NOT_FOUND,
      `Đơn hàng với ID ${orderId} không tồn tại`,
    );
  }

  /** Validate F&B (tồn tại, còn kinh doanh) và chốt giá snapshot. */
  private async buildFnbLines(fnbItems: FnbOrderItemDto[] | undefined) {
    const lines: {
      fnbItemId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];
    if (!fnbItems || fnbItems.length === 0) return { lines, subtotal: 0 };

    const ids = [...new Set(fnbItems.map((item) => String(item.fnbItemId)))];
    const catalog = await this.fnbCatalog.findByIds(ids);
    const catalogById = new Map(catalog.map((item) => [item.id, item]));

    let subtotal = 0;
    for (const item of fnbItems) {
      const fnbItem = catalogById.get(String(item.fnbItemId));
      if (!fnbItem) {
        throw new BusinessException(
          ErrorCode.FNB_ITEM_NOT_FOUND,
          `Sản phẩm F&B với ID ${item.fnbItemId} không tồn tại`,
        );
      }
      if (!fnbItem.isActive) {
        throw new BusinessException(
          ErrorCode.FNB_ITEM_INACTIVE,
          `Sản phẩm F&B "${fnbItem.name}" hiện không còn kinh doanh`,
        );
      }

      const lineSubtotal = fnbItem.basePrice * item.quantity;
      subtotal += lineSubtotal;
      lines.push({
        fnbItemId: fnbItem.id,
        quantity: item.quantity,
        unitPrice: fnbItem.basePrice,
        subtotal: lineSubtotal,
      });
    }
    return { lines, subtotal };
  }

  /**
   * POST /api/v1/orders - Khởi tạo đơn PENDING từ các ghế đang được giữ (HOLDING)
   *  1. Kiểm tra ghế HOLDING hợp lệ & lấy giá vé snapshot (bookings)
   *  2. Validate & tính tiền F&B (fnb)
   *  3. Áp voucher (promotions)
   *  4. Transaction: tạo Order + OrderSeatDetail + OrderFnbDetail
   * Vé (Ticket) chỉ được sinh khi thanh toán thành công (xem fulfillOrder).
   */
  async createOrder(userId: string, dto: CreateOrderDto) {
    const showtimeId = String(dto.showtimeId);
    const seatIds = [...new Set(dto.seatIds.map(String))];

    // 1. Ghế đang giữ
    const holding = await this.seatReservation.validateHolding({
      userId,
      showtimeId,
      seatIds,
    });
    if (!holding.isValid) {
      throw new BusinessException(
        ErrorCode.SEATS_HOLD_EXPIRED_OR_INVALID,
        'Ghế giữ chỗ không hợp lệ hoặc đã hết hạn. Vui lòng chọn ghế trước khi tạo đơn.',
      );
    }

    // 2. F&B
    const fnb = await this.buildFnbLines(dto.fnbItems);

    // 3. Voucher
    let discountAmount = 0;
    if (dto.voucherCode && dto.voucherCode.trim() !== '') {
      discountAmount = await this.voucherCalculator.calculateDiscount(
        dto.voucherCode,
        holding.subtotalTickets + fnb.subtotal,
      );
    }

    // 4. Tạo đơn
    const now = new Date();
    const order = await this.unitOfWork.run((tx) =>
      this.orderRepository.createPending(
        {
          order: {
            orderCode: generateOrderCode(now),
            userId,
            showtimeId,
            channel: dto.channel,
            subtotalTickets: holding.subtotalTickets,
            subtotalFnb: fnb.subtotal,
            discountAmount,
            finalAmount: calculateFinalAmount(
              holding.subtotalTickets,
              fnb.subtotal,
              discountAmount,
            ),
            expiresAt: calculateExpiresAt(now),
          },
          seats: holding.seats.map((seat) => ({
            seatId: seat.seatId,
            price: seat.price,
          })),
          fnbItems: fnb.lines,
        },
        tx,
      ),
    );

    return toOrderCreatedResponse(order, seatIds);
  }

  /**
   * Chuyển đơn PENDING sang trạng thái kết thúc (CANCELLED/EXPIRED), hủy F&B chưa nhận,
   * rồi giải phóng ghế (ngoài transaction vì bookings quản lý trạng thái ghế).
   */
  private async closePendingOrder(
    order: Order,
    finalStatus: OrderStatus.CANCELLED | OrderStatus.EXPIRED,
  ): Promise<string[]> {
    const seatIds = await this.orderRepository.findSeatIds(order.id);

    await this.unitOfWork.run(async (tx) => {
      order.status = finalStatus;
      await this.orderRepository.save(order, tx);
      await this.orderRepository.cancelPendingFnbDetails(order.id, tx);
    });

    if (seatIds.length > 0) {
      await this.seatReservation.release({
        showtimeId: order.showtimeId,
        seatIds,
        userId: order.userId ?? undefined,
      });
    }
    return seatIds;
  }

  // POST /api/v1/orders/:id/cancel - chỉ hủy được đơn PENDING của chính user
  async cancelOrder(userId: string, orderId: string) {
    const order = await this.orderRepository.findById(orderId);
    if (!order || order.userId !== userId) throw this.orderNotFound(orderId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BusinessException(
        ErrorCode.ORDER_NOT_PENDING,
        `Chỉ có thể hủy đơn hàng ở trạng thái chờ thanh toán (trạng thái hiện tại: ${order.status})`,
      );
    }

    const seatIds = await this.closePendingOrder(order, OrderStatus.CANCELLED);
    return toOrderCancelledResponse(order, seatIds);
  }

  /** Hủy các đơn PENDING quá hạn thanh toán và giải phóng ghế. Trả về số đơn đã hủy. */
  async cleanupExpiredOrders(): Promise<number> {
    const expiredOrders = await this.orderRepository.findExpiredPending(
      new Date(),
    );
    if (expiredOrders.length === 0) return 0;

    let count = 0;
    for (const order of expiredOrders) {
      try {
        await this.closePendingOrder(order, OrderStatus.EXPIRED);
        count++;
      } catch (err) {
        this.logger.error(
          `[cleanupExpiredOrders] Lỗi khi hủy đơn ${order.id}: ${err}`,
        );
      }
    }

    this.logger.log(`[Cleanup] Đã hủy ${count} đơn hàng hết hạn thanh toán`);
    return count;
  }

  // GET /api/v1/orders/my
  async getMyOrders(userId: string) {
    const orders = await this.orderRepository.findByUser(
      userId,
      MY_ORDERS_LIMIT,
    );
    return orders.map(toOrderListItem);
  }

  // GET /api/v1/orders/:id - chỉ chủ sở hữu đơn
  async getOrderById(userId: string, orderId: string) {
    const order = await this.orderRepository.findByIdWithDetails(orderId);

    // NOT_FOUND cả khi đơn thuộc người khác để không lộ ID
    if (!order || order.userId !== userId) throw this.orderNotFound(orderId);

    return toOrderDetail(order);
  }

  /**
   * Thanh toán thành công (gọi bởi payments qua OrdersFacade):
   * PENDING -> PAID, sinh vé, chốt ghế HOLDING -> BOOKED.
   */
  async fulfillOrder(
    orderId: string,
    paymentMethod: PaymentMethod,
  ): Promise<OrderSnapshot> {
    const order = await this.orderRepository.findByIdWithSeatDetails(orderId);
    if (!order) throw this.orderNotFound(orderId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BusinessException(
        ErrorCode.ORDER_ALREADY_PROCESSED,
        `Đơn hàng đã được xử lý (trạng thái: ${order.status})`,
      );
    }

    const seatIds = order.seatDetails.map((seat) => seat.seatId);

    await this.unitOfWork.run(async (tx) => {
      order.status = OrderStatus.PAID;
      order.paymentMethod = paymentMethod;
      await this.orderRepository.save(order, tx);

      const now = new Date();
      await this.ticketRepository.createMany(
        order.seatDetails.map((seat) => ({
          orderId: order.id,
          showtimeId: order.showtimeId,
          seatId: seat.seatId,
          ticketCode: generateTicketCode(now),
          price: seat.price,
          status: TicketStatus.VALID,
        })),
        tx,
      );
    });

    // Chốt ghế (kèm dọn trạng thái giữ tạm thời của người mua)
    if (seatIds.length > 0) {
      const bookedCount = await this.seatReservation.markBooked(
        order.showtimeId,
        seatIds,
        order.userId ?? undefined,
      );
      this.logger.log(
        `[Order] Đã chốt ${bookedCount}/${seatIds.length} ghế sang BOOKED cho đơn hàng ${order.orderCode}`,
      );
    }

    return toOrderSnapshot(order);
  }

  /** Trạng thái hiện tại của đơn (dành cho payments). */
  async findSnapshotById(orderId: string): Promise<OrderSnapshot | null> {
    const order = await this.orderRepository.findById(orderId);
    return order ? toOrderSnapshot(order) : null;
  }
}
