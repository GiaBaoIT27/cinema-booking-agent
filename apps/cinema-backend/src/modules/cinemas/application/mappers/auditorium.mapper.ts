import { Auditorium } from '../../domain/entities/auditorium.entity.js';

/** Phần tử trong danh sách GET /auditoriums (kèm tên cụm rạp). */
export function toAuditoriumListItem(auditorium: Auditorium) {
  return {
    ...toAuditoriumResponse(auditorium),
    cineplexName: auditorium.cineplex?.name || '',
  };
}

/** GET /auditoriums/:id — id trả về dạng string (giữ nguyên contract cũ). */
export function toAuditoriumDetail(auditorium: Auditorium) {
  return {
    id: auditorium.id,
    cineplex: {
      id: auditorium.cineplex.id,
      code: auditorium.cineplex.code,
      name: auditorium.cineplex.name,
    },
    code: auditorium.code,
    name: auditorium.name,
    screenType: auditorium.screenType,
    audioType: auditorium.audioType,
    totalSeats: auditorium.totalSeats,
    status: auditorium.status,
    createdAt: auditorium.createdAt,
    updatedAt: auditorium.updatedAt,
  };
}

/** POST /auditoriums và GET /cineplexes/:id/auditoriums */
export function toAuditoriumResponse(auditorium: Auditorium) {
  return {
    id: Number(auditorium.id),
    cineplexId: Number(auditorium.cineplexId),
    code: auditorium.code,
    name: auditorium.name,
    screenType: auditorium.screenType,
    audioType: auditorium.audioType,
    totalSeats: Number(auditorium.totalSeats),
    status: auditorium.status,
    createdAt: auditorium.createdAt,
    updatedAt: auditorium.updatedAt,
  };
}

/** PUT /auditoriums/:id — id/cineplexId trả về dạng string (giữ nguyên contract cũ). */
export function toAuditoriumUpdateResponse(auditorium: Auditorium) {
  return {
    id: auditorium.id,
    cineplexId: auditorium.cineplexId,
    code: auditorium.code,
    name: auditorium.name,
    screenType: auditorium.screenType,
    audioType: auditorium.audioType,
    totalSeats: auditorium.totalSeats,
    status: auditorium.status,
    createdAt: auditorium.createdAt,
    updatedAt: auditorium.updatedAt,
  };
}

/** PATCH /auditoriums/:id/status */
export function toAuditoriumStatusResponse(
  auditorium: Auditorium,
  reason?: string,
) {
  return {
    id: auditorium.id,
    code: auditorium.code,
    status: auditorium.status,
    reason: reason ?? null,
    updatedAt: auditorium.updatedAt,
  };
}
