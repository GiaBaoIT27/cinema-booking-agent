import * as crypto from 'crypto';
import qs from 'qs';

export class VnPaySignatureUtil {
  /**
   * Chuẩn hóa và sắp xếp các tham số theo thứ tự bảng chữ cái alphabet theo chuẩn VNPay
   */
  static sortObject(obj: Record<string, any>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const str: string[] = [];

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        str.push(encodeURIComponent(key));
      }
    }
    str.sort();

    for (let key = 0; key < str.length; key++) {
      const originalKey = str[key];
      const val = obj[originalKey];
      if (val !== undefined && val !== null && val !== '') {
        sorted[originalKey] = encodeURIComponent(String(val)).replace(/%20/g, '+');
      }
    }
    return sorted;
  }

  /**
   * Tạo chuỗi dữ liệu ký (signData) bằng qs.stringify với encode: false
   */
  static createSignData(sortedData: Record<string, string>): string {
    return qs.stringify(sortedData, { encode: false });
  }

  /**
   * Tính mã HMAC-SHA512
   */
  static hmacSha512(secretKey: string, data: string): string {
    return crypto
      .createHmac('sha512', Buffer.from(secretKey, 'utf-8'))
      .update(Buffer.from(data, 'utf-8'))
      .digest('hex');
  }

  /**
   * Kiểm tra tính hợp lệ của chữ ký phản hồi từ VNPay (IPN / Return URL)
   */
  static verifyChecksum(
    query: Record<string, any>,
    secureSecret: string,
  ): boolean {
    const secureHash = query['vnp_SecureHash'];
    if (!secureHash) return false;

    // Loại bỏ các trường hash khỏi dữ liệu kiểm tra
    const cleanQuery = { ...query };
    delete cleanQuery['vnp_SecureHash'];
    delete cleanQuery['vnp_SecureHashType'];

    const sortedData = this.sortObject(cleanQuery);
    const signData = this.createSignData(sortedData);
    const checkHash = this.hmacSha512(secureSecret, signData);

    return checkHash.toLowerCase() === String(secureHash).toLowerCase();
  }
}
