# Cinema Domain

## Vocabulary

| Concept | Meaning |
| --- | --- |
| Movie | Catalog information; does not establish available seats |
| Cineplex / cinema | Cinema site represented by the backend cineplex model; map UI terminology explicitly |
| Auditorium | Physical screening room and seat geometry |
| Seat | Physical seat in an auditorium |
| Showtime | Movie screening in an auditorium at a specified time |
| Showtime seat | Seat state and pricing for a particular showtime |
| Local selection | Client intent before a backend-confirmed hold |
| Hold | Temporary backend-confirmed seat reservation with expiry |
| Order | Purchase intent and lifecycle; distinct from the hold and payment transaction |
| Payment transaction | Attempt/result recorded through backend payment handling |
| Ticket | Entitlement issued by backend order fulfillment with its own validity state |
| AI suggestion | Recommendation or highlighted candidate; not a selected seat or confirmed transaction |

## Current relationships

A movie has showtimes. A showtime uses an auditorium. A physical seat can have different availability for different showtimes. Booking changes require both seat ownership and showtime context.

Backend booking services coordinate Redis holds and database seat state. Order fulfillment creates ticket outcomes. Current order states include PENDING, PAID, EXPIRED, CANCELLED and REFUNDED; ticket states include VALID, CHECKED_IN and CANCELLED.

## Design intent versus implementation

The inspected Figma seat designs distinguish Available, Selected, Unavailable and Held; the UI must preserve those meanings. AI suggestions are separate from Selected. Hold timers must follow server-confirmed expiry, rather than starting from a click or a hardcoded screenshot value.

Figma describes a maximum of six selected seats and a 10-minute hold timer. Current backend hold duration is 11 minutes and order expiry is 10 minutes. These are different lifecycles, not interchangeable constants. See [design contract gaps](design-contract-gaps.md) before selecting behavior.

## Source navigation

- Auditorium/seat: `apps/cinema-backend/src/modules/cinemas/entities/`.
- Showtime/seat availability: `apps/cinema-backend/src/modules/showtimes/domain/entities/`.
- Holds: `apps/cinema-backend/src/modules/bookings/services/` and `constants/booking-redis.constant.ts`.
- Orders/tickets: `apps/cinema-backend/src/modules/orders/entities/` and `services/`.
- Payments: `apps/cinema-backend/src/modules/payments/`.

Use these locations to inspect the current behavior; accepted specs own changes to it.
