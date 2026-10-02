# 0001 — Next.js + TypeScript Frontend

- Status: accepted
- Date: 2026-10-01
- Decision authority: explicit project-owner instruction in the Figma implementation discussion

## Context

The web application directory is not initialized. React/Vite and Next.js were discussed as possible directions for implementing the Figma web design.

## Decision

Use Next.js + TypeScript in `apps/cinema-frontend`.

## Rationale and consequences

The project owner selected this stack. The record does not infer a separate SEO, hosting or rendering requirement from that selection.

The implementation plan must establish the actual framework version, route/rendering boundaries, session strategy and verification commands. Keep NestJS as the existing backend boundary unless an authorized design changes it.

Follow-up on 2026-10-02: the owner accepted the [M1 spec](../05-specs/m1-foundation-home.md), including Tailwind CSS, fixture interactions, responsive scope and minimal contrast corrections. Auth/session strategy is still open.
