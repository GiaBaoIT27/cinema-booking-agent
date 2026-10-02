import { expect, test } from "@playwright/test";

for (const width of [320, 375, 768, 1024, 1440]) {
  for (const locale of ["vi", "en"]) for (const theme of ["light", "dark"]) {
    test(`responsive content ${width} ${locale} ${theme}`, async ({ page, context }, testInfo) => {
      await context.addCookies([
        { name: "mba_locale", value: locale, url: "http://127.0.0.1:3100" },
        { name: "mba_theme", value: theme, url: "http://127.0.0.1:3100" },
      ]);
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      const cards = await page.locator("#now-showing .movie-card").evaluateAll(elements => elements.map(el => el.getBoundingClientRect().top));
      expect(cards.filter(top => top === cards[0])).toHaveLength(width < 360 ? 1 : width < 768 ? 2 : width < 1024 ? 3 : width < 1280 ? 4 : 5);
      const fields = await page.locator(".quick-booking select").evaluateAll(elements => elements.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y }; }));
      expect(fields.filter(field => field.y === fields[0].y)).toHaveLength(width < 768 ? 1 : width < 1280 ? 2 : 4);
      const poster = await page.locator(".movie-poster").first().boundingBox();
      expect(poster!.width / poster!.height).toBeCloseTo(192 / 250, 2);
      const search = await page.locator(".hero-search > div").boundingBox();
      const submit = await page.locator(".hero-search button").boundingBox();
      expect(submit!.y >= search!.y + search!.height).toBe(width < 768);
      const title = await page.locator("h1").boundingBox();
      const panel = await page.locator(".release-panel").boundingBox();
      expect(panel!.y > title!.y).toBe(width < 1280);
      const clipped = await page.locator("main p, main h1, main h2, main h3, main button, label:not(.sr-only), .preference-item").evaluateAll(elements => elements.filter(el => {
        const style = getComputedStyle(el);
        return el.clientWidth && (el.scrollWidth > el.clientWidth + 1 || (style.overflowY !== "visible" && el.scrollHeight > el.clientHeight + 1));
      }).map(el => el.textContent));
      expect(clipped).toEqual([]);
      if (width < 1024) {
        await expect(page.locator(".home-nav-links")).toBeHidden();
        await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeVisible();
      } else {
        await expect(page.locator(".home-nav-links")).toBeVisible();
        await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeHidden();
      }
      if (width < 768) {
        const small = await page.locator("button, a, input, select").evaluateAll(elements => elements.filter(el => el.getClientRects().length && !el.closest("dialog:not([open])")).filter(el => { const r = el.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map(el => `${el.tagName}: ${el.textContent || el.id}`));
        expect(small).toEqual([]);
      }
      await page.screenshot({ path: testInfo.outputPath(`home-${width}-${locale}-${theme}.png`), fullPage: true });
    });
  }
}

// Region snapshots guard the reviewed design across viewport, language and theme.
// The responsive content cases above separately assert geometry and usable targets.
for (const width of [1440, 375, 768, 1024]) {
  for (const locale of ["vi", "en"]) for (const theme of ["light", "dark"]) {
    test(`reviewed regions ${width}-${locale}-${theme}`, async ({ page, context }) => {
      await page.setViewportSize({ width, height: 1000 });
      await context.addCookies([
        { name: "mba_locale", value: locale, url: "http://127.0.0.1:3100" },
        { name: "mba_theme", value: theme, url: "http://127.0.0.1:3100" },
      ]);
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      for (const region of ["preferences", "navigation", "hero", "quick-booking", "ai-entry", "now-showing", "upcoming"]) {
        await expect(page.getByTestId(region)).toHaveScreenshot(`${region}-${width}-${locale}-${theme}.png`, { animations: "disabled", maxDiffPixelRatio: 0.005 });
      }
    });
  }
}
