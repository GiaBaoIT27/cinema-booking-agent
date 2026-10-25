import { Injectable } from '@nestjs/common';

import { SeatTypesFacade } from '#modules/seat-types/public-api/index.js';
import type {
  ISeatTypeLookup,
  SeatTypeRef,
} from '../../application/ports/seat-type-lookup.port.js';

/** Adapter: dịch port ISeatTypeLookup sang public API của module `seat-types`. */
@Injectable()
export class SeatTypesFacadeAdapter implements ISeatTypeLookup {
  constructor(private readonly seatTypesFacade: SeatTypesFacade) {}

  exists(id: string): Promise<boolean> {
    return this.seatTypesFacade.exists(id);
  }

  existsAll(ids: string[]): Promise<boolean> {
    return this.seatTypesFacade.existsMany(ids);
  }

  findByIds(ids: string[]): Promise<SeatTypeRef[]> {
    return this.seatTypesFacade.findByIds(ids);
  }
}
