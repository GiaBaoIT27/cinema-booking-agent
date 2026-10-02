import { expect, test } from "vitest";
import { formatShowtime, getDictionary } from "./dictionary";

test("genre and status labels translate while stable IDs remain keys", () => {
  expect(getDictionary("vi").genres["sci-fi"]).toBe("Khoa học viễn tưởng");
  expect(getDictionary("en").genres["sci-fi"]).toBe("Sci-fi");
  expect(getDictionary("vi").statuses["now-showing"]).toBe("Đang chiếu");
  expect(getDictionary("en").statuses["now-showing"]).toBe("Now Showing");
});

test("showtime formatting is independent of the machine timezone", () => {
  expect(formatShowtime("2026-10-10", "19:30", "vi")).toBe("10/10/2026 · 19:30");
  expect(formatShowtime("2026-10-10", "19:30", "en")).toBe("Oct 10, 2026 · 7:30 PM");
});
