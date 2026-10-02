"use client";

import { useDictionary, usePreferences } from "./provider";
import { Button } from "../../components/ui/button";

export function PreferenceControls() {
  const { preferences, setLocale, setTheme } = usePreferences();
  const { preferences: labels } = useDictionary();

  return <div className="preference-controls" aria-label={labels.language + " / " + labels.theme}>
    <div className="preference-group" role="group" aria-label={labels.language}>
      <Button variant="tertiary" aria-pressed={preferences.locale === "vi"} onClick={() => setLocale("vi")}>{labels.vietnamese}</Button>
      <Button variant="tertiary" aria-pressed={preferences.locale === "en"} onClick={() => setLocale("en")}>{labels.english}</Button>
    </div>
    <div className="preference-group" role="group" aria-label={labels.theme}>
      <Button variant="tertiary" aria-pressed={preferences.theme === "light"} onClick={() => setTheme("light")}>{labels.light}</Button>
      <Button variant="tertiary" aria-pressed={preferences.theme === "dark"} onClick={() => setTheme("dark")}>{labels.dark}</Button>
    </div>
  </div>;
}
