# M1 Foundation and Home acceptance

Date: 2026-10-02. Scope: the fixture-backed Home route `/` in `apps/cinema-frontend`. The accepted [specification](../05-specs/m1-foundation-home.md), [token record](../05-specs/m1-foundation-home.tokens.json), and [Figma audit](../03-product/figma-m1-audit-2026-10-02.md) define the target. This record covers M1 only; API, authentication, AI, seat holds, payment and valid tickets remain outside it.

## Source comparison before baseline approval

The four canonical 1440px Home frames were inspected against production Chromium captures after `document.fonts.ready`: Figma Light VI `33:6203`, Light EN `33:6047`, Dark VI `33:6518`, and Dark EN `33:6362` in file `8n7jzPDh8S4VuiemeEHUgE`. Source captures are design references, not app assets or pixel-test expected images. The same source-based geometry was checked after the responsive changes; the four measured desktop selector sets had no geometry drift.

| Frame | Source-to-runtime finding |
| --- | --- |
| Light VI `33:6203` | Two-line hero heading, VI copy, utility/navigation, Quick, AI, five colored Now Showing posters and five green Upcoming posters retain their order. Main blocks start at y164/508/714/866/1370. Approved VI genre translation and Light contrast colors differ from the source. |
| Light EN `33:6047` | One-line heading and EN copy shorten the hero. Main blocks start at y164/454/660/812/1316. Source poster titles, order and colors are retained. Approved contrast colors and initial disabled Quick action differ. |
| Dark VI `33:6518` | VI block geometry matches Light VI. Dark page/surface/brown AI roles and the dark primary button's `#07110a` text are retained. Upcoming uses the content placeholder `#355c4d`; translated genres and brighter tertiary text are approved changes. |
| Dark EN `33:6362` | EN block geometry matches Light EN. Now Showing retains five distinct poster colors; Upcoming keeps the uniform content color. Native select arrows, disabled Quick action, and corrected tertiary text are intentional changes. |

Shared measured desktop geometry: 1200px content, 44px utility, 72px navigation, hero columns 760/392 with 48px gap, 220×398px cards, 192×250px posters and 24px card gaps. Content-driven pages end after the cards rather than reproducing the Figma canvas's blank tail. Browser font rasterization and native select painting can differ from Figma. No claim of pixel-exact Figma equivalence follows from the regression threshold.

The reviewed [region baselines](../../apps/cinema-frontend/e2e/home.visual.spec.ts-snapshots/) contain 112 PNGs: seven regions × 1440/375/768/1024 × VI/EN × Light/Dark. The [visual test](../../apps/cinema-frontend/e2e/home.visual.spec.ts) sets cookies before navigation, waits for fonts, captures each locator with animations disabled, and compares on Windows Chromium at DPR 1 with at most 0.5% changed pixels. Its 20 separate responsive cases assert columns, poster ratio, overflow, wrapping, navigation and phone target sizes at 320/375/768/1024/1440. The PNGs are regression references for this platform/font setup, not independent evidence of design parity. Review against the four Figma frames is required before replacing them.

## Behavior, access and color evidence

The [normal browser suite](../../apps/cinema-frontend/e2e/) covers server-rendered preferences, cookie reload/fallback/blocked writes, search submissions and preview states, Quick dependencies and handoffs, navigation, locale updates, keyboard/dialog behavior, responsive layout, actual rendered contrast, and axe scans. The [error suite](../../apps/cinema-frontend/e2e/home.error.spec.ts) runs a fresh server with `MBA_FIXTURE_SCENARIO=error-once` and tests Retry with the submitted context. Each test has a fresh browser context. No application HTTP adapter or backend call is present in M1.

At 375px, visible phone controls measured at least 44×44px. Keyboard checks include native Quick select changes, Search/Quick/menu dialog Tab and Shift+Tab boundaries, Escape, focus return, menu handoff, resize, and reduced motion. The final focus repair keeps focus on the persistent Close button when keyboard Clear filters or View details replaces its focused action inside the still-open native modal. Focused browser tests cover Clear through loading and ready, View details, Tab/Shift+Tab, Escape to the original Search opener, and retention of focused locale/theme controls. The existing mobile menu test also covers immediate resize before Escape and restores the visible Menu trigger. The 320px reflow cases found no horizontal document scroll or clipped visible text. A separate genuine Chromium 200% profile-zoom check used two isolated browser profiles at the same 1440×1000 outer window: the CSS inner viewport changed from 1424×905 to 712×452, DPR from 1 to 2, while computed CSS zoom and `visualViewport.scale` remained 1. At 200%, the measured document width was 712/712 (scroll/client), controls and dialog remained usable, and full viewport captures showed the Quick helper, movie metadata and actions. This was a programmatic Chromium zoom preference check; a native Edge toolbar/shortcut check could not be completed. The 320px viewport test is separate reflow evidence.

