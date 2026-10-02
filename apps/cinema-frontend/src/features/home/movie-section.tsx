import { useDictionary } from "@/features/preferences/provider";
import { MovieCard } from "./movie-card";
import type { Movie, ReleaseStatus } from "./model";

export function MovieSection({
  status,
  movies,
  onBrowse,
  onDetails,
}: {
  status: ReleaseStatus;
  movies: Movie[];
  onBrowse(status: ReleaseStatus): void;
  onDetails(movieId: string): void;
}) {
  const d = useDictionary();
  return (
    <section
      id={status}
      className="movie-section"
      data-testid={status}
      key={status}
      aria-labelledby={`${status}-title`}
    >
      <div className="movie-section-heading">
        <h2 id={`${status}-title`} className="text-section-heading">
          {status === "now-showing"
            ? d.home.nowShowingTitle
            : d.home.upcomingTitle}
        </h2>
        <button
          type="button"
          className={status === "now-showing" ? "browse-primary" : ""}
          onClick={() => onBrowse(status)}
        >
          {status === "now-showing" ? d.home.browseAll : d.home.browseUpcoming}
        </button>
      </div>
      <div className="movie-grid">
        {movies
          .filter((m) => m.releaseStatus === status)
          .map((movie) => (
            <MovieCard key={movie.id} movie={movie} onDetails={onDetails} />
          ))}
      </div>
    </section>
  );
}
