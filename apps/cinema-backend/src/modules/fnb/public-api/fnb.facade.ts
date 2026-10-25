import { Inject, Injectable } from '@nestjs/common';
import {
  FNB_REPOSITORY,
  type IFnbRepository,
} from '../domain/repositories/fnb.repository.interface.js';
import { toFnbItemSummary } from '../application/mappers/fnb-item.mapper.js';
import type { FnbItemSummaryDto } from './fnb-summary.dto.js';

/**
 * Cổng giao tiếp DUY NHẤT của module F&B với bên ngoài.
 * Chỉ trả về FnbItemSummaryDto – tuyệt đối không để lộ entity.
 */
@Injectable()
export class FnbFacade {
  constructor(
    @Inject(FNB_REPOSITORY)
    private readonly fnbRepository: IFnbRepository,
  ) {}

  /** Lấy snapshot giá hiện tại của các món F&B – dùng cho luồng tạo Order */
  async getItemsForOrder(ids: string[]): Promise<FnbItemSummaryDto[]> {
    const items = await this.fnbRepository.findByIds(ids);
    return items.map(toFnbItemSummary);
  }

  async findByIds(ids: string[]): Promise<FnbItemSummaryDto[]> {
    const items = await this.fnbRepository.findByIds(ids);
    return items.map(toFnbItemSummary);
  }

  async findActiveItems(category?: string): Promise<FnbItemSummaryDto[]> {
    const items = await this.fnbRepository.findActive(category);
    return items.map(toFnbItemSummary);
  }

  async findById(id: string | number): Promise<FnbItemSummaryDto | null> {
    const item = await this.fnbRepository.findById(id.toString());
    return item ? toFnbItemSummary(item) : null;
  }

  exists(id: string | number): Promise<boolean> {
    return this.fnbRepository.existsById(id.toString());
  }
}
