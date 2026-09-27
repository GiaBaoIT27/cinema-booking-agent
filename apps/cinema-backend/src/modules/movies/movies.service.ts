import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DataSource, DeepPartial } from 'typeorm';
import { Movie } from './entities/movie.entity.js';
import { Genre } from '#modules/genres/entities/genre.entity.js';
import { Distributor } from '#modules/distributors/entities/distributor.entity.js';
import { Showtime } from '../showtimes/entities/showtime.entity.js';

import { MovieStatus } from './enums/movie-status.enum.js';
import { ShowtimeStatus } from '../showtimes/enums/showtime-status.enum.js';
import { CreateMovieDto } from './dto/create-movie.dto.js';
import { GetMoviesQueryDto } from './dto/get-movies-query.dto.js';
import { GetMovieShowtimesQueryDto } from './dto/get-movie-showtimes-query.dto.js';
import {
  MovieShowtimesResponseDto,
  CinemaShowtimeGroupDto,
} from './dto/movie-showtimes-response.dto.js';

import { UpdateMovieDto } from './dto/update-movie.dto.js';
import { UpdateMovieStatusDto } from './dto/update-movie-status.dto.js';
import { UpdateMovieGenresDto } from './dto/update-movie-genres.dto.js';
import { RedisService } from '#src/common/redis/redis.service.js';
import { UploadService } from '../upload/upload.service.js';
import {
  MOVIE_REDIS_KEYS,
  MOVIE_REDIS_TTL,
} from './constants/movie-redis.constant.js';
import {
  MovieMediaFiles,
  ResolvedMovieMedia,
} from './interfaces/movie-media.interface.js';

