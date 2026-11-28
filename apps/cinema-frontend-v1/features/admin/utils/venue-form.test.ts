import { describe, expect, it } from "vitest";
import {
  buildSeatGrid,
  emptyAuditoriumForm,
  emptyCineplexForm,
  rowLetters,
  validateAuditoriumForm,
  validateCineplexForm,
  validateSeatGrid,
} from "./venue-form";

describe("cineplex form", () => {
  const ok = {
    ...emptyCineplexForm,
    code: "CPX-HCM-Q1",
    name: "Cinema Star - Quận 1",
    provinceId: "2",
    wardId: "4",
    address: "12 Lê Lợi",
  };

  it("tạo payload, bỏ tọa độ và SĐT trống", () => {
    const r = validateCineplexForm(ok);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload).toMatchObject({ provinceId: 2, wardId: 4 });
      expect(r.payload.latitude).toBeUndefined();
      expect(r.payload.phoneNumber).toBeUndefined();
    }
  });

  it("từ chối mã chữ thường, tọa độ ngoài phạm vi, SĐT sai", () => {
    const r = validateCineplexForm({ ...ok, code: "cpx q1", latitude: "95", phoneNumber: "0123" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["code", "latitude", "phoneNumber"]);
  });
});

describe("auditorium form", () => {
  it("bắt buộc cụm rạp và sức chứa ≥ 1", () => {
    const r = validateAuditoriumForm({ ...emptyAuditoriumForm, code: "HALL-01", name: "Phòng 1", totalSeats: "0" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["cineplexId", "totalSeats"]);
  });

  it("tạo payload hợp lệ", () => {
    const r = validateAuditoriumForm({ ...emptyAuditoriumForm, cineplexId: "1", code: "HALL-01", name: "Phòng 1", totalSeats: "120" });
    expect(r.ok && r.payload).toMatchObject({ cineplexId: 1, totalSeats: 120, screenType: "STANDARD" });
  });
});

describe("seat grid", () => {
  it("sinh đúng số ghế, mã ghế và tọa độ không trùng", () => {
    const items = buildSeatGrid({ rows: 3, seatsPerRow: 4, normalSeatTypeId: 1, vipSeatTypeId: 2, vipRows: ["C"] });
    expect(items).toHaveLength(12);
    expect(items[0]).toMatchObject({ seatNumber: "A1", coordX: 0, coordY: 0, seatTypeId: 1 });
    expect(items[11]).toMatchObject({ seatNumber: "C4", coordX: 3, coordY: 2, seatTypeId: 2 });
    expect(new Set(items.map((i) => `${i.coordX},${i.coordY}`)).size).toBe(12);
    expect(new Set(items.map((i) => i.seatNumber)).size).toBe(12);
  });

  it("không vượt sức chứa phòng", () => {
    expect(validateSeatGrid("10", "12", 100)).toMatch(/vượt sức chứa/);
    expect(validateSeatGrid("10", "10", 100)).toBeNull();
    expect(validateSeatGrid("0", "10", 100)).not.toBeNull();
  });

  it("liệt kê chữ cái hàng", () => {
    expect(rowLetters(3)).toEqual(["A", "B", "C"]);
  });
});
