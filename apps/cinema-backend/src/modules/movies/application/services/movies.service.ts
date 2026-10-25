import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DistributorsFacade,
  DistributorStatus,
} from '#modules/distributors/public-api/index.js';
import { GenresFacade } from '#modules/genres/public-api/index.js';
import { Movie } from '../../domain/entities/movie.entity.js';
import { MovieStatus } from '../../domain/enums/movie-status.enum.js';
import {
  MOVIE_REDIS_KEYS,
  MOVIE_REDIS_TTL,
} from '../../domain/constants/movie-redis.constant.js';
import {
  MovieCatalogChangedEvent,
  type MovieCatalogChangeReason,
} from '../../domain/events/movie-catalog-changed.event.js';
import { SHOWTIME_GATEWAY } from '../../domain/ports/showtime.gateway.port.js';
import type { IShowtimeGateway } from '../../domain/ports/showtime.gateway.port.js';
import { MOVIE_REPOSITORY } from '../../domain/repositories/movie.repository.interface.js';
import type { IMovieRepository } from '../../domain/repositories/movie.repository.interface.js';
import { canTransitionStatus } from '../../domain/services/movie-status.rules.js';
import { parseMovieSort } from '../../domain/services/movie-sort.rules.js';
import { isValidRunPeriod } from '../../domain/services/movie-schedule.rules.js';

import { CreateMovieDto } from '../dto/create-movie.dto.js';
import { UpdateMovieDto } from '../dto/update-movie.dto.js';
import { UpdateMovieStatusDto } from '../dto/update-movie-status.dto.js';
import { UpdateMovieGenresDto } from '../dto/update-movie-genres.dto.js';
import { GetMoviesQueryDto } from '../dto/query-movies.dto.js';

import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';

import {
  toCreateMovieResponse,
  toMovieDetail,
  toMovieListItem,
} from '../mappers/movie.mapper.js';
import type { MovieDetailModel } from '../models/movie-detail.model.js';
import type { MovieMediaFiles } from '../models/movie-media.model.js';
import { MovieMediaService } from './movie-media.service.js';
import { MoviesCacheService } from './movies-cache.service.js';

@Injectable()
export class MoviesService {
  constructor(
    @Inject(MOVIE_REPOSITORY)
    private readonly movieRepository: IMovieRepository,
    @Inject(SHOWTIME_GATEWAY)
    private readonly showtimeGateway: IShowtimeGateway,
    private readonly distributorsFacade: DistributorsFacade,
    private readonly genresFacade: GenresFacade,
    private readonly mediaService: MovieMediaService,
    private readonly cache: MoviesCacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // GET api/v1/movies
  async findAll(query: GetMoviesQueryDto) {
    const { search, status, genre_id, page, limit, sort } = query;
    const queryStr = `kw=${search || 'null'}:st=${status || 'null'}:g=${genre_id || 'null'}:p=${page}:l=${limit}:s=${sort}`;
    const { field, direction } = parseMovieSort(sort);

    // Dữ liệu cache giữ dạng { data: Movie[], totalItems } để tương thích key đang có trong Redis.
    const { data, totalItems } = await this.cache.getOrSet(
      MOVIE_REDIS_KEYS.LIST(queryStr),
      async () => {
        const { items, total } = await this.movieRepository.search({
          keyword: search,
          status,
          genreId: genre_id ? String(genre_id) : undefined,
          sortField: field,
          sortDirection: direction,
          page,
          limit,
        });
        return { data: items, totalItems: total };
      },
      MOVIE_REDIS_TTL.LIST_SECONDS,
    );

    return {
      data: data.map(toMovieListItem),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 0,
      },
    };
  }

  // GET api/v1/movies/:id
  async findOne(id: number) {
    const detail = await this.cache.getOrSet(
      MOVIE_REDIS_KEYS.DETAIL(id),
      async () => {
        const movie = await this.movieRepository.findById(String(id));
        return movie ? this.composeDetail(movie) : null;
      },
      MOVIE_REDIS_TTL.DETAIL_SECONDS,
    );

    if (!detail)
      throw new BusinessException(
        ErrorCode.MOVIE_NOT_FOUND,
        `Phim với ID ${id} không tồn tại trên hệ thống`,
      );
    return toMovieDetail(detail);
  }

