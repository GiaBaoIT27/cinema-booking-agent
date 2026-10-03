import { Inject, Injectable } from '@nestjs/common';
import { Genre } from '../domain/entities/genre.entity.js';
import { GENRE_REPOSITORY } from '../domain/repositories/genre.repository.interface.js';
import type { IGenreRepository } from '../domain/repositories/genre.repository.interface.js';
import type { GenreSummaryDto } from './genre-summary.dto.js';

/**
 * Facade công khai của Genres module — cổng giao tiếp DUY NHẤT với các module khác (movies...).
 * Các module khác CHỈ import từ `#modules/genres/public-api` và chỉ nhận DTO tóm tắt,
 * không bao giờ nhận entity nội bộ.
 */
@Injectable()
export class GenresFacade {
  constructor(
    @Inject(GENRE_REPOSITORY)
    private readonly genreRepository: IGenreRepository,
  ) {}

  /** Toàn bộ thể loại, sắp xếp theo tên. */
  async findAll(): Promise<GenreSummaryDto[]> {
    const genres = await this.genreRepository.findAll();
    return genres.map(toSummary);
  }

  async findByIds(ids: Array<string | number>): Promise<GenreSummaryDto[]> {
    const genres = await this.genreRepository.findByIds([
      ...new Set(ids.map(String)),
    ]);
    return genres.map(toSummary);
  }

  async exists(id: string | number): Promise<boolean> {
    return this.genreRepository.exists(String(id));
  }
}

// Entity → DTO tóm tắt (ranh giới: không để entity nội bộ lọt ra ngoài module)
const toSummary = (genre: Genre): GenreSummaryDto => ({
  id: Number(genre.id),
  code: genre.code,
  name: genre.name,
  description: genre.description,
});
