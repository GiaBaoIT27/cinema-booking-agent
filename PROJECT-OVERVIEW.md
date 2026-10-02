# Cinema Booking Agent — Project Overview

## Product

Build a cinema management and movie ticket booking system with an AI booking assistant. The repository reserves applications for the backend, customer and administration web experience, customer mobile experience, and AI agent.

This file owns the product foundation and confirmed direction. Read [CONTEXT.md](CONTEXT.md) for the current implementation state.

## Confirmed direction

- Keep the existing NestJS backend in `apps/cinema-backend`.
- Implement the web application with **Next.js + TypeScript** in `apps/cinema-frontend`, as selected by the project owner.
- For M1 Foundation + Home, the owner selected **Tailwind CSS**, fixture data with interactions before API integration, desktop plus responsive checks at 375/768/1024px, and minimal color corrections for AA contrast. The owner accepted the [written M1 specification](docs/05-specs/m1-foundation-home.md) on 2026-10-02.
- Use the [Movie Booking Agent Figma file](https://www.figma.com/design/8n7jzPDh8S4VuiemeEHUgE?node-id=2-2) as the visual design source, with frame selection and behavior captured in accepted specifications.
- Application boundaries are organized in `apps/`. Shared documentation describes architecture, domain, API contracts and development procedures.

## Product scope

- Discover movies, cinemas and showtimes.
- Authenticate customers and manage their account and tickets.
- Select seats, obtain a server-confirmed hold, create an order, complete payment and access tickets.
- Provide AI-assisted discovery and booking interaction. The intended design keeps transaction authority in the backend.
- Retain backend cinema management and permission boundaries.

Scope describes the intended product, not a claim that every capability is implemented.

## Constraints

- Preserve existing API and authorization contracts unless a task explicitly changes them.
- Separate client selection, server hold, order, payment transaction and ticket validity.
- Treat AI suggestions and prototype outcomes as input or simulation, never proof of payment or ticket validity.
- Keep secrets outside tracked documentation and source.
- Record differences between Figma and implementation before selecting new behavior.

Canonical vocabulary lives in [the cinema domain](docs/03-product/cinema-domain.md). Current implementation constraints and proposed team practices are described in [Standards](docs/04-standards/README.md).

## Open decisions

- Which AI design is canonical: original, split view, adaptive, or inline conversation? Inline Conversation + E2E25 was proposed, not approved.
- Responsive scope for slices after M1; M1 includes desktop 1440 and phone/tablet layouts.
- Auth/session strategy, backend rendering integration and deployment target. M1 preference persistence is defined in its accepted spec, separate from authentication.
- Agent runtime/model/tool contracts and production payment gateways.
- How to reconcile design seat limits and hold/payment timing with existing backend behavior.

## Team workflow

Issue and Pull Request templates are available for task scope, review and verification. The team has not yet confirmed a mandatory tracking or branching workflow. Durable specifications and decisions belong in `docs/`; personal skills, prompts and AI orchestration remain local.
