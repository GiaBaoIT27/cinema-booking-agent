# M1 Foundation + Home — Implementation Plan

- Ngày lập: 2026-10-02; revision 1.
- Trạng thái: sẵn sàng để review và chọn cách thực thi; chưa khởi tạo ứng dụng.
- Spec: [M1 Foundation + Home — accepted](../05-specs/m1-foundation-home.md).
- Design: [audit Figma](../03-product/figma-m1-audit-2026-10-02.md) và [token snapshot](../05-specs/m1-foundation-home.tokens.json).

**Goal:** Dựng Home Next.js có dữ liệu mẫu, VI/EN × Light/Dark, Search/QuickBooking và responsive theo spec đã được chủ dự án duyệt.

**Architecture:** Root layout đọc preference cookie trên server, một provider cập nhật theme/locale trên client. Home dùng một view và fixture adapter độc lập DOM; QuickBooking và search state có hàm thuần để kiểm tra. Native controls/dialog xử lý hành vi chuẩn trình duyệt; giao dịch và các màn hình sau Home chỉ có điểm chuyển tiếp demo trong M1.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS v4, npm; Vitest cho logic thuần, Playwright/axe cho hành vi trình duyệt và kiểm tra ảnh.

## Global constraints

- `apps/cinema-frontend` là application boundary; dependencies/lockfile riêng theo cách tổ chức app hiện tại. Không tạo root workspace hoặc thay backend lockfile.
- “Next.js + TypeScript”, “Tailwind CSS”, “M1; nối backend API ở M2”.
- “Desktop 1440; kiểm tra 375, 768, 1024px”. Kiểm tra thêm reflow 320 và zoom 200% theo spec.
- “Mặc định: VI + Light”; cookies `mba_locale=vi|en`, `mba_theme=light|dark`, 1 năm, Path `/`, SameSite Lax, Secure trên HTTPS.
- “Không tạo bốn bản Home theo theme/locale.” State lưu ID; đổi preference giữ query/filter/quick selection.
- 10 movie fixtures, poster màu đúng Figma; QuickBooking dùng `2026-10-10` / `2026-10-11`, không phụ thuộc ngày máy.
- Light primary `#278349`; hover/action-text `#267a44`; secondary/tertiary `#5b7069`; Dark tertiary `#9ab0a7`. Giữ token nguyên bản trong tài liệu.
- “Không mô phỏng hold, payment thành công hoặc vé hợp lệ.” M1 không gọi backend/Redis/database/AI.
- “Không thêm footer hoặc poster ảnh ngoài nguồn baseline.” Chiều cao trang theo nội dung, không theo canvas height.
- Spec quyết định hành vi; plan quyết định file, interface và thứ tự thực hiện. Các checkboxes chỉ cập nhật khi có bằng chứng của bước tương ứng.

## 1. Dependency và command contract

Kiểm tra package metadata từ npm registry ngày 2026-10-02; máy hiện tại có Node `24.19.0`, npm `11.17.0`. Chọn Node 24 và npm 11 cho M1. Pin dependencies, commit `package-lock.json`, dùng `npm ci` khi clone lại.

| Package | Version chốt cho plan | Vai trò |
| --- | --- | --- |
| next / eslint-config-next | 16.3.8 | Runtime / lint rules cùng phiên bản |
| react / react-dom | 19.3.0 | UI runtime |
| typescript | 5.9.3 | Nhánh TS 5 ổn định; không cần TS 7 cho M1 |
| tailwindcss / @tailwindcss/postcss | 4.3.3 | Styling / PostCSS |
| postcss | 8.5.28 | CSS pipeline |
| eslint | 9.39.5 | Flat config, tương thích lint plugins đã chọn |
| @types/node | 24.19.1 | Khớp Node major |
| @types/react / @types/react-dom | 19.3.0 | React types |
| vitest | 5.0.3 | Logic tests, Node 24 được engines hỗ trợ |
| @playwright/test | 1.63.0 | Chromium browser tests |
| @axe-core/playwright | 4.13.0 | Accessibility scan bổ trợ |

