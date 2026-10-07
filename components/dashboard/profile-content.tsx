"use client";

import {
  AlertCircle,
  CalendarClock,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  Mail,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { FormEvent, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useI18n } from "@/components/i18n/language-provider";
import { useDashboardUser } from "@/components/dashboard/dashboard-provider";
import { formatUserRole } from "@/lib/auth/user-display";
import type {
  LaravelAuthenticatedUser,
  ProfileUpdateInput,
} from "@/types/auth";
import { FullScreenTransition } from "@/components/ui/full-screen-transition";

function formatDate(value: string | null, locale: string) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ProfileContent() {
  const initialUser = useDashboardUser();
  const { t, locale } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [values, setValues] = useState<ProfileUpdateInput>({
    name: user.name,
    email: user.email,
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);

  const change = (field: keyof ProfileUpdateInput, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
    setMessage("");
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (values.name.trim().length < 2)
      nextErrors.name = t("Enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      nextErrors.email = t("Enter a valid email address.");
    if (
      values.password &&
      (values.password.length < 8 ||
        !/[A-Z]/.test(values.password) ||
        !/[a-z]/.test(values.password) ||
        !/\d/.test(values.password))
    )
      nextErrors.password = t(
        "Use at least 8 characters with uppercase, lowercase and a number.",
      );
    if (values.password && !values.current_password)
      nextErrors.current_password = t("Enter your current password.");
    if (values.password !== values.password_confirmation)
      nextErrors.password_confirmation = t("Passwords do not match.");
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    setMessage("");
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          current_password: values.current_password || undefined,
          password: values.password || undefined,
          password_confirmation: values.password
            ? values.password_confirmation
            : undefined,
        }),
      });
      const result = (await response.json()) as {
        success: boolean;
        message?: string;
        errors?: Record<string, string[]>;
        data?: { user: LaravelAuthenticatedUser };
      };
      if (!response.ok || !result.success || !result.data?.user) {
        const fieldErrors = Object.fromEntries(
          Object.entries(result.errors ?? {}).map(([key, messages]) => [
            key,
            t(messages[0]),
          ]),
        );
        setErrors({
          ...fieldErrors,
          form: Object.keys(fieldErrors).length
            ? ""
            : t(result.message ?? "Unable to update your profile."),
        });
        return;
      }
      setUser((current) => ({
        ...current,
        name: result.data!.user.name,
        email: result.data!.user.email,
      }));
      setValues((current) => ({
        ...current,
        name: result.data!.user.name,
        email: result.data!.user.email,
        current_password: "",
        password: "",
        password_confirmation: "",
      }));
      setMessage(t("Profile updated successfully."));
      router.refresh();
    } catch {
      setErrors({ form: t("Unable to connect to CelleXa. Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file?: File) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setErrors({ form: t("Choose a JPG, PNG or WebP image up to 2 MB.") });
      return;
    }
    setAvatarBusy(true);
    setErrors({});
    setMessage("");
    try {
      const body = new FormData();
      body.append("avatar", file);
      const response = await fetch("/api/auth/profile/avatar", {
        method: "POST",
        body,
      });
      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };
      if (!response.ok || !result.success) {
        setErrors({
          form: t(result.message ?? "Unable to upload the profile image."),
        });
        return;
      }
      setUser((current) => ({ ...current, hasAvatar: true }));
      setAvatarVersion(Date.now());
      setMessage(t("Profile image updated successfully."));
      router.refresh();
    } catch {
      setErrors({ form: t("Unable to upload the profile image.") });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setErrors({});
    setMessage("");
    try {
      const response = await fetch("/api/auth/profile/avatar", {
        method: "DELETE",
      });
      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };
      if (!response.ok || !result.success) {
        setErrors({
          form: t(result.message ?? "Unable to remove the profile image."),
        });
        return;
      }
      setUser((current) => ({ ...current, hasAvatar: false }));
      setMessage(t("Profile image removed successfully."));
      router.refresh();
    } catch {
      setErrors({ form: t("Unable to remove the profile image.") });
    } finally {
      setAvatarBusy(false);
    }
  }

  const fieldClass = (error?: string) =>
    `mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:ring-4 ${error ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"}`;
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {(saving || avatarBusy) && (
        <FullScreenTransition
          title={avatarBusy ? "Updating profile image" : "Saving your profile"}
          description="Please wait while we securely update your account."
        />
      )}
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-sm font-semibold text-blue-600">{t("Account")}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {t("My profile")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t(
              "View and update your personal information and account security.",
            )}
          </p>
        </header>
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-2xl font-bold text-white">
                <Image
                  key={avatarVersion}
                  src={
                    user.hasAvatar
                      ? `/api/auth/profile/avatar?v=${avatarVersion}`
                      : "/images/default-profile.png"
                  }
                  alt={t("Profile image")}
                  fill
                  sizes="96px"
                  unoptimized={user.hasAvatar}
                  className="object-cover"
                />
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                  <Camera className="h-4 w-4" />
                  {t(user.hasAvatar ? "Change image" : "Upload image")}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={avatarBusy}
                    onChange={(event) => {
                      void uploadAvatar(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                    className="sr-only"
                  />
                </label>
                {user.hasAvatar && (
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => void removeAvatar()}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("Remove")}
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {t("JPG, PNG or WebP. Maximum 2 MB.")}
              </p>
              {avatarBusy && (
                <LoaderCircle className="mt-3 h-5 w-5 animate-spin text-blue-600" />
              )}
              <h2 className="mt-5 text-xl font-bold">{user.name}</h2>
              <p className="mt-1 break-all text-sm text-slate-500">
                {user.email}
              </p>
              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {t("Active account")}
              </span>
            </div>
            <dl className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">{t("Role")}</dt>
                <dd className="font-semibold">{formatUserRole(user.role)}</dd>
              </div>
            </dl>
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="h-4 w-4 text-blue-600" />
                {t("Last successful login")}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {formatDate(user.lastLoginAt, locale)}
              </p>
            </div>
          </aside>
          <form
            onSubmit={submit}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 p-6">
              <h2 className="flex items-center gap-2 font-bold">
                <UserRound className="h-5 w-5 text-blue-600" />
                {t("Personal information")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t(
                  "Update the name and email address associated with your account.",
                )}
              </p>
            </div>
            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <Field label={t("Full name")} error={errors.name}>
                <input
                  value={values.name}
                  onChange={(e) => change("name", e.target.value)}
                  className={fieldClass(errors.name)}
                  autoComplete="name"
                />
              </Field>
              <Field label={t("Email address")} error={errors.email}>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={values.email}
                    onChange={(e) => change("email", e.target.value)}
                    className={`${fieldClass(errors.email)} pl-10`}
                    type="email"
                    autoComplete="email"
                  />
                </div>
              </Field>
            </div>
            <div className="border-y border-slate-100 p-6">
              <h2 className="flex items-center gap-2 font-bold">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                {t("Change password")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t("Leave these fields empty to keep your current password.")}
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <PasswordField
                  label={t("Current password")}
                  value={values.current_password ?? ""}
                  error={errors.current_password}
                  show={showPasswords}
                  onChange={(value) => change("current_password", value)}
                />
                <PasswordField
                  label={t("New password")}
                  value={values.password ?? ""}
                  error={errors.password}
                  show={showPasswords}
                  onChange={(value) => change("password", value)}
                />
                <PasswordField
                  label={t("Confirm new password")}
                  value={values.password_confirmation ?? ""}
                  error={errors.password_confirmation}
                  show={showPasswords}
                  onChange={(value) => change("password_confirmation", value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowPasswords((current) => !current)}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
              >
                {showPasswords ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {t(showPasswords ? "Hide passwords" : "Show passwords")}
              </button>
            </div>
            <div className="p-6">
              {errors.form && (
                <p
                  role="alert"
                  className="mb-4 flex gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"
                >
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  {errors.form}
                </p>
              )}
              {message && (
                <p
                  role="status"
                  className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700"
                >
                  {message}
                </p>
              )}
              <button
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t(saving ? "Saving..." : "Save changes")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      {children}
      {error && (
        <span className="mt-1.5 block text-xs text-red-600">{error}</span>
      )}
    </label>
  );
}
function PasswordField({
  label,
  value,
  error,
  show,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  show: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} error={error}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-4 ${error ? "border-red-300 focus:ring-red-100" : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"}`}
      />
    </Field>
  );
}
