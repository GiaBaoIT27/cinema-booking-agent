export class ShowtimeSummaryDto {
  id: number;
  movieId: number;
  auditoriumId: number;
  projectionType: string;
  audioLanguage: string;
  subtitleLanguage: string | null;
  startTime: Date;
  endTime: Date;
  status: string;
}
