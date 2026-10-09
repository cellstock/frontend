"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";

const LanguageContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (message: string, values?: Record<string, string | number>) => string;
} | null>(null);

function readLocale() {
  const cookie = document.cookie
    .split("; ")
    .find((value) => value.startsWith(LOCALE_COOKIE + "="));
  return normalizeLocale(cookie?.slice(LOCALE_COOKIE.length + 1));
}
function subscribeLocale(notify: () => void) {
  window.addEventListener("cellexa:locale-changed", notify);
  return () => window.removeEventListener("cellexa:locale-changed", notify);
}

export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    readLocale,
    () => initialLocale,
  );
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const setLocale = useCallback((next: Locale) => {
    const selected = normalizeLocale(next);
    document.cookie = `${LOCALE_COOKIE}=${selected}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    window.dispatchEvent(new Event("cellexa:locale-changed"));
  }, []);
  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (message: string, values?: Record<string, string | number>) =>
        translate(locale, message, values),
    }),
    [locale, setLocale],
  );
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("LanguageProvider is required.");
  return value;
}
