import { Cineplex } from '../../domain/entities/cineplex.entity.js';
import type { CineplexWithDistance } from '../../domain/repositories/cineplex.repository.interface.js';
import type { LocationRef } from '../ports/location-lookup.port.js';
import type { FnbItemRow } from '../ports/fnb-lookup.port.js';

const toNumberOrNull = (value: number | string | null): number | null =>
  value !== null ? Number(value) : null;

const toLocationResponse = (location: LocationRef | null) =>
  location
    ? {
        id: Number(location.id),
        code: location.code,
        name: location.name,
      }
    : null;

/** Phần tử trong danh sách GET /cineplexes */
export function toCineplexListItem({
  cineplex,
  distanceKm,
}: CineplexWithDistance) {
  return {
    id: Number(cineplex.id),
    code: cineplex.code,
    name: cineplex.name,
    provinceId: Number(cineplex.provinceId),
    wardId: Number(cineplex.wardId),
    address: cineplex.address,
    latitude: toNumberOrNull(cineplex.latitude),
    longitude: toNumberOrNull(cineplex.longitude),
    phoneNumber: cineplex.phoneNumber,
    status: cineplex.status,
    createdAt: cineplex.createdAt,
    updatedAt: cineplex.updatedAt,
    distanceKm: distanceKm !== null ? Number(distanceKm.toFixed(2)) : null,
  };
}

/** GET /cineplexes/:id */
export function toCineplexDetail(
  cineplex: Cineplex,
  province: LocationRef | null,
  ward: LocationRef | null,
) {
  return {
    id: Number(cineplex.id),
    code: cineplex.code,
    name: cineplex.name,
    address: cineplex.address,
    latitude: toNumberOrNull(cineplex.latitude),
    longitude: toNumberOrNull(cineplex.longitude),
    phoneNumber: cineplex.phoneNumber,
    status: cineplex.status,
    province: toLocationResponse(province),
    ward: toLocationResponse(ward),
    createdAt: cineplex.createdAt,
    updatedAt: cineplex.updatedAt,
  };
}

/** POST / PUT /cineplexes */
export function toCineplexResponse(cineplex: Cineplex) {
  return {
    id: Number(cineplex.id),
    code: cineplex.code,
    name: cineplex.name,
    provinceId: Number(cineplex.provinceId),
    wardId: Number(cineplex.wardId),
    address: cineplex.address,
    latitude: toNumberOrNull(cineplex.latitude),
    longitude: toNumberOrNull(cineplex.longitude),
    phoneNumber: cineplex.phoneNumber,
    status: cineplex.status,
    createdAt: cineplex.createdAt,
    updatedAt: cineplex.updatedAt,
  };
}

/** PATCH /cineplexes/:id/status */
export function toCineplexStatusResponse(
  cineplex: Pick<Cineplex, 'id' | 'code' | 'status' | 'updatedAt'>,
  reason?: string,
) {
  return {
    id: Number(cineplex.id),
    code: cineplex.code,
    status: cineplex.status,
    reason: reason ?? null,
    updatedAt: cineplex.updatedAt,
  };
}

/** GET /cineplexes/:id/fnb-items */
export function toFnbItemResponse(item: FnbItemRow) {
  return {
    id: Number(item.id),
    sku: item.sku,
    name: item.name,
    type: item.type,
    category: item.category,
    unit: item.unit,
    basePrice: Number(item.basePrice),
    imageUrl: item.imageUrl,
    description: item.description,
    isActive: item.isActive,
  };
}
