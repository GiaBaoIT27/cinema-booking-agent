import { Injectable } from '@nestjs/common';

import { FnbFacade } from '#modules/fnb/public-api/index.js';
import type {
  FnbItemRef,
  IFnbCatalog,
} from '../../application/ports/fnb-catalog.port.js';

/** Adapter: dịch port IFnbCatalog sang public API của module `fnb`. */
@Injectable()
export class FnbFacadeAdapter implements IFnbCatalog {
  constructor(private readonly fnbFacade: FnbFacade) {}

  async findByIds(ids: string[]): Promise<FnbItemRef[]> {
    const items = await this.fnbFacade.findByIds(ids);
    return items.map((item) => ({
      id: String(item.id),
      name: item.name,
      basePrice: Number(item.basePrice),
      isActive: item.isActive,
    }));
  }
}
