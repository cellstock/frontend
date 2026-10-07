"use client";

import Link from "@/components/ui/AppLink";
import {
  AlertCircle,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/language-provider";

import { AuthenticationError, signup } from "@/lib/auth/auth-client";
import type { SignupCredentials, SignupFormErrors } from "@/types/auth";
import { FullScreenTransition } from "@/components/ui/full-screen-transition";

const initial: SignupCredentials = {
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
};

function validate(values: SignupCredentials): SignupFormErrors {
  const errors: SignupFormErrors = {};
  if (values.name.trim().length < 2) errors.name = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = "Enter a valid email address.";
  if (
    values.password.length < 8 ||
    !/[A-Za-z]/.test(values.password) ||
    !/\d/.test(values.password)
  )
    errors.password = "Use at least 8 characters with a letter and a number.";
  if (values.password_confirmation !== values.password)
    errors.password_confirmation = "Passwords do not match.";
  return errors;
}

export function SignupForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<SignupFormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function change(field: keyof SignupCredentials, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      form: undefined,
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validate(values);
    if (Object.keys(validation).length) {
      setErrors(validation);
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      await signup({
        ...values,
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setErrors({
        form:
          error instanceof AuthenticationError
            ? error.message
            : "Unable to connect to CelleXa. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {submitting && (
        <FullScreenTransition
          title="Creating your account"
          description="Please wait while we prepare your CelleXa workspace."
        />
      )}
      {errors.form && (
        <div
          role="alert"
          aria-live="polite"
          className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          {t(errors.form)}
        </div>
      )}
      <Field
        id="name"
        label={t("Full name")}
        placeholder={t("Enter your full name")}
        icon={UserRound}
        value={values.name}
        error={errors.name ? t(errors.name) : undefined}
        disabled={submitting}
        autoComplete="name"
        onChange={(value) => change("name", value)}
      />
      <Field
        id="email"
        label={t("Email address")}
        placeholder={t("Enter your email address")}
        icon={Mail}
        type="email"
        value={values.email}
        error={errors.email ? t(errors.email) : undefined}
        disabled={submitting}
        autoComplete="email"
        onChange={(value) => change("email", value)}
      />
      <PasswordField
        id="password"
        label={t("Password")}
        placeholder={t("Create a secure password")}
        value={values.password}
        error={errors.password ? t(errors.password) : undefined}
        show={showPassword}
        disabled={submitting}
        autoComplete="new-password"
        toggle={() => setShowPassword((current) => !current)}
        onChange={(value) => change("password", value)}
      />
      <PasswordField
        id="password_confirmation"
        label={t("Confirm password")}
        placeholder={t("Enter your password again")}
        value={values.password_confirmation}
        error={
          errors.password_confirmation
            ? t(errors.password_confirmation)
            : undefined
        }
        show={showPassword}
        disabled={submitting}
        autoComplete="new-password"
        toggle={() => setShowPassword((current) => !current)}
        onChange={(value) => change("password_confirmation", value)}
      />
      <button
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:bg-blue-400"
      >
        {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {t(submitting ? "Creating account..." : "Create account")}
      </button>
      <p className="text-center text-sm text-slate-500">
        {t("Already have an account?")}{" "}
        <Link
          href="/login"
          className="font-semibold text-blue-600 hover:text-blue-700"
        >
          {t("Sign in")}
        </Link>
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  placeholder,
  icon: Icon,
  value,
  error,
  disabled,
  type = "text",
  autoComplete,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  icon: typeof UserRound;
  value: string;
  error?: string;
  disabled: boolean;
  type?: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          className={`w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm outline-none placeholder:text-slate-400 focus:ring-4 ${error ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"}`}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function PasswordField({
  id,
  label,
  placeholder,
  value,
  error,
  show,
  disabled,
  autoComplete,
  toggle,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  show: boolean;
  disabled: boolean;
  autoComplete: string;
  toggle: () => void;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          className={`w-full rounded-xl border bg-white py-3 pl-11 pr-12 text-sm outline-none placeholder:text-slate-400 focus:ring-4 ${error ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"}`}
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={t(show ? "Hide password" : "Show password")}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
