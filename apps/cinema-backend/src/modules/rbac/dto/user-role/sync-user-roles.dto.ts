import { IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AssignUserRoleDto } from './assign-user-role.dto.js';
import { UnprocessableEntityException } from '@nestjs/common';

export class SyncUserRolesDto {
  @IsArray({ message: 'Danh sách vai trò (roles) phải là một mảng.' })
  @IsNotEmpty({ message: 'Danh sách vai trò không được để trống.' })
  @ValidateNested({ each: true })
  @Type(() => AssignUserRoleDto)
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return value;

    // Kiểm tra trùng lặp bộ đôi (roleId + cineplexId)
    const seen = new Set<string>();
    for (const item of value) {
      const key = `${item.roleId}-${item.cineplexId ?? 'null'}`;
      if (seen.has(key)) {
        throw new UnprocessableEntityException({
          message: 'Request body chứa các vai trò và phạm vi rạp bị trùng lặp.',
          errorCode: 'DUPLICATE_ROLE_ASSIGNMENT_IN_REQUEST',
        });
      }
      seen.add(key);
    }
    return value;
  })
  roles: AssignUserRoleDto[];
}
