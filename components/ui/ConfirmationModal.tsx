"use client";
import { useI18n } from "@/components/i18n/language-provider";

import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

interface ConfirmationModalProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmationModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  isConfirming = false,
  tone = "danger",
  onConfirm,
  onClose,
}: ConfirmationModalProps) {
  const { t } = useI18n();
  const titleId = useId();
  const descriptionId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isConfirming) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isConfirming, onClose]);

  if (!open) {
    return null;
  }

  const confirmButtonStyle =
    tone === "danger"
      ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-100"
      : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-100";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label={t("Close confirmation dialog")}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        disabled={isConfirming}
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
      >
        <button
          type="button"
          aria-label={t("Close dialog")}
          disabled={isConfirming}
          onClick={onClose}
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            tone === "danger"
              ? "bg-red-50 text-red-600"
              : "bg-blue-50 text-blue-600"
          }`}
        >
          <AlertTriangle className="h-6 w-6" />
        </div>

        <h2
          id={titleId}
          className="mt-5 pr-10 text-xl font-bold tracking-tight text-slate-950"
        >
          {t(title)}
        </h2>

        <div
          id={descriptionId}
          className="mt-2 text-sm leading-6 text-slate-600"
        >
          {typeof description === "string" ? t(description) : description}
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={isConfirming}
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t(cancelLabel)}
          </button>

          <button
            type="button"
            disabled={isConfirming}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${confirmButtonStyle}`}
          >
            {isConfirming && <LoaderCircle className="h-4 w-4 animate-spin" />}

            {isConfirming ? t("Please wait...") : t(confirmLabel)}
          </button>
        </div>
      </section>
    </div>
  );
}
