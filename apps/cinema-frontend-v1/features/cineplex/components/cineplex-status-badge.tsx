import {
  CINEPLEX_STATUS_LABEL,
  type CineplexStatus,
} from "../types/cineplex.types";

const STYLES: Record<CineplexStatus, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-400",
  MAINTENANCE: "bg-amber-500/15 text-amber-400",
  CLOSED: "bg-rose-500/15 text-rose-400",
};

export function CineplexStatusBadge({ status }: { status: CineplexStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STYLES[status]}`}
    >
      {CINEPLEX_STATUS_LABEL[status]}
    </span>
  );
}
