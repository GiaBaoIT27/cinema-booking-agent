# Cinema frontend

This is the Next.js application for the cinema booking web interface. The current Foundation slice has a temporary shell at `/` with Vietnamese/English and light/dark controls. Home content and fixture interactions are added in later M1 tasks. It does not contact the backend.

## Requirements

- Node.js 24 (`>=24 <25`)
- npm 11.17.0

From `apps/cinema-frontend`, install the pinned dependencies and run the app:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. The initial preference is Vietnamese with the light theme. The controls update the page in the current session and save one-year `mba_locale` and `mba_theme` cookies when the browser permits it. The server reads those cookies on a later request.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e -- e2e/shell.spec.ts e2e/preferences.spec.ts
```

The browser tests start the production build on port 3100. Run `npm run build` before them. `test:e2e:error` and `test:visual` are reserved for the later Home tests.

## Fonts and design tokens

`src/styles/theme.css` maps the Foundation colors to runtime variables for each theme. The original values and the approved M1 contrast changes are recorded in the [token snapshot](../../docs/05-specs/m1-foundation-home.tokens.json). `src/app/globals.css` exposes semantic Tailwind colors, font roles and radius values.

The app bundles the same Inter and Roboto Slab variable fonts locally through `next/font/local`. The build host could fetch Google Fonts CSS through its shell proxy, but `next/font/google` could not fetch it during `next build`. Local files make builds independent of that proxy. Updating a font now requires updating the bundled file and its license.

| Font | Source | Included weights | License | SHA-256 |
| --- | --- | --- | --- | --- |
| Inter | [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/inter) | 400, 500, 600, 700 | [SIL Open Font License 1.1](src/fonts/Inter-OFL.txt) | `29160A80FF49DDCAB2C97711247E08B1FAB27A484A329CE8B813D820DC559031` |
| Roboto Slab | [Google Fonts source](https://github.com/google/fonts/tree/main/apache/robotoslab) | 600, 700 | [Apache License 2.0](src/fonts/RobotoSlab-LICENSE.txt) | `786AE192477447D33C6672C3055FBA7CBFE45184C9A79E77A14F15716CA05B16` |

The variable font files include Latin and Vietnamese glyphs. See the [accepted M1 specification](../../docs/05-specs/m1-foundation-home.md) for the complete Home scope and responsive behavior.
