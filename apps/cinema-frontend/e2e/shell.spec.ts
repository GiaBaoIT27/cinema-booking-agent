import { expect, test } from "@playwright/test";

test("server renders default preference attributes and a usable shell", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydration/i.test(message.text())) errors.push(message.text());
  });

  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test("valid preference cookies are reflected in the server response", async ({ page, context }) => {
  await context.addCookies([
    { name: "mba_locale", value: "en", url: "http://127.0.0.1:3100" },
    { name: "mba_theme", value: "dark", url: "http://127.0.0.1:3100" },
  ]);
  const response = await page.goto("/");
  const html = await response?.text();
  expect(html).toContain('<html lang="en" data-theme="dark"');
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
