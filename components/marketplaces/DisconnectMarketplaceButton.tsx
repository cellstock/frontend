"use client";
import { useI18n } from "@/components/i18n/language-provider";

import { AlertCircle, LoaderCircle, Unplug } from "lucide-react";
import { useState } from "react";

import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import {
  disconnectMarketplace,
  MarketplaceApiError,
} from "@/lib/api/marketplaces";

interface DisconnectMarketplaceButtonProps {
  slug: string;
  marketplaceName: string;
  disabled?: boolean;
  onDisconnected: (message: string) => Promise<void> | void;
}

export function DisconnectMarketplaceButton({
  slug,
  marketplaceName,
  disabled = false,
  onDisconnected,
}: DisconnectMarketplaceButtonProps) {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const [error, setError] = useState("");

  async function handleDisconnect() {
    if (isDisconnecting) {
      return;
    }

    setIsDisconnecting(true);
    setError("");

    try {
      const response = await disconnectMarketplace(slug);

      setIsModalOpen(false);

      await onDisconnected(
        response.message || `${marketplaceName} disconnected successfully.`,
      );
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof MarketplaceApiError
          ? caughtError.message
          : "Unable to disconnect the marketplace.",
      );

      setIsModalOpen(false);
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || isDisconnecting}
        onClick={() => {
          setError("");
          setIsModalOpen(true);
        }}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isDisconnecting ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Unplug className="h-4 w-4" />
        )}

        {isDisconnecting ? t("Disconnecting...") : t("Disconnect")}
      </button>

      {error && (
        <div
          role="alert"
          className="mt-3 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <ConfirmationModal
        open={isModalOpen}
        title={`Disconnect ${marketplaceName}?`}
        description={
          <>
            {t(
              "CelleXa will stop synchronizing this marketplace. The saved connection credentials and settings will be removed. This action does not delete data from the marketplace itself.",
            )}
          </>
        }
        confirmLabel={t("Disconnect marketplace")}
        isConfirming={isDisconnecting}
        tone="danger"
        onClose={() => {
          if (!isDisconnecting) {
            setIsModalOpen(false);
          }
        }}
        onConfirm={() => void handleDisconnect()}
      />
    </>
  );
}
