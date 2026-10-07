import { Building2, Clock3, Database, Link2, Mail } from "lucide-react";

import Link from "@/components/ui/AppLink";

const cards = [
  {
    title: "Refurbed catalog",
    description:
      "Upload and manage the Refurbed instance catalog used when adding inventory.",
    points: [
      "Large XLSX and CSV imports",
      "Instance ID and category search",
      "Localized names and attributes",
    ],
    href: "/dashboard/settings/refurbed-catalog",
    action: "Manage Refurbed catalog",
    icon: Database,
  },
  {
    title: "Seller profile",
    description:
      "Manage the default information used by your marketplace accounts.",
    points: [
      "Upload your logo",
      "Terms and conditions",
      "Return policy",
      "Business and contact information",
      "Inventory and account preferences",
    ],
    href: "/dashboard/settings/seller-profile",
    action: "See your seller profile",
    icon: Building2,
  },
  {
    title: "Order preferences",
    description: "Manage your orders effectively and configure your documents.",
    points: [
      "Personalized email templates",
      "Feedback templates",
      "Packing slips and labels",
    ],
    href: "/dashboard/settings/orders",
    action: "See your order preferences",
    icon: Mail,
  },
  {
    title: "Push preferences",
    description: "Set up a synchronization schedule for your marketplaces.",
    points: [
      "Synchronization frequency",
      "Enabled data types",
      "Marketplace schedules",
    ],
    href: "/dashboard/settings/push",
    action: "See your push preferences",
    icon: Clock3,
  },
  {
    title: "Marketplace links",
    description: "Manage your connections to marketplaces in detail.",
    points: [
      "Connection status",
      "Credentials and markets",
      "Synchronization settings",
    ],
    href: "/dashboard/marketplaces",
    action: "Update marketplace connections",
    icon: Link2,
  },
];

export default function SettingsPage() {
  return (
    <main className="min-h-[calc(100vh-5rem)] bg-sky-50/70 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-blue-600">Settings</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
          Your preferences
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage your seller account, orders, synchronization, and marketplace
          connections.
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {cards.map(
            ({ title, description, points, href, action, icon: Icon }) => (
              <section
                key={title}
                className="flex min-h-72 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                </div>
                <p className="mt-5 text-sm font-medium text-slate-700">
                  {description}
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      {point}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex justify-end pt-6">
                  <Link
                    href={href}
                    className="rounded-xl border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
                  >
                    {action}
                  </Link>
                </div>
              </section>
            ),
          )}
        </div>
      </div>
    </main>
  );
}
