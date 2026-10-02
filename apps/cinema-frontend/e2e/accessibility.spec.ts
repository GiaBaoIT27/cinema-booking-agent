import { expect, test } from "@playwright/test";

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
