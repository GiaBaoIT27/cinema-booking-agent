import { Injectable, BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';
import { IPaymentGateway } from './payment-gateway.interface.js';
import { VnPayGateway } from './vnpay/vnpay.gateway.js';

@Injectable()
export class PaymentGatewayRegistry {
  private readonly gateways = new Map<PaymentMethod, IPaymentGateway>();

  constructor(private readonly vnPayGateway: VnPayGateway) {
    this.register(PaymentMethod.VNPAY, this.vnPayGateway);
  }

  register(method: PaymentMethod, gateway: IPaymentGateway): void {
    this.gateways.set(method, gateway);
  }

  getGateway(method: PaymentMethod): IPaymentGateway {
    const gateway = this.gateways.get(method);
    if (!gateway) {
      throw new BadRequestException({
        errorCode: 'GATEWAY_NOT_SUPPORTED',
        message: `Cổng thanh toán ${method} chưa được hỗ trợ trên hệ thống`,
      });
    }
    return gateway;
  }
}

