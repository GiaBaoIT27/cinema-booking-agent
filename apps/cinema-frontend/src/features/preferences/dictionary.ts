import type { Locale } from "./model";

type GenreId = "sci-fi" | "drama" | "romance" | "thriller" | "adventure";
type ReleaseStatus = "now-showing" | "upcoming";

const dictionaries = {
  vi: {
    brand: "Cinema",
    shellHeading: "Rạp chiếu phim",
    preferences: { language: "Ngôn ngữ", theme: "Giao diện", vietnamese: "Tiếng Việt", english: "English", light: "Sáng", dark: "Tối" },
    navigation: { home: "Trang chủ", nowShowing: "Đang chiếu", cinemas: "Rạp phim", myTickets: "Vé của tôi", login: "Đăng nhập", aiAssistant: "Trợ lý AI" },
    home: { heroTitle: "Khám phá phim tại rạp", heroDescription: "Chọn phim và suất chiếu phù hợp với bạn.", search: "Tìm kiếm", searchPlaceholder: "Tìm phim", browseAll: "Xem tất cả", viewDetails: "Xem chi tiết", quickBooking: "Đặt vé nhanh", bookNow: "Chọn ghế", cinema: "Rạp phim", movie: "Phim", date: "Ngày", showtime: "Suất chiếu", notSelected: "Chưa chọn", noShowtimes: "Chưa có suất phù hợp", demoSearchResults: "Kết quả tìm kiếm mẫu", noResults: "Không có phim phù hợp", clearFilters: "Xóa bộ lọc", retry: "Thử lại", close: "Đóng", loading: "Đang tìm phim", demoNotice: "Đây là dữ liệu mẫu. Tính năng này sẽ được kết nối ở bước sau." },
    genres: { "sci-fi": "Khoa học viễn tưởng", drama: "Chính kịch", romance: "Lãng mạn", thriller: "Giật gân", adventure: "Phiêu lưu" },
    statuses: { "now-showing": "Đang chiếu", upcoming: "Sắp chiếu" },
    metadata: { minutes: "phút", age: "Độ tuổi" },
  },
  en: {
    brand: "Cinema",
    shellHeading: "Cinema booking",
    preferences: { language: "Language", theme: "Theme", vietnamese: "Tiếng Việt", english: "English", light: "Light", dark: "Dark" },
    navigation: { home: "Home", nowShowing: "Now Showing", cinemas: "Cinemas", myTickets: "My Tickets", login: "Log in", aiAssistant: "AI Assistant" },
    home: { heroTitle: "Discover movies in cinemas", heroDescription: "Choose a movie and showtime that suits you.", search: "Search", searchPlaceholder: "Search movies", browseAll: "Browse all", viewDetails: "View details", quickBooking: "Quick Booking", bookNow: "Choose seats", cinema: "Cinema", movie: "Movie", date: "Date", showtime: "Showtime", notSelected: "Not selected", noShowtimes: "No matching showtimes", demoSearchResults: "Demo search results", noResults: "No matching movies", clearFilters: "Clear filters", retry: "Retry", close: "Close", loading: "Searching movies", demoNotice: "This is demo data. This feature will be connected in a later step." },
    genres: { "sci-fi": "Sci-fi", drama: "Drama", romance: "Romance", thriller: "Thriller", adventure: "Adventure" },
    statuses: { "now-showing": "Now Showing", upcoming: "Upcoming" },
    metadata: { minutes: "min", age: "Age" },
  },
} satisfies Record<Locale, {
  brand: string;
  shellHeading: string;
  preferences: Record<string, string>;
  navigation: Record<string, string>;
  home: Record<string, string>;
  genres: Record<GenreId, string>;
  statuses: Record<ReleaseStatus, string>;
  metadata: Record<string, string>;
}>;

export type Dictionary = (typeof dictionaries)[Locale];

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function formatShowtime(date: string, time: string, locale: Locale): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const instant = new Date(Date.UTC(year, month - 1, day, hour - 7, minute));
  const datePart = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: locale === "vi" ? "2-digit" : "short", day: locale === "vi" ? "2-digit" : "numeric",
  }).format(instant);
  const timePart = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    timeZone: "Asia/Ho_Chi_Minh", hour: "numeric", minute: "2-digit", hour12: locale === "en",
  }).format(instant);
  return `${datePart} · ${timePart}`;
}
