"use client";
import { Boxes, ShieldCheck, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/components/i18n/language-provider";
import { MarketingShell } from "@/components/marketing/marketing-shell";

const benefits = [
  [
    ShoppingBag,
    "Unified orders",
    "Manage marketplace orders from one secure workspace.",
  ],
  [
    Boxes,
    "Synchronized inventory",
    "Keep offers and stock organized with database-backed synchronization.",
  ],
  [
    ShieldCheck,
    "Secure account access",
    "Use protected authentication to access your operational data.",
  ],
] as const;

export function AuthPageLayout({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <MarketingShell>
      <main className="relative overflow-hidden bg-slate-50 px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_15%_10%,#2563eb20,transparent_38%),radial-gradient(circle_at_85%_30%,#4f46e520,transparent_35%)]" />
        <div className="relative mx-auto grid max-w-7xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40 lg:grid-cols-[1.05fr_.95fr]">
          <section className="relative overflow-hidden bg-slate-950 p-7 text-white sm:p-10 lg:p-14">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,#2563eb55,transparent_38%),radial-gradient(circle_at_90%_90%,#4f46e544,transparent_40%)]" />
            <div className="relative">
              <p className="text-sm font-bold uppercase tracking-[.18em] text-blue-300">
                {t("Cellexa Marketplace Hub")}
              </p>
              <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                {t("One workspace for every marketplace operation.")}
              </h1>
              <p className="mt-5 max-w-xl leading-7 text-slate-300">
                {t(
                  "Manage orders, inventory, connections and daily workflows with a portal designed for speed and clarity.",
                )}
              </p>
              <div className="mt-9 grid gap-4">
                {benefits.map(([Icon, benefitTitle, body]) => (
                  <div
                    key={benefitTitle}
                    className="flex gap-4 rounded-2xl border border-white/10 bg-white/[.05] p-4"
                  >
                    <span className="h-fit rounded-xl bg-blue-500/15 p-2.5 text-blue-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="font-bold">{t(benefitTitle)}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {t(body)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="flex items-center p-6 sm:p-10 lg:p-14">
            <div className="w-full">
              <p className="text-sm font-bold uppercase tracking-[.16em] text-blue-600">
                {t(eyebrow)}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {t(title)}
              </h2>
              <p className="mb-8 mt-3 text-sm leading-6 text-slate-500">
                {t(description)}
              </p>
              {children}
              <div className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="h-4 w-4" />
                {t("Protected and secure access")}
              </div>
            </div>
          </section>
        </div>
      </main>
    </MarketingShell>
  );
}
