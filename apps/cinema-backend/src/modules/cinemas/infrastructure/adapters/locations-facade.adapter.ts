import { Injectable } from '@nestjs/common';

import { LocationsFacade } from '#modules/locations/public-api/index.js';
import type {
  ILocationLookup,
  LocationRef,
} from '../../application/ports/location-lookup.port.js';

/** Adapter: dịch port ILocationLookup sang public API của module `locations`. */
@Injectable()
export class LocationsFacadeAdapter implements ILocationLookup {
  constructor(private readonly locationsFacade: LocationsFacade) {}

  isWardInProvince(provinceId: string, wardId: string): Promise<boolean> {
    return this.locationsFacade.validateProvinceAndWard(provinceId, wardId);
  }

  findProvince(id: string): Promise<LocationRef | null> {
    return this.locationsFacade.getProvinceById(id);
  }

  findWard(id: string): Promise<LocationRef | null> {
    return this.locationsFacade.getWardById(id);
  }
}
