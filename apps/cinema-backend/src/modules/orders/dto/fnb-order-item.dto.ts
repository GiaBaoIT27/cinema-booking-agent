import { IsNotEmpty, IsInt, Min, Max } from 'class-validator';

export class FnbOrderItemDto {
  @IsNotEmpty({ message: 'fnbItemId không được để trống' })
  @IsInt({ message: 'fnbItemId phải là số nguyên' })
  fnbItemId: number;

  @IsNotEmpty({ message: 'quantity không được để trống' })
  @IsInt({ message: 'quantity phải là số nguyên' })
  @Min(1, { message: 'Số lượng F&B tối thiểu là 1' })
  @Max(20, { message: 'Số lượng F&B tối đa là 20' })
  quantity: number;
}
