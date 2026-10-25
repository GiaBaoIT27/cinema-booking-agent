import Link from "next/link";
import type { CineplexDetail } from "../types/cineplex.types";
import { CineplexStatusBadge } from "./cineplex-status-badge";

export function CineplexDetailHeader({
  cineplex,
}: {
  cineplex: CineplexDetail;
}) {
  const fullAddress = [
    cineplex.address,
    cineplex.ward.name,
    cineplex.province.name,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <header className="space-y-3">
      <Link
        href="/cineplexes"
        className="text-sm text-gray-500 hover:text-red-600"
      >
        ← Tất cả rạp
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{cineplex.name}</h1>
        <CineplexStatusBadge status={cineplex.status} />
      </div>
      <p className="text-gray-600">{fullAddress}</p>
      {cineplex.phoneNumber && (
        <a
          href={`tel:${cineplex.phoneNumber}`}
          className="inline-block text-sm font-medium text-red-600 hover:underline"
        >
          Hotline liên hệ: {cineplex.phoneNumber}
        </a>
      )}
    </header>
  );
}