Metadata trực tiếp: [Next](https://registry.npmjs.org/next/16.3.8), [TypeScript](https://registry.npmjs.org/typescript/5.9.3), [Tailwind](https://registry.npmjs.org/tailwindcss/4.3.3), [Vitest](https://registry.npmjs.org/vitest/5.0.3), [Playwright](https://registry.npmjs.org/@playwright%2ftest/1.63.0). Nếu install phát hiện peer conflict, không bỏ qua bằng `--force`/`--legacy-peer-deps`; xem mục replan.

Các command dưới đây là **command sẽ được tạo**, chưa tồn tại ở frontend tại thời điểm viết plan. CWD là `apps/cinema-frontend`, trừ bước ghi rõ root repo.

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "next typegen && tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "test:e2e:error": "playwright test --config playwright.error.config.ts",
  "test:visual": "playwright test tests/e2e/home.visual.spec.ts"
}
```

Lint chạy riêng, vì Next 16 build không tự chạy lint. [Next installation](https://nextjs.org/docs/app/getting-started/installation). Tailwind dùng `@tailwindcss/postcss`, import CSS tại root; không thêm `tailwind.config.js` kiểu v3. [Tailwind + Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs).

## 2. Target file map

Mọi path trong cây dưới là tương đối với `apps/cinema-frontend`; `[C]` create, `[M]` modify. Những file generated được tạo bằng công cụ tương ứng.

```text
package.json [C]                   scripts, exact dependencies, engines
package-lock.json [C, generated]   dependency resolution
tsconfig.json [C]                 strict TS, @/* -> src/*
next-env.d.ts [C, generated]       Next types
postcss.config.mjs [C]            Tailwind plugin
eslint.config.mjs [C]             Next core-web-vitals + TypeScript rules
vitest.config.ts [C]              pure Node test scope
playwright.config.ts [C]          production server, ready scenario
playwright.error.config.ts [C]    production server, error-once scenario
README.md [M]                    actual setup/run/check commands after initialization
public/icons/magnifier-light.svg [C]  exported source icon
public/icons/magnifier-dark.svg [C]   exported source icon
src/
  app/layout.tsx [C]              fonts, cookies, provider, html lang/theme
  app/page.tsx [C]                fixture data + scenario -> HomeClient
  app/globals.css [C]             Tailwind import, base styles
  styles/theme.css [C]            semantic values, aliases, role typography
  components/ui/
    button.tsx [C]               variant and keyboard focus
    search-field.tsx [C]         labeled input + source icon
    filter-chip.tsx [C]          toggle with aria-pressed
    select-field.tsx [C]         select-only combobox with custom popup
    dialog.tsx [C]               native modal, Escape and focus return
  features/preferences/
    model.ts [C]                enum validation, cookie serialization
    dictionary.ts [C]           typed VI/EN UI copy and formatter helpers
    provider.tsx [C]            initial SSR preferences + client persistence
    controls.tsx [C]            LanguageSwitch + ThemeSwitch
  features/home/
    model.ts [C]                catalog/query/quick/intent types
    fixtures.ts [C]             canonical movies + synthetic cinemas/showtimes
    fixture-adapter.ts [C]      search, option relations, abort/scenarios
    quick-selection.ts [C]      dependency reset and tuple resolution
    search-preview.ts [C]       request identity and preview reducer
    use-search-preview.ts [C]   asynchronous lifecycle around adapter
    home-client.tsx [C]         view composition and navigation intents
    navigation.tsx [C]          guest nav + mobile menu
    hero.tsx [C]                search draft + release-status panel
    quick-booking.tsx [C]       dependent controls + helper
    ai-entry.tsx [C]            AI intent entry
    movie-card.tsx [C]          artwork + metadata + detail action
    movie-section.tsx [C]       section heading/grid/browse intent
    demo-dialog.tsx [C]         search results or bounded handoff content
tests/
  unit/
    components/ui/primitives.test.ts [C]          primitive rendering checks
    features/preferences/model.test.ts [C]        invalid values and independent updates
    features/preferences/dictionary.test.ts [C]   translated copy and time formatting
    features/home/fixture-adapter.test.ts [C]      relation/search/recovery checks
    features/home/quick-selection.test.ts [C]     reset/no-options/invalid tuple checks
    features/home/search-preview.test.ts [C]      stale completion, clear, retry context
  e2e/
    shell.spec.ts [C]             app startup and hydration smoke
    preferences.spec.ts [C]       SSR/reload/blocked persistence behavior
    home.spec.ts [C]              Search, QuickBooking, every CTA
    home.error.spec.ts [C]        error-once Retry and context
    accessibility.spec.ts [C]     keyboard/focus/axe/targets
    home.visual.spec.ts [C]       four preferences + viewport regions
    contrast.ts [C]              browser contrast helper
    home.visual.spec.ts-snapshots/ [C, generated and reviewed]
```

Ngoài app: sửa `.gitignore` ở root để ignore `playwright-report/`, `test-results/`, `.vitest/`; cập nhật [CONTEXT](../../CONTEXT.md) và README app sau khi runtime đã kiểm chứng. Không ignore snapshot baseline cần review. Không đổi package/backend, API hay schema.

## 3. Interface contract

### 3.1. Preference — `features/preferences/model.ts`

```ts
export type Locale = "vi" | "en";
export type Theme = "light" | "dark";
export type Preferences = { locale: Locale; theme: Theme };
export const DEFAULT_PREFERENCES: Preferences = { locale: "vi", theme: "light" };
export function parsePreferences(values: {
  mba_locale?: string; mba_theme?: string;
}): Preferences;
export function serializePreferenceCookie(key: "mba_locale", value: Locale, secure: boolean): string;
export function serializePreferenceCookie(key: "mba_theme", value: Theme, secure: boolean): string;
```

Provider consumes `initial: Preferences`, exposes `preferences`, `setLocale(locale)`, `setTheme(theme)` qua `usePreferences()`. `parsePreferences` không import Next. Root layout chuyển `cookies().get(...).value` vào hàm thuần. Cookie write thất bại không ngăn state/DOM cập nhật.

Dictionary export `getDictionary(locale): Dictionary`, `formatShowtime(date, time, locale): string`; hai locale có cùng keys, genre/status map theo ID. Format ngày/giờ theo `Asia/Ho_Chi_Minh`, không parse local date bằng timezone tùy máy.

### 3.2. Catalog và adapter — `features/home/model.ts`

```ts
export type ReleaseStatus = "now-showing" | "upcoming";
export type GenreId = "sci-fi" | "drama" | "romance" | "thriller" | "adventure";
export type Movie = {
  id: string; title: string; releaseStatus: ReleaseStatus; genreId: GenreId;
  durationMinutes: number; ageRating?: string; placeholderColor: string;
};
export type Cinema = { id: string; name: string };
export type Showtime = {
  id: string; cinemaId: string; movieId: string; date: string; time: string;
};
export type Catalog = { movies: Movie[]; cinemas: Cinema[]; showtimes: Showtime[] };
export type SearchQuery = { query: string; status: ReleaseStatus; genreId: GenreId | null };
export type QuickSelection = {
  cinemaId: string | null; movieId: string | null;
  date: string | null; showtimeId: string | null;
};
export type QuickOptions = {
  cinemas: Cinema[]; movies: Movie[]; dates: string[]; showtimes: Showtime[];
};
export type FixtureScenario = "ready" | "error-once";
export type CatalogAdapter = {
  search(query: SearchQuery, signal?: AbortSignal): Promise<Movie[]>;
  getQuickOptions(selection: QuickSelection): QuickOptions;
  resolveQuickSelection(selection: QuickSelection): Showtime | undefined;
};
```

`fixtures.ts` exports `homeCatalog: Catalog`; `fixture-adapter.ts` exports `createFixtureAdapter(catalog, options?: {scenario?: FixtureScenario; delayMs?: number}): CatalogAdapter`. Mặc định delay 300ms. Scenario error-once chỉ lỗi request đầu đã hoàn thành; abort không bị tính thành lỗi đầu. Ready chỉ phụ thuộc fixtures, không HTTP.

Root page truyền `scenario` từ `MBA_FIXTURE_SCENARIO` sau enum validation (fallback ready). Đây là cấu hình demo/test, không đọc secret/env backend. Một adapter instance tồn tại xuyên các lần đổi theme/locale; không tạo lại mỗi render.

`quick-selection.ts` exports `EMPTY_QUICK_SELECTION`, `reduceQuickSelection(state, action)`, `getQuickOptions(catalog, selection)`, `resolveQuickSelection(catalog, selection)`. Action union dùng `{type: "cinema"|"movie"|"date"|"showtime"; value: string|null}`; reset downstream bằng `null`.

### 3.3. Search và intents

`search-preview.ts` định nghĩa:

```ts
export type SearchPreview =
  | { status: "closed" }
  | { status: "loading"; requestId: number; submitted: SearchQuery }
  | { status: "ready"; requestId: number; submitted: SearchQuery; movies: Movie[] }
  | { status: "error"; requestId: number; submitted: SearchQuery };
export type SearchAction =
  | { type: "start"; requestId: number; submitted: SearchQuery }
  | { type: "resolve"; requestId: number; movies: Movie[] }
  | { type: "reject"; requestId: number }
  | { type: "close" };
export function reduceSearchPreview(state: SearchPreview, action: SearchAction): SearchPreview;
export function clearSearchQuery(query: SearchQuery): SearchQuery;
export type HomeIntent =
  | { kind: "cinema-directory" | "my-tickets" | "login" | "ai-assistant" }
  | { kind: "movie-details"; movieId: string }
  | { kind: "seat-selection"; showtime: Showtime };
```

`HomeIntent` nằm trong `model.ts` để UI dùng chung. Empty là ready với `movies.length === 0`. Resolve/reject chỉ nhận đúng requestId hiện tại và chỉ khi state loading. `clearSearchQuery` giữ status, xóa query/genre. Retry dùng bản submitted trước lỗi; browse-section submit một query riêng không sửa hero draft.

`use-search-preview.ts` export `useSearchPreview(adapter)` trả `{state, submit(query), retry(), clear(), close()}`. Hook sở hữu monotonic requestId và AbortController; close/unmount abort và bỏ completion cũ. HomeClient sở hữu hero draft và QuickSelection; preview không nhận mutable draft object.

Dialog UI props: `open: boolean`, `title: string`, `onClose(): void`, `children: ReactNode`, `returnFocusTo?: HTMLElement|null`. Nội dung modal sử dụng native `<dialog>.showModal()`; close/cancel đồng bộ state, focus về trigger còn visible. Khi mobile menu mở handoff, close menu rồi focus dialog mới; khi handoff đóng, trả về menu trigger thay vì link đã bị ẩn.

## 4. Tasks

### Task 1 — Frontend shell, Foundation và preferences

**Files:** create package/config/app/styles và toàn bộ `features/preferences/`; test `model.test.ts`, `tests/e2e/shell.spec.ts`, `tests/e2e/preferences.spec.ts`; modify app README/root `.gitignore` theo file map.

**Consumes:** spec §§4–5, source tokens/overrides, hiện trạng app chỉ có README.

**Produces:** app có build/run/check commands; preference interface §3.1; semantic theme utilities và font roles. Trang shell tạm chỉ cần H1 và preference controls, được thay bằng Home ở Task 4.

- [ ] Viết `package.json` private, `engines.node: ">=24 <25"`, `packageManager: "npm@11.17.0"`, scripts ở §1. Pin dependencies ở bảng; tạo config trong app, không chạy generator lên thư mục đang có tài liệu.
- [ ] Tạo TS strict config: target ES2017, module ESNext, moduleResolution Bundler, jsx react-jsx, noEmit, esModuleInterop, resolveJsonModule, incremental; paths `@/*: ["./src/*"]`; include source, Next generated types, tests/config.
- [ ] Tạo PostCSS và ESLint config:

```js
// postcss.config.mjs
export default { plugins: { "@tailwindcss/postcss": {} } };
// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals, ...nextTs,
  globalIgnores([".next/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
]);
```

- [ ] Tạo `vitest.config.ts` dùng `defineConfig` từ `vitest/config`, `test.environment: "node"`, `include: ["tests/unit/**/*.test.ts"]`. Tạo Playwright config mẫu ở Task 6 trước khi chạy browser smoke.
- [ ] Chạy `npm install`, `npx playwright install chromium`; kiểm tra lockfile/dependency tree bằng `npm ls --depth=0`. Nếu có peer/engine lỗi, xử lý trước khi viết UI.
- [ ] Viết behavior tests preference trước implementation:

