import { Genre } from '../entities/genre.entity.js';

export interface GenreSearchCriteria {
  /** Khớp một phần theo code hoặc name, không phân biệt hoa thường (repository tự escape ký tự LIKE). */
  keyword?: string;
  page: number;
  limit: number;
}

export interface IGenreRepository {
  /** Sắp xếp theo tên tăng dần. */
  search(
    criteria: GenreSearchCriteria,
  ): Promise<{ items: Genre[]; total: number }>;

  /** Toàn bộ thể loại, sắp xếp theo tên tăng dần (không phân trang). */
  findAll(): Promise<Genre[]>;

  findById(id: string): Promise<Genre | null>;

  findByIds(ids: string[]): Promise<Genre[]>;

  exists(id: string): Promise<boolean>;

  /** Truyền excludeId để bỏ qua chính bản ghi đang sửa. */
  existsCode(code: string, excludeId?: string): Promise<boolean>;

  existsName(name: string, excludeId?: string): Promise<boolean>;

  create(data: Partial<Genre>): Genre;

  /**
   * @throws GenreUniqueViolationError khi vi phạm unique (code / name).
   */
  save(genre: Genre): Promise<Genre>;

  deleteById(id: string): Promise<void>;
}

export const GENRE_REPOSITORY = Symbol('GENRE_REPOSITORY');
