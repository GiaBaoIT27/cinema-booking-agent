/** Ngày kết thúc chiếu phải ≥ ngày khởi chiếu. */
export function isValidRunPeriod(
  releaseDate: Date | string,
  endDate: Date | string,
): boolean {
  return new Date(endDate) >= new Date(releaseDate);
}
