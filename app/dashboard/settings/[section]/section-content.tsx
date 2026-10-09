"use client";

import { Settings2 } from "lucide-react";
import { useParams } from "next/navigation";

const titles: Record<string, string> = {
  "seller-profile": "Seller profile",
  orders: "Order preferences",
  push: "Push preferences",
};

export default function SettingsSectionPage() {
  const { section } = useParams<{ section: string }>();
  const title = titles[section] ?? "Preferences";

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-blue-600">Settings</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          {title}
        </h1>
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Settings2 className="h-8 w-8 text-blue-600" />
          <h2 className="mt-5 text-lg font-bold text-slate-900">
            Preference page ready
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Share the internal page reference when you are ready, and this
            section can be implemented step by step.
          </p>
        </section>
      </div>
    </main>
  );
}
