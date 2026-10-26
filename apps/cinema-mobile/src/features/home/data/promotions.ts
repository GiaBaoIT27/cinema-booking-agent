export interface PromoItem {
  id: string;
  title: string;
  desc: string;
  imageUrl: string;
}

/**
 * Khuyến mãi: hiện cùng nội dung tĩnh với PromoSection của web (chưa có API khuyến mãi).
 * Khi backend có endpoint, thay mảng này bằng một hook gọi API.
 */
export const PROMOTIONS: PromoItem[] = [
  {
    id: "cgv-friend",
    title: "Thành Viên CGV Friend",
    desc: "Thẻ CGV Friend mang đến nhiều ưu đãi cho thành viên mới",
    imageUrl: "https://res.cloudinary.com/verolisd/image/upload/v1791735049/240x201_14_.png",
  },
  {
    id: "cgv-vip",
    title: "Thành Viên CGV VIP",
    desc: "Thẻ VIP CGV dành riêng cho bạn những đặc quyền đặc biệt",
    imageUrl: "https://res.cloudinary.com/verolisd/image/upload/v1791735050/onl_n_o_240x201_6_.png",
  },
  {
    id: "giai-tri-khac",
    title: "Dịch Vụ Giải Trí Khác",
    desc: "Trọn gói tiện lợi - Trọn vẹn trải nghiệm dịch vụ xem phim cao cấp",
    imageUrl: "https://res.cloudinary.com/verolisd/image/upload/v1791735050/birthday_popcorn_box_240x201.png",
  },
];
