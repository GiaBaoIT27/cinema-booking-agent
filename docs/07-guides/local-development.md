# Local Development

## Prerequisites

Use Git, Node.js/npm and Docker Compose. The backend lockfile contains tooling engines requiring Node `^22.22.3 || ^24.15.0 || >=26.0.0`; Node 24.15+ within the Node 24 line is a compatible choice for that constraint. The repo does not currently pin a Node version. Check all installation engine errors rather than suppressing them.

Backend startup validates Cloudinary configuration and uses PostgreSQL/Redis. Discover settings from tracked `.env.example`, never by printing local secrets.

## Start infrastructure

From the repository root:

```sh
docker compose up -d
```

Ports 5432 and 6379 must be available. Compose starts PostgreSQL/Redis only.

## Configure and install backend

From `apps/cinema-backend`, create `.env` only if it is absent:

```powershell
if (-not (Test-Path -LiteralPath .env)) {
  Copy-Item -LiteralPath .env.example -Destination .env
}
npm ci
```

Set appropriate JWT secrets and valid Cloudinary development credentials in the local file. Configure the database/service values to match your development environment.

```sh
npm run start:dev
```

Default API address is `http://localhost:3000/api/v1`. Send `Accept: application/json`; see [HTTP contracts](../02-architecture/http-contracts.md).

Startup may synchronize schema outside production. Use a development database; do not point these commands at a shared or production database without a scoped operational plan.

## Commands

| CWD | Command | Meaning and current limitation |
| --- | --- | --- |
| Root | `node scripts/verify-docs.mjs` | Check shared documentation structure and local links |
| Root | `git diff --check` | Check tracked diff whitespace |
| Backend | `npm run build` | Build backend; requires installed dependencies |
| Backend | `npm run lint` | Existing oxlint script includes absent `test/`; inspect result |
| Backend | `npm run test` | Vitest unit configuration; no tests currently tracked |
| Backend | `npm run test:e2e` | Vitest E2E configuration; no tests currently tracked |
| Backend | `npm run test:cov` | Coverage configuration; no established coverage baseline |
| Backend | `npm run format` | Rewrites files; use only within authorized edit scope |
| Backend | `npm run db:seed` | Builds, bootstraps application modules and changes data |

Do not run seed as a verification command. No frontend/mobile/agent scripts exist yet. No application validation result is implied by this command inventory.

## Stop infrastructure

From the root:

```sh
docker compose down
```

Do not add `-v` unless deletion of the local database volume is explicitly intended.
