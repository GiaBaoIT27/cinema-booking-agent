"use client";

import { useHeroMovies } from "../hooks/use-hero-movie";
import { HeroBanner, HeroBannerSkeleton } from "./hero-banner";

/** Dùng trong trang chủ: <HeroBannerContainer />. Không có phim thì ẩn banner. */
export function HeroBannerContainer() {
  const { data, isPending } = useHeroMovies();
  if (isPending) return <HeroBannerSkeleton />;
  if (!data || data.length === 0) return null;
  return <HeroBanner movies={data} />;
}
