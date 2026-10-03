/** Thông tin tóm tắt của thể loại dành cho module khác. */
export interface GenreSummaryDto {
  id: number;
  code: string;
  name: string;
  description: string | null;
}
