export interface ShowtimeDisplayRef {
  showtimeId: string;
  movieTitle: string | null;
  auditoriumName: string | null;
  startTime: Date;
}

export interface SeatLabelRef {
  seatId: string;
  seatNumber: string;
}

/**
 * Thông tin hiển thị trên vé (tên phim, phòng chiếu, giờ chiếu, số ghế) –
 * dữ liệu thuộc các module `showtimes`, `movies`, `cinemas`.
 */
export interface ITicketDisplayLookup {
  getShowtimeDisplayInfo(showtimeIds: string[]): Promise<ShowtimeDisplayRef[]>;

  getSeatLabels(seatIds: string[]): Promise<SeatLabelRef[]>;
}

export const TICKET_DISPLAY_LOOKUP = Symbol('TICKET_DISPLAY_LOOKUP');
