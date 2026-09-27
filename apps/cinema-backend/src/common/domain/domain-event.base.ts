// src/shared-kernel/domain/domain-event.base.ts
import { v4 as uuidv4 } from 'uuid';

export abstract class BaseDomainEvent {
  /**
   * Định danh duy nhất cho từng sự kiện được bắn ra (Idempotency Key / Tracking)
   */
  public readonly eventId: string;

  /**
   * Thời điểm chính xác sự kiện này phát sinh trong hệ thống
   */
  public readonly occurredAt: Date;

  /**
   * ID của Aggregate Root hoặc Thực thể chính tạo ra sự kiện này (ví dụ: bookingId, orderId)
   */
  public abstract readonly aggregateId: string;

  constructor() {
    this.eventId = uuidv4();
    this.occurredAt = new Date();
  }

  /**
   * Tên gọi định danh duy nhất của Sự kiện để Event Bus phân luồng xử lý.
   * Doanh nghiệp thường dùng dạng: 'module_name.entity.action' (ví dụ: 'sales.booking.created')
   */
  public abstract getEventName(): string;
}
