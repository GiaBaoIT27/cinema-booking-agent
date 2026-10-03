import { expect, test } from "vitest";
import {
  formatShowtime,
  getDictionary,
} from "../../../../src/features/preferences/dictionary";

test("genre and status labels translate while stable IDs remain keys", () => {
  expect(getDictionary("vi").genres["sci-fi"]).toBe("Viễn tưởng");
  expect(getDictionary("en").genres["sci-fi"]).toBe("Sci-Fi");
  expect(getDictionary("vi").statuses["now-showing"]).toBe("Đang chiếu");
  expect(getDictionary("en").statuses["now-showing"]).toBe("Now showing");
});

test("showtime formatting is independent of the machine timezone", () => {
  expect(formatShowtime("2026-10-10", "19:30", "vi")).toBe(
    "10/10/2026 · 19:30",
  );
  expect(formatShowtime("2026-10-10", "19:30", "en")).toBe(
    "Oct 10, 2026 · 7:30 PM",
  );
});
