"use client";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { ContactForm } from "@/components/marketing/contact-form";
import {
  MarketingShell,
  PageHero,
} from "@/components/marketing/marketing-shell";
import { useI18n } from "@/components/i18n/language-provider";
const reasons = [
  [
    Mail,
    "Product and account questions",
    "Discuss plans, onboarding and account access.",
  ],
  [
    MessageCircle,
    "Operational support",
    "Get help with orders, inventory and marketplace synchronization.",
  ],
  [
    ShieldCheck,
    "Your details are protected",
    "Your message is stored securely for our support team.",
  ],
] as const;
export default function ContactPage() {
  const { t } = useI18n();
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Contact Cellexa"
        title="Let’s improve your marketplace workflow."
        description="Tell us about your marketplaces, operational goals or support needs. Our team will help you find the right next step."
      />
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-blue-600">
              {t("Talk to our team")}
            </p>
            <h2 className="mt-3 text-3xl font-bold">
              {t("We’re here to help.")}
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              {t(
                "Whether you are evaluating Cellexa or already managing daily operations, send us your question and we will respond as soon as possible.",
              )}
            </p>
            <div className="mt-8 grid gap-4">
              {reasons.map(([Icon, title, body]) => (
                <div
                  key={title}
                  className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <span className="h-fit rounded-xl bg-blue-50 p-3 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold">{t(title)}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {t(body)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </MarketingShell>
  );
}
