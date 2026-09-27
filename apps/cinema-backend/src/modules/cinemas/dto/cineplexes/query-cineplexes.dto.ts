import {
  IsOptional,
  IsString,
  IsInt,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CineplexStatusQuery {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  CLOSED = 'CLOSED',
  ALL = 'ALL',
}

export class GetCineplexesQueryDto {
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
  @IsEnum(CineplexStatusQuery, {
    message: 'Trạng thái phải là ACTIVE, MAINTENANCE, CLOSED hoặc ALL',
  })
  status: CineplexStatusQuery = CineplexStatusQuery.ACTIVE;

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
