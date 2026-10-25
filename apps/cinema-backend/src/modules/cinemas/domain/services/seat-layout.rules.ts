/**
 * Quy tắc thuần của sơ đồ ghế (không phụ thuộc framework / DB).
 * Một ghế chiếm `gridSpan` ô liên tiếp theo trục X trên cùng hàng Y.
 */

export interface GridPlacement {
  coordX: number;
  coordY: number;
  gridSpan?: number;
}

export interface LayoutItem extends GridPlacement {
  seatNumber: string;
}

export type LayoutCollision =
  | { kind: 'DUPLICATE_SEAT_NUMBER'; seatNumber: string }
  | { kind: 'OVERLAPPING_COORDINATES'; coordX: number; coordY: number };

export const spanOf = (item: { gridSpan?: number }): number =>
  item.gridSpan || 1;

/** Tìm va chạm đầu tiên (theo thứ tự phần tử): trùng mã ghế hoặc chồng lấp ô lưới. */
export function findLayoutCollision(items: LayoutItem[]): LayoutCollision | null {
  const seatNumbers = new Set<string>();
  const occupied = new Set<string>();

  for (const item of items) {
    if (seatNumbers.has(item.seatNumber)) {
      return { kind: 'DUPLICATE_SEAT_NUMBER', seatNumber: item.seatNumber };
    }
    seatNumbers.add(item.seatNumber);

    for (let dx = 0; dx < spanOf(item); dx++) {
      const x = item.coordX + dx;
      const key = `${x},${item.coordY}`;
      if (occupied.has(key)) {
        return { kind: 'OVERLAPPING_COORDINATES', coordX: x, coordY: item.coordY };
      }
      occupied.add(key);
    }
  }
  return null;
}

/** Sức chứa quy đổi = tổng gridSpan của các ghế. */
export function totalCapacity(items: { gridSpan?: number }[]): number {
  return items.reduce((sum, item) => sum + spanOf(item), 0);
}

/** Toạ độ lớn nhất (bao gồm) mà sơ đồ chiếm dụng. */
export function computeGridBounds(items: GridPlacement[]): {
  maxX: number;
  maxY: number;
} {
  let maxX = 0;
  let maxY = 0;
  for (const item of items) {
    maxX = Math.max(maxX, item.coordX + spanOf(item) - 1);
    maxY = Math.max(maxY, item.coordY);
  }
  return { maxX, maxY };
}

/** Kích thước ma trận hiển thị (số hàng / số cột cần vẽ). */
export function computeGridDimensions(seats: GridPlacement[]): {
  maxRowsY: number;
  maxColumnsX: number;
} {
  let maxRowsY = 0;
  let maxColumnsX = 0;
  for (const seat of seats) {
    maxColumnsX = Math.max(maxColumnsX, seat.coordX + spanOf(seat));
    maxRowsY = Math.max(maxRowsY, seat.coordY + 1);
  }
  return { maxRowsY, maxColumnsX };
}
