/**
 * Chuyển đổi chuỗi bất kỳ thành slug URL-friendly.
 * Hỗ trợ tiếng Việt có dấu (normalize NFKD → strip diacritic → lowercase → replace space/special → trim dashes).
 *
 * @example
 * slugify('Avengers: Endgame (2019)') // 'avengers-endgame-2019'
 * slugify('Cô Gái Từ Quá Khứ')        // 'co-gai-tu-qua-khu'
 */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')                         // Tách ký tự có dấu thành base + combining
    .replace(/[\u0300-\u036f]/g, '')           // Xoá combining diacritics (dấu)
    .replace(/[đĐ]/g, 'd')                     // Xử lý đặc biệt chữ đ/Đ không tách được
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')             // Chỉ giữ chữ thường, số, khoảng trắng, gạch ngang
    .replace(/\s+/g, '-')                      // Thay khoảng trắng bằng gạch ngang
    .replace(/-+/g, '-')                       // Gộp nhiều gạch ngang liên tiếp
    .replace(/^-|-$/g, '');                    // Trim gạch ngang đầu/cuối
}
