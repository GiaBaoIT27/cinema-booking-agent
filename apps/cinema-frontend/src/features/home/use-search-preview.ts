"use client";
import { useCallback, useEffect, useReducer, useRef } from "react";
import type { CatalogAdapter, SearchQuery } from "./model";
import { clearSearchQuery, reduceSearchPreview } from "./search-preview";

export function useSearchPreview(adapter: CatalogAdapter) {
  const [state, dispatch] = useReducer(reduceSearchPreview, { status: "closed" });
  const requestId = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const submit = useCallback((query: SearchQuery) => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const id = ++requestId.current;
    const submitted = { ...query };
    dispatch({ type: "start", requestId: id, submitted });
    void adapter.search(submitted, controller.signal).then(
      (movies) => { if (!controller.signal.aborted) dispatch({ type: "resolve", requestId: id, movies }); },
      () => { if (!controller.signal.aborted) dispatch({ type: "reject", requestId: id }); },
    );
  }, [adapter]);
  const close = useCallback(() => {
    pending.current?.abort();
    dispatch({ type: "close" });
  }, []);
  useEffect(() => () => { pending.current?.abort(); }, [adapter]);
  return {
    state, submit, close,
    retry: () => { if (state.status === "error") submit(state.submitted); },
    clear: () => { if (state.status !== "closed") submit(clearSearchQuery(state.submitted)); },
  };
}
