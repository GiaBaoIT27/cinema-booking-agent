import { expect, test } from "@playwright/test";
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
