# Cinema Booking Agent

Cinema management and movie ticket booking, with a planned AI booking assistant.

## Start here

- [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md): product foundation and confirmed direction.
- [CONTEXT.md](CONTEXT.md): current implementation state and material limitations.
- [Documentation map](docs/README.md): architecture, domain, Standards, specs and procedures.

## Applications

| App | State |
| --- | --- |
| [Cinema Backend](apps/cinema-backend/README.md) | Initialized NestJS application; startup/build not verified in this checkout |
| [Cinema Frontend](apps/cinema-frontend/README.md) | M1 Foundation and Home fixture demo implemented; Next.js + TypeScript + Tailwind CSS |
| [Cinema Mobile](apps/cinema-mobile/README.md) | Not initialized; stack undecided |
| [Cinema Agent](apps/cinema-agent/README.md) | Not initialized; runtime/tool contracts undecided |

Dependencies are managed per app. There is no root npm workspace. PostgreSQL and Redis are provided by the root Docker Compose file.

## Local development

Clone the repository:

```sh
git clone https://github.com/GiaBaoIT27/cinema-booking-agent.git
cd cinema-booking-agent
```

Follow [local development](docs/07-guides/local-development.md) for Node requirements, environment setup, installation, infrastructure and app commands.

The current backend defaults to `http://localhost:3000/api/v1`. It requires PostgreSQL, Redis and valid development configuration, including Cloudinary credentials. Send `Accept: application/json`; see [HTTP contracts](docs/02-architecture/http-contracts.md).

## Documentation check

From the root:

```sh
node scripts/verify-docs.mjs
git diff --check
```

The checker validates shared documentation structure and local link targets. It does not verify application behavior or remote links. Backend test configuration exists, but no tests are tracked yet.

## Team development

Shared documentation lives in numbered `docs/` areas. It covers architecture, domain, API contracts, decisions and development procedures. Personal tool configuration is maintained separately.

The [contribution guide](docs/07-guides/contributing.md) and [Issue](.github/ISSUE_TEMPLATE/implementation-task.yml)/[PR](.github/PULL_REQUEST_TEMPLATE.md) templates are available for team review. Proposed practices are not recorded as agreements until both contributors confirm them.

For frontend work, read [Figma delivery](docs/07-guides/figma-delivery.md) and the [M1 acceptance record](docs/99-notes/m1-foundation-home-acceptance.md). The M1 responsive scope is fixed in the accepted spec; the canonical AI version for later slices remains open.

## Historical documentation

The root [structure.md](structure.md) and [frontend workflow pointer](docs/frontend-design-workflow.md) route readers to current documents and preserved historical notes. Do not use archived snapshots as current implementation authority.
