import { Suspense } from "react";
import { CineplexList } from "@/features/cineplex/components/cineplex-list";

export const metadata = { title: "Hệ thống rạp chiếu" };

export default function CineplexesPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
        HỆ THỐNG RẠP CHIẾU
      </h1>

      {/* useSearchParams cần Suspense khi build tĩnh */}
      <Suspense
        fallback={<div className="h-40 animate-pulse rounded-xl bg-gray-100" />}
      >
        <CineplexList />
      </Suspense>
    </main>
  );
}
