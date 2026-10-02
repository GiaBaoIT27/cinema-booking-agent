import { expect, test } from "@playwright/test";

test("preference controls respond to keyboard and expose selected state", async ({ page }) => {
  await page.goto("/");
  const english = page.getByRole("button", { name: "English" });
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
