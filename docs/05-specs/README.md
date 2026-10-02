# 05 — Specifications

This area owns durable required behavior and contracts. No feature specification has been accepted yet.

## M1 Foundation + Home

The [M1 specification](m1-foundation-home.md) is a draft for project-owner review. The owner confirmed:

- Next.js + TypeScript and Tailwind CSS.
- Fixture data with interactions before API integration.
- Desktop layouts and responsive checks at 375/768/1024px.
- Minimal contrast corrections.

Detailed behavior remains proposed until the owner approves the written spec. The [source token snapshot](m1-foundation-home.tokens.json) preserves the Figma values separately from proposed corrections. It is design documentation, not runtime configuration.

## Specification contents

A specification should identify:

- Status: draft, accepted or superseded.
- Scope, actors and required behavior.
- Canonical Figma file/node references and relevant variants.
- Routes or UI blocks, interactions and recovery states.
- Data/API contracts and known dependencies.
- Responsive/accessibility requirements and observable acceptance criteria.

Keep implementation progress separate from specifications, using the team's chosen tracker or task discussion. The [Figma delivery guide](../07-guides/figma-delivery.md) describes a proposed implementation sequence, not an accepted feature specification.
