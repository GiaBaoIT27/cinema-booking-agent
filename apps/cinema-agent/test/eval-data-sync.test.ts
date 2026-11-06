import { test } from "node:test";
import assert from "node:assert/strict";

import {
  checkFixtures,
  requiredEvalDate,
  resolveSeatId,
  vnDate,
  type SyncFixtures,
} from "../eval/eval-data-sync.js";

// 19:52 ngày 06/11 giờ VN – đúng thời điểm lần chạy eval bị lệch dữ liệu
const RUN_AT = new Date("2026-11-06T12:52:00Z");

const fixtures = (over: Partial<SyncFixtures> = {}): SyncFixtures => ({
  evalDate: "2026-11-07",
  showtimes: [
    { key: "mai-morning", id: "669", startTime: "2026-11-07T03:00:00.000Z", auditoriumCode: "HALL-01" },
    { key: "dune-evening", id: "673", startTime: "2026-11-07T13:00:00.000Z", auditoriumCode: "HALL-02" },
  ],
  seatsByAuditorium: {
    "HALL-01": { NORMAL: [{ id: 658, seatNumber: "H7" }, { id: 660, seatNumber: "H9" }] },
    "HALL-02": { NORMAL: [{ id: 750, seatNumber: "H7" }], SWEETBOX: [{ id: 755, seatNumber: "H7-H8" }] },
  },
  ...over,
});

const db = [
  { id: "669", startTime: "2026-11-07T03:00:00.000Z" },
  { id: "673", startTime: "2026-11-07T13:00:00.000Z" },
];

test("ngày theo giờ VN: 19:52 ngày 06/11 VN vẫn là 06/11, 'ngày mai' là 07/11", () => {
  assert.equal(vnDate(RUN_AT), "2026-11-06");
  assert.equal(requiredEvalDate(RUN_AT), "2026-11-07");
  // 23:30 UTC ngày 06/11 = 06:30 sáng 07/11 giờ VN
  assert.equal(requiredEvalDate(new Date("2026-11-06T23:30:00Z")), "2026-11-08");
});

test("fixtures khớp DB, đúng ngày mai, suất chưa bắt đầu => không lỗi", () => {
  assert.deepEqual(checkFixtures(fixtures(), db, [], RUN_AT), []);
});

test("tái hiện lần chạy lỗi: seed cho 05/11, chạy tối 06/11 => phát hiện TRƯỚC khi chạy", () => {
  const stale = fixtures({
    evalDate: "2026-11-05",
    showtimes: [{ key: "mai-morning", id: "669", startTime: "2026-11-05T03:00:00.000Z", auditoriumCode: "HALL-01" }],
  });
  const errors = checkFixtures(stale, [{ id: "669", startTime: "2026-11-05T03:00:00.000Z" }], [], RUN_AT);
  assert.ok(errors.some((e) => e.includes("2026-11-05") && e.includes("2026-11-07")));
  assert.ok(errors.some((e) => e.includes("đã bắt đầu")));
});

test("fixtures trỏ tới suất không còn trong DB hoặc lệch giờ => báo lỗi", () => {
  const errors = checkFixtures(
    fixtures(),
    [{ id: "669", startTime: "2026-11-07T04:00:00.000Z" }],
    [],
    RUN_AT,
  );
  assert.ok(errors.some((e) => e.includes("673") && e.includes("không còn")));
  assert.ok(errors.some((e) => e.includes("lệch giờ")));
});

test("tra ghế theo đúng phòng của suất chiếu – không nhầm sang phòng khác cùng nhãn", () => {
  assert.equal(resolveSeatId(fixtures(), "H7", "mai-morning"), "658");
  assert.equal(resolveSeatId(fixtures(), "H7", "dune-evening"), "750");
  assert.equal(resolveSeatId(fixtures(), "H9", "dune-evening"), null);
});

test("tra ghế không kèm suất: chỉ chấp nhận nhãn duy nhất; không còn id viết cứng", () => {
  assert.equal(resolveSeatId(fixtures(), "H7"), null); // có ở cả 2 phòng
  assert.equal(resolveSeatId(fixtures(), "H9"), "660");
  assert.equal(resolveSeatId(fixtures(), "Z99"), null);
  assert.equal(resolveSeatId(fixtures(), "658"), "658");
});

test("nhãn ghế dataset dùng mà fixtures không có => báo lỗi kèm mã case", () => {
  const errors = checkFixtures(
    fixtures(),
    db,
    [{ caseId: "A03", label: "Z1", showtimeKey: "mai-morning" }],
    RUN_AT,
  );
  assert.deepEqual(errors, ['[A03] Không tra được ghế "Z1" trong phòng của suất mai-morning']);
});
