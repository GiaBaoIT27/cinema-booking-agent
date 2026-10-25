export type CineplexStatus = "ACTIVE" | "MAINTENANCE" | "CLOSED";
export type CineplexStatusFilter = CineplexStatus | "ALL";

export const CINEPLEX_STATUS_LABEL: Record<CineplexStatus, string> = {
  ACTIVE: "Đang hoạt động",
  MAINTENANCE: "Bảo trì",
  CLOSED: "Đã đóng cửa",
};

interface CineplexBase {
  id: number;
  code: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phoneNumber: string | null;
  status: CineplexStatus;
  createdAt: string;
  updatedAt: string;
}

/** Item của GET /cineplexes: chỉ có id tỉnh/phường, kèm khoảng cách. */
export interface CineplexListItem extends CineplexBase {
  provinceId: number;
  wardId: number;
  /** null khi không gửi latitude/longitude. */
  distanceKm: number | null;
}

/** Dữ liệu của GET /cineplexes/:id: tỉnh/phường lồng nhau. */
export interface CineplexDetail extends CineplexBase {
  province: { id: number; code: string; name: string };
  ward: { id: number; code: string; name: string };
}

/** Query của GET /cineplexes (khớp QueryCineplexesDto ở backend). */
export interface CineplexListParams {
  provinceId?: string;
  wardId?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  status?: CineplexStatusFilter;
  search?: string;
  page?: number;
  limit?: number;
}

/** Query của GET /cineplexes/:id/showtimes (khớp QueryCineplexShowtimesDto). */
export interface CineplexShowtimesParams {
  /** YYYY-MM-DD */
  date?: string;
  movieId?: string;
}

export interface CineplexShowtimeItem {
  showtimeId: number;
  auditoriumId: number;
  auditoriumName: string;
  projectionType: string | null;
  startTime: string;
  endTime: string;
  status: string | null;
}

export interface CineplexMovieShowtimeGroup {
  movieId: number;
  movieTitle: string;
  posterUrl: string | null;
  durationMinutes: number;
  ageRating: string | null;
  showtimes: CineplexShowtimeItem[];
}
