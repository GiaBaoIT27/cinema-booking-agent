// common/dto/pagination.dto.ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class PaginationDto {
  @IsOptional()
  @Type(() => Number) // query param luôn là string, cần transform sang number
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // chặn client xin limit=999999 làm quá tải DB
  limit: number = 10;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;

  /** Helper — dùng thẳng trong TypeORM .skip(offset) */
  get offset(): number {
    return (this.page - 1) * this.limit;
  }
}
