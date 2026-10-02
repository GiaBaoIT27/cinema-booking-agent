"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getDictionary } from "./dictionary";
import { serializePreferenceCookie, type Locale, type Preferences, type Theme } from "./model";

type PreferenceContextValue = {
  preferences: Preferences;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
};

const PreferenceContext = createContext<PreferenceContextValue | null>(null);

export function PreferenceProvider({ initial, children }: { initial: Preferences; children: ReactNode }) {
  const [preferences, setPreferences] = useState(initial);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = preferences.locale;
    root.dataset.theme = preferences.theme;
    root.style.colorScheme = preferences.theme;
  }, [preferences]);

  const persist = (key: "mba_locale" | "mba_theme", value: Locale | Theme) => {
    try {
      const secure = window.location.protocol === "https:";
      document.cookie = key === "mba_locale"
        ? serializePreferenceCookie(key, value as Locale, secure)
        : serializePreferenceCookie(key, value as Theme, secure);
    } catch {
      // The preference remains usable for this page even when storage is blocked.
    }
  };

  const setLocale = (locale: Locale) => {
    setPreferences((current) => ({ ...current, locale }));
    persist("mba_locale", locale);
  };
  const setTheme = (theme: Theme) => {
    setPreferences((current) => ({ ...current, theme }));
    persist("mba_theme", theme);
  };

  return <PreferenceContext.Provider value={{ preferences, setLocale, setTheme }}>{children}</PreferenceContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferenceContext);
  if (!context) throw new Error("usePreferences must be used within PreferenceProvider");
  return context;
}

export function useDictionary() {
  return getDictionary(usePreferences().preferences.locale);
}
