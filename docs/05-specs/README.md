# 05 — Specifications

This area owns durable required behavior and contracts.

## M1 Foundation + Home

The project owner accepted the [M1 specification](m1-foundation-home.md) on 2026-10-02. It includes:

- Next.js + TypeScript and Tailwind CSS.
- Fixture data with interactions before API integration.
- Desktop layouts and responsive checks at 375/768/1024px.
- Minimal contrast corrections.

The [source token snapshot](m1-foundation-home.tokens.json) preserves the Figma values separately from the accepted M1 corrections. It is design documentation, not runtime configuration. The [implementation plan](../07-guides/m1-foundation-home-implementation-plan.md) maps the specification to files, interfaces and verification.

## Specification contents

A specification should identify:

- Status: draft, accepted or superseded.
- Scope, actors and required behavior.
- Canonical Figma file/node references and relevant variants.
- Routes or UI blocks, interactions and recovery states.
- Data/API contracts and known dependencies.
- Responsive/accessibility requirements and observable acceptance criteria.

Keep implementation progress separate from specifications, using the team's chosen tracker or task discussion. The [Figma delivery guide](../07-guides/figma-delivery.md) describes a proposed implementation sequence, not an accepted feature specification.
