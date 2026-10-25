import {
  Injectable,
  NestMiddleware,
  NotAcceptableException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HeaderValidationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Bỏ qua kiểm tra Header Accept đối với Webhook/IPN hoặc Return URL từ cổng thanh toán bên thứ ba (VNPay, MoMo...)
    if (req.originalUrl && req.originalUrl.includes('/payments/vnpay')) {
      return next();
    }

    const acceptHeader = req.headers['accept'];

    // Bắt buộc tất cả các request phải chấp nhận phản hồi dạng JSON
    if (!acceptHeader || !acceptHeader.includes('application/json')) {
      throw new NotAcceptableException({
        message:
          'API chỉ hỗ trợ định dạng phản hồi application/json. Vui lòng bổ sung Header Accept.',
        errorCode: 'INVALID_ACCEPT_HEADER',
      });
    }

    next();
  }
}
