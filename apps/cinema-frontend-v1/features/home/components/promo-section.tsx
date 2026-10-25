import Image from "next/image";
import Link from "next/link";

const PROMOS = [
  {
    id: "1",
    title: "Thành Viên CGV Friend",
    desc: "Thẻ CGV Friend mang đến nhiều ưu đãi cho thành viên mới",
    imageUrl:
      "https://res.cloudinary.com/verolisd/image/upload/v1791735049/240x201_14_.png",
    slug: "cgv-friend",
  },
  {
    id: "2",
    title: "Thành Viên CGV VIP",
    desc: "Thẻ VIP CGV dành riêng cho bạn những đặc quyền đặc biệt",
    imageUrl:
      "https://res.cloudinary.com/verolisd/image/upload/v1791735050/onl_n_o_240x201_6_.png",
    slug: "cgv-vip",
  },
  {
    id: "3",
    title: "Dịch Vụ Giải Trí Khác",
    desc: "Trọn gói tiện lợi - Trọn vẹn trải nghiệm dịch vụ xem phim cao cấp",
    imageUrl:
      "https://res.cloudinary.com/verolisd/image/upload/v1791735050/birthday_popcorn_box_240x201.png",
    slug: "giai-tri-khac",
  },
];

export function PromoSection() {
  return (
    <section className="bg-[#0B0F19] py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-xl font-bold uppercase tracking-wider text-white sm:text-2xl">
          Chương Trình Thành Viên Và Khuyến Mãi
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PROMOS.map((promo) => (
            <div
              key={promo.id}
              className="group flex flex-col overflow-hidden rounded-xl border border-[#1F2937] bg-[#111827] transition hover:border-[#374151]"
            >
              <div className="relative aspect-video w-full overflow-hidden">
                <Image
                  src={promo.imageUrl}
                  alt={promo.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </div>

              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {promo.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-[#9CA3AF] line-clamp-2">
                    {promo.desc}
                  </p>
                </div>

                <Link
                  href={`/promotions/${promo.slug}`}
                  className="mt-4 text-xs font-bold uppercase tracking-wide text-[#EF4444] transition hover:text-[#F87171]"
                >
                  Tìm Hiểu Ngay &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
