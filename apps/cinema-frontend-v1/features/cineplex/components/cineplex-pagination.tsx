import type { Pagination } from "../types/cineplex.types";

interface Props {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

const BTN =
  "cursor-pointer rounded-lg border border-[#1F2937] bg-[#111827] px-3.5 py-1.5 font-semibold text-white transition hover:border-[#EF4444]/60 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#1F2937]";

export function CineplexPagination({ pagination, onPageChange }: Props) {
  const { page, totalPages, totalItems } = pagination;
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-2 text-sm">
      <span className="text-[#9CA3AF]">{totalItems} rạp</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={BTN}
        >
          Trước
        </button>
        <span className="text-[#9CA3AF]">
          Trang <b className="text-white">{page}</b> / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={BTN}
        >
          Sau
        </button>
      </div>
    </div>
  );
}
