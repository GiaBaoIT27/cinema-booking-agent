"use client";
import { useDictionary, usePreferences } from "./provider";
export function PreferenceControls() {
  const { preferences, setLocale, setTheme } = usePreferences();
  const { preferences: labels } = useDictionary();
  return <div className="preference-controls" aria-label={labels.theme + " / " + labels.language}>
    <div className="preference-item"><span>{labels.theme}</span><div className="preference-group" role="group" aria-label={labels.theme}>
      <button type="button" aria-pressed={preferences.theme === "light"} onClick={() => setTheme("light")}>{labels.light}</button>
      <button type="button" aria-pressed={preferences.theme === "dark"} onClick={() => setTheme("dark")}>{labels.dark}</button>
    </div></div>
    <div className="preference-item"><span>{labels.language}</span><div className="preference-group" role="group" aria-label={labels.language}>
      <button type="button" aria-pressed={preferences.locale === "vi"} onClick={() => setLocale("vi")}>{labels.vietnamese}</button>
      <button type="button" aria-pressed={preferences.locale === "en"} onClick={() => setLocale("en")}>{labels.english}</button>
    </div></div>
  </div>;
}
