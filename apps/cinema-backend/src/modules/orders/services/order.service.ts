import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Order } from '../entities/order.entity.js';
import { Ticket } from '../entities/ticket.entity.js';
import { OrderSeatDetail } from '../entities/order-seat-details.entity.js';
import { OrderFnbDetail } from '../entities/order-fnb-details.entity.js';
import { FnbItem } from '#modules/fnb/entities/fnb-item.entities.js';
import { CreateOrderDto } from '../dto/create-order.dto.js';
import { OrderStatus } from '../enums/order-status.enum.js';
import { PaymentMethod } from '../enums/payment-method.enum.js';
import { FnbDetailStatus } from '../enums/fnb-detail-status.enum.js';
import { TicketStatus } from '../enums/ticket-status.enum.js';
import { PromotionsService } from '#modules/promotions/promotions.service.js';
import { BookingService } from '#modules/bookings/services/booking.service.js';

// Đơn hàng PENDING hết hạn sau 10 phút nếu chưa thanh toán
const ORDER_EXPIRY_MINUTES = 10;

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(OrderSeatDetail)
    private readonly seatDetailRepository: Repository<OrderSeatDetail>,
    @InjectRepository(OrderFnbDetail)
    private readonly fnbDetailRepository: Repository<OrderFnbDetail>,
    @InjectRepository(FnbItem)
    private readonly fnbItemRepository: Repository<FnbItem>,
    private readonly promotionsService: PromotionsService,
    // Inject BookingService để validate ghế HOLDING & giải phóng ghế khi hủy đơn
    private readonly bookingService: BookingService,
  ) {}

  /**
   * POST /api/v1/orders - Khởi tạo đơn hàng PENDING từ các ghế đang được giữ (HOLDING)
   *
   * Luồng xử lý:
   *  1. Gọi BookingService.validateHoldingSeats() - kiểm tra ghế HOLDING hợp lệ & snapshot giá vé
   *  2. Validate & tính tiền F&B (nếu có)
   *  3. Áp dụng voucher qua PromotionsService (nếu có)
   *  4. Transaction: tạo Order + Ticket + OrderFnbDetail
   */
  async createOrder(userId: string, createDto: CreateOrderDto) {
    const { showtimeId, seatIds, fnbItems, voucherCode, channel } = createDto;
    const uniqueSeatIds = Array.from(new Set(seatIds)).map((id) =>
      id.toString(),
    );
    const now = new Date();

    // ==========================================
    // BƯỚC 1: VALIDATE GHẾ HOLDING (gọi BookingService - internal API)
    // ==========================================
    const bookingValidation = await this.bookingService.validateHoldingSeats({
      userId,
      showtimeId: showtimeId.toString(),
      seatIds: uniqueSeatIds,
    });

    if (!bookingValidation.isValid) {
      throw new BadRequestException({
        errorCode: 'SEATS_HOLD_EXPIRED_OR_INVALID',
        message:
          'Ghế giữ chỗ không hợp lệ hoặc đã hết hạn. Vui lòng chọn ghế trước khi tạo đơn.',
      });
    }

    // ==========================================
    // BƯỚC 2: VALIDATE & TÍNH TIỀN F&B (nếu có)
    // ==========================================
    let subtotalFnb = 0;
    const fnbDetailsToSave: Array<{
      fnbItemId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }> = [];

    if (fnbItems && fnbItems.length > 0) {
      const fnbItemIds = fnbItems.map((f) => f.fnbItemId.toString());
      const fnbEntities = await this.fnbItemRepository.findBy({
        id: In(fnbItemIds),
      });

      // Kiểm tra tất cả F&B item tồn tại và đang active
      for (const item of fnbItems) {
        const entity = fnbEntities.find(
          (e: FnbItem) => e.id === item.fnbItemId.toString(),
        );
        if (!entity) {
          throw new NotFoundException({
            errorCode: 'FNB_ITEM_NOT_FOUND',
            message: `Sản phẩm F&B với ID ${item.fnbItemId} không tồn tại`,
          });
        }
        if (!entity.isActive) {
          throw new BadRequestException({
            errorCode: 'FNB_ITEM_INACTIVE',
            message: `Sản phẩm F&B "${entity.name}" hiện không còn kinh doanh`,
          });
        }

        const itemSubtotal = Number(entity.basePrice) * item.quantity;
        subtotalFnb += itemSubtotal;

        fnbDetailsToSave.push({
          fnbItemId: entity.id,
          quantity: item.quantity,
          unitPrice: Number(entity.basePrice),
          subtotal: itemSubtotal,
        });
      }
    }

    // ==========================================
    // BƯỚC 3: ÁP DỤNG VOUCHER (nếu có)
    // ==========================================
    let discountAmount = 0;
    if (voucherCode && voucherCode.trim() !== '') {
      const orderAmount = bookingValidation.subtotalTickets + subtotalFnb;
      const promotionResult = await this.promotionsService.validateAndCalculate(
        {
          code: voucherCode,
          orderAmount,
        },
      );
      discountAmount = promotionResult.discountAmount;
    }

    // Tính số tiền cuối cùng
    const finalAmount = Math.max(
      0,
      bookingValidation.subtotalTickets + subtotalFnb - discountAmount,
    );
    const orderCode = this.generateOrderCode();
    const expiresAt = new Date(
      now.getTime() + ORDER_EXPIRY_MINUTES * 60 * 1000,
    );

    // ==========================================
    // BƯỚC 4: TRANSACTION - Tạo Order, Ticket, FnbDetail
    // ==========================================
    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        // Khởi tạo và lưu Order
        const order = transactionalEntityManager.create(Order, {
          orderCode,
          userId,
          showtimeId: showtimeId.toString(),
          channel,
          subtotalTickets: bookingValidation.subtotalTickets,
          subtotalFnb,
          discountAmount,
          finalAmount,
          status: OrderStatus.PENDING,
          expiresAt,
        });

        const savedOrder = await transactionalEntityManager.save(Order, order);

        // Lưu danh sách OrderSeatDetail (snapshot giá từ bookingValidation)
        const seatDetailEntities = bookingValidation.seats.map((seat) =>
          transactionalEntityManager.create(OrderSeatDetail, {
            orderId: savedOrder.id,
            showtimeId: showtimeId.toString(),
            seatId: seat.seatId,
            price: seat.price,
          }),
        );
        await transactionalEntityManager.save(
          OrderSeatDetail,
          seatDetailEntities,
        );

        // Lưu danh sách chi tiết F&B
        if (fnbDetailsToSave.length > 0) {
          const fnbEntities = fnbDetailsToSave.map((detail) =>
            transactionalEntityManager.create(OrderFnbDetail, {
              ...detail,
              orderId: savedOrder.id,
              status: FnbDetailStatus.PENDING,
            }),
          );
          await transactionalEntityManager.save(OrderFnbDetail, fnbEntities);
        }

        return {
          orderId: Number(savedOrder.id),
          orderCode: savedOrder.orderCode,
          showtimeId: Number(savedOrder.showtimeId),
          seatIds: uniqueSeatIds.map(Number),
          channel: savedOrder.channel,
          pricing: {
            subtotalTickets: Number(savedOrder.subtotalTickets),
            subtotalFnb: Number(savedOrder.subtotalFnb),
            discountAmount: Number(savedOrder.discountAmount),
            finalAmount: Number(savedOrder.finalAmount),
          },
          status: savedOrder.status,
          expiresAt: savedOrder.expiresAt,
          createdAt: savedOrder.createdAt,
        };
      },
    );
  }

  /**
   * POST /api/v1/orders/:id/cancel - User chủ động hủy đơn PENDING
   * Chỉ hủy được đơn PENDING của chính user; ghế về AVAILABLE, tickets + F&B details bị hủy.
   */
  async cancelOrder(userId: string, orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId.toString() },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException({
        errorCode: 'ORDER_NOT_FOUND',
        message: `Đơn hàng với ID ${orderId} không tồn tại`,
      });
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException({
        errorCode: 'ORDER_NOT_PENDING',
        message: `Chỉ có thể hủy đơn hàng ở trạng thái chờ thanh toán (trạng thái hiện tại: ${order.status})`,
      });
    }

    const seatDetails = await this.seatDetailRepository.find({
      where: { orderId: order.id },
    });
    const seatIds = Array.from(new Set(seatDetails.map((s) => s.seatId)));

    // Transaction: hủy order, fnb details
    await this.dataSource.transaction(async (manager) => {
      order.status = OrderStatus.CANCELLED;
      await manager.save(Order, order);

      await manager
        .createQueryBuilder()
        .update(OrderFnbDetail)
        .set({ status: FnbDetailStatus.CANCELLED })
        .where('orderId = :orderId', { orderId: order.id })
        .andWhere('status = :status', { status: FnbDetailStatus.PENDING })
        .execute();
    });

    // Giải phóng ghế ngoài transaction (BookingService quản lý seat state)
    if (seatIds.length > 0) {
      await this.bookingService.releaseSeatsForOrder({
        showtimeId: order.showtimeId,
        seatIds,
        userId: order.userId ?? undefined,
      });
    }

    return {
      orderId: Number(order.id),
      orderCode: order.orderCode,
      status: order.status,
      releasedSeatIds: seatIds.map((id) => Number(id)),
      message: 'Hủy đơn hàng thành công',
    };
  }

  /**
   * Hàm dọn dẹp đơn hàng hết hạn (Expired Order Cleanup)
   * Quét bảng orders, hủy đơn PENDING đã quá hạn thanh toán.
   * Đồng thời giải phóng ghế liên quan về trạng thái AVAILABLE.
   */
  async cleanupExpiredOrders(): Promise<number> {
    const now = new Date();

    const expiredOrders = await this.orderRepository.find({
      where: {
        status: OrderStatus.PENDING,
      },
    });

    // Lọc bằng code vì TypeORM một số version không hỗ trợ operator LessThan với timestamp tốt
    const reallyExpired = expiredOrders.filter(
      (o) => new Date(o.expiresAt) < now,
    );

    if (reallyExpired.length === 0) return 0;

    let count = 0;

    for (const order of reallyExpired) {
      const seatDetails = await this.seatDetailRepository.find({
        where: { orderId: order.id },
      });
      const seatIds = Array.from(new Set(seatDetails.map((s) => s.seatId)));

      try {
        // Transaction: hủy order, fnb details
        await this.dataSource.transaction(async (manager) => {
          order.status = OrderStatus.EXPIRED;
          await manager.save(Order, order);

          await manager
            .createQueryBuilder()
            .update(OrderFnbDetail)
            .set({ status: FnbDetailStatus.CANCELLED })
            .where('orderId = :orderId', { orderId: order.id })
            .andWhere('status = :status', { status: FnbDetailStatus.PENDING })
            .execute();
        });

        // Giải phóng ghế ngoài transaction (BookingService quản lý seat state)
        if (seatIds.length > 0) {
          await this.bookingService.releaseSeatsForOrder({
            showtimeId: order.showtimeId,
            seatIds,
            userId: order.userId ?? undefined,
          });
        }

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

  /**
   * GET /api/v1/orders/my - Danh sách đơn hàng của user hiện tại
   */
  async getMyOrders(userId: string) {
    const orders = await this.orderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return {
      data: orders.map((order) => this.mapOrderSummary(order)),
    };
  }

  /**
   * GET /api/v1/orders/:id - Chi tiết đơn hàng (chỉ chủ sở hữu đơn)
   */
  async getOrderById(userId: string, orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId.toString() },
      relations: { tickets: true, seatDetails: true, fnbDetails: true },
    });

    // Trả về NOT_FOUND cả khi đơn không thuộc sở hữu để tránh lộ ID của người khác
    if (!order || order.userId !== userId) {
      throw new NotFoundException({
        errorCode: 'ORDER_NOT_FOUND',
        message: `Đơn hàng với ID ${orderId} không tồn tại`,
      });
    }

    return {
      ...this.mapOrderSummary(order),
      seatIds: order.seatDetails.map((s) => Number(s.seatId)),
      tickets: order.tickets.map((t) => ({
        id: Number(t.id),
        ticketCode: t.ticketCode,
        seatId: Number(t.seatId),
        price: Number(t.price),
        status: t.status,
      })),
      fnbDetails: order.fnbDetails.map((f) => ({
        id: Number(f.id),
        fnbItemId: Number(f.fnbItemId),
        quantity: f.quantity,
        unitPrice: Number(f.unitPrice),
        subtotal: Number(f.subtotal),
        status: f.status,
      })),
    };
  }

  private mapOrderSummary(order: Order) {
    return {
      orderId: Number(order.id),
      orderCode: order.orderCode,
      showtimeId: Number(order.showtimeId),
      channel: order.channel,
      paymentMethod: order.paymentMethod,
      pricing: {
        subtotalTickets: Number(order.subtotalTickets),
        subtotalFnb: Number(order.subtotalFnb),
        discountAmount: Number(order.discountAmount),
        finalAmount: Number(order.finalAmount),
      },
      status: order.status,
      expiresAt: order.expiresAt,
      createdAt: order.createdAt,
    };
  }

  /**
   * Cập nhật trạng thái đơn hàng khi thanh toán thành công,
   * sinh Ticket (vé thật) và chốt ghế sang trạng thái BOOKED.
   */
  async fulfillOrder(orderId: number, paymentMethod: PaymentMethod) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId.toString() },
      relations: { seatDetails: true },
    });

    if (!order) {
      throw new NotFoundException({
        errorCode: 'ORDER_NOT_FOUND',
        message: `Đơn hàng với ID ${orderId} không tồn tại`,
      });
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException({
        errorCode: 'ORDER_ALREADY_PROCESSED',
        message: `Đơn hàng đã được xử lý (trạng thái: ${order.status})`,
      });
    }

    const seatIds = order.seatDetails.map((s) => s.seatId);

    await this.dataSource.transaction(async (manager) => {
      // 1. Cập nhật Order
      order.status = OrderStatus.PAID;
      order.paymentMethod = paymentMethod;
      await manager.save(Order, order);

      // 2. Sinh Ticket thực tế
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const ticketEntities = order.seatDetails.map((seat) => {
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return manager.create(Ticket, {
          orderId: order.id,
          showtimeId: order.showtimeId,
          seatId: seat.seatId,
          ticketCode: `TKT-${dateStr}-${random}`,
          price: seat.price,
          status: TicketStatus.VALID,
        });
      });
      await manager.save(Ticket, ticketEntities);
    });

    // 3. Chốt ghế: HOLDING -> BOOKED (kèm dọn Redis Hash + Lock của người mua)
    if (seatIds.length > 0) {
      const bookedCount = await this.bookingService.markSeatsAsBooked(
        order.showtimeId,
        seatIds,
        order.userId ?? undefined,
      );

      this.logger.log(
        `[Order] Đã chốt ${bookedCount}/${seatIds.length} ghế sang BOOKED cho đơn hàng ${order.orderCode}`,
      );
    }

    return order;
  }

  // Sinh mã đơn hàng dạng: ORD-20260924-X7K2P9 (6 ký tự -> ít khả năng trùng unique constraint)
  private generateOrderCode(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${dateStr}-${random}`;
  }
}
