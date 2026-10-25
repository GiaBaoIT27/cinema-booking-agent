import { IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';

export class InitiatePaymentDto {
  @IsNotEmpty({ message: 'Mã đơn hàng orderId không được để trống' })
  orderId: string | number;

  @IsEnum(PaymentMethod, {
    message: 'Phương thức thanh toán không hợp lệ (VNPAY, MOMO, ZALOPAY...)',
  })
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  returnUrl?: string;
}

