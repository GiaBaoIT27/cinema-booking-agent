import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PreferenceControls } from "@/features/preferences/controls";
import { useDictionary, usePreferences } from "@/features/preferences/provider";
import { formatShowtime } from "@/features/preferences/dictionary";
import { MovieMetadata } from "./movie-card";
import type { Catalog, HomeIntent } from "./model";
import type { useSearchPreview } from "./use-search-preview";

export function DemoDialog({ catalog, intent, preview, returnFocus, closeDialog, openIntent, onClear }: { catalog: Catalog; intent: HomeIntent | null; preview: ReturnType<typeof useSearchPreview>; returnFocus: HTMLElement | null | (() => HTMLElement | null); closeDialog(): void; openIntent(intent: HomeIntent): void; onClear(): void }) {
 const d = useDictionary();
 const { preferences } = usePreferences();
  const intentMovie = intent?.kind === "movie-details" ? catalog.movies.find((m) => m.id === intent.movieId) : undefined;
  const intentShowtime = intent?.kind === "seat-selection" ? intent.showtime : undefined;
  const intentTitle = !intent ? d.home.demoSearchResults : intent.kind === "movie-details" ? d.home.viewDetails : intent.kind === "seat-selection" ? d.home.seatTitle : intent.kind === "cinema-directory" ? d.navigation.cinemas : intent.kind === "my-tickets" ? d.navigation.myTickets : intent.kind === "login" ? d.navigation.login : d.home.aiDialogTitle;
 return <Dialog open={Boolean(intent) || preview.state.status !== "closed"} title={intentTitle} onClose={closeDialog} returnFocusTo={returnFocus}>
      <div className="demo-content"><PreferenceControls /><p>{d.home.demoNotice}</p>
        {preview.state.status !== "closed" && <>
          <p data-testid="submitted-context">{preview.state.submitted.query} · {d.statuses[preview.state.submitted.status]}{preview.state.submitted.genreId ? ` · ${d.genres[preview.state.submitted.genreId]}` : ""}</p>
          <p role="status" aria-live="polite">{preview.state.status === "loading" ? d.home.loading : preview.state.status === "error" ? d.home.error : preview.state.movies.length === 0 ? d.home.noResults : `${preview.state.movies.length} ${d.home.demoSearchResults}`}</p>
          {preview.state.status === "loading" && <div data-testid="search-skeleton" aria-hidden="true" className="flex flex-col gap-3">{[0, 1, 2].map(row => <div key={row} className="h-16 rounded-md bg-surface-subtle motion-safe:animate-pulse" />)}</div>}
          {preview.state.status === "error" && <Button onClick={preview.retry}>{d.home.retry}</Button>}
          {preview.state.status === "ready" && (preview.state.movies.length === 0 ? <Button onClick={onClear}>{d.home.clearFilters}</Button> : <div className="preview-movies">{preview.state.movies.map((movie) => <article key={movie.id}><h3 className="text-movie-title">{movie.title}</h3><p><MovieMetadata movie={movie} /></p><Button onClick={() => openIntent({ kind: "movie-details", movieId: movie.id })}>{d.home.viewDetails}</Button></article>)}</div>)}
        </>}
        {intentMovie && <article><h3 className="text-movie-title">{intentMovie.title}</h3><p><MovieMetadata movie={intentMovie} /></p></article>}
        {intentShowtime && <p>{catalog.movies.find((m) => m.id === intentShowtime.movieId)?.title} · {catalog.cinemas.find((c) => c.id === intentShowtime.cinemaId)?.name} · {formatShowtime(intentShowtime.date, intentShowtime.time, preferences.locale)}</p>}
        <Button variant="tertiary" data-dialog-focus-fallback onClick={closeDialog}>{d.home.close}</Button>
      </div>
    </Dialog>;
}
