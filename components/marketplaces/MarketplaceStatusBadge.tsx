"use client";
import { useI18n } from "@/components/i18n/language-provider";
import {
  AlertCircle,
  CheckCircle2,
  CircleOff,
  LoaderCircle,
} from "lucide-react";

import type {
  MarketplaceConnectionStatus,
  SyncStatus,
} from "@/types/marketplace";

type Status = MarketplaceConnectionStatus | SyncStatus | "available";

interface MarketplaceStatusBadgeProps {
  status: Status;
  label?: string;
}

const statusStyles: Record<Status, string> = {
  available: "bg-slate-100 text-slate-700 ring-slate-600/15",
  connected: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  disconnected: "bg-slate-100 text-slate-700 ring-slate-600/15",
  testing: "bg-blue-50 text-blue-700 ring-blue-600/20",
  failed: "bg-red-50 text-red-700 ring-red-600/20",
  queued: "bg-amber-50 text-amber-700 ring-amber-600/20",
  running: "bg-blue-50 text-blue-700 ring-blue-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

const defaultLabels: Record<Status, string> = {
  available: "Available",
  connected: "Connected",
  disconnected: "Disconnected",
  testing: "Testing",
  failed: "Connection failed",
  queued: "Queued",
  running: "Running",
  completed: "Completed",
};

function StatusIcon({ status }: { status: Status }) {
  if (status === "connected" || status === "completed") {
    return <CheckCircle2 className="h-3.5 w-3.5" />;
  }

  if (status === "testing" || status === "queued" || status === "running") {
    return (
      <LoaderCircle
        className={`h-3.5 w-3.5 ${
          status === "testing" || status === "running" ? "animate-spin" : ""
        }`}
      />
    );
  }

  if (status === "failed") {
    return <AlertCircle className="h-3.5 w-3.5" />;
  }

  return <CircleOff className="h-3.5 w-3.5" />;
}

export function MarketplaceStatusBadge({
  status,
  label,
}: MarketplaceStatusBadgeProps) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        statusStyles[status]
      }`}
    >
      <StatusIcon status={status} />
      {t(label ?? defaultLabels[status])}
    </span>
  );
}
