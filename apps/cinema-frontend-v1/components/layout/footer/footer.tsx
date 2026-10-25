import Link from "next/link";
import Image from "next/image";
import { FooterBottom } from "./footer-bottom";
import { FooterColumn } from "./footer-column";

export function Footer() {
  return (
    <footer className="bg-[#080C15]">
      <div className="mx-auto max-w-277.5 px-5 pb-7">
        <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-[130px_110px_110px_110px_1fr] md:gap-10">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-block">
              <Image
                src="/images/cgvlogo.png"
                alt="CGV Logo"
                width={100}
                height={40}
              />
            </Link>

            <p className="mt-1 max-w-16.25 text-[12px] font-bold uppercase leading-tight text-white">
              BEHAPPY. BE A STAR
            </p>

            <div className="mt-3 flex gap-2">
              <SocialIcon
                src="/icons/facebook.png"
                alt="Facebook"
                href="https://facebook.com..."
              />
              <SocialIcon
                src="/icons/youtube.png"
                alt="Youtube"
                href="https://youtube.com..."
              />
              <SocialIcon
                src="/icons/tik-tok.png"
                alt="Tiktok"
                href="https://tiktok.com..."
              />
              <SocialIcon
                src="/icons/instagram.png"
                alt="Instagram"
                href="https://instagram.com..."
              />
            </div>
          </div>

          <FooterColumn
            title="Xem phim"
            items={["Phim đang chiếu", "Phim sắp chiếu", "Suất chiếu đặc biệt"]}
          />

          <FooterColumn
            title="CGV"
            items={[
              "Liên hệ",
              "Tuyển dụng",
              "Chính sách bảo mật",
              "Giới thiệu",
            ]}
          />

          <FooterColumn
            title="Dịch vụ khác"
            items={[
              "Kidzone",
              "Bowling",
              "Billiards",
              "Gym",
              "Coffee",
              "Nhà hàng",
            ]}
          />

          <FooterColumn
            title="Thông tin liên hệ"
            items={[
              "Email: cskh@cgvietnam.com.vn",
              "Hotline: 1900 6017",
              "Địa chỉ: 99-101 Nguyễn Đình Chiểu, Phường Xuân Hòa, TP. HCM",
            ]}
          />
        </div>

        <FooterBottom />
      </div>
    </footer>
  );
}

function SocialIcon({
  src,
  alt,
  href,
}: {
  src: string;
  alt: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-5 w-5 items-center justify-center rounded-full transition-opacity hover:opacity-80"
    >
      <Image
        src={src}
        alt={alt}
        width={24}
        height={24}
        className="object-contain"
      />
    </a>
  );
}
