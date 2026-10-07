"use client";

import { LoaderCircle, Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { useI18n } from "@/components/i18n/language-provider";
import { FullScreenTransition } from "@/components/ui/full-screen-transition";

type FormState = {
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
};
const emptyForm: FormState = {
  name: "",
  email: "",
  company: "",
  subject: "",
  message: "",
};

export function ContactForm() {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const update = (field: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (
      form.name.trim().length < 2 ||
      !/^\S+@\S+\.\S+$/.test(form.email) ||
      !form.subject.trim() ||
      form.message.trim().length < 10
    ) {
      setError(
        t("Please complete all required fields with valid information."),
      );
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (!response.ok)
        throw new Error(
          Object.values(result.errors ?? {}).flat()[0] ??
            result.message ??
            t("Unable to send your message."),
        );
      setSuccess(t("Thank you. Your message has been received."));
      setForm(emptyForm);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t("Unable to send your message."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8"
      noValidate
    >
      {submitting && (
        <FullScreenTransition
          title="Sending your message"
          description="Please wait while we send your message securely."
        />
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          {t("Name")} *
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
            autoComplete="name"
            required
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          {t("Email")} *
          <input
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
            type="email"
            autoComplete="email"
            required
          />
        </label>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          {t("Company")}
          <input
            value={form.company}
            onChange={(e) => update("company", e.target.value)}
            className={inputClass}
            autoComplete="organization"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          {t("Subject")} *
          <input
            value={form.subject}
            onChange={(e) => update("subject", e.target.value)}
            className={inputClass}
            required
          />
        </label>
      </div>
      <label className="mt-5 block text-sm font-semibold text-slate-700">
        {t("How can we help?")} *
        <textarea
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          className={`${inputClass} min-h-36 resize-y`}
          required
        />
      </label>
      <div aria-live="polite" className="mt-4">
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </p>
        )}
      </div>
      <button
        disabled={submitting}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {submitting ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {t(submitting ? "Sending..." : "Send message")}
      </button>
    </form>
  );
}
