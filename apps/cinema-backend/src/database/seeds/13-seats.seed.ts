import { DataSource } from 'typeorm';
import { Seat } from '#modules/cinemas/entities/seat.entity.js'; // Điều chỉnh đường dẫn theo dự án của bạn
import { Auditorium } from '#modules/cinemas/entities/auditorium.entity.js';
import { SeatType } from '#modules/seat-types/entities/seat-type.entity.js';
import { SeatStatus } from '#modules/cinemas/enums/seat-status.enum.js';

export class SeatSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const auditoriumRepository = dataSource.getRepository(Auditorium);
    const seatTypeRepository = dataSource.getRepository(SeatType);
    const seatRepository = dataSource.getRepository(Seat);

    console.log('Khởi chạy quy trình Seeding Ghế ngồi (Seats)...');

    // 1. Lấy danh sách Loại ghế (Seat Types) từ DB
    const seatTypes = await seatTypeRepository.find();
    if (seatTypes.length === 0) {
      console.warn(
        ' Không tìm thấy SeatType trong DB. Vui lòng seed bảng SeatType trước!',
      );
      return;
    }

    const normalSeatType =
      seatTypes.find((st) => st.code === 'NORMAL') || seatTypes[0];
    const vipSeatType =
      seatTypes.find((st) => st.code === 'VIP') || seatTypes[1] || seatTypes[0];
    const sweetboxSeatType =
      seatTypes.find((st) => st.code === 'SWEETBOX') ||
      seatTypes[2] ||
      seatTypes[0];

    // 2. Lấy danh sách toàn bộ Phòng chiếu (Auditoriums)
    const auditoriums = await auditoriumRepository.find();
    if (auditoriums.length === 0) {
      console.warn(
        ' Không tìm thấy phòng chiếu nào. Vui lòng chạy AuditoriumSeeder trước!',
      );
      return;
    }

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    for (const auditorium of auditoriums) {
      // Đảm bảo tính Lũy đẳng (Idempotent): Nếu phòng chiếu đã có ghế thì bỏ qua
      const existingSeatsCount = await seatRepository.count({
        where: { auditoriumId: auditorium.id },
      });

      if (existingSeatsCount > 0) {
        console.log(
          `~ Phòng [${auditorium.name}] đã có ${existingSeatsCount} ghế (Bỏ qua).`,
        );
        continue;
      }

      const seatsToCreate: Partial<Seat>[] = [];

      // Cấu hình kích thước ma trận ghế theo sức chứa phòng chiếu
      // - Phòng 120 ghế: 10 hàng (A-J) x 12 cột
      // - Phòng 80 ghế: 8 hàng (A-H) x 10 cột
      const isLargeHall = auditorium.totalSeats >= 120;
      const totalRows = isLargeHall ? 10 : 8;
      const totalCols = isLargeHall ? 12 : 10;

      for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
        const rowLabel = alphabet[rowIndex];
        const isLastRow = rowIndex === totalRows - 1; // Hàng cuối cùng xếp ghế SWEETBOX

        if (isLastRow) {
          // =========================================================================
          // HÀNG CUỐI: GHẾ ĐÔI SWEETBOX (gridSpan = 2, chiếm 2 ô trên lưới)
          // =========================================================================
          for (let col = 1; col <= totalCols; col += 2) {
            const coordX = col - 1;
            const coordY = rowIndex;

            seatsToCreate.push({
              auditoriumId: auditorium.id,
              seatTypeId: sweetboxSeatType.id,
              rowLabel: rowLabel,
              columnNumber: col,
              seatNumber: `${rowLabel}${col}-${rowLabel}${col + 1}`, // VD: J1-J2, H1-H2
              coordX: coordX,
              coordY: coordY,
              gridSpan: 2, // Ghế đôi chiếm 2 cột
              status: SeatStatus.ACTIVE || 'ACTIVE',
            });
          }
        } else {
          // =========================================================================
          // HÀNG THƯỜNG VÀ HÀNG VIP (gridSpan = 1)
          // =========================================================================
          // Quy hoạch vị trí:
          // - Các hàng trung tâm (D->G với phòng lớn, C->F với phòng nhỏ): Ghế VIP
          // - Các hàng gần màn hình hoặc còn lại: Ghế NORMAL
          const isVipRow = isLargeHall
            ? rowIndex >= 3 && rowIndex <= 6 // Hàng D, E, F, G
            : rowIndex >= 2 && rowIndex <= 5; // Hàng C, D, E, F

          const selectedSeatType = isVipRow ? vipSeatType : normalSeatType;

          for (let col = 1; col <= totalCols; col++) {
            const coordX = col - 1;
            const coordY = rowIndex;

            seatsToCreate.push({
              auditoriumId: auditorium.id,
              seatTypeId: selectedSeatType.id,
              rowLabel: rowLabel,
              columnNumber: col,
              seatNumber: `${rowLabel}${col}`, // VD: A1, B5, D10
              coordX: coordX,
              coordY: coordY,
              gridSpan: 1,
              status: SeatStatus.ACTIVE || 'ACTIVE',
            });
          }
        }
      }

      // 3. Bulk Insert ghế vào Database theo từng chunk 100 bản ghi để tối ưu hiệu năng
      await seatRepository.save(seatsToCreate, { chunk: 100 });
      console.log(
        `+ Khởi tạo thành công ${seatsToCreate.length} ghế cho phòng [${auditorium.name}]`,
      );
    }

    console.log('Hoàn thành Seeding danh mục Ghế ngồi (Seats) thành công!');
  }
}
