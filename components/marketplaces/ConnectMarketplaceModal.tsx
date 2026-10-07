"use client";
import { useI18n } from "@/components/i18n/language-provider";

import { PlugZap, ShieldCheck, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { ConnectionSettingsForm } from "@/components/marketplaces/ConnectionSettingsForm";
import { connectMarketplace } from "@/lib/api/marketplaces";
import type { Marketplace, MarketplaceFormValues } from "@/types/marketplace";

interface ConnectMarketplaceModalProps {
  open: boolean;
  marketplace: Marketplace;
  onClose: () => void;
  onConnected: (message: string) => Promise<void> | void;
}

export function ConnectMarketplaceModal({
  open,
  marketplace,
  onClose,
  onConnected,
}: ConnectMarketplaceModalProps) {
  const { t } = useI18n();
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isSubmitting, onClose]);

  if (!open) {
    return null;
  }

  function handleClose() {
    if (!isSubmitting) {
      onClose();
    }
  }

  async function handleConnect(values: MarketplaceFormValues) {
    setIsSubmitting(true);

    try {
      const response = await connectMarketplace(marketplace.slug, {
        account_name: values.account_name,
        credentials: {
          api_key: values.api_key,
        },
        settings: values.settings,
      });

      await onConnected(
        response.message || `${marketplace.name} connected successfully.`,
      );

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label={t("Close marketplace setup dialog")}
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
        disabled={isSubmitting}
        onClick={handleClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur sm:px-7">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <PlugZap className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h2
                id={titleId}
                className="truncate text-xl font-bold tracking-tight text-slate-950"
              >
                {t("Connect")}
                {marketplace.name}
              </h2>

              <p
                id={descriptionId}
                className="mt-1 text-sm leading-6 text-slate-500"
              >
                {t(
                  "Configure the marketplace account and choose what CelleXa should synchronize.",
                )}
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            aria-label={t("Close dialog")}
            disabled={isSubmitting}
            onClick={handleClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6 sm:px-7">
          <div className="mb-6 flex gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3.5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

            <div>
              <p className="text-sm font-semibold text-blue-900">
                {t("Secure credential handling")}
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                {t(
                  "The API key is sent through the secure CelleXa server proxy. It is never stored in browser storage or displayed after connection.",
                )}
              </p>
            </div>
          </div>

          <ConnectionSettingsForm
            mode="connect"
            marketplaceSlug={marketplace.slug}
            capabilities={marketplace.capabilities}
            initialSettings={{
              sync_orders: marketplace.capabilities.includes("orders"),
              sync_products: marketplace.capabilities.includes("products"),
              sync_inventory: false,
            }}
            onCancel={handleClose}
            onSubmit={handleConnect}
          />
        </div>
      </section>
    </div>
  );
}
