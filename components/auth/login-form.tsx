"use client";
import { useI18n } from "@/components/i18n/language-provider";

import { useRouter } from "next/navigation";
import Link from "@/components/ui/AppLink";

import {
  AlertCircle,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { FormEvent, useState } from "react";

import { AuthenticationError, login } from "@/lib/auth/auth-client";
import { FullScreenTransition } from "@/components/ui/full-screen-transition";
import type { LoginCredentials, LoginFormErrors } from "@/types/auth";

const initialCredentials: LoginCredentials = {
  email: "",
  password: "",
};

function validateLoginForm(credentials: LoginCredentials): LoginFormErrors {
  const errors: LoginFormErrors = {};
  const email = credentials.email.trim();

  if (!email) {
    errors.email = "Email address is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!credentials.password) {
    errors.password = "Password is required.";
  } else if (credentials.password.length < 8) {
    errors.password = "Password must contain at least 8 characters.";
  }

  return errors;
}

export function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [credentials, setCredentials] =
    useState<LoginCredentials>(initialCredentials);

  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof LoginCredentials, value: string) {
    setCredentials((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
      form: undefined,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const validationErrors = validateLoginForm(credentials);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await login({
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      });

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        setErrors({
          form:
            error.status === 401
              ? "The email address or password is incorrect."
              : error.message,
        });

        return;
      }

      console.error("Login failed:", error);

      setErrors({
        form: "Unable to connect to Cellexa. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {isSubmitting && (
        <FullScreenTransition
          title="Signing in"
          description="Please wait while we securely open your workspace."
        />
      )}
      {errors.form && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{t(errors.form)}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          {t("Email address")}
        </label>

        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            required
            disabled={isSubmitting}
            value={credentials.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder={t("Enter your registered email")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 ${
              errors.email
                ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                : "border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            }`}
          />
        </div>

        {errors.email && (
          <p id="email-error" className="mt-1.5 text-xs text-red-600">
            {t(errors.email)}
          </p>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-slate-700"
          >
            {t("Password")}
          </label>

          <span className="text-xs text-slate-400">
            {t("Minimum 8 characters")}
          </span>
        </div>

        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            disabled={isSubmitting}
            value={credentials.password}
            onChange={(event) => updateField("password", event.target.value)}
            placeholder={t("Enter your password")}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className={`w-full rounded-xl border bg-white py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 ${
              errors.password
                ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                : "border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            }`}
          />

          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? t("Hide password") : t("Show password")}
            aria-pressed={showPassword}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>

        {errors.password && (
          <p id="password-error" className="mt-1.5 text-xs text-red-600">
            {t(errors.password)}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-blue-400"
      >
        {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}

        {isSubmitting ? t("Signing in...") : t("Sign in")}
      </button>

      <p className="text-center text-sm text-slate-500">
        {t("New to CelleXa?")}{" "}
        <Link
          href="/signup"
          className="font-semibold text-blue-600 hover:text-blue-700"
        >
          {t("Create an account")}
        </Link>
      </p>
    </form>
  );
}
