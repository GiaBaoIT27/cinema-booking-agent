# Figma Delivery

## Design source

Use [Movie Booking Agent — UI Design](https://www.figma.com/design/8n7jzPDh8S4VuiemeEHUgE?node-id=2-2). The file has Foundations & Components, Screens and Prototype pages.

Map selected frames to routes or UI blocks, variants, interactions and API contracts. Confirm which design generation is canonical. `S10` is marked retired; payment frames include states rather than necessarily separate routes. Read [design gaps](../03-product/design-contract-gaps.md) before selecting behavior.

## Inspect a target screen

1. Read the frame, reusable components, token values and layout rules in Figma.
2. Capture a reference screenshot at the intended viewport.
3. Identify assets, text, interactions, loading/empty/error states and responsive behavior.
4. Compare the required data and actions with the backend controller, DTO and response contracts.

These steps can be performed directly in Figma or with a suitable design inspection tool. No particular plugin or skill is required by the repository.

## Proposed implementation sequence

The following sequence is a proposal for team review:

1. Foundation + Home: fonts, tokens, navigation and reusable component conventions.
2. Authentication and discovery: search, cinemas, movie details and showtimes.
3. Booking, payment and ticket: local selection, server hold, recovery and transaction outcomes.
4. Tickets/account and the selected AI experience, reusing transactional behavior.

Next.js + TypeScript is selected. For M1 Foundation + Home, the owner chose Tailwind CSS, fixture interactions before API integration, desktop plus responsive checks at 375/768/1024px, and minimal AA contrast corrections. Review the [M1 draft spec](../05-specs/m1-foundation-home.md) and [detailed audit](../03-product/figma-m1-audit-2026-10-02.md) before scaffolding.

Establish auth/session handling and responsive scope for later slices in their specifications. Use flexible layouts and durable local static assets. M1 keeps the Figma poster placeholders; map real artwork when integrating data. Share component behavior across theme/locale combinations.

## Verify

Compare screenshots at the same viewport and content for Light/VI, Light/EN, Dark/VI and Dark/EN. Check responsive layouts, keyboard/focus, text wrapping and loading/empty/error states. Verify hold conflicts, server expiry, changed availability and payment recovery in the slices that implement them.

Prototype transitions inform acceptance scenarios. Backend results determine actual holds, payment outcomes and ticket validity.
