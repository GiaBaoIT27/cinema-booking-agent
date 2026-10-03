import { Inject, Injectable } from '@nestjs/common';
import { GENRE_REPOSITORY } from '../../domain/repositories/genre.repository.interface.js';
import type { IGenreRepository } from '../../domain/repositories/genre.repository.interface.js';
import { MOVIE_CATALOG_GATEWAY } from '../../domain/ports/movie-catalog.gateway.port.js';
import type { IMovieCatalogGateway } from '../../domain/ports/movie-catalog.gateway.port.js';
import { Genre } from '../../domain/entities/genre.entity.js';
import { GenreUniqueViolationError } from '../../domain/errors/genre-unique-violation.error.js';
import {
  GENRE_CACHE_TTL,
  GENRE_REDIS_KEYS,
} from '../../domain/constants/genre-redis.constant.js';
import { CreateGenreDto } from '../dto/create-genre.dto.js';
import { UpdateGenreDto } from '../dto/update-genre.dto.js';
import { GetGenresQueryDto } from '../dto/query-genres.dto.js';
import { GetGenreMoviesQueryDto } from '../dto/query-genre-movies.dto.js';

import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';
import {
  toGenreDetail,
  toGenreMovieItem,
  toGenreResponse,
} from '../mappers/genre.mapper.js';
import { GenresCacheService } from './genres-cache.service.js';

@Injectable()
export class GenresService {
  constructor(
    @Inject(GENRE_REPOSITORY)
    private readonly genreRepository: IGenreRepository,
    @Inject(MOVIE_CATALOG_GATEWAY)
    private readonly movieCatalog: IMovieCatalogGateway,
    private readonly cache: GenresCacheService,
  ) {}

  // GET api/v1/genres
  findAll(query: GetGenresQueryDto) {
    const { keyword, page, limit } = query;
    const queryStr = `kw=${keyword || 'null'}:p=${page}:l=${limit}`;

    return this.cache.getOrSet(
      GENRE_REDIS_KEYS.LIST(queryStr),
      async () => {
        const { items, total } = await this.genreRepository.search({
          keyword,
          page,
          limit,
        });

        return {
          items: items.map(toGenreResponse),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            totalItems: total,
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      GENRE_CACHE_TTL,
    );
  }

  // GET api/v1/genres/:id
  async findOne(id: number) {
    const detail = await this.cache.getOrSet(
      GENRE_REDIS_KEYS.DETAIL(id),
      async () => {
        const genre = await this.genreRepository.findById(String(id));
        if (!genre) return null;

        const totalAssociatedMovies = await this.movieCatalog.countByGenre(
          genre.id,
        );
        return toGenreDetail(genre, totalAssociatedMovies);
      },
      GENRE_CACHE_TTL,
    );

    if (!detail)
      throw new BusinessException(
        ErrorCode.GENRE_NOT_FOUND,
        `Genre with ID ${id} not found`,
      );
    return detail;
  }

  // POST api/v1/genres
  async create(dto: CreateGenreDto) {
    await this.assertUnique(dto.code, dto.name);

    const genre = this.genreRepository.create({
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
    });
    const saved = await this.saveOrThrowConflict(genre, false);

    await this.cache.invalidateAll();
    return toGenreResponse(saved);
  }

  // PUT api/v1/genres/:id
  async update(id: number, dto: UpdateGenreDto) {
    const genreId = String(id);

    const genre = await this.genreRepository.findById(genreId);
    if (!genre)
      throw new BusinessException(
        ErrorCode.GENRE_NOT_FOUND,
        `Genre with ID ${id} not found`,
      );

    await this.assertUnique(dto.code, dto.name, genreId);

    genre.code = dto.code;
    genre.name = dto.name;
    // Giữ hành vi cũ: không gửi description thì giữ nguyên giá trị hiện có
    if (dto.description !== undefined) genre.description = dto.description;

    const saved = await this.saveOrThrowConflict(genre, true);

    await this.cache.invalidateAll();
    return toGenreResponse(saved);
  }

  // DELETE api/v1/genres/:id
  async remove(id: number) {
    const genreId = String(id);

    if (!(await this.genreRepository.exists(genreId))) {
      throw new BusinessException(
        ErrorCode.GENRE_NOT_FOUND,
        `Genre with ID ${id} not found`,
      );
    }

    // Còn phim liên kết → không cho xóa
    if ((await this.movieCatalog.countByGenre(genreId)) > 0) {
      throw new BusinessException(
        ErrorCode.GENRE_HAS_ASSOCIATED_MOVIES,
        `Genre with ID ${id} has associated movies`,
      );
    }

    await this.genreRepository.deleteById(genreId);

    await this.cache.invalidateAll();
    return { deletedGenreId: id };
  }

  // GET api/v1/genres/:id/movies
  async findMoviesByGenre(genreId: number, query: GetGenreMoviesQueryDto) {
    const { status, page, limit } = query;
    const queryStr = `status=${status || 'all'}:p=${page}:l=${limit}`;

    // Dữ liệu cache giữ nguyên dạng { data, pagination } như trước để tương thích key đang có trong Redis.
    const result = await this.cache.getOrSet(
      GENRE_REDIS_KEYS.MOVIES(genreId, queryStr),
      async () => {
        if (!(await this.genreRepository.exists(String(genreId)))) return null;

        const { items, total } = await this.movieCatalog.findByGenre(
          String(genreId),
          { status, page, limit },
        );

        return {
          data: items.map(toGenreMovieItem),
          pagination: {
            totalItems: total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      GENRE_CACHE_TTL,
    );

    if (!result)
      throw new BusinessException(
        ErrorCode.GENRE_NOT_FOUND,
        `Genre with ID ${genreId} not found`,
      );

    return {
      data: result.data,
      meta: { genreId, pagination: result.pagination },
    };
  }

  /** Kiểm tra trùng mã rồi tên (giữ thứ tự báo lỗi như API cũ). */
  private async assertUnique(
    code: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const takenByOther = excludeId !== undefined;

    if (await this.genreRepository.existsCode(code, excludeId)) {
      throw new BusinessException(
        ErrorCode.GENRE_CODE_ALREADY_EXISTS,
        `Genre code '${code}' is already in use`,
      );
    }
    if (await this.genreRepository.existsName(name, excludeId)) {
      throw new BusinessException(
        ErrorCode.GENRE_NAME_ALREADY_EXISTS,
        `Genre name '${name}' is already in use`,
      );
    }
  }

  /** Lưới an toàn cho race condition: hai request cùng qua bước kiểm tra trùng. */
  private async saveOrThrowConflict(
    genre: Genre,
    takenByOther: boolean,
  ): Promise<Genre> {
    try {
      return await this.genreRepository.save(genre);
    } catch (error) {
      if (error instanceof GenreUniqueViolationError) {
        throw error.field === 'code'
          ? new BusinessException(
              ErrorCode.GENRE_CODE_ALREADY_EXISTS,
              `Genre code '${genre.code}' is already in use`,
            )
          : new BusinessException(
              ErrorCode.GENRE_NAME_ALREADY_EXISTS,
              `Genre name '${genre.name}' is already in use`,
            );
      }
      throw error;
    }
  }
}
