import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "./button";
import { SearchField } from "./search-field";
import { FilterChip } from "./filter-chip";
import { SelectField } from "./select-field";

describe("native UI controls", () => {
  it("keeps action buttons from submitting a surrounding form unless requested", () => {
    const markup = renderToStaticMarkup(createElement(Button, { disabled: true }, "Continue"));
    expect(markup).toMatch(/<button\b[^>]*type="button"/);
    expect(markup).toContain(" disabled");
  });

  it("gives the search input a label while hiding its decorative icon", () => {
    const markup = renderToStaticMarkup(createElement(SearchField, { id: "movie-query", label: "Search movies", theme: "dark" }));
    expect(markup).toContain('for="movie-query"');
    expect(markup).toContain('id="movie-query"');
    expect(markup).toContain('alt=""');
    expect(markup).toContain('aria-hidden="true"');
  });

  it("uses native pressed and disabled state for a filter", () => {
    const markup = renderToStaticMarkup(createElement(FilterChip, { label: "Sci-fi", pressed: true, disabled: true }));
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain(" disabled");
  });

  it("labels a native select and keeps an empty placeholder option", () => {
    const markup = renderToStaticMarkup(createElement(SelectField, { id: "cinema", label: "Cinema", placeholder: "Choose a cinema", value: "", options: [{ value: "a", label: "Cinema A" }], onChange: () => {} }));
    expect(markup).toContain('<select id="cinema"');
    expect(markup).toContain('for="cinema"');
    expect(markup).toContain('<option value="" selected=""');
  });
});
