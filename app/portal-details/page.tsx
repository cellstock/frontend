"use client";
import {
  CtaSection,
  MarketingShell,
  PageHero,
} from "@/components/marketing/marketing-shell";
import { useI18n } from "@/components/i18n/language-provider";
const modules = [
  [
    "Dashboard",
    "Real totals, recent orders, marketplace links and synchronization visibility.",
  ],
  [
    "Orders",
    "Filters, customer addresses, status updates, tracking, PDFs, comments and buyer emails.",
  ],
  [
    "Inventory",
    "Database-backed offers with synchronization, search, filters, pagination, imports and exports.",
  ],
  [
    "Marketplaces",
    "Secure connections, selectable countries, sync settings and connection testing.",
  ],
  ["Analytics", "A structured area for sales and operational reporting."],
  ["Settings", "Seller, order, push and marketplace connection preferences."],
];
export default function PortalDetailsPage() {
  const { t } = useI18n();
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Portal details"
        title="A complete workspace for connected marketplace operations."
        description="Explore the functions available in CelleXa and how they support work from connection through fulfillment."
      />
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-3">
          {modules.map(([title, body], i) => (
            <article
              key={title}
              className="rounded-2xl border border-slate-200 p-6"
            >
              <span className="text-sm font-black text-blue-600">0{i + 1}</span>
              <h2 className="mt-4 text-xl font-bold">{t(title)}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{t(body)}</p>
            </article>
          ))}
        </div>
      </section>
      <CtaSection />
    </MarketingShell>
  );
}
