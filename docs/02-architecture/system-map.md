# System Map

Verified against source on 2026-10-01. Runtime operation has not been verified in this checkout.

## Application boundaries

The repository uses app directory boundaries, with npm dependencies managed per initialized app. It has no root workspace package configuration. Only the backend is initialized. The frontend direction is recorded in [ADR 0001](../06-decisions/0001-nextjs-typescript-frontend.md).

## Backend composition

Read `apps/cinema-backend/src/main.ts` for HTTP setup, then `src/app.module.ts` for application wiring.

| Composition module | Owns |
| --- | --- |
| `src/core/core.module.ts` | Event bus, logger, Redis, queue, mailer and storage infrastructure |
| `modules/aggregators/identity.module.ts` | Users, RBAC, Auth |
| `modules/aggregators/catalog.module.ts` | Genres, Distributors, Movies |
| `modules/aggregators/cinema-core.module.ts` | Locations, Seat Types, Cinemas, Showtimes |
| `modules/aggregators/sales.module.ts` | F&B, Promotions, Bookings, Orders, Payments, Notifications |

Aggregators assemble feature modules for the application. They do not re-export those modules for cross-feature dependency access.

## Navigation within a feature

Follow module registration → controller → DTO → service/use case → entity/repository. Inspect actual imports before describing dependencies.

- Auth and Showtimes use layered application/domain/infrastructure/presentation directories and `public/` entrypoints.
- Users and RBAC expose `public-api/` entrypoints.
- Several other modules retain flat or controller/service/entity layouts.
- Reuse existing public facade contracts when present. Comments mentioning a facade are not proof that it exists.
- `src/config/` owns configuration. `src/common/` owns cross-cutting HTTP concerns. `src/core/` owns infrastructure.
- `src/database/seeds/` owns seed scripts; seeding bootstraps application modules and changes database contents.

Do not force every module into a new directory pattern as part of a feature implementation.

## Data and runtime

- Root `docker-compose.yml` starts PostgreSQL 16 and Redis 7, not application processes.
- TypeORM entities load from registered modules. `src/config/database.config.ts` controls schema synchronization, which is enabled outside production.
- Source inspection did not establish a migration workflow or production deployment configuration.
- Redis stores session/hold data; database seat/order state must be considered together with Redis for transactional changes.
- Payment currently includes a mock gateway. Production integrations are not established by a listed gateway enum.

See [HTTP contracts](http-contracts.md), [cinema domain](../03-product/cinema-domain.md) and [design gaps](../03-product/design-contract-gaps.md) before frontend integration.
