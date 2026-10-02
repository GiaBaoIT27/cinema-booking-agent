# Engineering Standards

Status: technical constraints observed in source, with proposed development practices for team review. New conventions below are not recorded as jointly approved.

## Boundaries

- Preserve existing controller/DTO/response contracts unless a scoped task changes them.
- Aggregators MUST remain application composition modules. Feature-to-feature dependencies MUST NOT be routed through an aggregator.
- Use existing exported module contracts/facades when available. Follow the target module's actual layout; do not invent facades or normalize unrelated modules.
- Backend TypeScript internal imports MUST preserve the `.js` suffix required by its ESM/NodeNext configuration. Existing aliases are `#src/*` and `#modules/*`.

## API and data

- Preserve global authentication/permission enforcement. Public routes require explicit metadata and review.
- Preserve the existing response envelope and 422 validation behavior. Do not double-wrap success responses.
- Client and AI code MUST NOT fabricate server holds, successful payments or valid tickets.
- Seat geometry and availability MUST be driven by auditorium/showtime data, not a fixed Figma grid.
- Account for Redis and database state together when changing booking/order/payment behavior.
- Entity changes require inspection of consumers, seeds and synchronization/migration impact before execution against a database.

## UI implementation

These frontend practices are proposals based on the design. Confirm them in the relevant team specification before treating them as requirements.

- Theme and locale are independent concerns. Avoid four copies of page code for Light/Dark × VI/EN.
- Use Figma assets and token semantics for visual fidelity; adapt reference code to the project's chosen component/layout system.
- Loading, empty, disabled, validation and recovery states belong in the slice that needs them.
- Communicate important seat/payment states with text or markers as well as color; preserve keyboard and focus behavior.
- Establish responsive behavior in the slice specification; do not silently claim responsive parity from a desktop screenshot.

## Verification and documentation

The following practices are proposed for team review.

- Behavior changes need verification of observable behavior. Prefer focused regression/contract tests for transactional and auth changes; visual checks cover layout.
- A test runner finding no tests is not passing behavior verification.
- Report the actual cwd, command, result and unverified conditions. A successful docs checker does not prove that an application builds or runs.
- Update the canonical owner of changed durable knowledge; link to it instead of duplicating it.
- Secrets and customer data MUST NOT appear in tracked examples, logs or documentation.