```ts
import { expect, test } from "vitest";
import { parsePreferences, serializePreferenceCookie } from "./model";
test("invalid locale preserves valid dark theme", () => {
  expect(parsePreferences({ mba_locale: "xx", mba_theme: "dark" }))
    .toEqual({ locale: "vi", theme: "dark" });
});
test("preference cookie gets HTTPS attributes only when requested", () => {
  const value = serializePreferenceCookie("mba_locale", "en", true);
  expect(value).toContain("mba_locale=en");
  expect(value).toContain("Max-Age=31536000");
  expect(value).toContain("Path=/");
  expect(value).toContain("SameSite=Lax");
  expect(value).toContain("Secure");
  expect(serializePreferenceCookie("mba_theme", "dark", false)).not.toContain("Secure");
});
```

- [ ] Run `npm test -- tests/unit/features/preferences/model.test.ts`, xác nhận RED do module/hành vi chưa tồn tại; thêm fallback độc lập cho từng enum và serializer đúng thuộc tính, rerun GREEN.
- [ ] Tạo provider một state Preferences; setter merge một thuộc tính, cập nhật `document.documentElement.lang`, `dataset.theme`, `style.colorScheme`, rồi thử ghi cookie trong try/catch. Không đọc localStorage để ghi đè SSR. `controls.tsx` của Task 1 dùng native buttons; chưa import primitives sẽ được tạo ở Task 3.
- [ ] Root layout `await cookies()` từ `next/headers`, gọi parser, đặt `<html lang={locale} data-theme={theme}>`; wrap children bằng provider `initial`. Dùng `Inter`/`Roboto_Slab` từ `next/font/google` với latin/vietnamese và các weight spec; font variables không xung đột semantic aliases.
- [ ] Map 22 colors mỗi theme vào CSS variables trong `styles/theme.css`; áp dụng overrides runtime, giữ artwork colors theo movie data. Base `globals.css`:

