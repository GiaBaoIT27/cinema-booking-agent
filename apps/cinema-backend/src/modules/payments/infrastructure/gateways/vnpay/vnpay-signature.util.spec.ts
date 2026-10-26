import { describe, it, expect } from 'vitest';
import { VnPaySignatureUtil } from './vnpay-signature.util.js';

describe('VnPaySignatureUtil (Security & Cryptography)', () => {
  const secretKey = 'TEST_SECRET_KEY_123456';

  describe('sortObject', () => {
    it('should sort keys alphabetically and filter out empty/null/undefined values', () => {
      const input = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_Amount: 10000000,
        emptyField: '',
        nullField: null,
        undefinedField: undefined,
      };

      const sorted = VnPaySignatureUtil.sortObject(input);
      const keys = Object.keys(sorted);

      expect(keys).toEqual(['vnp_Amount', 'vnp_Command', 'vnp_Version']);
      expect(sorted['emptyField']).toBeUndefined();
      expect(sorted['nullField']).toBeUndefined();
      expect(sorted['undefinedField']).toBeUndefined();
    });

    it('should replace spaces with + in values according to VNPay spec', () => {
      const input = {
        vnp_OrderInfo: 'Thanh toan don hang #12345',
      };

      const sorted = VnPaySignatureUtil.sortObject(input);
      expect(sorted['vnp_OrderInfo']).toBe('Thanh+toan+don+hang+%2312345');
    });
  });

  describe('hmacSha512 and verifyChecksum', () => {
    it('should generate a valid 128-character hex string for HMAC-SHA512', () => {
      const hash = VnPaySignatureUtil.hmacSha512(
        secretKey,
        'vnp_Amount=100000',
      );
      expect(hash).toHaveLength(128);
      expect(hash).toMatch(/^[a-f0-9]{128}$/);
    });

    it('should correctly verify checksum when payload matches signature', () => {
      const params: Record<string, any> = {
        vnp_Amount: '10000000',
        vnp_Command: 'pay',
        vnp_TxnRef: 'ORD_99999',
      };

      const sorted = VnPaySignatureUtil.sortObject(params);
      const signData = VnPaySignatureUtil.createSignData(sorted);
      const secureHash = VnPaySignatureUtil.hmacSha512(secretKey, signData);

      // Payload returned from VNPay
      const queryFromVnPay = {
        ...params,
        vnp_SecureHash: secureHash,
        vnp_SecureHashType: 'SHA512',
      };

      const isValid = VnPaySignatureUtil.verifyChecksum(
        queryFromVnPay,
        secretKey,
      );
      expect(isValid).toBe(true);
    });

    it('should reject checksum if payload data has been tampered with', () => {
      const params: Record<string, any> = {
        vnp_Amount: '10000000',
        vnp_TxnRef: 'ORD_99999',
      };

      const sorted = VnPaySignatureUtil.sortObject(params);
      const signData = VnPaySignatureUtil.createSignData(sorted);
      const secureHash = VnPaySignatureUtil.hmacSha512(secretKey, signData);

      // Attacker tampered with amount from 100,000 VND to 1,000 VND
      const tamperedQuery = {
        vnp_Amount: '100000',
        vnp_TxnRef: 'ORD_99999',
        vnp_SecureHash: secureHash,
      };

      const isValid = VnPaySignatureUtil.verifyChecksum(
        tamperedQuery,
        secretKey,
      );
      expect(isValid).toBe(false);
    });

    it('should reject when vnp_SecureHash is missing', () => {
      const isValid = VnPaySignatureUtil.verifyChecksum(
        { vnp_Amount: '1000' },
        secretKey,
      );
      expect(isValid).toBe(false);
    });
  });
});
