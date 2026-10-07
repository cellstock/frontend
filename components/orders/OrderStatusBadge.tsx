"use client";
import { useI18n } from "@/components/i18n/language-provider";
import {
  Ban,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  RotateCcw,
  Truck,
} from "lucide-react";

interface OrderStatusBadgeProps {
  status: string;
}

interface StatusConfiguration {
  label: string;
  className: string;
  icon: typeof CheckCircle2;
}

const statusConfigurations: Record<string, StatusConfiguration> = {
  new: {
    label: "New",
    className: "bg-blue-50 text-blue-700 ring-blue-600/20",
    icon: Clock3,
  },
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 ring-amber-600/20",
    icon: Clock3,
  },
  paid: {
    label: "Paid",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    icon: CircleDollarSign,
  },
  processing: {
    label: "Processing",
    className: "bg-violet-50 text-violet-700 ring-violet-600/20",
    icon: PackageCheck,
  },
  shipped: {
    label: "Shipped",
    className: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    icon: CheckCircle2,
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 ring-red-600/20",
    icon: Ban,
  },
  canceled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 ring-red-600/20",
    icon: Ban,
  },
  refunded: {
    label: "Refunded",
    className: "bg-slate-100 text-slate-700 ring-slate-600/20",
    icon: RotateCcw,
  },
};

function formatUnknownStatus(status: string): string {
  return status
    .trim()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const { t } = useI18n();
  const normalizedStatus = status.trim().toLowerCase();

  const configuration = statusConfigurations[normalizedStatus];

  const Icon = configuration?.icon ?? Clock3;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        configuration?.className ??
        "bg-slate-100 text-slate-700 ring-slate-600/20"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />

      {t(configuration?.label || formatUnknownStatus(status) || "Unknown")}
    </span>
  );
}
