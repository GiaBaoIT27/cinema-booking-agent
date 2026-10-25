import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
  vnpay: {
    tmnCode: process.env.VNPAY_TMN_CODE || 'DEMO_TMN',
    hashSecret: process.env.VNPAY_HASH_SECRET || 'DEMO_HASH_SECRET',
    url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:3000/api/v1/payments/vnpay/return',
    ipnUrl: process.env.VNPAY_IPN_URL || 'http://localhost:3000/api/v1/payments/vnpay/ipn',
  },
}));

