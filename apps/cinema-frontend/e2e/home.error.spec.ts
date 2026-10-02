import { expect, test } from "@playwright/test";
import { contrast } from "./contrast";
import { writeFile } from "node:fs/promises";

for (const theme of ["light", "dark"]) {
  test(`runtime error text contrast ${theme}`, async ({ page, context }, testInfo) => {
    await context.addCookies([{ name: "mba_theme", value: theme, url: "http://127.0.0.1:3100" }]);
    await page.goto("/");
    await page.getByRole("searchbox").press("Enter");
    const error = page.getByRole("dialog").getByRole("status");
    await expect(error).toContainText("Không thể tải");
    const pair = await contrast(error);
    expect(pair.ratio).toBeGreaterThanOrEqual(4.5);
    await testInfo.attach("runtime-error-contrast.json", { body: JSON.stringify(pair), contentType: "application/json" });
    await writeFile(testInfo.outputPath("runtime-error-contrast.json"), JSON.stringify(pair, null, 2));
  });
}
test("Retry uses submitted snapshot and preferences do not recreate the error-once adapter", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("Dune");
  await page.getByRole("searchbox").press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("status")).toContainText("Không thể tải");
  await dialog.getByRole("button", { name: "EN", exact: true }).click();
  await dialog.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(dialog.getByTestId("submitted-context")).toContainText("Dune · Now showing");
  await dialog.getByRole("button", { name: "Retry" }).click();
  await expect(dialog.getByRole("heading", { name: "Dune: Part Two" })).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("searchbox").fill("Afterlight");
  await page.getByRole("searchbox").press("Enter");
  await expect(dialog.getByRole("heading", { name: "Afterlight" })).toBeVisible();
});