Rendered enabled text pairs were read from Chromium computed foreground/opaque background (and `::placeholder` where applicable), including settled hover states. The measured scope is Home and its dialogs; this is not a whole-application accessibility certification. Disabled Quick text is excluded from enabled text contrast claims.

| Role/state | Light foreground/background; ratio | Dark foreground/background; ratio |
| --- | --- | --- |
| Main heading | `#1f3b36` / `#fbfcfa`; 11.7473 | `#d7efe6` / `#0b1412`; 15.4748 |
| Secondary copy | `#5b7069` / `#fbfcfa`; 5.1447 | `#9ab0a7` / `#0b1412`; 8.1406 |
| Primary action | `#ffffff` / `#278349`; 4.7415 | `#07110a` / `#4dbb73`; 7.9291 |
| Primary hover | `#ffffff` / `#267a44`; 5.3169 | `#07110a` / `#63c884`; 9.2588 |
| Metadata / Search placeholder | `#5b7069` / `#ffffff`; 5.2944 | `#9ab0a7` / `#12201c`; 7.3190 |
| Light AI body correction | `#596e67` / `#f3e8e3`; 4.534617 | `#9ab0a7` / `#2b1c18`; 7.1311 |
| Error live text | `#1f3b36` / `#ffffff`; 12.0890 | `#d7efe6` / `#12201c`; 13.9130 |

The [token record](../05-specs/m1-foundation-home.tokens.json) preserves Figma values and approved M1 overrides. In particular, source Light primary `#33a15b` becomes `#278349`, Light hover `#2b8a4d` becomes `#267a44`, Light secondary/tertiary become `#5b7069`, and Dark tertiary becomes `#9ab0a7`. The global Light secondary/tertiary tokens remain the approved `#5b7069`. On the actual Light AI surface, that color measured 4.402590:1, so only AI body text uses `#596e67` and measures 4.534617:1. This additional scoped deviation is in [theme.css](../../apps/cinema-frontend/src/styles/theme.css). All listed enabled pairs exceed 4.5:1; the tested Home/menu/Search axe states had no violations.

The bundled Inter and Roboto Slab fonts were loaded before capture. A source-backed glyph check covered 237 selected Latin/Vietnamese codepoints in each local font, including precomposed and decomposed forms; it was a scoped check, not a claim of complete Unicode coverage. The bundled magnifier SVGs are 574-byte source assets with 18×18 roots. Source SHA-256 matches the shipped [Light](../../apps/cinema-frontend/public/icons/magnifier-light.svg) (`9738E4A28433820A4E21D4A8CA65A4DE3353D26DB9522410AA00D38B50F3320B`) and [Dark](../../apps/cinema-frontend/public/icons/magnifier-dark.svg) (`DA43177AE9B4A363DEC5E05C4803313AD32704E2D5DFB7454019A4A0B90CB720`) files; runtime geometry is 18×18. Poster boxes preserve 192:250 aspect ratio without remote artwork.

## Criterion traceability

