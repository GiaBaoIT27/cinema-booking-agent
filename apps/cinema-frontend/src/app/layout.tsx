import type { Metadata } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { PreferenceProvider } from "@/features/preferences/provider";
import { parsePreferences } from "@/features/preferences/model";
import "./globals.css";

const inter = localFont({ src: "../fonts/Inter-Variable.ttf", weight: "400 700", variable: "--font-inter", display: "swap" });
const robotoSlab = localFont({ src: "../fonts/RobotoSlab-Variable.ttf", weight: "600 700", variable: "--font-roboto-slab", display: "swap" });

export const metadata: Metadata = { title: "Cinema", description: "Movie booking demo" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const initial = parsePreferences({
    mba_locale: cookieStore.get("mba_locale")?.value,
    mba_theme: cookieStore.get("mba_theme")?.value,
  });
  return <html lang={initial.locale} data-theme={initial.theme} className={`${inter.variable} ${robotoSlab.variable}`}>
    <body><PreferenceProvider initial={initial}>{children}</PreferenceProvider></body>
  </html>;
}
