import { Injectable } from '@nestjs/common';
import { FnbFacade } from '#modules/fnb/public-api/fnb.facade.js';

import type {
  FnbItemRow,
  IFnbCatalogGateway,
} from '../../application/ports/fnb-lookup.port.js';

/** Adapter: dịch port IFnbCatalogGateway sang public API của module `fnb`. */

@Injectable()
export class FnbFacadeAdapter implements IFnbCatalogGateway {
  constructor(private readonly fnbFacade: FnbFacade) {}

  findActiveItems(category?: string): Promise<FnbItemRow[]> {
    return this.fnbFacade.findActiveItems(category);
  }
}
