---
status: current
last_verified: 2026-10-01
---

# Current Project Context

## Implementation boundary

- `apps/cinema-backend` is the only initialized application. It has NestJS source, an npm lockfile, build/lint/test configuration and local PostgreSQL/Redis infrastructure.
- `apps/cinema-frontend`, `apps/cinema-mobile` and `apps/cinema-agent` are placeholders. Next.js + TypeScript is confirmed direction for the frontend, not an installed runtime.
- There is no root package manager workspace or shared runtime package.
- Backend composition uses `CoreModule` and Identity, Catalog, Cinema Core and Sales aggregators. Module layouts still vary; see [architecture](docs/02-architecture/system-map.md).

## Current direction

Prepare the web application from the Figma design in independently verifiable slices. The first proposed slice is foundation + Home. There is no accepted feature specification or initialized frontend yet.

## Material limitations

- No tracked unit/E2E tests or CI workflow were found. Backend build, lint and server startup have not been verified in this checkout.
- The backend lint script references an absent `test/` directory. An empty test suite must not be reported as passing behavior verification.
- Payment handling currently includes a mock gateway. Production gateway integration and design payment-state coverage require separate work.
- Global request middleware, authentication and response envelopes affect frontend integration; see [HTTP contracts](docs/02-architecture/http-contracts.md).
- Figma includes several AI generations. Some designs are historical; canonical selection remains unresolved.
- The Figma page inventory found desktop designs and no frame named mobile/tablet/responsive. A complete responsive audit is still needed.
- Design and backend differences include hold duration and auth/payment endpoint coverage; see [design contract gaps](docs/03-product/design-contract-gaps.md).

## Read next

- [Project foundation](PROJECT-OVERVIEW.md)
- [Documentation map](docs/README.md)
- [Local development](docs/07-guides/local-development.md)
- Task scope and status: the team's chosen tracker or task discussion.

Update this projection when implementation reality changes. Keep detailed task progress separate from this project-state summary.
