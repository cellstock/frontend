"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CellexaLogo } from "@/components/branding/cellexa-logo";
import { useI18n } from "@/components/i18n/language-provider";

export function FullScreenTransition({
  title = "Signing you out",
  description = "Please wait while we securely close your session.",
}: {
  title?: string;
  description?: string;
}) {
  const { t } = useI18n();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex h-dvh w-screen items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[3px]"
      role="status"
      aria-live="assertive"
      aria-label={t(title)}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/20 bg-white/95 p-7 text-center shadow-2xl shadow-slate-950/40 sm:p-9">
        <div className="flex justify-center">
          <CellexaLogo theme="light" />
        </div>
        <div className="relative mx-auto mt-8 h-20 w-20">
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-blue-100 border-r-indigo-500 border-t-blue-600 motion-reduce:animate-none" />
          <div className="absolute inset-2 animate-[spin_1.6s_linear_infinite_reverse] rounded-full border-2 border-transparent border-b-cyan-400 border-l-blue-300 motion-reduce:animate-none" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/30">
              <Sparkles className="h-5 w-5" />
            </span>
          </div>
        </div>
        <h2 className="mt-6 text-xl font-bold text-slate-900">{t(title)}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {t(description)}
        </p>
      </div>
    </div>,
    document.body,
  );
}
