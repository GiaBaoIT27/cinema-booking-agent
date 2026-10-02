import { expect, test } from "@playwright/test";

test("theme control labels follow the selected language", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Tối" })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("button", { name: "Dark" })).toBeVisible();
});

test("English and dark mode survive reload independently", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cinema");
  expect(errors).toEqual([]);
});

test("invalid locale cookie falls back without discarding dark theme", async ({ page, context }) => {
  await context.addCookies([
    { name: "mba_locale", value: "xx", url: "http://127.0.0.1:3100" },
    { name: "mba_theme", value: "dark", url: "http://127.0.0.1:3100" },
  ]);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("changing theme leaves locale and its copy intact", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("button", { name: "Dark" }).click();
  await page.getByRole("button", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cinema");
});

test("blocked cookie writes do not block in-session locale changes", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "cookie", { configurable: true, set() { throw new Error("blocked cookie"); } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cinema");
});