```css
@import "tailwindcss";
@import "../styles/theme.css";
@theme inline {
  --color-page: var(--mba-bg-page);
  --color-surface: var(--mba-bg-surface);
  --color-text-primary: var(--mba-text-primary);
  --color-text-secondary: var(--mba-text-secondary);
  --color-action-primary: var(--mba-action-primary);
  --color-action-text: var(--mba-action-text);
  --font-body: var(--font-inter);
  --font-display: var(--font-roboto-slab);
  --radius-control: 12px;
  --radius-quick: 16px;
}
```

- [ ] Thêm aliases còn lại cho border/signature/status/radius, role typography đúng audit. `body` dùng page/text-primary/font-body. Focus outline nhìn thấy ở cả hai theme; `prefers-reduced-motion` tắt smooth transitions/scroll.
- [ ] Browser test: cookie EN/Dark render `html` đúng từ response, reload vẫn EN/Dark; invalid locale fallback VI nhưng theme vẫn Dark; thay theme không đổi locale. Với cookie write bị chặn trong init script, thao tác đổi locale vẫn đổi UI/lang ở phiên hiện tại. Collect `pageerror` và lỗi hydration.
- [ ] Chạy `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e -- tests/e2e/shell.spec.ts tests/e2e/preferences.spec.ts`. GREEN cho shell, không gọi đó là hoàn tất Home.
- [ ] Commit riêng deliverable Foundation, kèm configs/lockfile/tests/docs; chỉ stage các paths Task 1 sở hữu.

### Task 2 — Catalog fixture và QuickBooking logic

**Files:** create `model.ts`, `fixtures.ts`, `fixture-adapter.ts`, `quick-selection.ts` and their tests under `tests/unit/features/home/`.

**Consumes:** model contracts §3.2, fixture table và dependency reset từ spec.

**Produces:** `homeCatalog`, `createFixtureAdapter`, quick reducer/options/resolver; import được trong Home mà không phụ thuộc React/Next.

- [ ] Viết tests với catalog Figma và ID ổn định; run RED trước khi thêm adapter/reducer. Catalog movie IDs: `dune-part-two`, `afterlight`, `paper-moons`, `night-shift`, `red-horizon`, `orbit-zero`, `summer-letters`, `skyward`, `quiet-city`, `last-signal`.
- [ ] Tạo `homeCatalog` với tên/genre/minutes/colors/age từ spec. Cinema IDs: `demo-central`, `demo-west`, `demo-no-showtimes`; tên riêng mẫu “Demo Central”, “Demo West”, “Demo Empty”. Nhãn mô tả dữ liệu mẫu lấy từ dictionary, không gắn tiếng Việt cố định vào tên. Showtime rows cố định:

