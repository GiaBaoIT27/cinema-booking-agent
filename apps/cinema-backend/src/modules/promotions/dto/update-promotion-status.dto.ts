import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdatePromotionStatusDto {
  @IsNotEmpty({ message: 'Trạng thái isActive không được để trống' })
  @IsBoolean({ message: 'isActive phải là kiểu boolean (true/false)' })
  isActive: boolean;
}
