import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryRolePermissionsDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true) // Ép chuỗi "true" sang boolean thực tế
  @IsBoolean({
    message: 'Cờ gom nhóm (grouped) phải là giá trị logic true hoặc false.',
  })
  grouped?: boolean = false;

  @IsOptional()
  @IsString({ message: 'Phân hệ lọc (module) phải là chuỗi ký tự.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  module?: string;
}
