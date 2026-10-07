"use client";
import Link from "@/components/ui/AppLink";
import { Check } from "lucide-react";
import {
  MarketingShell,
  PageHero,
} from "@/components/marketing/marketing-shell";
import { useI18n } from "@/components/i18n/language-provider";
const plans = [
  {
    name: "Starter",
    price: "€29",
    features: [
      "1 marketplace connection",
      "Order and inventory synchronization",
      "Core exports and documents",
    ],
  },
  {
    name: "Growth",
    price: "€79",
    featured: true,
    features: [
      "Multiple marketplace connections",
      "Advanced order and inventory tools",
      "Priority synchronization and support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    features: [
      "Custom marketplace scope",
      "Team and workflow configuration",
      "Dedicated onboarding and support",
    ],
  },
];
export default function PlansPage() {
  const { t } = useI18n();
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Plans and pricing"
        title="Choose a plan that grows with your marketplace operation."
        description="Clear plans for teams moving from manual portal work to connected, database-backed operations."
      />
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-3xl border p-7 ${plan.featured ? "border-blue-500 shadow-2xl shadow-blue-600/15" : "border-slate-200"}`}
            >
              <h2 className="text-xl font-bold">{t(plan.name)}</h2>
              <p className="mt-5 text-4xl font-black">
                {plan.price}
                {plan.price.startsWith("€") && (
                  <span className="text-sm font-medium text-slate-500">
                    {t(" / month")}
                  </span>
                )}
              </p>
              <ul className="mt-7 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm">
                    <Check className="h-5 w-5 text-emerald-600" />
                    {t(feature)}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.name === "Enterprise" ? "/contact" : "/signup"}
                className={`mt-8 block rounded-xl px-5 py-3 text-center font-bold ${plan.featured ? "bg-blue-600 text-white" : "border border-blue-500 text-blue-700"}`}
              >
                {t(
                  plan.name === "Enterprise" ? "Contact sales" : "Get started",
                )}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