| ID | Cinema | Movie | Date / time |
| --- | --- | --- | --- |
| central-dune-1010-1800 | demo-central | dune-part-two | 2026-10-10 / 18:00 |
| central-dune-1010-2030 | demo-central | dune-part-two | 2026-10-10 / 20:30 |
| central-dune-1011-1800 | demo-central | dune-part-two | 2026-10-11 / 18:00 |
| central-afterlight-1011-1900 | demo-central | afterlight | 2026-10-11 / 19:00 |
| west-dune-1010-1900 | demo-west | dune-part-two | 2026-10-10 / 19:00 |
| west-afterlight-1011-2000 | demo-west | afterlight | 2026-10-11 / 20:00 |

- [ ] Test uniqueness/foreign-key validity và Upcoming không nằm trong Quick options. Implement options theo showtime relations, dates unique sorted, showtimes sorted time, không tự chọn first option.
- [ ] Viết test reset/resolution:

```ts
import { expect, test } from "vitest";
import { homeCatalog } from "./fixtures";
import { reduceQuickSelection, resolveQuickSelection, getQuickOptions } from "./quick-selection";
test("cinema change resets every downstream selection", () => {
  expect(reduceQuickSelection({ cinemaId: "demo-central", movieId: "dune-part-two",
    date: "2026-10-10", showtimeId: "central-dune-1010-1800" },
    { type: "cinema", value: "demo-west" }))
    .toEqual({ cinemaId: "demo-west", movieId: null, date: null, showtimeId: null });
});
test("showtime from another cinema cannot make a tuple valid", () => {
  expect(resolveQuickSelection(homeCatalog, { cinemaId: "demo-west",
    movieId: "dune-part-two", date: "2026-10-10", showtimeId: "central-dune-1010-1800" }))
    .toBeUndefined();
  expect(getQuickOptions(homeCatalog, { cinemaId: "demo-no-showtimes",
    movieId: null, date: null, showtimeId: null }).movies).toEqual([]);
});
```

- [ ] Run RED, implement reducers/resolver. Resolver phải kiểm tra đủ bốn giá trị với cùng một row, không chỉ kiểm tra `showtimeId` tồn tại.
- [ ] Search: normalize bằng `trim().toLocaleLowerCase()`, title includes query; status AND optional genre. Giữ thứ tự catalog. Test `"  DUNE "` + now-showing + sci-fi → đúng một phim; query không khớp → empty.
- [ ] Search Promise timer 300ms, abort clears timer/listener và reject AbortError. Error-once không reset khi đổi preference. Vitest dùng fake timers, `advanceTimersByTimeAsync(300)`; test abort không tiêu hao error-once, Retry cùng query sau lỗi trả kết quả.
- [ ] Run `npm test -- tests/unit/features/home/fixture-adapter.test.ts tests/unit/features/home/quick-selection.test.ts`, `npm run typecheck`, `npm run lint`; commit Task 2.

### Task 3 — Primitives, dialog và asset nguồn

**Files:** create `components/ui/*`, hai magnifier SVG; modify `features/preferences/controls.tsx` để dùng Button; extend `tests/e2e/accessibility.spec.ts` cho controls hiện có trên shell/preference. Chưa cần test snapshots primitives riêng.

**Consumes:** semantic utilities Task 1, dictionary/provider, component variants/nodes trong audit.

**Produces:** typed primitives để Home dùng; dialog focus contract §3.3; icon SVG local 18 × 18.

- [ ] Lấy SVG từ magnifier nguồn SearchField cho Light/Dark; lưu hai file tên ổn định trong `public/icons`. Giữ vector/path, không vẽ lại bằng emoji hay CSS, không commit URL asset tạm thời.
- [ ] Button props extend `ButtonHTMLAttributes<HTMLButtonElement>`, `variant: "primary"|"secondary"|"tertiary"`; default `type="button"`, native disabled, focus-visible và pressed feedback. Primary colors dùng semantic tokens.
- [ ] SearchField extend input attributes, nhận `id`, `label`, `theme`; `<label>` có thể visually hidden nhưng accessible name rõ. Icon decorative: Next Image `alt=""`, width/height 18, aria-hidden; input focus không mất border/theme.
- [ ] FilterChip là button toggle `aria-pressed`, label từ dictionary. Cập nhật theo phản hồi chủ dự án 2026-10-03: SelectField dùng button `role="combobox"`, `aria-labelledby`, `aria-expanded`, `aria-controls` và `aria-activedescendant`, mở custom listbox từ toàn bộ box. Giữ placeholder rỗng, controlled value, disabled, chọn bằng pointer/keyboard, Escape hủy duyệt và Tab chọn/sang control tiếp theo; xem [spec QuickBooking](../05-specs/m1-foundation-home.md). Không thay bằng một ô text tĩnh.
- [ ] Dialog implement effect open→`showModal()`, close→`close()`, listener cancel→onClose, cleanup listeners/unmount. Lưu prior focused element; restoration chỉ focus khi element còn connected/visible, nếu không dùng `returnFocusTo`. Không thêm thư viện trap focus khi native modal đã đảm nhiệm.
- [ ] Kiểm tra browser nền Foundation: Tab tới preference controls, dùng Space/Enter đổi trạng thái, thấy focus và aria-pressed; các test modal sẽ RED khi Home/dialog trigger được nối ở Task 4, không claim đã pass modal chỉ từ static JSX.
- [ ] Chạy lint/typecheck/build, kiểm tra SVG nhìn đúng Light/Dark; commit Task 3. Ghi rõ modal integration cần check Task 4.

### Task 4 — Home desktop có tương tác đầy đủ

