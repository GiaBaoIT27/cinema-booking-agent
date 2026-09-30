import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes.enum.js';

/**
 * Exception nghiệp vụ chuẩn hóa — ném từ Application/Domain layer.
 * Rfc7807ExceptionFilter sẽ bóc tách `errorCode` từ response để trả về client.
 *
 * @example
 * throw new BusinessException(ErrorCode.BOOKING_SEAT_ALREADY_HELD, 'Ghế A1 đã được giữ bởi người khác.');
 */
export class BusinessException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ errorCode, message }, httpStatus);
  }
}
