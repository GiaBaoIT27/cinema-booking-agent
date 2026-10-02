# Cinema Backend

NestJS backend for identity, movie catalog, cinema/showtime data and ticket sales.

## Setup

From the repository root, follow [local development](../../docs/07-guides/local-development.md) to start PostgreSQL/Redis and configure the local environment.

Install dependencies from this directory:

```sh
npm ci
npm run start:dev
```

Default API: `http://localhost:3000/api/v1`. The environment validator requires Cloudinary configuration. Startup can synchronize the development database schema; it is not a read-only check.

## Commands

Run app scripts from `apps/cinema-backend`:

| Command | Purpose |
| --- | --- |
| `npm run build` | Compile into `dist/` |
| `npm run lint` | Run oxlint; the current script also references an absent `test/` directory |
| `npm run test` | Run unit tests matching `**/*.spec.ts` |
| `npm run test:e2e` | Run tests matching `**/*.e2e-spec.ts` |
| `npm run test:cov` | Run configured coverage |
| `npm run format` | Rewrite source formatting |
| `npm run db:seed` | Build and modify development data; not a validation command |

No test files are currently tracked. These commands are configuration inventory, not evidence of passing build/tests or successful server startup.

## Architecture and API

- [System map](../../docs/02-architecture/system-map.md)
- [HTTP contracts](../../docs/02-architecture/http-contracts.md)
- [Cinema domain](../../docs/03-product/cinema-domain.md)
- [Engineering Standards](../../docs/04-standards/engineering.md)

Start at `src/main.ts` and `src/app.module.ts`. Feature modules are composed through Identity, Catalog, Cinema Core and Sales aggregators; shared infrastructure lives in `src/core/`.

Send `Accept: application/json`. JWT/permission guards are global unless a route has explicit public metadata. Success/error envelopes are described in the HTTP contract document. Swagger dependencies are present, but no Swagger bootstrap/docs endpoint is established.

The current payment gateway includes mock handling. Production gateway integration and reconciliation contracts must be verified separately.
