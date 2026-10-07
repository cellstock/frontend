"use client";
import { Check, CreditCard, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/language-provider";
type Plan = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  billing_interval: string;
  features: string[] | null;
};
export default function Page() {
  const { t } = useI18n();
  const [current, setCurrent] = useState<Record<string, unknown> | null>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    void Promise.all([
      fetch("/api/subscription"),
      fetch("/api/subscription/plans"),
    ])
      .then(async ([subscriptionResponse, plansResponse]) => {
        const subscription = await subscriptionResponse.json();
        const available = await plansResponse.json();
        if (!subscriptionResponse.ok) throw new Error(subscription.message);
        if (!plansResponse.ok) throw new Error(available.message);
        setCurrent(subscription.data.subscription);
        setPlans(available.data.plans);
      })
      .catch((reason) => setError(reason.message));
  }, []);
  async function choose(planId: number) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setCurrent(result.data.subscription);
      setMessage(t("Subscription updated successfully."));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t("Unable to update subscription."),
      );
    } finally {
      setBusy(false);
    }
  }
  const currentPlanId = Number(current?.plan_id ?? 0);
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold text-blue-600">{t("Account")}</p>
        <h1 className="mt-1 text-3xl font-bold">{t("My subscription")}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {t("View or change the plan connected to your account.")}
        </p>
        {error && (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {message}
          </p>
        )}
        {current === undefined ? (
          <LoaderCircle className="mx-auto mt-16 h-8 w-8 animate-spin text-blue-600" />
        ) : (
          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={`rounded-3xl border bg-white p-6 shadow-sm ${currentPlanId === plan.id ? "border-blue-500 ring-4 ring-blue-50" : "border-slate-200"}`}
              >
                <CreditCard className="h-7 w-7 text-blue-600" />
                <div className="mt-4 flex items-end justify-between gap-3">
                  <h2 className="text-xl font-bold">{plan.name}</h2>
                  <p className="font-bold">
                    {plan.price} {plan.currency}
                    <span className="text-xs font-normal text-slate-400">
                      /{plan.billing_interval}
                    </span>
                  </p>
                </div>
                <p className="mt-3 min-h-10 text-sm text-slate-500">
                  {plan.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {(plan.features ?? []).map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={busy || currentPlanId === plan.id}
                  onClick={() => void choose(plan.id)}
                  className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {currentPlanId === plan.id
                    ? t("Current plan")
                    : t("Choose plan")}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
