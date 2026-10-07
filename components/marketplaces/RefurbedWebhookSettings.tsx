"use client";

import {
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Link2,
  LoaderCircle,
  Send,
  Webhook,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  generateMarketplaceWebhook,
  getMarketplaceWebhook,
  MarketplaceApiError,
  requestMarketplaceWebhookActivation,
  type MarketplaceWebhookDetails,
} from "@/lib/api/marketplaces";

const statusContent = {
  not_requested: ["Not configured", "bg-slate-100 text-slate-600"],
  generated: ["URL generated", "bg-violet-50 text-violet-700"],
  pending: ["Sending request", "bg-amber-50 text-amber-700"],
  requested: ["Activation requested", "bg-blue-50 text-blue-700"],
  active: ["Active", "bg-emerald-50 text-emerald-700"],
  failed: ["Request failed", "bg-red-50 text-red-700"],
} as const;

export function RefurbedWebhookSettings({ slug }: { slug: string }) {
  const [details, setDetails] = useState<MarketplaceWebhookDetails | null>(
    null,
  );
  const [busy, setBusy] = useState<"generate" | "request" | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMarketplaceWebhook(slug)
      .then((response) => setDetails(response.data))
      .catch((caught) => setError(getErrorMessage(caught)))
      .finally(() => setLoading(false));
  }, [slug]);

  async function generateUrl() {
    setBusy("generate");
    setError("");

    try {
      const response = await generateMarketplaceWebhook(slug);
      setDetails(response.data);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function requestActivation() {
    setBusy("request");
    setError("");

    try {
      const response = await requestMarketplaceWebhookActivation(slug);
      setDetails(response.data);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function copyUrl() {
    if (!details?.notification_url) {
      return;
    }

    await navigator.clipboard.writeText(details.notification_url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const status = details
    ? statusContent[details.status]
    : statusContent.not_requested;
  const requestSent =
    details?.status === "pending" ||
    details?.status === "requested" ||
    details?.status === "active";

  return (
    <section aria-labelledby="instant-order-notifications">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-blue-50 p-2 text-blue-600">
            <Webhook className="h-5 w-5" />
          </span>
          <div>
            <h2
              id="instant-order-notifications"
              className="text-lg font-bold text-slate-950"
            >
              Instant order notifications
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Generate a secure notification URL, then ask Refurbed to activate
              it for this account.
            </p>
          </div>
        </div>

        {!loading && (
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status[1]}`}
          >
            {status[0]}
          </span>
        )}
      </div>

      {loading ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading settings...
        </p>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Link2 className="h-5 w-5 text-blue-600" />
              1. Generate notification URL
            </div>

            {details?.notification_url ? (
              <div className="mt-4 flex gap-2">
                <input
                  readOnly
                  value={details.notification_url}
                  aria-label="Notification URL"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => void copyUrl()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void generateUrl()}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy === "generate" && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Generate URL
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Send className="h-5 w-5 text-blue-600" />
              2. Request activation
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              CelleXa sends the account details and generated URL to Refurbed.
            </p>

            <button
              type="button"
              disabled={
                busy !== null ||
                !details?.notification_url ||
                !details.manages_orders ||
                requestSent
              }
              onClick={() => void requestActivation()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-600 px-5 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
            >
              {busy === "request" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : requestSent ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Clock3 className="h-4 w-4" />
              )}
              {requestSent ? "Request sent" : "Send request to Refurbed"}
            </button>

            {!details?.manages_orders && (
              <p className="mt-3 text-xs text-slate-500">
                Enable Manage orders for at least one locale before sending the
                request.
              </p>
            )}
          </div>
        </div>
      )}

      {details?.last_received_at && (
        <p className="mt-4 text-xs text-slate-500">
          Last notification: {formatDate(details.last_received_at)}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof MarketplaceApiError
    ? error.message
    : "Unable to update the notification settings.";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
