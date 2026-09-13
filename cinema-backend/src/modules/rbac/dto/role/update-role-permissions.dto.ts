import { IsArray, IsInt, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateRolePermissionsDto {
  @IsOptional()
  @IsArray({ message: 'Danh sách mã quyền (permissionIds) phải là một mảng.' })
  @IsInt({ each: true, message: 'Mỗi mã quyền trong mảng phải là số nguyên.' })
  @Transform(({ value }) =>
    Array.isArray(value) ? [...new Set(value)] : value,
  ) // Tự động loại bỏ ID trùng lặp
  permissionIds?: number[] = [];
}
