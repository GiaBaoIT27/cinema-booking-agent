import { expect, test } from "vitest";
import {
  parsePreferences,
  serializePreferenceCookie,
} from "../../../../src/features/preferences/model";

test("invalid locale preserves a valid dark theme", () => {
  expect(parsePreferences({ mba_locale: "xx", mba_theme: "dark" })).toEqual({
    locale: "vi",
    theme: "dark",
  });
});

test("invalid theme preserves a valid English locale", () => {
  expect(parsePreferences({ mba_locale: "en", mba_theme: "sepia" })).toEqual({
    locale: "en",
    theme: "light",
  });
});

test("missing cookies use Vietnamese and light mode", () => {
  expect(parsePreferences({})).toEqual({ locale: "vi", theme: "light" });
});

test("preference cookies are scoped for one year and secure only on HTTPS", () => {
  const value = serializePreferenceCookie("mba_locale", "en", true);
  expect(value).toContain("mba_locale=en");
  expect(value).toContain("Max-Age=31536000");
  expect(value).toContain("Path=/");
  expect(value).toContain("SameSite=Lax");
  expect(value).toContain("Secure");
  expect(serializePreferenceCookie("mba_theme", "dark", false)).not.toContain(
    "Secure",
  );
});
