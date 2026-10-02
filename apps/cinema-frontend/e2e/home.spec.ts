import { expect, test } from "@playwright/test";

test("search draft preserves curated sections; Enter and button submit the same snapshot", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("searchbox", { name: "Tìm phim" });
  await input.fill(" dUnE ");
  await expect(page.getByTestId("movie-card")).toHaveCount(10);
  await input.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("status")).toContainText("Đang tìm phim");
  await expect(dialog.getByRole("heading", { name: "Dune: Part Two" })).toBeVisible();
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Tìm phim", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Dune: Part Two" })).toBeVisible();
});

test("closing pending search cancels it and a new submission owns the result", async ({ page }) => {
  await page.goto("/");
  await page.clock.install();
  const input = page.getByRole("searchbox");
  await input.fill("Dune");
  await input.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByTestId("search-skeleton")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.clock.runFor(350);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await input.fill("Afterlight");
  await input.press("Enter");
  await page.clock.runFor(350);
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Afterlight" })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Dune: Part Two" })).toHaveCount(0);
});

test("empty recovery preserves upcoming and syncs hero while browse preserves hero draft", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("hero-filters").getByRole("button", { name: "Sắp chiếu" }).click();
  await page.getByTestId("hero-filters").getByRole("button", { name: "Tâm lý" }).click();
  await page.getByRole("searchbox").fill("missing");
  await page.getByRole("searchbox").press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("status")).toContainText("Không có phim phù hợp");
  await dialog.getByRole("button", { name: "Xóa bộ lọc" }).click();
  await expect(dialog.getByRole("heading", { name: "Orbit Zero" })).toBeVisible();
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page.getByTestId("hero-filters").getByRole("button", { name: "Sắp chiếu" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("searchbox").fill("my draft");
  await page.getByRole("button", { name: "Xem tất cả phim", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Dune: Part Two" })).toBeVisible();
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("my draft");
});

test("quick dependencies reset downstream and no-options stays disabled", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("combobox", { name: "2. Chọn phim" })).toBeDisabled();
  await page.getByRole("combobox", { name: "1. Chọn rạp" }).selectOption("demo-central");
  await page.getByRole("combobox", { name: "2. Chọn phim" }).selectOption("dune-part-two");
  await page.getByRole("combobox", { name: "3. Chọn ngày" }).selectOption("2026-10-10");
  await page.getByRole("combobox", { name: /^4\./ }).selectOption("central-dune-1010-1800");
  await page.getByRole("combobox", { name: "1. Chọn rạp" }).selectOption("demo-west");
  await expect(page.getByRole("combobox", { name: "2. Chọn phim" })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "3. Chọn ngày" })).toBeDisabled();
  await expect(page.getByTestId("quick-submit")).toBeDisabled();
  await page.getByRole("combobox", { name: "1. Chọn rạp" }).selectOption("demo-no-showtimes");
  await expect(page.getByRole("combobox", { name: "2. Chọn phim" })).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("Chưa có suất phù hợp");
});

test("preferences preserve query, filters and tuple with translated modal context", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("Dune");
  await page.getByTestId("hero-filters").getByRole("button", { name: "Viễn tưởng" }).click();
  await page.getByRole("combobox", { name: "1. Chọn rạp" }).selectOption("demo-central");
  await page.getByRole("combobox", { name: "2. Chọn phim" }).selectOption("dune-part-two");
  await page.getByRole("combobox", { name: "3. Chọn ngày" }).selectOption("2026-10-10");
  await page.getByRole("combobox", { name: /^4\./ }).selectOption("central-dune-1010-1800");
  await page.getByTestId("quick-submit").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Dune: Part Two");
  await expect(dialog).toContainText("Demo Central");
  await dialog.getByRole("button", { name: "EN", exact: true }).click();
  await dialog.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(dialog).toContainText("Oct 10, 2026");
  await expect(dialog).toContainText("demo data");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("Dune");
  await expect(page.getByRole("combobox", { name: /^4\./ })).toHaveValue("central-dune-1010-1800");
  await expect(page.getByTestId("hero-filters").getByRole("button", { name: "Sci-Fi" })).toHaveAttribute("aria-pressed", "true");
});

test("guest destinations, movie details, AI and section browse have bounded feedback", async ({ page }) => {
  await page.goto("/");
  for (const [name, title] of [["Rạp phim", "Rạp phim"], ["Vé của tôi", "Vé của tôi"], ["Đăng nhập", "Đăng nhập"], ["Hỏi AI", "Trợ lý AI"]]) {
    await page.getByRole("button", { name, exact: true }).first().click();
    await expect(page.getByRole("dialog").getByRole("heading", { level: 2 })).toHaveText(title);
    await expect(page.getByRole("dialog")).toContainText("dữ liệu mẫu");
    await page.keyboard.press("Escape");
  }
  await page.getByTestId("ai-entry").getByRole("button").click();
  await expect(page.getByRole("dialog")).toContainText("Trợ lý AI");
  await page.keyboard.press("Escape");
  for (const card of await page.getByTestId("movie-card").all()) {
    const title = await card.getByRole("heading").innerText();
    await card.getByRole("button").click();
    await expect(page.getByRole("dialog")).toContainText(title);
    await page.keyboard.press("Escape");
  }
  await page.getByRole("button", { name: "Xem tất cả phim sắp chiếu" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Orbit Zero" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Đang chiếu", exact: true }).click();
  await expect(page).toHaveURL(/#now-showing$/);
  await page.getByRole("link", { name: /Movie Booking Agent/ }).click();
  await expect(page).toHaveURL(/#top$/);
});
