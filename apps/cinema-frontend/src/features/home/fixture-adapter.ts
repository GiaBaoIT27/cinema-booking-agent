import type { Catalog, CatalogAdapter, FixtureScenario } from "./model";
import { getQuickOptions, resolveQuickSelection } from "./quick-selection";

export function createFixtureAdapter(catalog: Catalog, options: { scenario?: FixtureScenario; delayMs?: number } = {}): CatalogAdapter {
  let errorPending = options.scenario === "error-once";
  return {
    search(query, signal) {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException("Search aborted", "AbortError"));
          return;
        }
        const normalizedQuery = query.query.trim().toLocaleLowerCase();
        const onAbort = () => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
          reject(new DOMException("Search aborted", "AbortError"));
        };
        const timer = setTimeout(() => {
          signal?.removeEventListener("abort", onAbort);
          if (errorPending) {
            errorPending = false;
            reject(new Error("Demo search failed"));
            return;
          }
          resolve(catalog.movies.filter((movie) => movie.title.toLocaleLowerCase().includes(normalizedQuery)
            && movie.releaseStatus === query.status
            && (query.genreId === null || movie.genreId === query.genreId)));
        }, options.delayMs ?? 300);
        signal?.addEventListener("abort", onAbort, { once: true });
      });
    },
    getQuickOptions: (selection) => getQuickOptions(catalog, selection),
    resolveQuickSelection: (selection) => resolveQuickSelection(catalog, selection),
  };
}
