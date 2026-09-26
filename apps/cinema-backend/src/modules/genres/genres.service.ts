import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { Genre } from './entities/genre.entity.js';
import { Movie } from '../movies/entities/movie.entity.js';
import { CreateGenreDto } from './dto/create-genre.dto.js';
import { GetGenresQueryDto } from './dto/query-genres.dto.js';
import { UpdateGenreDto } from './dto/update-genre.dto.js';
import { GetGenreMoviesQueryDto } from './dto/query-genre-movies.dto.js';
import { RedisService } from '#src/common/redis/redis.service.js';
import {
  GENRE_REDIS_KEYS,
  GENRE_CACHE_TTL,
} from './constants/genre-redis.constant.js';

@Injectable()
export class GenresService {
  constructor(
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  // GET api/v1/genres
  async findAll(queryDto: GetGenresQueryDto) {
    const { keyword, page, limit } = queryDto;
    const queryStr = `kw=${keyword || 'null'}:p=${page}:l=${limit}`;
    const cacheKey = GENRE_REDIS_KEYS.LIST(queryStr);

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const queryBuilder = this.genreRepository.createQueryBuilder('genre');

        if (keyword) {
          queryBuilder.where(
            'genre.code ILIKE :keyword OR genre.name ILIKE :keyword',
            { keyword: `%${keyword}%` },
          );
        }

        queryBuilder
          .orderBy('genre.name', 'ASC')
          .skip((page - 1) * limit)
          .take(limit);

        const [items, totalElements] = await queryBuilder.getManyAndCount();
        const totalPages = Math.ceil(totalElements / limit);

        return {
          items,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            totalElements,
            totalPages,
          },
        };
      },
      GENRE_CACHE_TTL,
    );
  }

  // GET api/v1/genres/:id
  async findOne(id: number) {
    const cacheKey = GENRE_REDIS_KEYS.DETAIL(id);

    const result = await this.redisService.getOrSet(
      cacheKey,
      async () => {
        const genre = await this.genreRepository.findOne({
          where: { id: id.toString() },
        });

        if (!genre) return null;

        const [{ count }] = await this.dataSource.query(
          `SELECT COUNT(*)::int as count FROM movie_genres WHERE genre_id = $1`,
          [id],
        );

        return {
          ...genre,
          totalAssociatedMovies: count,
        };
      },
      GENRE_CACHE_TTL,
    );

    if (!result) {
      throw new NotFoundException({
        errorCode: 'GENRE_NOT_FOUND',
        message: `Thể loại phim với ID ${id} không tồn tại trên hệ thống`,
      });
    }

    return result;
  }

  // POST api/v1/genres
  async create(createDto: CreateGenreDto): Promise<Genre> {
    // 1. Kiểm tra Định dạng Code (422 Unprocessable Entity)
    const codeRegex = /^[A-Z0-9_]+$/;
    if (!codeRegex.test(createDto.code)) {
      throw new UnprocessableEntityException({
        errorCode: 'INVALID_GENRE_CODE_FORMAT',
        message:
          'Mã thể loại phim phải đúng định dạng Upper-SNAKE_CASE (VD: ANIMATION, SCI_FI)',
      });
    }

    // 2. Kiểm tra Trùng lặp Code (409 Conflict)
    const existingCode = await this.genreRepository.findOne({
      where: { code: createDto.code },
      select: {
        id: true,
        name: true,
      },
    });
    if (existingCode) {
      throw new ConflictException({
        errorCode: 'GENRE_CODE_ALREADY_EXISTS',
        message: `Mã thể loại phim '${createDto.code}' đã tồn tại trên hệ thống`,
      });
    }

    // 3. Kiểm tra Trùng lặp Name (409 Conflict)
    const existingName = await this.genreRepository.findOne({
      where: { name: createDto.name },
      select: {
        id: true,
        name: true,
      },
    });
    if (existingName) {
      throw new ConflictException({
        errorCode: 'GENRE_NAME_ALREADY_EXISTS',
        message: `Tên thể loại phim '${createDto.name}' đã tồn tại trên hệ thống`,
      });
    }

    // 4. Khởi tạo & Lưu DB
    const newGenre = this.genreRepository.create(createDto);
    const savedGenre = await this.genreRepository.save(newGenre);

    // 5. Evict toàn bộ Cache liên quan đến Genres
    await this.redisService.delByPattern(GENRE_REDIS_KEYS.PATTERN_ALL);

    return savedGenre;
  }

  // PUT api/v1/genres/:id
  async update(id: number, updateDto: UpdateGenreDto): Promise<Genre> {
    // 1. Kiểm tra tồn tại thể loại (404 Not Found)
    const existingGenre = await this.genreRepository.findOne({
      where: { id: id.toString() },
    });
    if (!existingGenre) {
      throw new NotFoundException({
        errorCode: 'GENRE_NOT_FOUND',
        message: `Thể loại phim với ID ${id} không tồn tại trên hệ thống`,
      });
    }

    // 2. Kiểm tra Định dạng Code (422 Unprocessable Entity)
    const codeRegex = /^[A-Z0-9_]+$/;
    if (!codeRegex.test(updateDto.code)) {
      throw new UnprocessableEntityException({
        errorCode: 'INVALID_GENRE_CODE_FORMAT',
        message:
          'Mã thể loại phim phải đúng định dạng Upper-SNAKE_CASE (VD: ANIMATION, SCI_FI)',
      });
    }

    // 3. Kiểm tra Trùng lặp Code loại trừ ID hiện tại (409 Conflict)
    const codeConflict = await this.genreRepository.findOne({
      where: { code: updateDto.code, id: Not(id.toString()) },
      select: {
        id: true,
        code: true,
      },
    });
    if (codeConflict) {
      throw new ConflictException({
        errorCode: 'GENRE_CODE_ALREADY_EXISTS',
        message: `Mã thể loại phim '${updateDto.code}' đã được sử dụng bởi thể loại khác`,
      });
    }

    // 4. Kiểm tra Trùng lặp Name loại trừ ID hiện tại (409 Conflict)
    const nameConflict = await this.genreRepository.findOne({
      where: { name: updateDto.name, id: Not(id.toString()) },
      select: {
        id: true,
        name: true,
      },
    });
    if (nameConflict) {
      throw new ConflictException({
        errorCode: 'GENRE_NAME_ALREADY_EXISTS',
        message: `Tên thể loại phim '${updateDto.name}' đã được sử dụng bởi thể loại khác`,
      });
    }

    // 5. Cập nhật dữ liệu & Lưu DB
    Object.assign(existingGenre, updateDto);
    const updatedGenre = await this.genreRepository.save(existingGenre);

    // 6. Evict toàn bộ Cache liên quan đến Genres
    await this.redisService.delByPattern(GENRE_REDIS_KEYS.PATTERN_ALL);

    return updatedGenre;
  }

  // DELETE api/v1/genres/:id
  async remove(id: number) {
    // 1. Kiểm tra tồn tại thể loại phim (404 Not Found)
    const existingGenre = await this.genreRepository.findOne({
      where: { id: id.toString() },
    });
    if (!existingGenre) {
      throw new NotFoundException({
        errorCode: 'GENRE_NOT_FOUND',
        message: `Thể loại phim với ID ${id} không tồn tại trên hệ thống`,
      });
    }

    // 2. Kiểm tra Ràng buộc Dữ liệu liên kết với Phim (409 Conflict)
    const [{ count }] = await this.dataSource.query(
      `SELECT COUNT(*)::int as count FROM movie_genres WHERE genre_id = $1`,
      [id],
    );

    if (count > 0) {
      throw new ConflictException({
        errorCode: 'GENRE_HAS_ASSOCIATED_MOVIES',
        message: 'Không thể xóa thể loại này vì đang có bộ phim liên kết',
      });
    }

    // 3. Thực thi Xóa trong DB
    await this.genreRepository.delete(id);

    // 4. Evict toàn bộ Cache liên quan đến Genres
    await this.redisService.delByPattern(GENRE_REDIS_KEYS.PATTERN_ALL);

    // 5. Trả về thông tin ID vừa xóa thành công
    return {
      deletedGenreId: Number(id),
    };
  }

  // GET api/v1/genres/:id/movies
  async findMoviesByGenre(genreId: number, queryDto: GetGenreMoviesQueryDto) {
    const { status, page = 1, limit = 10 } = queryDto;
    const queryStr = `status=${status || 'all'}:p=${page}:l=${limit}`;
    const cacheKey = GENRE_REDIS_KEYS.MOVIES(genreId, queryStr);

    const result = await this.redisService.getOrSet(
      cacheKey,
      async () => {
        const genre = await this.genreRepository.findOne({
          where: { id: genreId.toString() },
          select: { id: true, code: true, name: true },
        });

        if (!genre) return null;

        const offset = (page - 1) * limit;

        // 1. Khởi tạo QueryBuilder từ Entity Movie
        const queryBuilder = this.dataSource
          .getRepository(Movie)
          .createQueryBuilder('movie')
          // Thực hiện INNER JOIN với bảng quan hệ N-N (movies <-> movie_genres <-> genres)
          .innerJoin('movie.genres', 'genre', 'genre.id = :genreId', {
            genreId,
          });

        // 2. Thêm điều kiện lọc theo status nếu có truyền vào
        if (status) {
          queryBuilder.andWhere('movie.status = :status', { status });
        }
        // 3. Thực hiện đếm tổng số bản ghi và lấy danh sách phim cùng lúc (Giảm số lần gọi DB)
        const [movies, total] = await queryBuilder
          .select([
            'movie.id',
            'movie.title',
            'movie.durationMinutes',
            'movie.releaseDate',
            'movie.ageRating',
            'movie.status',
            'movie.posterUrl',
          ])
          .orderBy('movie.releaseDate', 'DESC')
          .skip(offset)
          .take(limit)
          .getManyAndCount();

        return {
          data: movies,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      GENRE_CACHE_TTL,
    );

    if (!result) {
      throw new NotFoundException({
        errorCode: 'GENRE_NOT_FOUND',
        message: `Thể loại phim với ID ${genreId} không tồn tại trên hệ thống`,
      });
    }

    return result;
  }
}
