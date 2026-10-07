export const locales = ["en", "fr", "de", "it"] as const;
export type Locale = (typeof locales)[number];
export const LOCALE_COOKIE = "cellexa_locale";
export function normalizeLocale(value: unknown): Locale {
  return typeof value === "string" && locales.includes(value as Locale)
    ? (value as Locale)
    : "en";
}
