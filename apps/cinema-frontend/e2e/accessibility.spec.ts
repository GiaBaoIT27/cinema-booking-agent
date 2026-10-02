import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { contrast } from "./contrast";
import { writeFile } from "node:fs/promises";

for (const theme of ["light", "dark"]) for (const locale of ["vi", "en"]) {
  test(`enabled contrast and axe Home/menu/search ${theme} ${locale}`, async ({ page, context }, testInfo) => {
    await context.addCookies([
      { name: "mba_theme", value: theme, url: "http://127.0.0.1:3100" },
      { name: "mba_locale", value: locale, url: "http://127.0.0.1:3100" },
    ]);
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto("/");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const measured: Record<string, Awaited<ReturnType<typeof contrast>>> = {};
    for (const selector of ["h1", ".hero-description", ".hero-search button", '.hero-filters button[aria-pressed="true"]', '.hero-filters button[aria-pressed="false"]', ".movie-metadata", ".browse-primary", ".movie-section-heading button:not(.browse-primary)", ".release-helper", ".ai-entry p", ".ai-entry button", ".quick-helper", "#quick-cinema"]) {
      measured[selector] = await contrast(page.locator(selector).first());
    }
    measured.placeholder = await contrast(page.getByRole("searchbox"), "::placeholder");
    for (const selector of [".hero-search button", ".ai-entry button"]) {
      await page.locator(selector).hover();
      const hoverBackground = selector === ".hero-search button"
        ? theme === "light" ? "rgb(38, 122, 68)" : "rgb(99, 200, 132)"
        : theme === "light" ? "rgb(102, 54, 40)" : "rgb(213, 163, 142)";
      await expect(page.locator(selector)).toHaveCSS("background-color", hoverBackground);
      measured[`${selector}:hover`] = await contrast(page.locator(selector));
    }
    for (const [name, pair] of Object.entries(measured)) expect(pair.ratio, `${name}: ${JSON.stringify(pair)}`).toBeGreaterThanOrEqual(4.5);
    await testInfo.attach("runtime-enabled-contrast.json", { body: JSON.stringify(measured, null, 2), contentType: "application/json" });
    await writeFile(testInfo.outputPath("runtime-enabled-contrast.json"), JSON.stringify(measured, null, 2));
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press("Escape");
    await page.getByRole("searchbox").fill("Dune");
    await page.getByRole("searchbox").press("Enter");
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Dune: Part Two" })).toBeVisible();
    expect(await page.getByRole("dialog").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}

test("keyboard Quick selection reaches handoff; reduced motion keeps anchor and focus immediate", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  await page.locator("#quick-cinema").focus();
  for (const id of ["quick-cinema", "quick-movie", "quick-date", "quick-showtime"]) {
    await expect(page.locator(`#${id}`)).toBeFocused();
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Tab");
  }
  await expect(page.getByTestId("quick-submit")).toBeFocused();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Dune: Part Two");
  await dialog.getByRole("button", { name: "Đóng", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Sáng", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Đóng", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("quick-submit")).toBeFocused();
});

test("mobile menu closes before handoff and restores visible focus across resize", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  await menu.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("link", { name: "Trang chủ", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Đóng", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("link", { name: "Trang chủ", exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "Rạp phim", exact: true }).press("Enter");
  await expect(page.locator("dialog[open]")).toHaveCount(1);
  await expect(dialog).toContainText("dữ liệu mẫu");
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await menu.press("Enter");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".home-brand")).toBeFocused();
  await page.getByRole("button", { name: "Rạp phim", exact: true }).click();
  await page.setViewportSize({ width: 375, height: 900 });
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
});

test("preference controls respond to keyboard and expose selected state", async ({ page }) => {
  await page.goto("/");
  const english = page.getByRole("button", { name: "EN", exact: true });
  await english.focus();
  await expect(english).toBeFocused();
  await expect(english).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Space");
  await expect(english).toHaveAttribute("aria-pressed", "true");
  const dark = page.getByRole("button", { name: "Dark" });
  await dark.focus();
  await page.keyboard.press("Enter");
  await expect(dark).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});


test("native modal traps Tab, Escape closes and focus returns to search trigger", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Tìm phim", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element instanceof HTMLDialogElement && element.matches(":modal"))).toBe(true);
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await expect(dialog.getByRole("heading", { name: "Dune: Part Two" })).toBeVisible();
  const first = dialog.getByRole("button", { name: "Sáng", exact: true });
  const last = dialog.getByRole("button", { name: "Đóng", exact: true });
  await first.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("locale can change pending live status while the dialog stays open", async ({ page }) => {
  await page.goto("/");
  await page.clock.install();
  await page.getByRole("searchbox").fill("Dune");
  await page.getByRole("searchbox").press("Enter");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "EN", exact: true }).click();
  await expect(dialog.getByRole("status")).toHaveText("Searching movies");
  await page.clock.runFor(350);
  await expect(dialog.getByRole("heading", { name: "Dune: Part Two" })).toBeVisible();
  await expect(dialog).toContainText("Sci-Fi · 2h 46m");
});

test("keyboard Clear keeps focus in the modal through loading and ready", async ({ page }) => {
  await page.goto("/");
  await page.clock.install();
  const search = page.getByRole("searchbox");
  await search.fill("missing");
  await search.press("Enter");
  const dialog = page.getByRole("dialog");
  await page.clock.runFor(350);
  const clear = dialog.getByRole("button", { name: "Xóa bộ lọc" });
  await expect(clear).toBeVisible();
  await clear.focus();
  await clear.press("Enter");
  await expect(dialog.getByTestId("search-skeleton")).toBeVisible();
  expect(await dialog.evaluate((element) => element.matches(":modal") && element.contains(document.activeElement))).toBe(true);
  await expect(dialog.getByRole("button", { name: "Đóng", exact: true })).toBeFocused();
  await page.clock.runFor(350);
  await expect(dialog.getByRole("heading", { name: "Dune: Part Two" })).toBeVisible();
  expect(await dialog.evaluate((element) => element.matches(":modal") && element.contains(document.activeElement))).toBe(true);
  await expect(dialog.getByRole("button", { name: "Đóng", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Sáng", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Đóng", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(search).toBeFocused();
});

test("keyboard View details keeps focus in the modal after results are replaced", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("searchbox");
  await search.fill("Dune");
  await search.press("Enter");
  const dialog = page.getByRole("dialog");
  const details = dialog.getByRole("button", { name: "Xem chi tiết" });
  await expect(details).toBeVisible();
  await details.focus();
  await details.press("Enter");
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveText("Xem chi tiết");
  expect(await dialog.evaluate((element) => element.matches(":modal") && element.contains(document.activeElement))).toBe(true);
  await expect(dialog.getByRole("button", { name: "Đóng", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Sáng", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Đóng", exact: true })).toBeFocused();
  const english = dialog.getByRole("button", { name: "EN", exact: true });
  await english.focus();
  await english.press("Enter");
  await expect(english).toBeFocused();
  const dark = dialog.getByRole("button", { name: "Dark", exact: true });
  await dark.focus();
  await dark.press("Enter");
  await expect(dark).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(search).toBeFocused();
});
