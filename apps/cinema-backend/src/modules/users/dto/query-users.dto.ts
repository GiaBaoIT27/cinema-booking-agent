import { IsOptional, IsEnum, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { UserStatus } from '../enums/user-status.enum.js';
import { MembershipTier } from '../enums/membership-tier.enum.js';

export class QueryUsersDto {
  @IsOptional()
  @IsEnum(MembershipTier, { message: 'Hạng thành viên lọc không hợp lệ.' })
  membershipTier?: MembershipTier;

  @IsOptional()
  @IsEnum(UserStatus, { message: 'Trạng thái tài khoản lọc không hợp lệ.' })
  status?: UserStatus;

  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi ký tự.' })
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Số trang tối thiểu là 1.' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'Số lượng bản ghi trên một trang tối đa là 100.' })
  limit?: number = 20; // Mặc định là 20 bản ghi/trang
}
