import { Inject, Injectable } from '@nestjs/common';
import { DISTRIBUTOR_REPOSITORY } from '../../domain/repositories/distributor.repository.interface.js';
import type { IDistributorRepository } from '../../domain/repositories/distributor.repository.interface.js';
import { MOVIE_CATALOG_GATEWAY } from '../../domain/ports/movie-catalog.gateway.port.js';
import type { IMovieCatalogGateway } from '../../domain/ports/movie-catalog.gateway.port.js';
import { GetDistributorMoviesQueryDto } from '../dto/query-distributor-movies.dto.js';
import { toDistributorMovieItem } from '../mappers/distributor.mapper.js';

import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';

/** Danh sách phim của một nhà phát hành (dữ liệu thuộc module movies, đọc qua IMovieCatalogGateway). */
@Injectable()
export class DistributorMoviesService {
  constructor(
    @Inject(DISTRIBUTOR_REPOSITORY)
    private readonly distributorRepository: IDistributorRepository,
    @Inject(MOVIE_CATALOG_GATEWAY)
    private readonly movieCatalog: IMovieCatalogGateway,
  ) {}

  // GET api/v1/distributors/:id/movies
  async findMovies(id: number, query: GetDistributorMoviesQueryDto) {
    const { status, page, limit } = query;

    const distributor = await this.distributorRepository.findById(String(id));
    if (!distributor)
      throw new BusinessException(
        ErrorCode.DISTRIBUTOR_NOT_FOUND,
        `Nhà phát hành với ID ${id} không tồn tại trên hệ thống`,
      );

    const { items, total } = await this.movieCatalog.findByDistributor(
      distributor.id,
      { status, page, limit },
    );

    return {
      data: items.map(toDistributorMovieItem),
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      meta: {
        distributorInfo: {
          id: Number(distributor.id),
          name: distributor.name,
        },
      },
    };
  }
}
