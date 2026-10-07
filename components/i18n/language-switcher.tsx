"use client";

import { Check, ChevronDown, Languages } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/components/i18n/language-provider";
import type { Locale } from "@/lib/i18n/locale";

const options: Array<{
  locale: Locale;
  short: string;
  name: string;
  flag: string;
}> = [
  { locale: "en", short: "EN", name: "English", flag: "🇬🇧" },
  { locale: "fr", short: "FR", name: "Français", flag: "🇫🇷" },
  { locale: "de", short: "DE", name: "Deutsch", flag: "🇩🇪" },
  { locale: "it", short: "IT", name: "Italiano", flag: "🇮🇹" },
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected =
    options.find((option) => option.locale === locale) ?? options[0];

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  function choose(nextLocale: Locale) {
    setLocale(nextLocale);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={t("Language")}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/50 focus:outline-none focus:ring-4 focus:ring-blue-100 ${open ? "border-blue-400 ring-4 ring-blue-100" : "border-slate-200"}`}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Languages aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
        <span aria-hidden="true" className="text-base leading-none">
          {selected.flag}
        </span>
        <span>{selected.short}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        id={menuId}
        aria-hidden={!open}
        className={`absolute right-0 top-12 z-[80] w-56 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 transition-all duration-200 ease-out ${open ? "visible translate-y-0 scale-100 opacity-100" : "pointer-events-none invisible -translate-y-2 scale-95 opacity-0"}`}
      >
        <div className="px-3 pb-2 pt-1">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">
            {t("Choose language")}
          </p>
        </div>
        <div className="grid gap-1">
          {options.map((option) => {
            const active = option.locale === locale;
            return (
              <button
                key={option.locale}
                type="button"
                lang={option.locale}
                onClick={() => choose(option.locale)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
              >
                <span className="text-xl leading-none">{option.flag}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{option.name}</span>
                  <span className="block text-xs text-slate-400">
                    {option.short}
                  </span>
                </span>
                {active && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