| ID | Observed evidence |
| --- | --- |
| M1-01 | [Fixture catalog](../../apps/cinema-frontend/src/features/home/fixtures.ts), [Home test](../../apps/cinema-frontend/e2e/shell.spec.ts) and reviewed movie regions show five cards in each ordered section with source titles/colors. |
| M1-02 | Four source comparisons above; 1440px region snapshots and measured desktop geometry. |
| M1-03 | Visual test's 375/768/1024 cases check 2/3/4 grid columns, menu and Quick layout, text/overflow; 320 reflow is additional evidence. |
| M1-04 | [Preference tests](../../apps/cinema-frontend/e2e/preferences.spec.ts) and [Home browser tests](../../apps/cinema-frontend/e2e/home.spec.ts) check SSR, independent toggles, reload/fallback, blocked writes and retained draft/tuple. |
| M1-05 | [Fixture search tests](../../apps/cinema-frontend/src/features/home/fixture-adapter.test.ts) cover normalized AND filters; Home browser tests cover Enter/button, draft and initial sections. |
| M1-06 | [Preview reducer tests](../../apps/cinema-frontend/src/features/home/search-preview.test.ts), normal/error browser suites cover delay, abort, empty, error-once and Retry. |
| M1-07 | [Quick model tests](../../apps/cinema-frontend/src/features/home/quick-selection.test.ts) and Home browser tests cover reset, no options, shuffled date/time ordering, mismatched real movie IDs in tuples and demo handoff. |
| M1-08 | Home browser tests cover nav, movie details, AI, browse and Quick CTA; all stay within fixture dialogs. |
| M1-09 | [Dictionary](../../apps/cinema-frontend/src/features/preferences/dictionary.ts) and preference/Home browser tests cover VI/EN labels, genres, status, time and stable IDs. |
| M1-10 | [Accessibility browser tests](../../apps/cinema-frontend/e2e/accessibility.spec.ts), including replacement focus and resize return-focus regressions, plus 44px phone checks and zoom/reflow observations above. |
| M1-11 | Computed color pairs and source-to-override trace above; Light AI exception is scoped. |
| M1-12 | Fonts-ready capture, bundled font evidence and source SVG hashes/18×18 runtime size above; poster ratio check in visual suite. |
| M1-13 | Exact commands, versions, scenarios and nonempty results in the verification table below. |

## Verification on the final code

App commands run from `apps/cinema-frontend`; root commands run from the repository root. Browser suites run sequentially against production build on port 3100 with no server reuse. The snapshot creation pass (`npm run test:visual -- --grep 'reviewed regions' --update-snapshots`) wrote 112 files and passed 16/16; it was baseline creation, not a regression pass.

| CWD | Command | Exit and observed result |
| --- | --- | --- |
| Frontend | `npm ci` | 0; 388 packages added, 0 vulnerabilities; npm reported pinned ESLint 9.39.5 as deprecated and one pending `unrs-resolver@1.12.2` install script approval. |
| Frontend | `npm run lint` | 0; ESLint reported no findings. |
| Frontend | `npm run typecheck` | 0; Next route types generated, TypeScript passed. |
| Frontend | `npm test` | 0; 6 files, 26 tests passed. |
| Frontend | `npm run build` | 0; optimized build passed; `/` is server-rendered on demand. |
| Frontend | `npm run test:e2e` | 0; 61 tests passed in 54.2s on ready fixtures. |
| Frontend | `npm run test:e2e:error` | 0; 3 tests passed in 5.7s on error-once fixtures. |
| Frontend | `npm run test:visual` | 0; 36 tests passed in 27.1s against existing baselines, with no snapshot update. |
| Root | `node scripts/verify-docs.mjs` | 0; 35 current Markdown files and 136 local link targets passed. |
| Root | `git diff --check` | 0; no whitespace errors. |

Environment: Windows, Node 24.19.0, npm 11.17.0, Next 16.3.8, Playwright 1.63.0, pinned Chromium. Browser test processes clear inherited `NO_COLOR` and `FORCE_COLOR` only for those commands to avoid conflicting child-process diagnostics. No machine-wide environment setting changed.

Known limits and review notes: baseline PNGs are platform/font specific; native select popup appearance varies by OS. The backend, mobile and agent apps were not validated by these checks. The earlier Quick sorting and mismatched movie-ID test gaps are closed by the final tests. Two nonblocking maintainability notes remain: Quick date/time labels split a combined formatter string on punctuation, and DemoDialog's conditional JSX is dense. The final focus repair addresses the later observed open-modal defect. No merge, deploy or API integration is represented by this acceptance.

## Formatting follow-up (2026-10-02)

The frontend now uses Prettier with a shared format and check policy. Mechanical formatting spread DemoDialog's JSX across lines, addressing the line-density part of the earlier note. Its conditional rendering remains as designed, and the Quick label punctuation dependency remains. No runtime logic, fixtures, or visual baselines changed. After formatting, lint, typecheck, 26 unit tests, the production build, 61 normal browser tests, and 3 error browser tests passed. These are follow-up results; the table above records the original M1 acceptance run.
