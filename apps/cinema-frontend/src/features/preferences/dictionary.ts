import type { Locale } from "./model";

type GenreId = "sci-fi" | "drama" | "romance" | "thriller" | "adventure";
type ReleaseStatus = "now-showing" | "upcoming";
type Texts<K extends string> = Record<K, string>;
export type Dictionary = {
  brand: string;
  tagline: string;
  preferences: Texts<
    "language" | "theme" | "vietnamese" | "english" | "light" | "dark"
  >;
  navigation: Texts<
    "home" | "nowShowing" | "cinemas" | "myTickets" | "login" | "aiAssistant"
  >;
  home: Texts<
    | "heroTitle"
    | "heroDescription"
    | "search"
    | "searchPlaceholder"
    | "browseAll"
    | "browseUpcoming"
    | "nowShowingTitle"
    | "upcomingTitle"
    | "viewDetails"
    | "quickBooking"
    | "quickIntro"
    | "quickHelper"
    | "bookNow"
    | "cinema"
    | "movie"
    | "date"
    | "showtime"
    | "notSelected"
    | "noShowtimes"
    | "demoSearchResults"
    | "noResults"
    | "clearFilters"
    | "retry"
    | "close"
    | "loading"
    | "error"
    | "demoNotice"
    | "statusTitle"
    | "statusDescription"
    | "statusHelper"
    | "aiTitle"
    | "aiDescription"
    | "aiDialogTitle"
    | "seatTitle"
    | "invalidTuple"
  >;
  genres: Texts<GenreId>;
  statuses: Texts<ReleaseStatus>;
  metadata: Texts<"minutes" | "age">;
};
const dictionaries: Record<Locale, Dictionary> = {
  vi: {
    brand: "Movie Booking Agent",
    tagline: "Find · book · go",
    preferences: {
      language: "Ngôn ngữ",
      theme: "Giao diện",
      vietnamese: "VI",
      english: "EN",
      light: "Sáng",
      dark: "Tối",
    },
    navigation: {
      home: "Trang chủ",
      nowShowing: "Đang chiếu",
      cinemas: "Rạp phim",
      myTickets: "Vé của tôi",
      login: "Đăng nhập",
      aiAssistant: "Hỏi AI",
    },
    home: {
      heroTitle: "Tìm bộ phim cho buổi xem tiếp theo",
      heroDescription:
        "Tìm theo tên phim, rồi thu hẹp theo trạng thái hoặc thể loại. Nếu cần thêm trợ giúp, AI có thể giúp bạn lọc lựa chọn trước khi mở chi tiết phim.",
      search: "Tìm phim",
      searchPlaceholder: "Tìm phim",
      browseAll: "Xem tất cả phim",
      browseUpcoming: "Xem tất cả phim sắp chiếu",
      nowShowingTitle: "Phim đang chiếu",
      upcomingTitle: "Phim sắp chiếu",
      viewDetails: "Xem chi tiết",
      quickBooking: "Đặt vé nhanh",
      quickIntro: "4 bước để vào chọn ghế",
      quickHelper:
        "Đi thẳng đến chọn ghế sau khi đã chọn rạp, phim, ngày và suất chiếu.",
      bookNow: "Đặt vé ngay",
      cinema: "1. Chọn rạp",
      movie: "2. Chọn phim",
      date: "3. Chọn ngày",
      showtime: "4. Chọn suất",
      notSelected: "Chưa chọn",
      noShowtimes: "Chưa có suất phù hợp",
      demoSearchResults: "Kết quả tìm kiếm mẫu",
      noResults: "Không có phim phù hợp",
      clearFilters: "Xóa bộ lọc",
      retry: "Thử lại",
      close: "Đóng",
      loading: "Đang tìm phim",
      error: "Không thể tải kết quả mẫu. Hãy thử lại.",
      demoNotice:
        "Đây là dữ liệu mẫu. Phần tiếp nối sẽ được kết nối ở bước sau.",
      statusTitle: "Chọn theo trạng thái phát hành",
      statusDescription:
        "Xem phim đang chiếu hoặc sắp chiếu, sau đó thu hẹp thêm theo thể loại.",
      statusHelper:
        "Khám phá trực tiếp vẫn là chính; AI chỉ hỗ trợ khi bạn cần diễn đạt tiêu chí phức tạp hơn.",
      aiTitle: "Cần trợ giúp chọn phim?",
      aiDescription:
        "Hãy mô tả tâm trạng, thời gian, khu vực rạp hoặc nhu cầu của nhóm. AI chỉ thu hẹp lựa chọn; dữ liệu rạp vẫn là nguồn chính xác.",
      aiDialogTitle: "Trợ lý AI",
      seatTitle: "Chọn ghế — mẫu",
      invalidTuple: "Lựa chọn không còn phù hợp. Hãy chọn lại suất chiếu.",
    },
    genres: {
      "sci-fi": "Viễn tưởng",
      drama: "Tâm lý",
      romance: "Tình cảm",
      thriller: "Giật gân",
      adventure: "Phiêu lưu",
    },
    statuses: { "now-showing": "Đang chiếu", upcoming: "Sắp chiếu" },
    metadata: { minutes: "phút", age: "Độ tuổi" },
  },
  en: {
    brand: "Movie Booking Agent",
    tagline: "Find · book · go",
    preferences: {
      language: "Language",
      theme: "Appearance",
      vietnamese: "VI",
      english: "EN",
      light: "Light",
      dark: "Dark",
    },
    navigation: {
      home: "Home",
      nowShowing: "Now showing",
      cinemas: "Cinemas",
      myTickets: "My tickets",
      login: "Sign in",
      aiAssistant: "Ask AI",
    },
    home: {
      heroTitle: "Find your next movie",
      heroDescription:
        "Search by movie title, then narrow by status or genre. If you need more help, AI can refine your options before you open a movie.",
      search: "Search movies",
      searchPlaceholder: "Search movies",
      browseAll: "Browse all movies",
      browseUpcoming: "Browse upcoming movies",
      nowShowingTitle: "Now showing",
      upcomingTitle: "Coming soon",
      viewDetails: "View details",
      quickBooking: "Quick booking",
      quickIntro: "4 steps to seat selection",
      quickHelper:
        "Go straight to seats once cinema, movie, date and showtime are selected.",
      bookNow: "Book now",
      cinema: "1. Choose cinema",
      movie: "2. Choose movie",
      date: "3. Choose date",
      showtime: "4. Choose showtime",
      notSelected: "Not selected",
      noShowtimes: "No matching showtimes",
      demoSearchResults: "Demo search results",
      noResults: "No matching movies",
      clearFilters: "Clear filters",
      retry: "Retry",
      close: "Close",
      loading: "Searching movies",
      error: "Could not load demo results. Please retry.",
      demoNotice:
        "This is demo data. The next step will be connected in a later stage.",
      statusTitle: "Browse by release status",
      statusDescription:
        "Start with what is showing or coming soon, then narrow further by genre.",
      statusHelper:
        "Direct discovery stays primary; AI helps only when your criteria are harder to express.",
      aiTitle: "Need help deciding?",
      aiDescription:
        "Describe your mood, time, cinema area or group constraints. AI narrows options; cinema data remains authoritative.",
      aiDialogTitle: "AI assistant",
      seatTitle: "Seat selection — demo",
      invalidTuple:
        "This selection no longer matches. Please choose a showtime again.",
    },
    genres: {
      "sci-fi": "Sci-Fi",
      drama: "Drama",
      romance: "Romance",
      thriller: "Thriller",
      adventure: "Adventure",
    },
    statuses: { "now-showing": "Now showing", upcoming: "Coming soon" },
    metadata: { minutes: "min", age: "Age" },
  },
};
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
export function formatShowtime(
  date: string,
  time: string,
  locale: Locale,
): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const instant = new Date(Date.UTC(year, month - 1, day, hour - 7, minute));
  const datePart = new Intl.DateTimeFormat(
    locale === "vi" ? "vi-VN" : "en-US",
    {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: locale === "vi" ? "2-digit" : "short",
      day: locale === "vi" ? "2-digit" : "numeric",
    },
  ).format(instant);
  const timePart = new Intl.DateTimeFormat(
    locale === "vi" ? "vi-VN" : "en-US",
    {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "numeric",
      minute: "2-digit",
      hour12: locale === "en",
    },
  ).format(instant);
  return `${datePart} · ${timePart}`;
}
