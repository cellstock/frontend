"use client";

import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getSynchronizationIssues,
  retrySynchronizationIssue,
  SynchronizationIssue,
} from "@/lib/api/synchronization-issues";

const kindLabels = {
  sync_run: "Data synchronization",
  merchant_address: "Merchant address",
  connection: "Marketplace connection",
};

export function SynchronizationIssuesPage() {
  const [issues, setIssues] = useState<SynchronizationIssue[]>([]);
  const [marketplace, setMarketplace] = useState("");
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await getSynchronizationIssues();
      setIssues(response.data.issues);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load synchronization issues.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const marketplaces = [
    ...new Set(issues.map((issue) => issue.marketplace)),
  ].sort();
  const visibleIssues = useMemo(
    () =>
      issues.filter(
        (issue) => !marketplace || issue.marketplace === marketplace,
      ),
    [issues, marketplace],
  );

  async function retry(issue: SynchronizationIssue) {
    setRetrying(issue.id);
    setError("");
    setMessage("");
    try {
      const response = await retrySynchronizationIssue(issue.id);
      setMessage(response.message);
      setIssues((current) => current.filter((item) => item.id !== issue.id));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to queue the retry.",
      );
    } finally {
      setRetrying("");
    }
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Marketplace monitoring
          </div>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Synchronization issues
          </h1>
          <p className="mt-2 text-slate-600">
            Review marketplace failures and safely retry background operations.
          </p>
        </div>
        <select
          value={marketplace}
          onChange={(event) => setMarketplace(event.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3"
        >
          <option value="">All marketplaces</option>
          {marketplaces.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </header>

      {message && (
        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? null : visibleIssues.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-bold text-slate-900">
              Everything is synchronized
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              No marketplace failures need your attention.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleIssues.map((issue) => (
              <article
                key={issue.id}
                className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center"
              >
                <div className="flex min-w-0 flex-1 gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-slate-900">
                        {issue.title}
                      </h2>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {kindLabels[issue.kind]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-blue-700">
                      {issue.marketplace}
                      {issue.account ? ` · ${issue.account}` : ""}
                    </p>
                    <p className="mt-2 break-words text-sm text-red-700">
                      {friendlyMessage(issue.message)}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Failed {formatDate(issue.occurred_at)}
                    </p>
                  </div>
                </div>
                <button
                  disabled={Boolean(retrying)}
                  onClick={() => void retry(issue)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                >
                  {retrying === issue.id ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Retry synchronization
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function friendlyMessage(message: string) {
  const text = message.trim();
  if (!text) return "The marketplace did not complete this synchronization.";
  if (text.toLowerCase().includes("unauth"))
    return "The marketplace credentials were rejected. Reconnect the marketplace and retry.";
  if (text.toLowerCase().includes("rate"))
    return "The marketplace request limit was reached. Wait briefly and retry.";
  return text;
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "recently";
}
