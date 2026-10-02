import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { useDictionary, usePreferences } from "@/features/preferences/provider";
import { formatShowtime } from "@/features/preferences/dictionary";
import { useState, type Dispatch } from "react";
import type { CatalogAdapter, QuickSelection, HomeIntent } from "./model";
import type { reduceQuickSelection } from "./quick-selection";

export function QuickBooking({ adapter, selection, dispatchQuick, openIntent }: { adapter: CatalogAdapter; selection: QuickSelection; dispatchQuick: Dispatch<Parameters<typeof reduceQuickSelection>[1]>; openIntent(intent: HomeIntent): void }) {
 const d = useDictionary();
 const { preferences } = usePreferences();
 const [quickError, setQuickError] = useState(false);
 const options = adapter.getQuickOptions(selection);
 const resolved = adapter.resolveQuickSelection(selection);
 const noOptions = Boolean(selection.cinemaId && options.movies.length === 0);
 return <><form className="quick-booking" aria-labelledby="quick-title" onSubmit={(event) => {
        event.preventDefault();
        const showtime = adapter.resolveQuickSelection(selection);
        if (!showtime) { setQuickError(true); return; }
        setQuickError(false); openIntent({ kind: "seat-selection", showtime });
      }}>
        <div className="quick-intro"><h2 id="quick-title" className="text-quick-title">{d.home.quickBooking}</h2><p className="text-quick-intro">{d.home.quickIntro}</p></div>
        <SelectField id="quick-cinema" label={d.home.cinema} placeholder={d.home.notSelected} value={selection.cinemaId ?? ""} options={options.cinemas.map((c) => ({ value: c.id, label: c.name }))} onChange={(e) => { setQuickError(false); dispatchQuick({ type: "cinema", value: e.target.value || null }); }} />
        <SelectField id="quick-movie" label={d.home.movie} placeholder={d.home.notSelected} value={selection.movieId ?? ""} disabled={!selection.cinemaId || !options.movies.length} options={options.movies.map((m) => ({ value: m.id, label: m.title }))} onChange={(e) => dispatchQuick({ type: "movie", value: e.target.value || null })} />
        <SelectField id="quick-date" label={d.home.date} placeholder={d.home.notSelected} value={selection.date ?? ""} disabled={!selection.movieId || !options.dates.length} options={options.dates.map((date) => ({ value: date, label: formatShowtime(date, "12:00", preferences.locale).split(" · ")[0] }))} onChange={(e) => dispatchQuick({ type: "date", value: e.target.value || null })} />
        <SelectField id="quick-showtime" label={d.home.showtime} placeholder={d.home.notSelected} value={selection.showtimeId ?? ""} disabled={!selection.date || !options.showtimes.length} options={options.showtimes.map((s) => ({ value: s.id, label: formatShowtime(s.date, s.time, preferences.locale).split(" · ")[1] }))} onChange={(e) => dispatchQuick({ type: "showtime", value: e.target.value || null })} />
        <Button type="submit" data-testid="quick-submit" disabled={!resolved}>{d.home.bookNow}</Button>
      </form>
      <div className="quick-helper"><p>{d.home.quickHelper}</p>{(noOptions || quickError) && <p role="status">{quickError ? d.home.invalidTuple : d.home.noShowtimes}</p>}</div>
</>;
}
