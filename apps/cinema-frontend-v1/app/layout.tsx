import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";

const plusJakarta = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const beVietnam = Be_Vietnam_Pro({
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Cinema - Đặt Vé Xem Phim Trực Tuyến",
    template: "%s | Cinema",
  },
  description:
    "Hệ thống đặt vé xem phim trực tuyến, xem lịch chiếu phim và ưu đãi mới nhất.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${beVietnam.variable} font-body antialiased selection:bg-red-600 selection:text-white bg-[#080C15] text-white`}
        suppressHydrationWarning
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
