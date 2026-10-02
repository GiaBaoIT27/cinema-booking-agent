# Cinema frontend

This Next.js app runs the M1 Foundation and Home demo at `/`. It has Vietnamese and English copy, light and dark themes, ten fixture movies, local search previews, Quick Booking selections, and clearly labelled handoff dialogs. It does not call the backend, AI, Redis, or a database. A selection does not reserve a seat, take payment, or issue a ticket.

## Requirements

- Node.js 24 (`>=24 <25`)
- npm 11.17.0

From `apps/cinema-frontend`, install the pinned dependencies and run the app:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. The initial preference is Vietnamese with the light theme. Controls update immediately and save one-year `mba_locale` and `mba_theme` cookies when the browser permits it. Reloading reads those cookies on the server. Invalid cookie values fall back to the default for that preference. Changing either preference keeps the search draft and Quick Booking selection.

Search filters local fixture titles by text, release status, and genre. Quick Booking uses fixed demo dates (`2026-10-10` and `2026-10-11`); they are example showtimes, not current availability. Other destinations open a demo handoff. The `MBA_FIXTURE_SCENARIO=error-once` environment value is used by the isolated error test; normal runs use the ready fixture.

## Checks

After each frontend change, run the shared [frontend checks](AGENTS.md) in
order. The [frontend CI workflow](../../.github/workflows/frontend-ci.yml) runs
the same checks, starting at `format:check`:

```sh
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

The formatter skips generated build and test output, `next-env.d.ts`, the npm
lockfile, screenshot baselines, and original font and icon assets. Regenerate
those files with their tools when needed; do not edit them by hand.

After the build, run the browser checks locally:

```sh
npx playwright install chromium
npm run test:e2e
npm run test:e2e:error
npm run test:visual
```

Run the browser suites after the build, in the order shown. Playwright starts the production server on `127.0.0.1:3100` and refuses to reuse an existing server there. The normal suite uses ready fixtures; the error suite starts a fresh server with the error-once fixture. Visual checks use Chromium, DPR 1, and reviewed Windows region baselines at 1440, 375, 768, and 1024 CSS pixels. The screenshot limit is 0.5% changed pixels on the same OS and font setup. The visual suite also checks responsive geometry and targets at 320px. Install the pinned Playwright Chromium if it is not present; do not regenerate snapshots simply to make a failure pass. Compare changed regions with the [accepted design](../../docs/05-specs/m1-foundation-home.md) before updating a baseline.

From the repository root, also run `node scripts/verify-docs.mjs` and `git diff --check`. The [M1 acceptance record](../../docs/99-notes/m1-foundation-home-acceptance.md) lists the observed checks, design comparison, and limits.

## Fonts and design tokens

`src/styles/theme.css` maps the Foundation colors to runtime variables for each theme. The original values and the approved M1 contrast changes are recorded in the [token snapshot](../../docs/05-specs/m1-foundation-home.tokens.json). `src/app/globals.css` exposes semantic Tailwind colors, font roles and radius values.

The app bundles the same Inter and Roboto Slab variable fonts locally through `next/font/local`. The build host could fetch Google Fonts CSS through its shell proxy, but `next/font/google` could not fetch it during `next build`. Local files make builds independent of that proxy. Updating a font now requires updating the bundled file and its license.

| Font        | Source                                                                             | Included weights   | License                                                | SHA-256                                                            |
| ----------- | ---------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------ |
| Inter       | [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/inter)         | 400, 500, 600, 700 | [SIL Open Font License 1.1](src/fonts/Inter-OFL.txt)   | `29160A80FF49DDCAB2C97711247E08B1FAB27A484A329CE8B813D820DC559031` |
| Roboto Slab | [Google Fonts source](https://github.com/google/fonts/tree/main/apache/robotoslab) | 600, 700           | [Apache License 2.0](src/fonts/RobotoSlab-LICENSE.txt) | `786AE192477447D33C6672C3055FBA7CBFE45184C9A79E77A14F15716CA05B16` |

The variable font files include Latin and Vietnamese glyphs. See the [accepted M1 specification](../../docs/05-specs/m1-foundation-home.md) for the complete Home scope and responsive behavior.
