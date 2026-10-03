import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "../../../../src/components/ui/button";
import { SearchField } from "../../../../src/components/ui/search-field";
import { FilterChip } from "../../../../src/components/ui/filter-chip";
import { SelectField } from "../../../../src/components/ui/select-field";

describe("UI controls", () => {
  it("keeps action buttons from submitting a surrounding form unless requested", () => {
    const markup = renderToStaticMarkup(
      createElement(Button, { disabled: true }, "Continue"),
    );
    expect(markup).toMatch(/<button\b[^>]*type="button"/);
    expect(markup).toContain(" disabled");
  });

  it("gives the search input a label while hiding its decorative icon", () => {
    const markup = renderToStaticMarkup(
      createElement(SearchField, {
        id: "movie-query",
        label: "Search movies",
        theme: "dark",
      }),
    );
    expect(markup).toContain('for="movie-query"');
    expect(markup).toContain('id="movie-query"');
    expect(markup).toContain('alt=""');
    expect(markup).toContain('aria-hidden="true"');
  });

  it("uses native pressed and disabled state for a filter", () => {
    const markup = renderToStaticMarkup(
      createElement(FilterChip, {
        label: "Sci-fi",
        pressed: true,
        disabled: true,
      }),
    );
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain(" disabled");
  });

  it("labels the select-only combobox and exposes its collapsed state", () => {
    const markup = renderToStaticMarkup(
      createElement(SelectField, {
        id: "cinema",
        label: "Cinema",
        placeholder: "Choose a cinema",
        value: "",
        options: [{ value: "a", label: "Cinema A" }],
        onValueChange: () => {},
      }),
    );
    expect(markup).toContain('role="combobox"');
    expect(markup).toContain('aria-labelledby="cinema-label"');
    expect(markup).toContain('id="cinema-label"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('type="button"');
    expect(markup).toContain("Choose a cinema");
  });
});
