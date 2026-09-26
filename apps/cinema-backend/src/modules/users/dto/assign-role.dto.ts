import { IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignRoleDto {
  @Type(() => Number)
  @IsInt({ message: 'Mã vai trò (roleId) phải là số nguyên.' })
  @IsNotEmpty({ message: 'Mã vai trò không được để trống.' })
  roleId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Mã cụm rạp (cineplexId) phải là số nguyên.' })
  cineplexId?: number;
}
