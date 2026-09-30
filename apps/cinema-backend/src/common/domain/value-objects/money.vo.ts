/**
 * Money Value Object — đóng gói số tiền + đơn vị tiền tệ.
 * Immutable: mọi phép tính đều trả về instance Money mới.
 * Dùng chung cho orders, payments, bookings.
 *
 * @example
 * const ticket = Money.of(150_000, 'VND');
 * const fnb    = Money.of(50_000, 'VND');
 * const total  = ticket.add(fnb);            // Money(200_000, VND)
 * const after  = total.multiply(0.9);        // Áp 10% discount → Money(180_000, VND)
 */
export class Money {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: string,
  ) {
    if (_amount < 0) {
      throw new Error(`Money amount cannot be negative: ${_amount}`);
    }
  }

  static of(amount: number, currency = 'VND'): Money {
    return new Money(Math.round(amount), currency.toUpperCase());
  }

  static zero(currency = 'VND'): Money {
    return new Money(0, currency.toUpperCase());
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(
        `Currency mismatch: cannot operate on ${this._currency} and ${other._currency}`,
      );
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    const result = this._amount - other._amount;
    if (result < 0) {
      throw new Error(
        `Subtraction would result in negative amount: ${this._amount} - ${other._amount}`,
      );
    }
    return new Money(result, this._currency);
  }

  /** Nhân với hệ số (ví dụ: số lượng hoặc tỷ lệ giảm giá). Kết quả làm tròn. */
  multiply(factor: number): Money {
    return new Money(Math.round(this._amount * factor), this._currency);
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount > other._amount;
  }

  isGreaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount >= other._amount;
  }

  isZero(): boolean {
    return this._amount === 0;
  }

  equals(other: Money): boolean {
    return this._currency === other._currency && this._amount === other._amount;
  }

  toString(): string {
    return `${this._amount} ${this._currency}`;
  }

  toJSON(): { amount: number; currency: string } {
    return { amount: this._amount, currency: this._currency };
  }
}
