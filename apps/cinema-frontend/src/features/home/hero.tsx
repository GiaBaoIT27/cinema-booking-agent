import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { FilterChip } from "@/components/ui/filter-chip";
import { useDictionary, usePreferences } from "@/features/preferences/provider";
import type { Dispatch, SetStateAction } from "react";
import type { SearchQuery, ReleaseStatus } from "./model";

export function Hero({
  draft,
  setDraft,
  onSearch,
}: {
  draft: SearchQuery;
  setDraft: Dispatch<SetStateAction<SearchQuery>>;
  onSearch(query: SearchQuery): void;
}) {
  const d = useDictionary();
  const { preferences } = usePreferences();
  const setStatus = (status: ReleaseStatus) =>
    setDraft((previous) => ({ ...previous, status }));
  return (
    <section
      className="home-hero"
      data-testid="hero"
      aria-labelledby="hero-title"
    >
      <div className="hero-discovery">
        <h1 id="hero-title" className="text-hero">
          {d.home.heroTitle}
        </h1>
        <p className="hero-description">{d.home.heroDescription}</p>
        <form
          className="hero-search"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch(draft);
          }}
        >
          <SearchField
            id="movie-query"
            label={d.home.searchPlaceholder}
            theme={preferences.theme}
            placeholder={d.home.searchPlaceholder}
            value={draft.query}
            onChange={(event) =>
              setDraft({ ...draft, query: event.target.value })
            }
          />
          <Button type="submit">{d.home.search}</Button>
        </form>
        <div className="hero-filters" data-testid="hero-filters">
          <FilterChip
            label={d.statuses["now-showing"]}
            pressed={draft.status === "now-showing"}
            onClick={() => setStatus("now-showing")}
          />
          {(["sci-fi", "drama"] as const).map((genreId) => (
            <FilterChip
              key={genreId}
              label={d.genres[genreId]}
              pressed={draft.genreId === genreId}
              onClick={() =>
                setDraft({
                  ...draft,
                  genreId: draft.genreId === genreId ? null : genreId,
                })
              }
            />
          ))}
          <FilterChip
            label={d.statuses.upcoming}
            pressed={draft.status === "upcoming"}
            onClick={() => setStatus("upcoming")}
          />
        </div>
      </div>
      <aside className="release-panel" aria-labelledby="release-title">
        <h2 id="release-title" className="text-release-panel-title">
          {d.home.statusTitle}
        </h2>
        <p>{d.home.statusDescription}</p>
        <div className="hero-filters">
          {(["now-showing", "upcoming"] as const).map((status) => (
            <FilterChip
              key={status}
              label={d.statuses[status]}
              pressed={draft.status === status}
              onClick={() => setStatus(status)}
            />
          ))}
        </div>
        <p className="release-helper">{d.home.statusHelper}</p>
      </aside>
    </section>
  );
}
