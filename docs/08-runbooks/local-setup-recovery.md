# Local Setup Recovery

## Backend does not start

1. Confirm cwd is `apps/cinema-backend` and dependencies were installed from its lockfile.
2. Check the Node/npm engine error, if any. Do not suppress incompatible dependency engines.
3. From the root, use `docker compose ps` to inspect local PostgreSQL/Redis status.
4. Inspect the error for missing environment keys. Compare key names with tracked `.env.example`; do not print `.env` or paste credentials into the conversation.
5. Confirm local service ports and database connectivity. Do not reset volumes as a generic fix.

## Tests find no files

Unit tests are configured as `**/*.spec.ts` and E2E tests as `**/*.e2e-spec.ts`. No tests were found during normalization. Treat this as missing verification, not a successful behavior check. Add meaningful coverage in the task that changes behavior.

## Figma file unavailable

Confirm access to the linked file and selected screen/frame. Reopen the file or request access when necessary. Check the frame reference and capture a screenshot before implementation. Do not infer the whole file from one inspected screen.

## Documentation check fails

Run `node scripts/verify-docs.mjs` from any cwd; it resolves the repository from its own file location. Repair the reported missing file or local link. The preserved historical backend survey is excluded from current local-link checks.
