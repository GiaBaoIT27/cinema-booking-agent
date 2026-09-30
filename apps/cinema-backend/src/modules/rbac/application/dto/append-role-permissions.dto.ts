import { IsArray, IsInt, ArrayNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class AppendRolePermissionsDto {
  @IsArray({ message: 'Danh sách mã quyền (permissionIds) phải là một mảng.' })
  @ArrayNotEmpty({
    message: 'Danh sách mã quyền gán bổ sung không được để trống.',
  }) // Khớp lỗi EMPTY_PERMISSION_IDS_LIST [3.2]
  @IsInt({ each: true, message: 'Mỗi mã quyền trong mảng phải là số nguyên.' })
  @Transform(({ value }) =>
    Array.isArray(value) ? [...new Set(value)] : value,
  ) // Loại bỏ ID trùng lặp đầu vào
  permissionIds: number[];
}
