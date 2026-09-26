import { DataSource } from 'typeorm';
import { Genre } from '#modules/genres/entities/genre.entity.js'; // Bạn nhớ kiểm tra lại đường dẫn import entity này nhé

export class GenreSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const genreRepository = dataSource.getRepository(Genre);

    // 1. Định nghĩa danh sách các thể loại phim phổ biến trong hệ thống rạp
    const systemGenres = [
      {
        id: '1',
        code: 'ACTION',
        name: 'Hành động',
        description:
          'Thể loại phim tập trung vào các pha rượt đuổi, võ thuật, đấu súng và kỹ xảo điện ảnh mãn nhãn.',
      },
      {
        id: '2',
        code: 'COMEDY',
        name: 'Hài kịch',
        description:
          'Thể loại phim mang tính chất giải trí cao, sử dụng các tình huống trớ trêu, gây cười cho khán giả.',
      },
      {
        id: '3',
        code: 'HORROR',
        name: 'Kinh dị',
        description:
          'Thể loại phim khơi gợi nỗi sợ hãi, căng thẳng bằng các yếu tố giật gân, tâm linh hoặc quái dị.',
      },
      {
        id: '4',
        code: 'ROMANCE',
        name: 'Lãng mạn',
        description:
          'Thể loại phim tập trung vào câu chuyện tình yêu, cảm xúc và các mối quan hệ tình cảm giữa các nhân vật.',
      },
      {
        id: '5',
        code: 'SCI-FI',
        name: 'Khoa học viễn tưởng',
        description:
          'Thể loại phim khai thác các chủ đề giả tưởng về tương lai, công nghệ cao, vũ trụ hoặc du hành thời gian.',
      },
      {
        id: '6',
        code: 'ANIME',
        name: 'Hoạt hình',
        description:
          'Các bộ phim sử dụng kỹ thuật đồ họa 2D hoặc 3D để tạo dựng hình ảnh và kể chuyện.',
      },
    ];

    console.log(
      'Khởi chạy quy trình Seeding danh mục Thể loại phim (Genres)...',
    );

    // 2. Thực thi ghi dữ liệu lũy đẳng dựa trên trường duy nhất "code"
    for (const genreData of systemGenres) {
      const existingGenre = await genreRepository.findOne({
        where: { code: genreData.code },
      });

      if (!existingGenre) {
        // Tạo mới nếu chưa tồn tại
        const newGenre = genreRepository.create(genreData);
        await genreRepository.save(newGenre);
        console.log(
          `Khởi tạo thành công thể loại phim: [${genreData.code}] - ${genreData.name}`,
        );
      } else {
        // Đồng bộ lại mô tả nếu file seed có sự chỉnh sửa nội dung
        existingGenre.name = genreData.name;
        existingGenre.description = genreData.description;

        await genreRepository.save(existingGenre);
        console.log(
          `Cập nhật/Đồng bộ thành công thể loại phim: [${genreData.code}] - ${genreData.name}`,
        );
      }
    }

    console.log('Hoàn thành Seeding danh mục Thể loại phim thành công!');
  }
}
