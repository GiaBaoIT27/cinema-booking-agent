import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { validate as isUuid } from 'uuid';
import { ErrorCode } from '../constants/error-codes.enum.js';

/**
 * Pipe validate UUID v4 cho route param.
 * Dùng thay cho built-in ParseUUIDPipe để trả errorCode có cấu trúc.
 *
 * @example
 * @Get(':id')
 * findOne(@Param('id', ParseUuidPipe) id: string) {}
 */
@Injectable()
export class ParseUuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isUuid(value)) {
      throw new BadRequestException({
        errorCode: ErrorCode.INVALID_INPUT,
        message: `Giá trị '${value}' không phải là UUID hợp lệ.`,
      });
    }
    return value;
  }
}
