import { apiClient } from "@/lib/api-client";
import type { InitiatePaymentPayload, PaymentSession } from "../types/payment.types";

export const paymentService = {
  /** POST /api/v1/payments/initiate */
  initiate(payload: InitiatePaymentPayload): Promise<PaymentSession> {
    return apiClient.post<PaymentSession>("/payments/initiate", payload);
  },
};

export type PaymentApi = Pick<typeof paymentService, "initiate">;