@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);

  // Whitelist các cột được phép sort để tránh SQL Injection qua orderBy
  private readonly ALLOWED_SORT_FIELDS: Record<string, string> = {
    release_date: 'm.releaseDate',
    title: 'm.title',
    duration_minutes: 'm.durationMinutes',
  };
  // Ma trận định nghĩa các trạng thái hợp lệ có thể chuyển đến từ trạng thái hiện tại
  private readonly ALLOWED_STATUS_TRANSITIONS: Record<
    MovieStatus,
    MovieStatus[]
  > = {
    [MovieStatus.UPCOMING]: [MovieStatus.SHOWING, MovieStatus.ENDED],
    [MovieStatus.SHOWING]: [MovieStatus.ENDED],
    [MovieStatus.ENDED]: [], // Trạng thái ENDED là trạng thái cuối, không thể chuyển sang trạng thái khác
  };

  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
    @InjectRepository(Distributor)
    private readonly distributorRepository: Repository<Distributor>,
    @InjectRepository(Showtime)
    private readonly showtimeRepository: Repository<Showtime>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly uploadService: UploadService,
  ) {}

  // GET api/v1/movies
  async findAll(
    query: GetMoviesQueryDto,
  ): Promise<{ data: Movie[]; totalElements: number }> {
    const { search, status, genre_id, page, limit, sort } = query;
    const queryStr = `kw=${search || 'null'}:st=${status || 'null'}:g=${genre_id || 'null'}:p=${page}:l=${limit}:s=${sort}`;
    const cacheKey = MOVIE_REDIS_KEYS.LIST(queryStr);

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const queryBuilder = this.movieRepository.createQueryBuilder('m');

        if (genre_id) {
          queryBuilder.innerJoin('m.genres', 'g', 'g.id = :genreId', {
            genreId: genre_id,
          });
        }

        if (search) {
          queryBuilder.andWhere(
            '(m.title ILIKE :search OR m.originalTitle ILIKE :search)',
            { search: `%${search}%` },
          );
        }

        if (status) {
          queryBuilder.andWhere('m.status = :status', { status });
        }

        const [sortField, sortDirection] = sort.split(':');
        const dbSortColumn =
          this.ALLOWED_SORT_FIELDS[sortField] || 'm.releaseDate';
        const direction =
          sortDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        queryBuilder.orderBy(dbSortColumn, direction);

        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);

        const [movies, totalElements] = await queryBuilder.getManyAndCount();

        return { data: movies, totalElements };
      },
      MOVIE_REDIS_TTL.LIST_SECONDS,
    );
  }

  // GET api/v1/movies/:id
  async findOne(id: number): Promise<Movie> {
    const cacheKey = MOVIE_REDIS_KEYS.DETAIL(id);

    const movie = await this.redisService.getOrSet(
      cacheKey,
      async () => {
        return this.movieRepository.findOne({
          where: { id: id.toString() },
          relations: { distributor: true, genres: true },
        });
      },
      MOVIE_REDIS_TTL.DETAIL_SECONDS,
    );

    if (!movie) {
      throw new NotFoundException({
        errorCode: 'MOVIE_NOT_FOUND',
        message: `Phim với ID ${id} không tồn tại trên hệ thống`,
      });
    }

    return movie;
  }

  // POST api/v1/movies
  async create(
    createDto: CreateMovieDto,
    files?: MovieMediaFiles,
  ): Promise<Movie> {
    // 1. Validate Business Rule: endDate >= releaseDate (400 Bad Request)
    if (new Date(createDto.endDate) < new Date(createDto.releaseDate)) {
      throw new BadRequestException({
        errorCode: 'INVALID_DATE_RANGE',
        message:
          'Ngày kết thúc chiếu (endDate) phải lớn hơn hoặc bằng ngày phát hành (releaseDate)',
      });
    }

    // 2. Xử lý Media: upload file đính kèm (nếu có), fallback sang URL từ DTO
    const media = await this.resolveMovieMedia(createDto, null, files);

    // 2. Thực thi Database Transaction
    const savedMovie = await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        // 2.1. Kiểm tra distributorId có tồn tại trong DB (404 Not Found)
        const distributor = await transactionalEntityManager.findOne(
          Distributor,
          {
            where: { id: createDto.distributorId.toString() },
          },
        );
        if (!distributor) {
          throw new NotFoundException({
            errorCode: 'DISTRIBUTOR_NOT_FOUND',
            message: `Nhà phát hành với ID ${createDto.distributorId} không tồn tại trên hệ thống`,
          });
        }

        // 2.2. Kiểm tra toàn bộ genreIds có tồn tại trong DB (400 Bad Request)
        const uniqueGenreIds = Array.from(new Set(createDto.genreIds));
        const genres = await transactionalEntityManager.findBy(Genre, {
          id: In(uniqueGenreIds.map((gid) => gid.toString())),
        });

        if (genres.length !== uniqueGenreIds.length) {
          throw new BadRequestException({
            errorCode: 'INVALID_GENRE_ID',
            message:
              'Một hoặc nhiều mã thể loại phim (genreIds) không tồn tại trên hệ thống',
          });
        }

        // 2.3. Khởi tạo & Lưu bản ghi Movie (gán status mặc định 'UPCOMING')
        const { genreIds: _genreIds, distributorId, ...movieData } = createDto;

        const movieEntity = transactionalEntityManager.create(Movie, {
          ...movieData,
          // Ưu tiên URL media đã xử lý (file upload mới hoặc URL từ DTO)
          posterUrl: media.posterUrl,
          bannerUrl: media.bannerUrl,
          trailerUrl: media.trailerUrl,
          distributorId: distributorId.toString(),
          distributor,
          status: MovieStatus.UPCOMING,
          genres,
        } as DeepPartial<Movie>);

        return await transactionalEntityManager.save(Movie, movieEntity);
      },
    );

    // 3. Cache Invalidation: Evict toàn bộ Pattern movies:*
    await this.redisService.delByPattern(MOVIE_REDIS_KEYS.PATTERN_ALL);

    return savedMovie;
  }

  // PUT api/v1/movies/:id
  async update(
    id: number,
    updateDto: UpdateMovieDto,
    files?: MovieMediaFiles,
  ): Promise<Movie> {
    // 1. Kiểm tra tồn tại phim (404 Not Found)
    const movie = await this.movieRepository.findOne({
      where: { id: id.toString() },
      relations: { distributor: true, genres: true },
    });

    if (!movie) {
      throw new NotFoundException({
        errorCode: 'MOVIE_NOT_FOUND',
        message: `Phim với ID ${id} không tồn tại trên hệ thống`,
      });
    }

    // 2. Kiểm tra khoảng thời gian phát hành & kết thúc (400 Bad Request)
    const releaseDate = updateDto.releaseDate ?? movie.releaseDate;
    const endDate = updateDto.endDate ?? movie.endDate;

    if (new Date(endDate) < new Date(releaseDate)) {
      throw new BadRequestException({
        errorCode: 'INVALID_DATE_RANGE',
        message:
          'Ngày kết thúc chiếu (endDate) phải lớn hơn hoặc bằng ngày phát hành (releaseDate)',
      });
    }

    // 3. Kiểm tra sự tồn tại của distributorId (404 Not Found)
    if (
      updateDto.distributorId &&
      updateDto.distributorId.toString() !== movie.distributorId
    ) {
      const distributorExists = await this.distributorRepository.exists({
        where: { id: updateDto.distributorId.toString() },
      });

      if (!distributorExists) {
        throw new NotFoundException({
          errorCode: 'DISTRIBUTOR_NOT_FOUND',
          message: `Nhà phát hành với ID ${updateDto.distributorId} không tồn tại trên hệ thống`,
        });
      }
      movie.distributorId = updateDto.distributorId.toString();
    }

    // 4. Xử lý Media: upload file mới (nếu có) và ghi nhận asset cũ bị thay thế
    const media = await this.resolveMovieMedia(updateDto, movie, files);

    // 5. Cập nhật dữ liệu Entity
    Object.assign(movie, {
      title: updateDto.title,
      originalTitle: updateDto.originalTitle,
      description: updateDto.description,
      director: updateDto.director,
      cast: updateDto.cast,
      durationMinutes: updateDto.durationMinutes,
      ageRating: updateDto.ageRating,
      country: updateDto.country,
      originalLanguage: updateDto.originalLanguage,
      revenueShareRatio: updateDto.revenueShareRatio,
      trailerUrl: media.trailerUrl,
      posterUrl: media.posterUrl,
      bannerUrl: media.bannerUrl,
      releaseDate,
      endDate,
    });

    const updatedMovie = await this.movieRepository.save(movie);

    // 6. Dọn dẹp asset cũ trên Cloudinary (best-effort) sau khi lưu thành công
    await this.cleanupReplacedAssets(media.replacedAssets);

    // 7. Evict Cache: Xóa Cache chi tiết phim và toàn bộ Cache danh sách
    await Promise.all([
      this.redisService.del(MOVIE_REDIS_KEYS.DETAIL(id)),
      this.redisService.delByPattern(MOVIE_REDIS_KEYS.PATTERN_ALL),
    ]);

    return updatedMovie;
  }

  // PATCH api/v1/movies/:id/status
  async updateStatus(
    id: number,
    updateStatusDto: UpdateMovieStatusDto,
  ): Promise<Movie> {
    // 1. Kiểm tra tồn tại phim (404 Not Found)
    const movie = await this.movieRepository.findOne({
      where: { id: id.toString() },
      relations: { distributor: true, genres: true },
    });

    if (!movie) {
      throw new NotFoundException({
        errorCode: 'MOVIE_NOT_FOUND',
        message: `Phim với ID ${id} không tồn tại trên hệ thống`,
      });
    }

    const currentStatus = movie.status;
    const targetStatus = updateStatusDto.status;

    // 2. Validate Quy tắc chuyển trạng thái (State Machine Validation)
    if (currentStatus !== targetStatus) {
      const allowedNextStatuses =
        this.ALLOWED_STATUS_TRANSITIONS[currentStatus];

      if (!allowedNextStatuses.includes(targetStatus)) {
        throw new BadRequestException({
          errorCode: 'INVALID_STATUS_TRANSITION',
          message: `Không thể chuyển trạng thái phim từ ${currentStatus} sang ${targetStatus}`,
        });
      }

      // 3. Cập nhật trạng thái mới
      movie.status = targetStatus;
      const updatedMovie = await this.movieRepository.save(movie);

      // 4. Evict Cache: Xóa Cache chi tiết phim và toàn bộ Cache danh sách
      await Promise.all([
        this.redisService.del(MOVIE_REDIS_KEYS.DETAIL(id)),
        this.redisService.delByPattern(MOVIE_REDIS_KEYS.PATTERN_ALL),
      ]);

      return updatedMovie;
    }

    return movie;
  }

  // PATCH api/v1/movies/:id/genres
  async updateGenres(
    id: number,
    updateGenresDto: UpdateMovieGenresDto,
  ): Promise<Movie> {
    const uniqueGenreIds = Array.from(new Set(updateGenresDto.genreIds));

    // Thực thi Database Transaction để thay thế danh sách movie_genres
    const updatedMovie = await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        // 1. Kiểm tra tồn tại phim (404 Not Found)
        const movie = await transactionalEntityManager.findOne(Movie, {
          where: { id: id.toString() },
          relations: { distributor: true, genres: true },
        });

        if (!movie) {
          throw new NotFoundException({
            errorCode: 'MOVIE_NOT_FOUND',
            message: `Phim với ID ${id} không tồn tại trên hệ thống`,
          });
        }

        // 2. Kiểm tra tính hợp lệ của toàn bộ genreIds (400 Bad Request)
        const genres = await transactionalEntityManager.findBy(Genre, {
          id: In(uniqueGenreIds.map((gid) => gid.toString())),
        });

        if (genres.length !== uniqueGenreIds.length) {
          throw new BadRequestException({
            errorCode: 'INVALID_GENRE_ID',
            message:
              'Một hoặc nhiều mã thể loại phim (genreIds) không tồn tại trên hệ thống',
          });
        }

        // 3. Gán danh sách thể loại mới (TypeORM tự động xóa quan hệ cũ và insert quan hệ mới vào bảng movie_genres)
        movie.genres = genres;
        return await transactionalEntityManager.save(Movie, movie);
      },
    );

    // 4. Evict Cache: Xóa Cache chi tiết phim và toàn bộ Cache danh sách
    await Promise.all([
      this.redisService.del(MOVIE_REDIS_KEYS.DETAIL(id)),
      this.redisService.delByPattern(MOVIE_REDIS_KEYS.PATTERN_ALL),
    ]);

    return updatedMovie;
  }

  // DELETE api/v1/movies/:id
  async remove(id: number): Promise<void> {
    // 1. Kiểm tra tồn tại phim (404 Not Found)
    const movie = await this.movieRepository.findOne({
      where: { id: id.toString() },
    });

    if (!movie) {
      throw new NotFoundException({
        errorCode: 'MOVIE_NOT_FOUND',
        message: `Phim với ID ${id} không tồn tại trên hệ thống`,
      });
    }

    // 2. Kiểm tra Ràng buộc Nghiệp vụ: Suất chiếu active (409 Conflict)
    const activeShowtimeResult = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count 
       FROM showtimes 
       WHERE movie_id = $1 AND start_time >= CURRENT_TIMESTAMP`,
      [id.toString()],
    );

    const activeShowtimesCount = activeShowtimeResult[0]?.count ?? 0;

    if (activeShowtimesCount > 0) {
      throw new ConflictException({
        errorCode: 'MOVIE_HAS_ACTIVE_SHOWTIMES',
        message:
          'Phim đang có suất chiếu sắp hoặc đang diễn ra. Không thể xóa, vui lòng chuyển trạng thái phim sang ENDED',
      });
    }

    // 3. Thực thi Xóa cứng trong DB (movie_genres tự động xóa nhờ Foreign Key ON DELETE CASCADE)
    await this.movieRepository.delete(id.toString());

    // 4. Evict Cache: Xóa Cache chi tiết phim và toàn bộ Cache danh sách
    await Promise.all([
      this.redisService.del(MOVIE_REDIS_KEYS.DETAIL(id)),
      this.redisService.delByPattern(MOVIE_REDIS_KEYS.PATTERN_ALL),
    ]);
  }

  // GET api/v1/movies/:id/showtimes
  async getMovieShowtimes(
    id: number,
    queryDto: GetMovieShowtimesQueryDto,
  ): Promise<MovieShowtimesResponseDto> {
    // 1. Kiểm tra ID phim tồn tại và trạng thái hợp lệ (SHOWING hoặc UPCOMING)
    const movie = await this.movieRepository.findOne({
      where: { id: id.toString() },
    });

    if (!movie) {
      throw new NotFoundException({
        errorCode: 'MOVIE_NOT_FOUND',
        message: `Phim với ID ${id} không tồn tại trên hệ thống`,
      });
    }

    if (movie.status === MovieStatus.ENDED) {
      throw new BadRequestException({
        errorCode: 'MOVIE_NOT_ELIGIBLE_FOR_SHOWTIME',
        message:
          'Bộ phim đã kết thúc chiếu (ENDED), không có lịch chiếu khả dụng',
      });
    }

    const { cineplexId, date } = queryDto;
    const targetDate = date ?? new Date().toISOString().split('T')[0];
    const now = new Date();

    // 2. Truy vấn danh sách suất chiếu còn hiệu lực trong tương lai
    const queryBuilder = this.showtimeRepository
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.auditorium', 'a')
      .innerJoinAndSelect('a.cineplex', 'c')
      .where('s.movieId = :movieId', { movieId: id.toString() })
      .andWhere('s.status IN (:...validStatuses)', {
        validStatuses: [ShowtimeStatus.SCHEDULED, ShowtimeStatus.OPEN],
      })
      .andWhere('s.startTime > :now', { now });

    if (cineplexId) {
      queryBuilder.andWhere('c.id = :cineplexId', { cineplexId });
    }

    // Lọc theo khoảng thời gian trong ngày [00:00:00, 23:59:59.999]
    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);
    queryBuilder.andWhere(
      's.startTime >= :startOfDay AND s.startTime <= :endOfDay',
      { startOfDay, endOfDay },
    );

    queryBuilder.orderBy('c.id', 'ASC').addOrderBy('s.startTime', 'ASC');

    const showtimes = await queryBuilder.getMany();

    // 3. Nhóm (Group) dữ liệu theo Rạp/Cụm rạp (Cinemas / Cineplexes)
    const cinemaMap = new Map<number, CinemaShowtimeGroupDto>();

    for (const showtime of showtimes) {
      const cineplex = showtime.auditorium?.cineplex;
      if (!cineplex) continue;

      const cId = Number(cineplex.id);

      if (!cinemaMap.has(cId)) {
        cinemaMap.set(cId, {
          cineplexId: cId,
          cineplexName: cineplex.name,
          showtimes: [],
        });
      }

      cinemaMap.get(cId)!.showtimes.push({
        showtimeId: Number(showtime.id),
        auditoriumName: showtime.auditorium.name,
        projectionType: showtime.projectionType,
        startTime: showtime.startTime,
        endTime: showtime.endTime,
      });
    }

    // 4. Trả về đúng schema mà TypeScript và Class-Transformer yêu cầu
    return {
      movieId: Number(movie.id),
      movieTitle: movie.title,
      showtimesByCinema: Array.from(cinemaMap.values()),
    };
  }

  /**
   * Xử lý 3 slot media của phim (poster/banner/trailer):
   * - Nếu admin đính kèm file → upload lên Cloudinary (folder riêng từng loại).
   * - Ngược lại → fallback về URL truyền trong DTO.
   * - Nếu slot có file mới ghi đè URL cũ đang lưu trong DB → ghi nhận public_id
   *   của asset cũ vào replacedAssets để dọn dẹp sau khi lưu thành công.
   */
  private async resolveMovieMedia(
    dtoUrls: { posterUrl?: string; bannerUrl?: string; trailerUrl?: string },
    currentMovie: Pick<Movie, 'posterUrl' | 'bannerUrl' | 'trailerUrl'> | null,
    files?: MovieMediaFiles,
  ): Promise<ResolvedMovieMedia> {
    const resolved: ResolvedMovieMedia = {
      posterUrl: dtoUrls.posterUrl || currentMovie?.posterUrl || null,
      bannerUrl: dtoUrls.bannerUrl || currentMovie?.bannerUrl || null,
      trailerUrl: dtoUrls.trailerUrl || currentMovie?.trailerUrl || null,
      replacedAssets: [],
    };

    // Poster (ảnh)
    if (files?.posterFile?.[0]) {
      const upload = await this.uploadService.uploadFile(
        files.posterFile[0],
        'movies/posters',
      );
      resolved.posterUrl = upload.secure_url;
      this.collectReplacedAsset(
        currentMovie?.posterUrl ?? null,
        'image',
        resolved,
      );
    }

    // Banner (ảnh)
    if (files?.bannerFile?.[0]) {
      const upload = await this.uploadService.uploadFile(
        files.bannerFile[0],
        'movies/banners',
      );
      resolved.bannerUrl = upload.secure_url;
      this.collectReplacedAsset(
        currentMovie?.bannerUrl ?? null,
        'image',
        resolved,
      );
    }

    // Trailer (video)
    if (files?.trailerFile?.[0]) {
      const upload = await this.uploadService.uploadFile(
        files.trailerFile[0],
        'movies/trailers',
      );
      resolved.trailerUrl = upload.secure_url;
      this.collectReplacedAsset(
        currentMovie?.trailerUrl ?? null,
        'video',
        resolved,
      );
    }

    return resolved;
  }

  private collectReplacedAsset(
    currentUrl: string | null,
    resourceType: 'image' | 'video',
    resolved: ResolvedMovieMedia,
  ): void {
    const oldAsset = this.extractCloudinaryAsset(currentUrl);
    if (oldAsset) {
      resolved.replacedAssets.push({ ...oldAsset, resourceType });
    }
  }

  /**
   * Trích xuất public_id từ Cloudinary URL dạng:
   * https://res.cloudinary.com/<cloud_name>/{image|video}/upload/v{version}/{public_id}.{ext}
   * Trả về null nếu URL không thuộc Cloudinary (VD: URL ngoài admin tự nhập).
   */
  private extractCloudinaryAsset(
    url: string | null,
  ): { publicId: string; resourceType: 'image' | 'video' } | null {
    if (!url) return null;

    const match = url.match(
      /https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/,
    );

    if (!match) return null;

    return {
      publicId: match[2],
      resourceType: match[1] as 'image' | 'video',
    };
  }

  /**
   * Dọn dẹp asset cũ trên Cloudinary (best-effort):
   * lỗi xóa asset cũ không làm hỏng request, chỉ log cảnh báo.
   */
  private async cleanupReplacedAssets(
    replacedAssets: ResolvedMovieMedia['replacedAssets'],
  ): Promise<void> {
    await Promise.all(
      replacedAssets.map(async (asset) => {
        try {
          await this.uploadService.deleteFile(
            asset.publicId,
            asset.resourceType,
          );
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Không thể xóa asset cũ trên Cloudinary: ${asset.publicId} - ${reason}`,
          );
        }
      }),
    );
  }
}
