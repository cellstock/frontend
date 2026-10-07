"use client";
import { useI18n } from "@/components/i18n/language-provider";

import {
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  LoaderCircle,
} from "lucide-react";
import { useState } from "react";

import {
  MarketplaceApiError,
  testMarketplaceConnection,
} from "@/lib/api/marketplaces";

interface TestConnectionButtonProps {
  slug: string;
  disabled?: boolean;
  onCompleted?: (message: string) => Promise<void> | void;
}

export function TestConnectionButton({
  slug,
  disabled = false,
  onCompleted,
}: TestConnectionButtonProps) {
  const { t } = useI18n();
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleTest() {
    if (isTesting) {
      return;
    }

    setIsTesting(true);
    setFeedback(null);

    try {
      const response = await testMarketplaceConnection(slug);

      if (!response.success) {
        setFeedback({
          type: "error",
          message: response.message || "The connection test failed.",
        });

        return;
      }

      const message = response.message || "Connection tested successfully.";

      setFeedback({
        type: "success",
        message,
      });

      await onCompleted?.(message);
    } catch (error: unknown) {
      setFeedback({
        type: "error",
        message:
          error instanceof MarketplaceApiError
            ? error.message
            : "Unable to test the marketplace connection.",
      });

      await onCompleted?.("Connection test completed.");
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled || isTesting}
        onClick={() => void handleTest()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isTesting ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <FlaskConical className="h-4 w-4" />
        )}

        {isTesting ? t("Testing connection...") : t("Test connection")}
      </button>

      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`mt-3 flex gap-2 rounded-xl px-3 py-2.5 text-sm ${
            feedback.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}

          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
}
