# Backend HTTP Contracts

Observed in `apps/cinema-backend/src/main.ts`, `src/app.module.ts` and the `src/common/` middleware/interceptor/filter. These are current implementation facts, not a complete OpenAPI specification.

## Requests

- Default address: `http://localhost:3000/api/v1`; `PORT` changes the port. Bootstrap hardcodes `api/v1`.
- Send `Accept: application/json`. `header-validation.middleware.ts` rejects requests that do not meet this requirement with 406.
- JWT and permission guards are global. Inspect `@Public()` and permission metadata on the controller; never assume a callback or read endpoint is public.
- Global DTO validation enables whitelist/transform and produces 422 validation errors.

## Successful responses

`transform.interceptor.ts` wraps JSON responses as:

```ts
{
  success: true,
  code: number,
  message: string,
  data: unknown,
  pagination?: unknown,
  meta: { timestamp: string, requestId: string, path: string }
}
```

Paginated responses are normalized by the interceptor. Controllers should not create a second success envelope. Streamable file responses are handled separately.

## Errors

`rfc7807-exception.filter.ts` currently emits custom JSON:

```ts
{
  success: false,
  code: number,
  errorCode: string,
  message: string,
  errors?: Array<{ field: string, message: string }>,
  meta: { timestamp: string, requestId: string, path: string }
}
```

The filter name does not establish RFC 7807 compliance or an `application/problem+json` content type.

## Integration checkpoints

- Read controller + DTO + service before designing a frontend adapter.
- Auth currently exposes register/login. A service method alone does not establish a logout/refresh/OTP HTTP endpoint.
- Booking exposes hold/release/my-holds. Hold results include server expiry information.
- Payment exposes create-url/mock callback; inspect guard behavior and result handling before using it.
- Swagger dependencies exist, but no Swagger bootstrap was found in `main.ts`. Do not advertise a generated API docs route until implemented and verified.
