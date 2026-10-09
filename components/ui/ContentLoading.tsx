"use client";

import { useI18n } from "@/components/i18n/language-provider";

export function ContentLoading({
  label = "Loading content",
}: {
  label?: string;
}) {
  const { t } = useI18n();
  return (
    <p role="status" className="px-6 py-8 text-sm text-slate-500">
      {t(label)}
    </p>
  );
}