  // POST api/v1/movies
  async create(createDto: CreateMovieDto, files?: MovieMediaFiles) {
    // 1. Validate TRƯỚC khi upload để request sai không để lại file rác trên cloud
    if (!isValidRunPeriod(createDto.releaseDate, createDto.endDate)) {
      throw new BusinessException(
        ErrorCode.INVALID_DATE_RANGE,
        'Ngày phát hành và ngày kết thúc không hợp lệ',
      );
    }
    await this.assertDistributorAssignable(createDto.distributorId);

    const genreIds = Array.from(new Set(createDto.genreIds)).map(String);
    await this.assertGenresExist(genreIds);

    // 2. Upload media (nếu có), fallback sang URL trong DTO
    const media = await this.mediaService.resolve(createDto, null, files);

    // 3. Lưu phim + thể loại trong một transaction; lỗi → xóa file vừa upload
    const { genreIds: _genreIds, distributorId, ...movieData } = createDto;
    let saved: Movie;
    try {
      saved = await this.movieRepository.createWithGenres(
        {
          ...movieData,
          posterUrl: media.posterUrl ?? undefined,
          bannerUrl: media.bannerUrl ?? undefined,
          trailerUrl: media.trailerUrl ?? undefined,
          distributorId: String(distributorId),
          status: MovieStatus.UPCOMING,
        },
        genreIds,
      );
    } catch (error) {
      await this.mediaService.discardUploaded(media);
      throw error;
    }

    await this.cache.invalidateAll();
    this.publish(saved.id, 'CREATED');
    return toCreateMovieResponse(saved);
  }

  // PUT api/v1/movies/:id
  async update(id: number, updateDto: UpdateMovieDto, files?: MovieMediaFiles) {
    const movie = await this.getMovieOrThrow(id);

    // Khoảng thời gian chiếu sau khi gộp giá trị mới với giá trị đang lưu
    const releaseDate = updateDto.releaseDate ?? movie.releaseDate;
    const endDate = updateDto.endDate ?? movie.endDate;
    if (!isValidRunPeriod(releaseDate, endDate)) {
      throw new BusinessException(
        ErrorCode.INVALID_DATE_RANGE,
        'Ngày phát hành và ngày kết thúc không hợp lệ',
      );
    }

    // Đổi nhà phát hành → phải tồn tại và đang ACTIVE
    if (
      updateDto.distributorId &&
      String(updateDto.distributorId) !== movie.distributorId
    ) {
      await this.assertDistributorAssignable(updateDto.distributorId);
      movie.distributorId = String(updateDto.distributorId);
    }

    const media = await this.mediaService.resolve(updateDto, movie, files);

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

    let updated: Movie;
    try {
      updated = await this.movieRepository.save(movie);
    } catch (error) {
      await this.mediaService.discardUploaded(media);
      throw error;
    }

    // Dọn asset cũ (best-effort) sau khi lưu thành công
    await this.mediaService.cleanupReplaced(media);
    await this.cache.invalidateMovie(id);
    this.publish(updated.id, 'UPDATED');

    return toMovieDetail(await this.composeDetail(updated));
  }

  // PATCH api/v1/movies/:id/status
  async updateStatus(id: number, dto: UpdateMovieStatusDto) {
    const movie = await this.getMovieOrThrow(id);

    const currentStatus = movie.status;
    const targetStatus = dto.status;

    // Cùng trạng thái → không làm gì
    if (currentStatus === targetStatus) {
      return toMovieDetail(await this.composeDetail(movie));
    }

    // Validate quy tắc chuyển trạng thái (state machine)
    if (!canTransitionStatus(currentStatus, targetStatus)) {
      throw new BusinessException(
        ErrorCode.MOVIE_STATUS_TRANSITION_NOT_ALLOWED,
        `Không thể chuyển trạng thái từ ${currentStatus} sang ${targetStatus}`,
      );
    }

    movie.status = targetStatus;
    const updated = await this.movieRepository.save(movie);

    await this.cache.invalidateMovie(id);
    this.publish(updated.id, 'STATUS_CHANGED');

    return toMovieDetail(await this.composeDetail(updated));
  }

