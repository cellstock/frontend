"use client";

import { BarChart3, Rocket } from "lucide-react";
import { useParams } from "next/navigation";

const pages: Record<string, { title: string; description: string }> = {
  overview: {
    title: "Analytics",
    description:
      "Your marketplace performance overview will be displayed here.",
  },
  repricing: {
    title: "WeReprice",
    description:
      "Automatic marketplace repricing tools will be configured here.",
  },
  strategies: {
    title: "Your strategies",
    description: "Create and manage your repricing strategies here.",
  },
  schedule: {
    title: "Schedule your repricings",
    description: "Configure when and how frequently repricing runs here.",
  },
};

export default function AnalyticsSectionPage() {
  const params = useParams<{ section?: string[] }>();
  const key = params.section?.at(-1) ?? "overview";
  const page = pages[key] ?? pages.overview;

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="flex items-center gap-2 text-sm font-semibold text-blue-600">
          <BarChart3 className="h-4 w-4" /> Analytics
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          {page.title}
        </h1>
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Rocket className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-lg font-bold text-slate-900">
            Page ready for its functionality
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {page.description}
          </p>
        </section>
      </div>
    </main>
  );
}