**Files:** create các Home view files, `search-preview.ts`, `tests/unit/features/home/search-preview.test.ts`, `use-search-preview.ts`, `playwright.error.config.ts`; modify `app/page.tsx`; create/extend `tests/e2e/home.spec.ts`, `tests/e2e/home.error.spec.ts`, `tests/e2e/accessibility.spec.ts`.

**Consumes:** Task 1 preference/dictionary/theme, Task 2 CatalogAdapter/quick functions, Task 3 primitives; source four Home contexts và screenshots.

**Produces:** Route `/` hiển thị Home chuẩn desktop, mọi CTA có feedback, search lifecycle và QuickBooking hoạt động bằng fixtures.

- [ ] Đọc lại high-fidelity design context/screenshot của `33:6047`, `33:6203`, `33:6362`, `33:6518` trước JSX cuối. Copy UI strings của từng locale vào dictionary; dịch genre Upcoming/VI theo exception đã duyệt. Node IDs giúp truy vết, không dùng Figma reference JSX làm app nguyên khối.
- [ ] Viết reducer test trước code:

```ts
import { expect, test } from "vitest";
import { reduceSearchPreview, clearSearchQuery } from "./search-preview";
test("completion after close cannot reopen preview", () => {
  const closed = reduceSearchPreview({ status: "loading", requestId: 1,
    submitted: { query: "Dune", status: "now-showing", genreId: null } }, { type: "close" });
  expect(reduceSearchPreview(closed, { type: "resolve", requestId: 1, movies: [] }))
    .toEqual({ status: "closed" });
});
test("clear query and genre preserves release context", () => {
  expect(clearSearchQuery({ query: "missing", status: "upcoming", genreId: "drama" }))
    .toEqual({ query: "", status: "upcoming", genreId: null });
});
```

- [ ] Run RED rồi implement reducer; ignore requestId cũ hoặc completion khi không loading. Hook abort previous request khi submit mới/close/unmount; Retry giữ submitted context. Empty clear submit query đã clear và giữ status; nếu preview mở từ hero thì đồng bộ hero query/genre, nếu từ browse thì hero draft giữ nguyên.
- [ ] Page server truyền `homeCatalog` và scenario đã validate vào HomeClient. Đặt `export const dynamic = "force-dynamic"` trên page để scenario runtime và SSR preferences không bị đóng vào static build. Tạo adapter một lần bằng memo/ref với dependencies catalog/scenario, không locale/theme. Một dialog host chuyển giữa search và HomeIntent; mở handoff phải close/abort preview cũ.
- [ ] Dựng utility + guest nav + Hero/StatusPanel + Quick/helper + AIEntry + NowShowing + Upcoming. Container 1200, top48, main gap48; grid desktop 5×220, gap24, card/poster số đo từ audit. Section anchors: `now-showing`, `upcoming`.
- [ ] HomeClient state: hero draft rỗng/now-showing/null, QuickSelection nulls; render sections độc lập draft. Submit Enter và button đều qua form `onSubmit`, gọi hook cùng query snapshot. Status chips và status panel dùng chung setter; genre toggle chọn một hoặc bỏ.
- [ ] Quick controls enable khi predecessor đã chọn và options có dữ liệu; no-options helper có tên rõ. Submit gọi resolver lần nữa; fail hiển thị lỗi cục bộ, success mở seat-selection intent. Không auto-select row đầu.
- [ ] Navigation/AI/cards/browse dùng bảng intent spec. Brand→top; NowShowing→anchor; MyTickets/Login/Cinemas/AI/details→dialog; browse→search query riêng. Demo copy nói rõ dữ liệu mẫu và phần tiếp nối, không báo transaction đã hoàn thành.
- [ ] Viết Playwright behavior có ID/accessible name, không selector phụ thuộc utility class:

```ts
import { test, expect } from "@playwright/test";
test("quick booking resets movie and rejects empty downstream state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "1. Chọn rạp" }).selectOption("demo-central");
  await page.getByRole("combobox", { name: "2. Chọn phim" }).selectOption("dune-part-two");
  await page.getByRole("combobox", { name: "3. Chọn ngày" }).selectOption("2026-10-10");
  await page.getByRole("combobox", { name: /^4\./ }).selectOption("central-dune-1010-1800");
  await page.getByRole("combobox", { name: "1. Chọn rạp" }).selectOption("demo-west");
  await expect(page.getByRole("combobox", { name: "2. Chọn phim" })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "3. Chọn ngày" })).toBeDisabled();
  await expect(page.getByTestId("quick-submit")).toBeDisabled();
});
```

Accessible names lấy copy source; regex `^4\.` xác định điều khiển thứ tư bằng step prefix, không đổi copy nguồn để khớp test. `data-testid="quick-submit"` chỉ dùng để tránh trùng CTA; UI visible copy luôn lấy Figma/dictionary.

- [ ] Tạo config cho error-once trước khi chạy Retry integration (default config đã được tạo ở Task 1, có named export `appServer`):

```ts
import { defineConfig } from "@playwright/test";
import base, { appServer } from "./playwright.config";
export default defineConfig({
  ...base, testIgnore: [], testMatch: "**/home.error.spec.ts",
  webServer: { ...appServer, env: { MBA_FIXTURE_SCENARIO: "error-once" } },
});
```

