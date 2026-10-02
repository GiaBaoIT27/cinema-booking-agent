export type Locale = "vi" | "en";
export type Theme = "light" | "dark";
export type Preferences = { locale: Locale; theme: Theme };

export const DEFAULT_PREFERENCES: Preferences = { locale: "vi", theme: "light" };

export function parsePreferences(values: {
  mba_locale?: string;
  mba_theme?: string;
}): Preferences {
  return {
    locale: values.mba_locale === "en" ? "en" : "vi",
    theme: values.mba_theme === "dark" ? "dark" : "light",
  };
}

export function serializePreferenceCookie(key: "mba_locale", value: Locale, secure: boolean): string;
export function serializePreferenceCookie(key: "mba_theme", value: Theme, secure: boolean): string;
export function serializePreferenceCookie(key: "mba_locale" | "mba_theme", value: Locale | Theme, secure: boolean): string {
  return `${key}=${value}; Max-Age=31536000; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
}