  // PATCH api/v1/movies/:id/genres
  async updateGenres(id: number, dto: UpdateMovieGenresDto) {
    const movie = await this.getMovieOrThrow(id);

    const genreIds = Array.from(new Set(dto.genreIds)).map(String);
    await this.assertGenresExist(genreIds);

    await this.movieRepository.replaceGenres(movie.id, genreIds);

    await this.cache.invalidateMovie(id);
    this.publish(movie.id, 'GENRES_CHANGED');

    return toMovieDetail(await this.composeDetail(movie));
  }

  // DELETE api/v1/movies/:id
  async remove(id: number): Promise<void> {
    const movie = await this.getMovieOrThrow(id);

    // Ràng buộc nghiệp vụ: còn suất chiếu từ hiện tại trở đi → không cho xóa
    if ((await this.showtimeGateway.countUpcomingByMovie(movie.id)) > 0) {
      throw new BusinessException(
        ErrorCode.MOVIE_HAS_ACTIVE_SHOWTIMES,
        'Phim vẫn còn suất chiếu trong tương lai, không thể xóa',
      );
    }

    await this.movieRepository.deleteById(movie.id);

    // Xóa media của phim (best-effort — không làm hỏng việc xóa phim)
    await this.mediaService.discardMovieAssets(movie);
    await this.cache.invalidateMovie(id);
    this.publish(movie.id, 'DELETED');
  }

  private async getMovieOrThrow(id: number): Promise<Movie> {
    const movie = await this.movieRepository.findById(String(id));
    if (!movie)
      throw new BusinessException(
        ErrorCode.MOVIE_NOT_FOUND,
        `Phim với ID ${id} không tồn tại trên hệ thống`,
      );
    return movie;
  }

  /** Nhà phát hành phải tồn tại (404) và đang ACTIVE (409). */
  private async assertDistributorAssignable(
    distributorId: number,
  ): Promise<void> {
    const distributor =
      await this.distributorsFacade.getDistributorById(distributorId);
    if (!distributor)
      throw new BusinessException(
        ErrorCode.DISTRIBUTOR_NOT_FOUND,
        `Nhà phát hành với ID ${distributorId} không tồn tại`,
      );
    if (distributor.status !== DistributorStatus.ACTIVE) {
      throw new BusinessException(
        ErrorCode.DISTRIBUTOR_NOT_ACTIVE,
        `Nhà phát hành với ID ${distributorId} không đang hoạt động`,
      );
    }
  }

  /** Mọi genreId (đã unique) phải tồn tại. */
  private async assertGenresExist(genreIds: string[]): Promise<void> {
    const genres = await this.genresFacade.findByIds(genreIds);
    if (genres.length !== genreIds.length)
      throw new BusinessException(
        ErrorCode.GENRE_NOT_FOUND,
        'Một hoặc nhiều thể loại không tồn tại',
      );
  }

  /** Ghép phim với tên nhà phát hành và danh sách thể loại lấy qua facade của module tương ứng. */
  private async composeDetail(movie: Movie): Promise<MovieDetailModel> {
    const [distributor, genreIds] = await Promise.all([
      this.distributorsFacade.getDistributorById(movie.distributorId),
      this.movieRepository.findGenreIds(movie.id),
    ]);
    const genres = await this.genresFacade.findByIds(genreIds);

    return {
      ...movie,
      distributor: distributor
        ? { id: movie.distributorId, name: distributor.name }
        : null,
      genres: genres.map((genre) => ({
        id: String(genre.id),
        code: genre.code,
        name: genre.name,
      })),
    };
  }

  private publish(movieId: string, reason: MovieCatalogChangeReason): void {
    const event = new MovieCatalogChangedEvent(movieId, reason);
    this.eventEmitter.emit(event.getEventName(), event);
  }
}
