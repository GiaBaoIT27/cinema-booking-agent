import { Distributor } from '../../domain/entities/distributor.entity.js';
import type { SettlementPeriod } from '../../domain/ports/settlement-lookup.port.js';
import type { DistributorMovieRow } from '../../domain/ports/movie-catalog.gateway.port.js';

const toIsoDate = (date: Date | string): string =>
  new Date(date).toISOString().split('T')[0];

/** "2025-01-01 đến 2025-03-31" — null khi chưa có kỳ đối soát nào. */
export function formatSettlementPeriod(
  period: SettlementPeriod | null,
): string | null {
  return period
    ? `${toIsoDate(period.startDate)} đến ${toIsoDate(period.endDate)}`
    : null;
}

/** Phần tử trong danh sách GET /distributors */
export function toDistributorListItem(distributor: Distributor) {
  return { ...distributor, id: Number(distributor.id) };
}

/** POST /distributors (updatedAt luôn null khi vừa tạo — giữ nguyên contract cũ) */
export function toDistributorCreateResponse(distributor: Distributor) {
  return {
    id: Number(distributor.id),
    name: distributor.name,
    taxCode: distributor.taxCode,
    address: distributor.address,
    contactPerson: distributor.contactPerson,
    contactEmail: distributor.contactEmail,
    contactPhone: distributor.contactPhone,
    bankAccountNumber: distributor.bankAccountNumber,
    bankName: distributor.bankName,
    status: distributor.status,
    createdAt: distributor.createdAt,
    updatedAt: null,
  };
}

/** GET /distributors/:id */
export function toDistributorDetail(
  distributor: Distributor,
  totalDistributedMovies: number,
  lastSettlementPeriod: string | null,
) {
  return {
    id: Number(distributor.id),
    name: distributor.name,
    taxCode: distributor.taxCode,
    address: distributor.address,
    contactPerson: distributor.contactPerson,
    contactEmail: distributor.contactEmail,
    contactPhone: distributor.contactPhone,
    bankAccountNumber: distributor.bankAccountNumber,
    bankName: distributor.bankName,
    status: distributor.status,
    summaryStats: { totalDistributedMovies, lastSettlementPeriod },
    createdAt: distributor.createdAt,
    updatedAt: distributor.updatedAt,
  };
}

/** PUT /distributors/:id */
export function toDistributorUpdateResponse(distributor: Distributor) {
  return {
    id: Number(distributor.id),
    name: distributor.name,
    taxCode: distributor.taxCode,
    address: distributor.address,
    contactPerson: distributor.contactPerson,
    contactEmail: distributor.contactEmail,
    contactPhone: distributor.contactPhone,
    bankAccountNumber: distributor.bankAccountNumber,
    bankName: distributor.bankName,
    status: distributor.status,
    updatedAt: distributor.updatedAt,
  };
}

/** PATCH /distributors/:id/status */
export function toDistributorStatusResponse(
  distributor: Pick<Distributor, 'id' | 'status' | 'updatedAt'>,
) {
  return {
    id: Number(distributor.id),
    status: distributor.status,
    updatedAt: distributor.updatedAt,
  };
}

/** Phần tử trong GET /distributors/:id/movies (originalTitle → englishTitle theo spec). */
export function toDistributorMovieItem(movie: DistributorMovieRow) {
  return {
    id: Number(movie.id),
    title: movie.title,
    englishTitle: movie.originalTitle ?? null,
    durationMinutes: movie.durationMinutes,
    releaseDate: movie.releaseDate ? toIsoDate(movie.releaseDate) : null,
    ageRating: movie.ageRating,
    status: movie.status,
  };
}
