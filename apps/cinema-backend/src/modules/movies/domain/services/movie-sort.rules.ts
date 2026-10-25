export type MovieSortField = 'releaseDate' | 'title' | 'durationMinutes';

/** Whitelist cột được phép sort (tránh SQL injection qua orderBy). */
const SORT_FIELD_BY_QUERY_KEY: Record<string, MovieSortField> = {
  release_date: 'releaseDate',
  title: 'title',
  duration_minutes: 'durationMinutes',
};

/** "release_date:desc" → { field, direction }. Cột lạ → releaseDate; hướng lạ → DESC. */
export function parseMovieSort(sort: string): {
  field: MovieSortField;
  direction: 'ASC' | 'DESC';
} {
  const [key, direction] = sort.split(':');
  return {
    field: SORT_FIELD_BY_QUERY_KEY[key] || 'releaseDate',
    direction: direction?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
  };
}
