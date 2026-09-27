import { DataSource } from 'typeorm';
import { Showtime } from '#modules/showtimes/entities/showtime.entity.js'; // Điều chỉnh đường dẫn theo dự án của bạn
import { Auditorium } from '#modules/cinemas/entities/auditorium.entity.js';
import { Movie } from '#modules/movies/entities/movie.entity.js';
import { ProjectionType } from '#modules/showtimes/enums/projection-type.enum.js';
import { ShowtimeStatus } from '#modules/showtimes/enums/showtime-status.enum.js';
import { MovieStatus } from '#modules/movies/enums/movie-status.enum.js';

export class ShowtimeSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const showtimeRepository = dataSource.getRepository(Showtime);
    const auditoriumRepository = dataSource.getRepository(Auditorium);
    const movieRepository = dataSource.getRepository(Movie);

    console.log('Khởi chạy quy trình Seeding Suất chiếu (Showtimes)...');

    // 1. Lấy danh sách Phòng chiếu và Phim đang chiếu (SHOWING)
    const auditoriums = await auditoriumRepository.find();
    const showingMovies = await movieRepository.find({
      where: [{ status: MovieStatus.SHOWING }],
    });

    if (auditoriums.length === 0 || showingMovies.length === 0) {
      console.warn(
        '⚠️ Không tìm thấy Auditoriums hoặc Phim đang chiếu trong DB. Vui lòng chạy AuditoriumSeeder và MovieSeeder trước!',
      );
      return;
    }

    // 2. Cấu hình thời gian lên lịch (Xếp lịch chiếu cho 3 ngày: Hôm nay + 2 ngày tới)
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);

    const cleaningMinutes = 15; // Thời gian dọn phòng giữa 2 suất chiếu

    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + dayOffset);

      for (const auditorium of auditoriums) {
        // Suất chiếu đầu tiên trong ngày bắt đầu từ 09:00 sáng
        let slotStartTime = new Date(currentDate);
        slotStartTime.setHours(9, 0, 0, 0);

        // Suất chiếu cuối cùng trong ngày bắt đầu trước 23:00 đêm
        const dayLimitTime = new Date(currentDate);
        dayLimitTime.setHours(23, 0, 0, 0);

        let movieIndex = 0;

        while (slotStartTime < dayLimitTime) {
          // Luân phiên lấy từng bộ phim trong danh sách phim đang chiếu
          const movie = showingMovies[movieIndex % showingMovies.length];
          movieIndex++;

          // Tính end_time = start_time + durationMinutes
          const slotEndTime = new Date(
            slotStartTime.getTime() + movie.durationMinutes * 60 * 1000,
          );

          // Ánh xạ ProjectionType tương ứng với loại màn hình phòng chiếu
          let projectionType = ProjectionType.TWO_D || '2D';
          const screenTypeUpper = String(
            auditorium.screenType || '',
          ).toUpperCase();

          if (screenTypeUpper.includes('IMAX')) {
            projectionType = ProjectionType.IMAX || 'IMAX';
          } else if (
            screenTypeUpper.includes('DX') ||
            screenTypeUpper.includes('4DX')
          ) {
            projectionType = ProjectionType.FOUR_DX || '4DX';
          }

          // Xử lý Ngôn ngữ Lồng tiếng & Phụ đề
          const audioLanguage = movie.originalLanguage || 'Tiếng Việt';
          let subtitleLanguage: string | null = 'Tiếng Việt';

          if (movie.country === 'Việt Nam' || audioLanguage === 'Tiếng Việt') {
            subtitleLanguage = null; // Phim tiếng Việt không cần phụ đề
          }

          // Kiểm tra Lũy đẳng: Bỏ qua nếu suất chiếu đã tồn tại tại đúng phòng & thời điểm đó
          const existingShowtime = await showtimeRepository.findOne({
            where: {
              auditoriumId: auditorium.id,
              startTime: slotStartTime,
            },
          });

          if (!existingShowtime) {
            const newShowtime = showtimeRepository.create({
              auditoriumId: auditorium.id,
              movieId: movie.id,
              projectionType: projectionType as any,
              audioLanguage: audioLanguage,
              subtitleLanguage: subtitleLanguage,
              startTime: slotStartTime,
              endTime: slotEndTime,
              cleaningMinutes: cleaningMinutes,
              status: ShowtimeStatus.SCHEDULED || 'SCHEDULED',
            });

            await showtimeRepository.save(newShowtime);

            const formatTime = (d: Date) =>
              d.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              });
            const formatDate = (d: Date) =>
              d.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
              });

            console.log(
              `+ [${formatDate(currentDate)}] Phòng [${auditorium.name}] | Phim: [${movie.title}] | ${formatTime(slotStartTime)} - ${formatTime(slotEndTime)} | (${projectionType})`,
            );
          }

          // Thời điểm bắt đầu của suất chiếu kế tiếp = slotEndTime + cleaningMinutes
          slotStartTime = new Date(
            slotEndTime.getTime() + cleaningMinutes * 60 * 1000,
          );
        }
      }
    }

    console.log(
      'Hoàn thành Seeding danh mục Suất chiếu (Showtimes) thành công!',
    );
  }
}
