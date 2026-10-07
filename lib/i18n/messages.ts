import catalog from "@/lib/i18n/catalog.json";
import type { Locale } from "@/lib/i18n/locale";

const dictionary: Record<string, string[]> = catalog;
const positions = { fr: 0, de: 1, it: 2 } as const;

export function translate(
  locale: Locale,
  message: string,
  values: Record<string, string | number> = {},
): string {
  const translated =
    locale === "en"
      ? message
      : (dictionary[message]?.[positions[locale]] ?? message);
  return translated.replace(/\{(\w+)\}/g, (match, key: string) =>
    values[key] === undefined ? match : String(values[key]),
  );
}
