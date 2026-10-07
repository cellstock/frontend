"use client";
import Link from "@/components/ui/AppLink";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Globe2,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import {
  CtaSection,
  MarketingShell,
  PageHero,
} from "@/components/marketing/marketing-shell";
import { useI18n } from "@/components/i18n/language-provider";
const features = [
  [
    ShoppingBag,
    "Unified order management",
    "Review orders, customers, statuses, tracking and documents from one workspace.",
  ],
  [
    Boxes,
    "Database-backed inventory",
    "Synchronize offers, manage stock and use fast database filters and pagination.",
  ],
  [
    RefreshCw,
    "Reliable synchronization",
    "Track marketplace connections, synchronization runs and errors.",
  ],
  [
    BarChart3,
    "Operational visibility",
    "Monitor dashboard totals, recent activity and marketplace performance.",
  ],
  [
    Globe2,
    "Multilingual workspace",
    "Use CelleXa in English, French, German or Italian across desktop and mobile.",
  ],
] as const;
export default function HomePage() {
  const { t } = useI18n();
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Marketplace operations, connected"
        title="Run every marketplace workflow from one clear portal."
        description="CelleXa brings orders, inventory, connections and daily operational actions together so your team can work faster with fewer errors."
      >
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white"
          >
            {t("Create your account")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/portal-details"
            className="rounded-xl border border-white/20 px-6 py-3.5 font-bold text-white"
          >
            {t("Explore the portal")}
          </Link>
        </div>
      </PageHero>
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-blue-600">
            {t("Everything your team needs")}
          </p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            {t("Built around real marketplace operations")}
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map(([Icon, title, body]) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 p-6 shadow-sm"
              >
                <span className="inline-flex rounded-xl bg-blue-50 p-3 text-blue-600">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-bold">{t(title)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t(body)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <CtaSection />
    </MarketingShell>
  );
}
