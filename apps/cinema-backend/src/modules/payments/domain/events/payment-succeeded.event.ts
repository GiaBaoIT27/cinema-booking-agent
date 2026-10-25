export class PaymentSucceededEvent {
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly method: string,
    public readonly gatewayTxnRef: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}

