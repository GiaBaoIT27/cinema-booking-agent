export class PaymentFailedEvent {
  constructor(
    public readonly orderId: string,
    public readonly amount: number,
    public readonly method: string,
    public readonly gatewayTxnRef: string,
    public readonly reason: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}

