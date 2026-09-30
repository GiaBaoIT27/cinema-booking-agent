import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes.enum.js';
import { BusinessException } from './business.exception.js';

/**
 * Exception dùng khi resource không tìm thấy (HTTP 404).
 * Thay thế NotFoundException thô để kèm theo errorCode chuẩn.
 *
 * @example
 * throw new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND, `User ${id} không tồn tại.`);
 */
export class ResourceNotFoundException extends BusinessException {
  constructor(
    errorCode: ErrorCode = ErrorCode.RESOURCE_NOT_FOUND,
    message = 'Không tìm thấy tài nguyên yêu cầu.',
  ) {
    super(errorCode, message, HttpStatus.NOT_FOUND);
  }
}