- [ ] Test Search Enter/button, draft không ẩn 10 initial cards, loading→ready, empty clear, error-once→Retry, đóng pending không reopen, theme/locale không reset query/tuple. Với Retry test dùng `playwright.error.config.ts`.
- [ ] Test native dialog Tab không ra nền, Escape và return focus. Guest CTA navigation luôn có phản hồi đúng intent, không 404. Đổi locale khi dialog mở giữ submitted query/tuple, dịch tên/metadata và live status.
- [ ] Run unit/lint/typecheck/build và `test:e2e`, `test:e2e:error`; screenshot content desktop bốn preferences để review trước responsive. Commit Task 4.

### Task 5 — Responsive và accessibility theo viewport

**Files:** modify `styles/theme.css`, Home view components, primitives khi có lỗi thật; extend `home.spec.ts`, `accessibility.spec.ts`, `home.visual.spec.ts`.

**Consumes:** Home desktop GREEN; responsive table spec; focus/target/contrast criteria M1-03/10/11.

**Produces:** responsive 375/768/1024, reflow 320, desktop được giữ; menu/dialog bằng bàn phím; color pairs thực tế có evidence.

- [ ] Grid dùng min-width360/768/1024/1280, lần lượt 2/3/4/5 cột, dưới360 một cột. Container px16/24/32; card fluid dưới1280, poster aspect192/250. Tailwind `grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5` với breakpoints default tương ứng.
- [ ] Hero stack dưới1280, H1 32/38→40/46→48/54; search button xuống hàng phone; labels/copy wrap. Quick grid 1 cột phone, 2×2 từ768, inline từ1280; AI CTA xuống hàng phone, max760.
- [ ] Navigation collapse dưới1024. Native dialog menu giữ mọi action; chọn item close menu trước mở handoff; restore về menu button. Preferences wrap và controls target44; không có focusable desktop nav khi hidden.
- [ ] Viết overflow/target test và run RED trước sửa layout:

```ts
import { test, expect } from "@playwright/test";
for (const width of [320, 375, 768, 1024, 1440]) {
  test(`Home has no horizontal scroll at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth
      <= document.documentElement.clientWidth)).toBe(true);
    if (width < 768) {
      const box = await page.getByTestId("quick-submit").boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });
}
```

- [ ] Rerun checks sau khi sửa. Test VI/EN và Light/Dark ở các viewport để bắt wrap/cropped labels; không chỉ kiểm tra một screenshot Light/EN.
- [ ] Tab/Shift+Tab trên menu, Search, Quick và demo dialog; test Escape, focus-return khi trigger cũ bị ẩn do resize. Hướng reduced motion: anchor scroll không smooth, animations không làm trì hoãn action.
- [ ] Axe scan Home và dialog, rồi đo manual/runtime foreground/background cho button default/hover, chip selected, placeholders, metadata, action links và error text. Scanner không thay thế kiểm tra focus/contrast thực tế.
- [ ] Reflow320 và zoom200% manual trên browser; card tăng chiều cao, utility/helper không cắt. Native select có thể khác visual popup theo OS, ghi exception đã được spec chấp nhận.
- [ ] Chạy lint/typecheck/unit/build/e2e sau sửa; đối chiếu lại desktop1440 để phát hiện regression. Commit Task 5.

### Task 6 — Nghiệm thu, visual baseline và tài liệu chạy

**Files:** finish `tests/e2e/*`, reviewed snapshot baseline; modify README app/CONTEXT, tạo evidence tại `docs/99-notes/m1-foundation-home-acceptance.md` khi thực sự thực thi.

**Consumes:** tất cả Tasks 1–5, criteria M1-01…13.

**Produces:** evidence đọc được, các checks thật chạy GREEN, baseline được đối chiếu Figma; chưa bao gồm merge/deploy hay API M2.

- [ ] Playwright default config chạy production build trên port3100; browser Chromium cố định, DPR1, viewport1440×1000. Không reuse server không rõ trạng thái. Config cơ sở:

```ts
import { defineConfig } from "@playwright/test";
export const appServer = {
  command: "npm run start -- --hostname 127.0.0.1 --port 3100",
  url: "http://127.0.0.1:3100", reuseExistingServer: false, timeout: 60000,
  env: { MBA_FIXTURE_SCENARIO: "ready" },
};
export default defineConfig({
  testDir: "./e2e", testIgnore: "**/home.error.spec.ts",
  fullyParallel: false, workers: 1, forbidOnly: Boolean(process.env.CI), retries: 0,
  use: { browserName: "chromium", baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1,
    trace: "retain-on-failure" },
  expect: { toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.005 } },
  webServer: appServer,
});
```

- [ ] Kiểm tra `playwright.error.config.ts` từ Task 4 có đúng overrides dưới đây; chạy hai suite tuần tự trên cùng port, browser context mới cho mỗi case:

```ts
import { defineConfig } from "@playwright/test";
import base, { appServer } from "./playwright.config";
export default defineConfig({
  ...base, testIgnore: [], testMatch: "**/home.error.spec.ts",
  webServer: { ...appServer, env: { MBA_FIXTURE_SCENARIO: "error-once" } },
});
```
- [ ] Visual matrix: 1440/375/768/1024 × VI/EN × Light/Dark. Add cookies trước navigation; đợi `document.fonts.ready`, `animations: disabled`; chụp top/hero, quick/AI và movie sections theo locator thay vì canvas tail. Tạo screenshot loops:

```ts
import { test, expect } from "@playwright/test";
for (const width of [1440, 375, 768, 1024]) for (const locale of ["vi", "en"])
for (const theme of ["light", "dark"]) {
  test(`${width}-${locale}-${theme}`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1000 });
    await context.addCookies([
      { name: "mba_locale", value: locale, url: "http://127.0.0.1:3100" },
      { name: "mba_theme", value: theme, url: "http://127.0.0.1:3100" },
    ]);
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    for (const region of ["preferences", "navigation", "hero", "quick-booking",
      "ai-entry", "now-showing", "upcoming"]) {
      await expect(page.getByTestId(region)).toHaveScreenshot(`${region}-${width}-${locale}-${theme}.png`);
    }
  });
}
```

- [ ] First-run screenshots là ảnh code, chưa chứng minh giống Figma. Đối chiếu bốn desktop canonical thủ công/overlay trước khi accept baseline. Review geometry/fonts/copy/colors và exceptions spec; không lấy ảnh code làm expected rồi gọi đó là design parity.
- [ ] Ngưỡng regression 0.5% pixel khác cho cùng Chromium/OS/font; không dùng threshold để hợp thức hóa geometry lệch. Nếu OS/font rendering khác, tạo baseline theo platform đã review, không tăng tolerance để che lỗi. Không dùng pixel threshold giữa ảnh Figma và browser như chứng nhận tuyệt đối.
- [ ] Chạy từ frontend: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`, `npm run test:e2e:error`, `npm run test:visual`. Các browser suites chỉ chạy sau build; không nhận “no tests found” là pass.
- [ ] Chạy từ root: `node scripts/verify-docs.mjs`, `git diff --check`. Evidence ghi command/cwd/exit code, versions, scenarios, ảnh đối chiếu, color pairs, kiểm tra keyboard/zoom và criterion IDs. Không ghi secrets hoặc nhật ký customer thật.
- [ ] README app thay placeholder bằng setup/run/check commands đã chứng minh; CONTEXT chỉ ghi frontend initialized sau build/runtime đã chạy. Giữ các backend limitations chưa được xử lý.
- [ ] Review diff theo spec/engineering constraints, sửa các lỗi thuộc M1 và rerun check liên quan. Commit deliverable đã nghiệm thu; tạo PR/merge/deploy theo yêu cầu của chủ dự án ở bước tích hợp.

