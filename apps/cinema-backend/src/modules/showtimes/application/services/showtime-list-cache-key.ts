/**
 * Chuỗi định danh cache cho GET /showtimes.
 * Phải chứa MỌI tham số lọc: trước đây chỉ có ngày/trang/limit nên lọc theo phim, rạp,
 * định dạng hoặc trạng thái trả nhầm kết quả của lần gọi trước trong cùng ngày.
 */
export function showtimeListQueryKey(q: {
  date: string;
  movieId?: number | string;
  cineplexId?: number | string;
  projectionType?: string;
  status?: string;
  page?: number;
  limit?: number;
}): string {
  return [
    `m=${q.movieId ?? '*'}`,
    `c=${q.cineplexId ?? '*'}`,
    `d=${q.date}`,
    `pt=${q.projectionType ?? '*'}`,
    `st=${q.status ?? '*'}`,
    `p=${q.page ?? 1}`,
    `l=${q.limit ?? 20}`,
  ].join(':');
}
