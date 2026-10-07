"use client";
import { useI18n } from "@/components/i18n/language-provider";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatisticCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  change?: number;
  attention?: boolean;
}

export function StatisticCard({
  title,
  value,
  description,
  icon: Icon,
  iconClassName,
  change,
  attention = false,
}: StatisticCardProps) {
  const { t } = useI18n();
  const isPositive = change !== undefined && change >= 0;

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClassName}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        {change !== undefined && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
              isPositive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {Math.abs(change)}%
          </span>
        )}

        {attention && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            {t("Attention")}
          </span>
        )}
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">{t(title)}</p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-400">{t(description)}</p>
    </article>
  );
}
