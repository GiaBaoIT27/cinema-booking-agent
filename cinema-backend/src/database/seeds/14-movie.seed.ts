import { DataSource } from 'typeorm';
import { Movie } from '#modules/movies/entities/movie.entity.js'; // Điều chỉnh lại đường dẫn cho đúng entity của bạn
import { Genre } from '#modules/genres/entities/genre.entity.js';
import { Distributor } from '#modules/distributors/entities/distributor.entity.js';
import { AgeRating } from '#modules/movies/enums/movie-age-rating.enum.js';
import { MovieStatus } from '#modules/movies/enums/movie-status.enum.js';

export class MovieSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const movieRepository = dataSource.getRepository(Movie);
    const genreRepository = dataSource.getRepository(Genre);
    const distributorRepository = dataSource.getRepository(Distributor);

    console.log('Khởi chạy quy trình Seeding Phim (Movies)...');

    // 1. Kiểm tra sự tồn tại của Nhà phát hành & Thể loại phim
    const distributors = await distributorRepository.find();
    const genres = await genreRepository.find();

    if (distributors.length === 0 || genres.length === 0) {
      console.warn(
        '⚠️ Không tìm thấy Distributors hoặc Genres trong DB. Vui lòng chạy DistributorSeeder và GenreSeeder trước!',
      );
      return;
    }

    // Helper map thể loại phim theo code để gán nhanh
    const getGenresByCodes = (codes: string[]): Genre[] => {
      return genres.filter((g) => codes.includes(g.code));
    };

    // 2. Định nghĩa danh sách các bộ phim mẫu
    const systemMovies = [
      {
        title: 'Mai',
        originalTitle: 'Mai',
        description:
          'Câu chuyện xoay quanh cuộc đời của Mai, người phụ nữ làm nghề mát-xa chịu nhiều thành kiến xã hội, và chuyện tình lãng mạn nhưng sóng gió với Dương - chàng trai kém tuổi ham mê âm nhạc.',
        director: 'Trấn Thành',
        cast: 'Phương Anh Đào, Tuấn Trần, Trấn Thành, Hồng Đào',
        durationMinutes: 131,
        ageRating: AgeRating.T18 || 'T18',
        country: 'Việt Nam',
        originalLanguage: 'Tiếng Việt',
        revenueShareRatio: 50.0,
        trailerUrl: 'https://www.youtube.com/watch?v=HKJpU2j3Oeo',
        posterUrl:
          'https://images.unsplash.com/photo-1536440136628-849c177e76a1',
        bannerUrl:
          'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba',
        releaseDate: new Date('2026-02-10'),
        endDate: new Date('2026-05-10'),
        status: MovieStatus.SHOWING || 'SHOWING',
        distributorId: distributors[1]?.id || '2', // Galaxy Studio
        genreCodes: ['ROMANCE', 'COMEDY'],
      },
      {
        title: 'Dune: Hành Tinh Cát - Phần Hai',
        originalTitle: 'Dune: Part Two',
        description:
          'Paul Atreides hợp lực cùng Chani và người Fremen để trả thù những kẻ đã hủy hoại gia đình anh, đồng thời đứng trước lựa chọn giữa tình yêu và số phận của vũ trụ.',
        director: 'Denis Villeneuve',
        cast: 'Timothée Chalamet, Zendaya, Rebecca Ferguson, Javier Bardem',
        durationMinutes: 166,
        ageRating: AgeRating.T16 || 'T16',
        country: 'Mỹ',
        originalLanguage: 'Tiếng Anh',
        revenueShareRatio: 45.0,
        trailerUrl: 'https://www.youtube.com/watch?v=Way9Dexny3w',
        posterUrl:
          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
        bannerUrl:
          'https://images.unsplash.com/photo-1509198397868-475647b2a1e5',
        releaseDate: new Date('2026-03-01'),
        endDate: new Date('2026-06-01'),
        status: MovieStatus.SHOWING || 'SHOWING',
        distributorId: distributors[0]?.id || '1', // CJ CGV
        genreCodes: ['ACTION', 'SCI-FI'],
      },
      {
        title: 'Quật Mộ Trùng Phùng',
        originalTitle: 'Exhuma',
        description:
          'Một gia đình giàu có ở Los Angeles gặp phải chuỗi sự kiện kỳ lạ, đã thuê hai pháp sư trẻ, một thầy phong thủy và một chuyên gia táng lễ để khai quật ngôi mộ cổ tổ tiên.',
        director: 'Jang Jae-hyun',
        cast: 'Choi Min-sik, Kim Go-eun, Yoo Hai-jin, Lee Do-hyun',
        durationMinutes: 134,
        ageRating: AgeRating.T18 || 'T18',
        country: 'Hàn Quốc',
        originalLanguage: 'Tiếng Hàn',
        revenueShareRatio: 50.0,
        trailerUrl: 'https://www.youtube.com/watch?v=tT8O9O2cZ6s',
        posterUrl:
          'https://images.unsplash.com/photo-1509281373149-e957c6296406',
        bannerUrl:
          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
        releaseDate: new Date('2026-03-15'),
        endDate: new Date('2026-06-15'),
        status: MovieStatus.SHOWING || 'SHOWING',
        distributorId: distributors[2]?.id || '3', // BHD
        genreCodes: ['HORROR', 'ACTION'],
      },
      {
        title: 'Thám Tử Lừng Danh Conan: Ngôi Sao 5 Cánh 1 Triệu Đô',
        originalTitle: 'Detective Conan: The Million-dollar Pentagram',
        description:
          'Siêu trộm Kaito Kid gửi thư cảnh báo đến tập đoàn财阀 nhắm vào thanh bảo kiếm Nhật Bản liên quan đến Shinsengumi tại Hakodate, Hokkaido.',
        director: 'Chika Nagaoka',
        cast: 'Minami Takayama, Wakana Yamazaki, Rikiya Koyama',
        durationMinutes: 111,
        ageRating: AgeRating.P || 'P',
        country: 'Nhật Bản',
        originalLanguage: 'Tiếng Nhật',
        revenueShareRatio: 48.0,
        trailerUrl: 'https://www.youtube.com/watch?v=34211111111',
        posterUrl:
          'https://images.unsplash.com/photo-1578632767115-351597cf2477',
        bannerUrl:
          'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f',
        releaseDate: new Date('2026-10-01'),
        endDate: new Date('2026-12-31'),
        status: MovieStatus.UPCOMING || 'UPCOMING',
        distributorId: distributors[3]?.id || '4', // Lotte Cinema
        genreCodes: ['ANIME', 'ACTION'],
      },
      {
        title: 'Deadpool & Wolverine',
        originalTitle: 'Deadpool & Wolverine',
        description:
          'Tổ chức Quản lý Biến thiên Thời gian (TVA) lôi kéo Deadpool khỏi cuộc sống yên bình và giao cho anh một sứ mệnh mới cùng với Wolverine.',
        director: 'Shawn Levy',
        cast: 'Ryan Reynolds, Hugh Jackman, Emma Corrin, Morena Baccarin',
        durationMinutes: 127,
        ageRating: AgeRating.T18 || 'T18',
        country: 'Mỹ',
        originalLanguage: 'Tiếng Anh',
        revenueShareRatio: 50.0,
        trailerUrl: 'https://www.youtube.com/watch?v=73_1biulk6s',
        posterUrl:
          'https://images.unsplash.com/photo-1568832359672-e36cf5d74f54',
        bannerUrl:
          'https://images.unsplash.com/photo-1534447677768-be436bb09401',
        releaseDate: new Date('2026-11-15'),
        endDate: new Date('2027-02-15'),
        status: MovieStatus.UPCOMING || 'UPCOMING',
        distributorId: distributors[4]?.id || '5', // Beta Media
        genreCodes: ['ACTION', 'COMEDY', 'SCI-FI'],
      },
    ];

    // 3. Thực thi lưu dữ liệu Lũy đẳng (Idempotent)
    for (const movieData of systemMovies) {
      const { genreCodes, ...movieFields } = movieData;

      const existingMovie = await movieRepository.findOne({
        where: { title: movieFields.title },
        relations: { genres: true },
      });

      const matchedGenres = getGenresByCodes(genreCodes);

      if (!existingMovie) {
        const newMovie = movieRepository.create({
          ...movieFields,
          genres: matchedGenres,
        });

        await movieRepository.save(newMovie);
        console.log(`+ Khởi tạo thành công phim: [${movieFields.title}]`);
      } else {
        // Cập nhật/Đồng bộ nếu phim đã tồn tại
        Object.assign(existingMovie, movieFields);
        existingMovie.genres = matchedGenres;

        await movieRepository.save(existingMovie);
        console.log(`~ Đồng bộ thành công phim: [${movieFields.title}]`);
      }
    }

    console.log('Hoàn thành Seeding danh mục Phim (Movies) thành công!');
  }
}
