import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseQuickOption } from "./quick-controls";

for (const theme of ["light", "dark"]) {
  test(`search focus belongs to the outer rounded field in ${theme}`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "mba_theme", value: theme, url: "http://127.0.0.1:3100" },
    ]);
    await page.goto("/");
    const search = page.getByRole("searchbox");
    const field = page.locator(".hero-search > div");
    await search.click();
    await expect(search).toBeFocused();
    await expect(search).toHaveCSS("outline-style", "none");
    await search.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(search).toBeFocused();
    await expect(search).toHaveCSS("outline-style", "none");
    const outline = await field.evaluate((element) => ({
      style: getComputedStyle(element).outlineStyle,
      width: getComputedStyle(element).outlineWidth,
    }));
    expect(outline).toEqual({ style: "solid", width: "3px" });
    await search.fill("Dune");
    await search.press("Enter");
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "Dune: Part Two" }),
    ).toBeVisible();
  });
}

test("every enabled Quick box opens from its label and padded edge", async ({
  page,
}) => {
  await page.goto("/");
  for (const [id, label, option] of [
    ["quick-cinema", "1. Chọn rạp", "Demo Central"],
    ["quick-movie", "2. Chọn phim", "Dune: Part Two"],
    ["quick-date", "3. Chọn ngày", "10/10/2026"],
    ["quick-showtime", "4. Chọn suất", "18:00"],
  ]) {
    const field = page.locator(`#${id}`);
    await field.getByText(label, { exact: true }).click();
    const list = page.getByRole("listbox", { name: label });
    await expect(list).toBeVisible();
    await page.keyboard.press("Escape");
    await field.click({ position: { x: 4, y: 4 } });
    await expect(list).toBeVisible();
    await list.getByRole("option", { name: option, exact: true }).click();
    await expect(list).toBeHidden();
    await expect(field).toBeFocused();
    await expect(field).toContainText(option);
  }
  await expect(page.getByTestId("quick-submit")).toBeEnabled();
});

test("Escape cancels exploration; outside click and another box dismiss the list", async ({
  page,
}) => {
  await page.goto("/");
  await chooseQuickOption(page, "1. Chọn rạp", "Demo Central");
  const cinema = page.locator("#quick-cinema");
  await cinema.press("Enter");
  await expect(
    page.getByRole("option", { name: "Demo Central", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await cinema.press("ArrowDown");
  await cinema.press("Escape");
  await expect(cinema).toContainText("Demo Central");
  await expect(cinema).toBeFocused();
  await expect(page.getByRole("listbox")).toBeHidden();
  await cinema.click();
  await page.locator("#quick-movie").click();
  await expect(page.getByRole("listbox")).toHaveCount(1);
  await expect(
    page.getByRole("listbox", { name: "2. Chọn phim" }),
  ).toBeVisible();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(page.getByRole("listbox")).toBeHidden();
});

test("keyboard typeahead selects a cinema, Tab commits, and clearing resets dependencies", async ({
  page,
}) => {
  await page.goto("/");
  const cinema = page.locator("#quick-cinema");
  await cinema.focus();
  await cinema.pressSequentially("Demo W");
  await expect(page.getByRole("listbox")).toBeVisible();
  const activeId = await cinema.getAttribute("aria-activedescendant");
  await expect(page.locator(`[id="${activeId}"]`)).toHaveText("Demo West");
  await cinema.press("Tab");
  await expect(cinema).toContainText("Demo West");
  await expect(page.locator("#quick-movie")).toBeFocused();
  await chooseQuickOption(page, "2. Chọn phim", "Dune: Part Two");
  await chooseQuickOption(page, "1. Chọn rạp", "Chưa chọn");
  await expect(cinema).toContainText("Chưa chọn");
  await expect(page.locator("#quick-movie")).toBeDisabled();
  await expect(page.locator("#quick-date")).toBeDisabled();
  await expect(page.locator("#quick-showtime")).toBeDisabled();
  await expect(page.getByTestId("quick-submit")).toBeDisabled();
});

test("unmatched typeahead after canceled exploration preserves the booking tuple", async ({
  page,
}) => {
  await page.goto("/");
  await chooseQuickOption(page, "1. Chọn rạp", "Demo Central");
  await chooseQuickOption(page, "2. Chọn phim", "Dune: Part Two");
  await chooseQuickOption(page, "3. Chọn ngày", "10/10/2026");
  await chooseQuickOption(page, /^4\./, "18:00");
  const cinema = page.locator("#quick-cinema");
  await cinema.press("Enter");
  await cinema.press("Home");
  await cinema.press("Escape");
  await expect(cinema).toContainText("Demo Central");
  await cinema.press("z");
  await cinema.press("Tab");
  await expect(cinema).toContainText("Demo Central");
  await expect(page.locator("#quick-movie")).toContainText("Dune: Part Two");
  await expect(page.locator("#quick-date")).toContainText("10/10/2026");
  await expect(page.locator("#quick-showtime")).toContainText("18:00");
  await expect(page.getByTestId("quick-submit")).toBeEnabled();
});

test.describe("touch popup in a short viewport", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 375, height: 300 },
  });

  test("tap opens the whole box and scroll keeps popup choices selectable", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#quick-cinema").tap();
    const list = page.getByRole("listbox");
    await expect(list).toBeVisible();
    const bounds = await list.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(300);
    await list.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await list.getByRole("option", { name: "Demo Central", exact: true }).tap();
    await expect(page.locator("#quick-cinema")).toContainText("Demo Central");
    await page.locator("#quick-movie").tap();
    await list.getByRole("option", { name: "Afterlight", exact: true }).tap();
    await expect(page.locator("#quick-movie")).toContainText("Afterlight");
    await expect(list).toBeHidden();
  });
});

for (const width of [320, 375, 768, 1024, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`custom popup stays readable and within the viewport at ${width} ${theme}`, async ({
      page,
      context,
    }) => {
      await context.addCookies([
        { name: "mba_theme", value: theme, url: "http://127.0.0.1:3100" },
      ]);
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.locator("#quick-cinema").click();
      const list = page.getByRole("listbox");
      await expect(list).toBeVisible();
      const bounds = await list.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      const option = list.getByRole("option", { name: "Demo Central" });
      expect((await option.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await option.click();
      await page.locator("#quick-movie").click();
      await expect(page.getByRole("listbox")).toBeVisible();
      await page.locator("#quick-cinema").click();
      await page.getByRole("button", { name: "EN", exact: true }).click();
      await expect(page.getByRole("listbox")).toBeHidden();
      await page.locator("#quick-cinema").click();
      await expect(
        page.getByRole("listbox", { name: "1. Choose cinema" }),
      ).toBeVisible();
      await expect(
        page.getByRole("option", { name: "Demo Central" }),
      ).toHaveAttribute("aria-selected", "true");
    });
  }
}
