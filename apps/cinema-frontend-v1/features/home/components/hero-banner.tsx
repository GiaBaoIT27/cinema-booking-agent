"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroMovie } from "../utils/to-hero-movie";

const AUTO_PLAY_INTERVAL = 6000; // 6 giây

interface Props {
  movies: HeroMovie[];
}

/** Hero Banner Slider — hiển thị nhiều phim với animation fade + slide, arrow nav, auto-play. */
export function HeroBanner({ movies }: Props) {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = movies.length;

  const goTo = useCallback(
    (index: number, dir: "left" | "right") => {
      if (animating || total <= 1) return;
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        setCurrent(index);
        setAnimating(false);
      }, 500);
    },
    [animating, total],
  );

  const prev = useCallback(() => {
    goTo((current - 1 + total) % total, "left");
  }, [current, total, goTo]);

  const next = useCallback(() => {
    goTo((current + 1) % total, "right");
  }, [current, total, goTo]);

  // Auto-play
  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setTimeout(() => next(), AUTO_PLAY_INTERVAL);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, next, total]);

  if (total === 0) return null;

  const movie = movies[current];

  const meta = [
    movie.genres.length > 0 ? movie.genres.join(", ") : null,
    movie.durationMinutes ? `${movie.durationMinutes} phút` : null,
  ].filter(Boolean) as string[];

  return (
    // Bề rộng banner được giới hạn theo đúng cột nội dung của trang
    // (max-w-6xl + padding giống QuickBookingBar / MovieTabsSection / PromoSection)
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-[#1F2937] bg-black shadow-2xl"
        style={{ height: "clamp(360px, 45vw, 520px)" }}
      >
        {/* Background Image với fade animation */}
        {movies.map((m, i) => (
          <div
            key={m.id}
            aria-hidden={i !== current}
            className={[
              "absolute inset-0 transition-opacity duration-500",
              i === current ? "opacity-100 z-10" : "opacity-0 z-0",
            ].join(" ")}
          >
            {m.imageUrl && (
              <Image
                src={m.imageUrl}
                alt={m.title}
                fill
                priority={i === 0}
                sizes="(max-width: 1152px) 100vw, 1088px"
                className="object-cover opacity-60"
              />
            )}
          </div>
        ))}

        {/* Gradient overlay */}
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-[#080C15] via-[#080C15]/30 to-black/40 pointer-events-none" />

        {/* Content — slide-in animation */}
        <div
          key={`content-${current}`}
          className={[
            "absolute bottom-14 left-0 z-30 w-full",
            "animate-in fade-in slide-in-from-bottom-4 duration-500",
            animating
              ? direction === "right"
                ? "-translate-x-4 opacity-0"
                : "translate-x-4 opacity-0"
              : "",
          ].join(" ")}
        >
          <div className="w-full px-5 sm:px-8 lg:px-12">
            <div className="max-w-2xl space-y-3">
              {/* Meta: genre • duration • age */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#D1D5DB]">
                {meta.map((item, i) => (
                  <span key={item} className="flex items-center gap-2">
                    {i > 0 && <span>•</span>}
                    {item}
                  </span>
                ))}
                {movie.ageRating && (
                  <span className="rounded bg-amber-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {movie.ageRating}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white sm:text-5xl drop-shadow-lg">
                {movie.title}
              </h1>

              {/* CTA buttons */}
              <div className="flex items-center gap-3 pt-2">
                {movie.trailerUrl && (
                  <a
                    href={movie.trailerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 items-center gap-2 rounded-lg border border-white/30 bg-black/40 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    <Play size={16} fill="white" />
                    Xem Trailer
                  </a>
                )}
                <Link
                  href={`/movies/${movie.id}`}
                  className="flex h-10 items-center rounded-lg bg-[#EF4444] px-6 text-sm font-bold text-white transition hover:bg-[#F87171]"
                >
                  Mua Vé Ngay
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Arrow Navigation */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Phim trước"
              className="absolute left-4 top-1/2 z-40 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm border border-white/20 transition hover:bg-white/20 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={next}
              aria-label="Phim tiếp theo"
              className="absolute right-4 top-1/2 z-40 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm border border-white/20 transition hover:bg-white/20 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* Dot Indicators */}
        {total > 1 && (
          <div className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2 flex items-center gap-2">
            {movies.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > current ? "right" : "left")}
                aria-label={`Chuyển đến banner ${i + 1}`}
                className={[
                  "rounded-full transition-all duration-300",
                  i === current
                    ? "bg-[#EF4444] w-6 h-2"
                    : "bg-white/40 w-2 h-2 hover:bg-white/70",
                ].join(" ")}
              />
            ))}
          </div>
        )}

        {/* Progress bar auto-play */}
        {total > 1 && (
          <div className="absolute bottom-0 left-0 z-40 h-[3px] w-full bg-white/10">
            <div
              key={`progress-${current}`}
              className="h-full bg-[#EF4444]"
              style={{
                animation: `heroProgress ${AUTO_PLAY_INTERVAL}ms linear forwards`,
              }}
            />
          </div>
        )}

        {/* CSS animation keyframes */}
        <style jsx>{`
          @keyframes heroProgress {
            from {
              width: 0%;
            }
            to {
              width: 100%;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

export function HeroBannerSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div
        className="w-full animate-pulse rounded-2xl border border-[#1F2937] bg-[#111827]"
        style={{ height: "clamp(360px, 45vw, 520px)" }}
      />
    </div>
  );
}
