"use client";
import { CheckCircle2, Target, Users } from "lucide-react";
import {
  CtaSection,
  MarketingShell,
  PageHero,
} from "@/components/marketing/marketing-shell";
import { useI18n } from "@/components/i18n/language-provider";
export default function AboutPage() {
  const { t } = useI18n();
  const values = [
    [
      Target,
      "Focused operations",
      "Tools organized around the work marketplace teams complete every day.",
    ],
    [
      Users,
      "Team-ready",
      "A shared portal gives staff and managers consistent data and workflows.",
    ],
    [
      CheckCircle2,
      "Reliable by design",
      "Local storage, synchronization records and validation make work easier to verify.",
    ],
  ] as const;
  return (
    <MarketingShell>
      <PageHero
        eyebrow="About CelleXa"
        title="Marketplace management designed around the people doing the work."
        description="CelleXa helps commerce teams replace repetitive portal switching with one dependable operational workspace."
      />
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">{t("Our purpose")}</h2>
            <p className="mt-5 leading-8 text-slate-600">
              {t(
                "Marketplace teams manage complex data across orders, offers, shipping, customers and reporting. CelleXa organizes those workflows into one clear system while keeping marketplace data synchronized.",
              )}
            </p>
            <p className="mt-4 leading-8 text-slate-600">
              {t(
                "The portal is built for practical daily use with fast navigation, responsive pages, clear errors and local database reliability.",
              )}
            </p>
          </div>
          <div className="grid gap-4">
            {values.map(([Icon, title, body]) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 p-6"
              >
                <Icon className="h-6 w-6 text-blue-600" />
                <h3 className="mt-4 font-bold">{t(title)}</h3>
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
