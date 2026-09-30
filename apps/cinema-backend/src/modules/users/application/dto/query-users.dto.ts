import { IsOptional, IsEnum } from 'class-validator';
import { PaginationDto } from '#src/common/dto/pagination.dto.js';
import { UserStatus } from '../../domain/enums/user-status.enum.js';
import { MembershipTier } from '../../domain/enums/membership-tier.enum.js';

export class QueryUsersDto extends PaginationDto {
  @IsOptional()
  @IsEnum(MembershipTier, { message: 'Hạng thành viên lọc không hợp lệ.' })
  membershipTier?: MembershipTier;

  @IsOptional()
  @IsEnum(UserStatus, { message: 'Trạng thái tài khoản lọc không hợp lệ.' })
  status?: UserStatus;
}