## 5. Traceability nghiệm thu

| Spec criterion | Task | Bằng chứng |
| --- | --- | --- |
| M1-01 | 2,4 | Catalog/relations + Home 10 cards đúng thứ tự/copy/colors |
| M1-02 | 4,6 | Bốn desktop reference comparisons + reviewed region screenshots |
| M1-03 | 5,6 | 375/768/1024 grid/menu/Quick + overflow checks |
| M1-04 | 1,4 | SSR cookies, reload/fallback, blocked write, keep draft/tuple |
| M1-05 | 2,4 | Normalized AND search, Enter/button, initial sections |
| M1-06 | 2,4 | Delay/abort + preview reducer + browser error/Retry/empty |
| M1-07 | 2,4 | Reset/no-options/tuple validation + browser Quick flow |
| M1-08 | 4 | Table tất cả CTA và bounded intent dialogs |
| M1-09 | 1,4 | Dictionary keys/formatters + VI/EN runtime copy |
| M1-10 | 3,5,6 | Tab/Escape/focus return, target44, zoom/reflow evidence |
| M1-11 | 1,5,6 | Runtime colors/contrast and source-vs-override trace |
| M1-12 | 1,3,6 | Fonts-ready visual capture, source SVG, poster aspect |
| M1-13 | 1–6 | Exact scripts, actual nonempty checks, build/runtime/evidence |

## 6. Assumptions, recovery và replan

- Windows + Node24/npm11 là môi trường kiểm tra ban đầu; chưa hứa pixel-identical trên mọi OS. Playwright snapshots tách theo platform khi cần.
- Không có schema/data migration hoặc API compatibility change. Nếu bước sau cần field/API thật, tách khỏi M1 và quay về HTTP contracts/spec M2.
- Figma canonical nodes/token snapshot giữ ổn định. Nếu nguồn đổi geometry/copy/semantic meaning, ghi diff và cập nhật spec trước khi đổi baseline tương ứng.
- Nếu package/version chốt không còn install được hoặc peer conflict, xác minh registry/official docs, ghi version adjustment có bằng chứng; không bỏ qua dependency gates.
- Nếu font build download bị chặn, dùng font files có quyền sử dụng và `next/font/local` cho cùng font/weights/glyphs; record asset source. Không đổi font sang fallback để vượt visual gate.
- Nếu một dialog/helper/responsive flow đòi thêm route hoặc booking/auth/AI runtime, dừng phần đó để re-scope; giữ M1 boundary.
- Recovery theo từng commit/task: revert thay đổi frontend thuộc task bị lỗi, rerun last passing gate. Không dùng `git reset --hard` hoặc xóa thư mục chứa thay đổi người khác. Remote merge/deploy chưa thuộc plan này.

## 7. Execution checkpoints

Sau mỗi task: xem diff, chạy gate của task và ghi bằng chứng; không claim M1 complete từ unit tests hay docs checker. Sau Task 4 review desktop; sau Task 5 review responsive; sau Task 6 review full acceptance. Các thay đổi workflow/skills cá nhân được lưu ngoài repo; plan này có thể được hai thành viên thực hiện với công cụ họ chọn.
