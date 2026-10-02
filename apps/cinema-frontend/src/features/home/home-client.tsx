"use client";
import { useCallback, useMemo, useReducer, useState } from "react";
import { createFixtureAdapter } from "./fixture-adapter";
import { EMPTY_QUICK_SELECTION, reduceQuickSelection } from "./quick-selection";
import { clearSearchQuery } from "./search-preview";
import { useSearchPreview } from "./use-search-preview";
import type { Catalog, FixtureScenario, HomeIntent, SearchQuery } from "./model";
import { Navigation } from "./navigation";
import { Hero } from "./hero";
import { QuickBooking } from "./quick-booking";
import { AIEntry } from "./ai-entry";
import { MovieSection } from "./movie-section";
import { DemoDialog } from "./demo-dialog";

export function HomeClient({ catalog, scenario }: { catalog: Catalog; scenario: FixtureScenario }) {
  const adapter = useMemo(() => createFixtureAdapter(catalog, { scenario }), [catalog, scenario]);
  const preview = useSearchPreview(adapter);
  const [draft, setDraft] = useState<SearchQuery>({ query: "", status: "now-showing", genreId: null });
  const [selection, dispatchQuick] = useReducer(reduceQuickSelection, EMPTY_QUICK_SELECTION);
  const [intent, setIntent] = useState<HomeIntent | null>(null);
  const [searchOrigin, setSearchOrigin] = useState<"hero" | "browse">("hero");
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null);
  const [navigationFocus, setNavigationFocus] = useState<(() => HTMLElement | null) | null>(null);
  const setNavigationFocusResolver = useCallback((resolve: () => HTMLElement | null) => setNavigationFocus(() => resolve), []);
  const rememberFocus = () => setReturnFocus(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const openIntent = (next: HomeIntent) => { rememberFocus(); preview.close(); setIntent(next); };
  const search = (query: SearchQuery, origin: "hero" | "browse") => { rememberFocus(); setIntent(null); setSearchOrigin(origin); preview.submit(query); };
  const closeDialog = () => { preview.close(); setIntent(null); };
  return <>
    <Navigation openIntent={openIntent} onFocusFallback={setNavigationFocusResolver} />
    <main className="home-container home-main">
      <Hero draft={draft} setDraft={setDraft} onSearch={query => search(query, "hero")} />
      <QuickBooking adapter={adapter} selection={selection} dispatchQuick={dispatchQuick} openIntent={openIntent} />
      <AIEntry onOpen={() => openIntent({ kind: "ai-assistant" })} />
      {(["now-showing", "upcoming"] as const).map(status => <MovieSection key={status} status={status} movies={catalog.movies} onBrowse={status => search({ query: "", status, genreId: null }, "browse")} onDetails={movieId => openIntent({ kind: "movie-details", movieId })} />)}
    </main>
    <DemoDialog catalog={catalog} intent={intent} preview={preview} returnFocus={navigationFocus ?? returnFocus} closeDialog={closeDialog} openIntent={openIntent} onClear={() => {
      if (searchOrigin === "hero" && preview.state.status !== "closed") setDraft(clearSearchQuery(preview.state.submitted));
      preview.clear();
    }} />
  </>;
}
