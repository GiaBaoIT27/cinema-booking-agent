import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { PaginationDto, SortOrder } from '../dto/pagination.dto.js';

/**
 * Áp dụng keyword search (ILIKE), sort, và phân trang vào một TypeORM SelectQueryBuilder.
 *
 * @param qb         QueryBuilder đã join/where sẵn theo nghiệp vụ module
 * @param pagination DTO chứa page, limit, keyword, sortBy, sortOrder
 * @param searchFields Các cột được phép search keyword (ví dụ: ['movie.title', 'movie.description'])
 * @param allowedSortFields Whitelist cột được phép sort (tránh SQL injection qua sortBy)
 * @param alias      Alias chính của entity trong QueryBuilder (ví dụ: 'movie')
 *
 * @example
 * const qb = this.repo.createQueryBuilder('movie');
 * applyPagination(qb, dto, ['movie.title'], ['title', 'createdAt'], 'movie');
 * const [items, total] = await qb.getManyAndCount();
 */
export function applyPagination<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  pagination: PaginationDto,
  searchFields: string[] = [],
  allowedSortFields: string[] = ['createdAt'],
  alias: string = 'entity',
): SelectQueryBuilder<T> {
  // ── Keyword search ──────────────────────────────────────────────────────────
  if (pagination.keyword && searchFields.length > 0) {
    const keyword = `%${pagination.keyword.trim()}%`;
    const conditions = searchFields
      .map((field, i) => `LOWER(${field}) ILIKE LOWER(:keyword${i})`)
      .join(' OR ');
    const params = searchFields.reduce(
      (acc, _, i) => ({ ...acc, [`keyword${i}`]: keyword }),
      {},
    );
    qb.andWhere(`(${conditions})`, params);
  }

  // ── Sort ────────────────────────────────────────────────────────────────────
  const rawSortBy = pagination.sortBy ?? 'createdAt';
  // Chỉ cho phép sort theo whitelist để tránh injection
  const sortColumn = allowedSortFields.includes(rawSortBy)
    ? rawSortBy
    : 'createdAt';

  // Nếu sortColumn đã có alias thì dùng thẳng, ngược lại prefix alias vào
  const sortExpression = sortColumn.includes('.')
    ? sortColumn
    : `${alias}.${sortColumn}`;

  qb.orderBy(sortExpression, pagination.sortOrder ?? SortOrder.DESC);

  // ── Pagination ──────────────────────────────────────────────────────────────
  qb.skip(pagination.offset).take(pagination.limit);

  return qb;
}
