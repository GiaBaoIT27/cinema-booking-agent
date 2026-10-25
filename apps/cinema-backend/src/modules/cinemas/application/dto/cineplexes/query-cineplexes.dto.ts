import {
  IsOptional,
  IsString,
  IsInt,
  IsIn,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CineplexStatus } from '../../../domain/enums/cineplex-status.enum.js';

/** Trạng thái cụm rạp hoặc 'ALL' (không lọc). */
export type CineplexStatusFilter = CineplexStatus | 'ALL';

export const CINEPLEX_STATUS_FILTERS: CineplexStatusFilter[] = [
  ...Object.values(CineplexStatus),
  'ALL',
];

export class QueryCineplexesDto {
  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'Mã Tỉnh/Thành phố phải là chuỗi hợp lệ' })
  provinceId?: string;

  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'Mã Xã/Phường phải là chuỗi hợp lệ' })
  wardId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Latitude phải là số thực' })
  @Min(-90, { message: 'Latitude từ -90 đến 90' })
  @Max(90, { message: 'Latitude từ -90 đến 90' })
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Longitude phải là số thực' })
  @Min(-180, { message: 'Longitude từ -180 đến 180' })
  @Max(180, { message: 'Longitude từ -180 đến 180' })
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Bán kính tìm kiếm phải là số thực' })
  @Min(0.1, { message: 'Bán kính tối thiểu là 0.1 km' })
  radiusKm: number = 10.0;

  @IsOptional()
  @IsIn(CINEPLEX_STATUS_FILTERS, {
    message: 'Trạng thái phải là ACTIVE, MAINTENANCE, CLOSED hoặc ALL',
  })
  status: CineplexStatusFilter = CineplexStatus.ACTIVE;

  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi' })
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên' })
  @Min(1, { message: 'Trang tối thiểu là 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số lượng bản ghi phải là số nguyên' })
  @Min(1, { message: 'Số lượng bản ghi tối thiểu là 1' })
  @Max(100, { message: 'Số lượng bản ghi tối đa là 100' })
  limit: number = 20;
}
