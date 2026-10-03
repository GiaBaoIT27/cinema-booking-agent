import { expect, type Page } from "@playwright/test";

export async function chooseQuickOption(
  page: Page,
  field: string | RegExp,
  option: string,
) {
  await page.getByRole("combobox", { name: field }).click();
  const list = page.getByRole("listbox", { name: field });
  await expect(list).toBeVisible();
  await list.getByRole("option", { name: option, exact: true }).click();
  await expect(list).toBeHidden();
}
