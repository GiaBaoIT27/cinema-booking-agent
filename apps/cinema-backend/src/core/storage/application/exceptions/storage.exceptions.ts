import { BadGatewayException, BadRequestException } from '@nestjs/common';
import type { UploadViolation } from '../../domain/services/upload-policy.rules.js';

/** Thiếu file trong request (field "file"). */
export class MissingUploadFileException extends BadRequestException {
  constructor() {
    super('Thiếu file upload (field "file")');
  }
}

/** File sai loại hoặc quá lớn — thông điệp giữ nguyên như API cũ. */
export class InvalidUploadFileException extends BadRequestException {
  constructor(violation: UploadViolation) {
    super(
      violation.kind === 'UNSUPPORTED_TYPE'
        ? `Loại file không được hỗ trợ: ${violation.mimetype}. Chỉ nhận ${violation.allowedLabel}.`
        : `File vượt quá kích thước cho phép (tối đa ${violation.maxMegabytes}MB)`,
    );
  }
}

/** Nhà cung cấp lưu trữ (Cloudinary) từ chối / lỗi mạng khi upload. */
export class StorageUploadFailedException extends BadGatewayException {
  constructor() {
    super({
      errorCode: 'STORAGE_UPLOAD_FAILED',
      message: 'Không thể tải file lên dịch vụ lưu trữ, vui lòng thử lại sau',
    });
  }
}
