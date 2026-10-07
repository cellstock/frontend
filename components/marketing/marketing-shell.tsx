"use client";

import Link from "@/components/ui/AppLink";
import { ArrowRight, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CellexaLogo } from "@/components/branding/cellexa-logo";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useI18n } from "@/components/i18n/language-provider";

const links = [
  ["/", "Home"],
  ["/about", "About"],
  ["/portal-details", "Portal details"],
  ["/plans", "Plans"],
  ["/contact", "Contact"],
] as const;

export function MarketingShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <CellexaLogo theme="light" />
          <nav className="hidden items-center gap-7 lg:flex">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-semibold text-slate-600 transition hover:text-blue-600"
              >
                {t(label)}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              {t("Sign in")}
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              {t("Get started")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label="Open navigation"
            className="rounded-xl border border-slate-200 p-2.5 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        {open && (
          <div className="border-t border-slate-200 px-4 py-4 lg:hidden">
            <nav className="grid gap-1">
              {links.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  {t(label)}
                </Link>
              ))}
            </nav>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <LanguageSwitcher />
              <Link
                href="/login"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
              >
                {t("Sign in")}
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
              >
                {t("Get started")}
              </Link>
            </div>
          </div>
        )}
      </header>
      {children}
      <Footer />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden bg-slate-950 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#2563eb33,transparent_36%),radial-gradient(circle_at_80%_70%,#4f46e533,transparent_35%)]" />
      <div className="relative mx-auto max-w-5xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">
          {t(eyebrow)}
        </p>
        <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
          {t(title)}
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
          {t(description)}
        </p>
        {children}
      </div>
    </section>
  );
}

export function CtaSection() {
  const { t } = useI18n();
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white shadow-2xl shadow-blue-900/20 sm:p-12 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-3xl font-bold">
            {t("Ready to simplify marketplace operations?")}
          </h2>
          <p className="mt-3 max-w-2xl text-blue-100">
            {t(
              "Create your CelleXa workspace and bring orders, inventory and marketplace connections into one portal.",
            )}
          </p>
        </div>
        <Link
          href="/signup"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-blue-700"
        >
          {t("Start now")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-4 py-12 text-slate-400 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <CellexaLogo theme="dark" />
          <p className="mt-5 max-w-md text-sm leading-6">
            {t(
              "A centralized portal for managing marketplace orders, inventory, synchronization and operational workflows.",
            )}
          </p>
        </div>
        <div>
          <p className="font-bold text-white">{t("Explore")}</p>
          <div className="mt-4 grid gap-3 text-sm">
            {links.slice(1).map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-white">
                {t(label)}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="font-bold text-white">{t("Account")}</p>
          <div className="mt-4 grid gap-3 text-sm">
            <Link href="/login" className="hover:text-white">
              {t("Sign in")}
            </Link>
            <Link href="/signup" className="hover:text-white">
              {t("Create account")}
            </Link>
            <Link href="/contact" className="hover:text-white">
              {t("Contact support")}
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-slate-800 pt-6 text-xs">
        © {new Date().getFullYear()} CelleXa. {t("All rights reserved.")}
      </div>
    </footer>
  );
}
