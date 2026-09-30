/**
 * DateRange Value Object — đóng gói khoảng thời gian có điểm đầu và điểm cuối.
 * Immutable. Dùng cho: khoảng hiệu lực voucher, lịch chiếu phim, thống kê doanh thu.
 *
 * @example
 * const range = DateRange.of(new Date('2024-07-01'), new Date('2024-07-31'));
 * range.contains(new Date('2024-07-15')); // true
 * range.overlaps(otherRange);
 */
export class DateRange {
  private constructor(
    private readonly _from: Date,
    private readonly _to: Date,
  ) {
    if (_from >= _to) {
      throw new Error(
        `DateRange: from (${_from.toISOString()}) must be strictly before to (${_to.toISOString()})`,
      );
    }
  }

  static of(from: Date, to: Date): DateRange {
    return new DateRange(from, to);
  }

  get from(): Date {
    return new Date(this._from); // Trả bản sao tránh mutation ngoài VO
  }

  get to(): Date {
    return new Date(this._to);
  }

  /** Kiểm tra một thời điểm có nằm trong khoảng không (inclusive). */
  contains(date: Date): boolean {
    return date >= this._from && date <= this._to;
  }

  /** Kiểm tra hai khoảng thời gian có giao nhau không. */
  overlaps(other: DateRange): boolean {
    return this._from < other._to && this._to > other._from;
  }

  /** Số mili giây của khoảng thời gian. */
  durationMs(): number {
    return this._to.getTime() - this._from.getTime();
  }

  /** Số phút của khoảng thời gian (làm tròn xuống). */
  durationMinutes(): number {
    return Math.floor(this.durationMs() / 60_000);
  }

  equals(other: DateRange): boolean {
    return (
      this._from.getTime() === other._from.getTime() &&
      this._to.getTime() === other._to.getTime()
    );
  }

  toJSON(): { from: string; to: string } {
    return {
      from: this._from.toISOString(),
      to: this._to.toISOString(),
    };
  }
}
