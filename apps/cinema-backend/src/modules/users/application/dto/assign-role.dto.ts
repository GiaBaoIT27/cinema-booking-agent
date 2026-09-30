import { IsString, IsOptional, IsNotEmpty, IsUUID } from 'class-validator';

export class AssignRoleDto {
  @IsNotEmpty({ message: 'Role ID is required.' })
  @IsString()
  roleId: string;

  @IsOptional()
  @IsString()
  cineplexId?: string;
}
