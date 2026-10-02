---
status: current
last_verified: 2026-10-02
---

# Current Project Context

## Implementation boundary

- `apps/cinema-backend` has NestJS source, an npm lockfile, build/lint/test configuration and local PostgreSQL/Redis infrastructure. Its startup/build remain unverified in this checkout.
- `apps/cinema-frontend` is an initialized Next.js, TypeScript and Tailwind CSS app. Its M1 Home runs on local fixtures with VI/EN and Light/Dark preferences; its production build and browser runtime have been exercised. See the [frontend README](apps/cinema-frontend/README.md) and [M1 acceptance record](docs/99-notes/m1-foundation-home-acceptance.md).
- `apps/cinema-mobile` and `apps/cinema-agent` remain placeholders.
- There is no root package manager workspace or shared runtime package.
- Backend composition uses `CoreModule` and Identity, Catalog, Cinema Core and Sales aggregators. Module layouts still vary; see [architecture](docs/02-architecture/system-map.md).

## Current direction

The owner accepted the [M1 Foundation + Home specification](docs/05-specs/m1-foundation-home.md) on 2026-10-02. The [audit](docs/03-product/figma-m1-audit-2026-10-02.md) and [implementation plan](docs/07-guides/m1-foundation-home-implementation-plan.md) define the implemented fixture interactions, responsive layouts and minimal contrast corrections. API integration remains a later slice.

## Material limitations

- The frontend has unit, browser, accessibility and visual checks. No CI workflow is present. Backend build, lint and server startup have not been verified in this checkout.
- The backend lint script references an absent `test/` directory. An empty test suite must not be reported as passing behavior verification.
- Payment handling currently includes a mock gateway. Production gateway integration and design payment-state coverage require separate work.
- Global request middleware, authentication and response envelopes affect frontend integration; see [HTTP contracts](docs/02-architecture/http-contracts.md).
- Figma includes several AI generations. Some designs are historical; canonical selection remains unresolved.
- The Figma Screens inventory found desktop designs and no frame named mobile/tablet/responsive. The accepted M1 spec supplies the 375/768/1024px rules; later slices still need their own audit and rules.
- Design and backend differences include hold duration and auth/payment endpoint coverage; see [design contract gaps](docs/03-product/design-contract-gaps.md).

## Read next

- [Project foundation](PROJECT-OVERVIEW.md)
- [Documentation map](docs/README.md)
- [M1 Foundation + Home specification](docs/05-specs/m1-foundation-home.md)
- [M1 implementation plan](docs/07-guides/m1-foundation-home-implementation-plan.md)
- [Local development](docs/07-guides/local-development.md)
- Task scope and status: the team's chosen tracker or task discussion.

Update this projection when implementation reality changes. Keep detailed task progress separate from this project-state summary.
