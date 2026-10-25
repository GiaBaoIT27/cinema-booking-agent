import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateFnbItemStatusDto {
  @IsNotEmpty({
    message: 'Trạng thái kinh doanh (isActive) không được để trống',
  })
  @IsBoolean({
    message: 'Trạng thái kinh doanh phải là kiểu boolean (true/false)',
  })
  isActive: boolean;
}
