import { translate } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/locale";
export function formatOrderCurrency(
  amount: string | number,
  currency: string,
  locale: Locale = "en",
): string {
  const numericAmount =
    typeof amount === "number" ? amount : Number.parseFloat(amount);

  if (!Number.isFinite(numericAmount)) {
    return `${amount} ${currency}`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${numericAmount.toFixed(2)} ${currency}`;
  }
}

export function formatOrderDateTime(
  value: string | null,
  locale: Locale = "en",
): string {
  if (!value) {
    return translate(locale, "Not available");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return translate(locale, "Not available");
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatOrderDate(
  value: string | null,
  locale: Locale = "en",
): string {
  if (!value) {
    return translate(locale, "Not available");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return translate(locale, "Not available");
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(date);
}

export function formatCountryCode(value: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return "—";
  }

  const segments = normalizedValue.split("-");

  return segments[segments.length - 1].toUpperCase();
}

export function formatPaymentMethod(
  value: string | null,
  locale: Locale = "en",
): string {
  if (!value) {
    return translate(locale, "Not available");
  }

  return value
    .trim()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
