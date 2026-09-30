import { Expose, Type, Transform } from 'class-transformer';

export class TicketItemDto {
  @Expose()
  ticketCode: string;

  @Expose()
  @Transform(({ value }) => Number(value)) // Ép kiểu BigInt thô sang Number
  orderId: number;

  @Expose()
  @Transform(({ value }) => Number(value)) // Ép kiểu BigInt thô sang Number
  showtimeId: number;

  @Expose()
  movieTitle: string;

  @Expose()
  auditoriumName: string;

  @Expose()
  seatNumber: string;

  @Expose()
  @Transform(({ value }) => Number(value)) // Ép kiểu Decimal/Numeric sang Number
  price: number;

  @Expose()
  status: string;

  @Expose()
  startTime: Date;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : null)) // Ép chuỗi thời gian sang Date object an toàn
  checkedInAt: Date | null;
}

export class PaginationMetaDataDto {
  @Expose() page: number;
  @Expose() limit: number;
  @Expose() totalItems: number;
  @Expose() totalPages: number;
}

export class GetTicketsResponseDataDto {
  @Expose()
  @Type(() => TicketItemDto)
  data: TicketItemDto[];

  @Expose()
  @Type(() => PaginationMetaDataDto)
  pagination: PaginationMetaDataDto;
}
