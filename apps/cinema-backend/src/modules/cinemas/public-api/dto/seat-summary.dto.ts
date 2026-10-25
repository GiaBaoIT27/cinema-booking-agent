export class SeatSummaryDto {
  id: number;
  auditoriumId: number;
  seatTypeId: number;
  rowLabel: string;
  columnNumber: number;
  seatNumber: string;
  coordX: number;
  coordY: number;
  gridSpan: number;
  status: string;
}
