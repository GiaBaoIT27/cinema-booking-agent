export class ShowtimesCancelledEvent {
  constructor(
    public readonly auditoriumId: string,
    public readonly showtimeIds: string[],
    public readonly reason: string,
    public readonly cancelledAt: Date = new Date(),
  ) {}
}
