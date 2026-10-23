"use client";

import { Pencil, Trash2 } from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "@/components/ui/AppLink";
import RichTextEditor from "@/components/settings/RichTextEditor";
import {
  deleteSellerLogo,
  getSellerProfile,
  updateSellerProfile,
  uploadSellerLogo,
  type SellerProfile,
} from "@/lib/api/seller-profile";
import { publicPath } from "@/lib/public-path";

const emptyProfile: SellerProfile = {
  id: 0,
  has_logo: false,
  logo_url: null,
  about_me: "",
  contact_information: "",
  terms_and_conditions: "",
  return_policy: "",
  push_after_upload: false,
  use_new_inventory_page: false,
  updated_at: null,
};

export default function SellerProfilePage() {
  const [profile, setProfile] = useState<SellerProfile>(emptyProfile);
  const [logoKey, setLogoKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSellerProfile()
      .then((response) => setProfile(response.data.profile))
      .catch((caught) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load seller profile.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await updateSellerProfile({
        about_me: profile.about_me,
        contact_information: profile.contact_information,
        terms_and_conditions: profile.terms_and_conditions,
        return_policy: profile.return_policy,
        push_after_upload: profile.push_after_upload,
        use_new_inventory_page: profile.use_new_inventory_page,
      });
      setProfile(response.data.profile);
      setMessage(response.message || "Seller profile saved successfully.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save seller profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onLogoSelected(file: File | null) {
    if (!file) return;
    setError("");
    setMessage("");

    try {
      const response = await uploadSellerLogo(file);
      setProfile(response.data.profile);
      setLogoKey((key) => key + 1);
      setMessage(response.message || "Seller logo updated successfully.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to upload logo.",
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeLogo() {
    setError("");
    setMessage("");

    try {
      const response = await deleteSellerLogo();
      setProfile(response.data.profile);
      setLogoKey((key) => key + 1);
      setMessage(response.message || "Seller logo removed successfully.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to remove logo.",
      );
    }
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-sky-50/70 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">Settings</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Your seller profile
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Manage your logo, business details, and default seller
              preferences.
            </p>
          </div>
          <Link
            href="/dashboard/settings"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to settings
          </Link>
        </div>

        {error && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
          </p>
        )}

        <form
          onSubmit={save}
          className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          {loading ? (
            <p className="text-sm text-slate-600">Loading seller profile…</p>
          ) : (
            <>
              <ProfileSection
                title="Your logo"
                description="Your logo will appear on your packing slips. File type: JPEG/GIF. Maximum size allowed is 30Kb."
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {profile.has_logo && profile.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={logoKey}
                        src={`${publicPath(profile.logo_url)}?v=${logoKey}`}
                        alt="Seller logo"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">No logo</span>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/gif"
                    className="hidden"
                    onChange={(event) =>
                      onLogoSelected(event.target.files?.[0] ?? null)
                    }
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                    aria-label="Upload logo"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {profile.has_logo && (
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                      aria-label="Remove logo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </ProfileSection>

              <ProfileSection
                title="Your 'About me' information"
                description="Describe your business here. This information can appear on your marketplace listings."
              >
                <RichTextEditor
                  ariaLabel="About me"
                  value={profile.about_me}
                  onChange={(about_me) =>
                    setProfile((current) => ({ ...current, about_me }))
                  }
                />
              </ProfileSection>

              <ProfileSection
                title="Your contact information"
                description="Describe how you can be contacted. This information can appear on your marketplace listings."
              >
                <RichTextEditor
                  ariaLabel="Contact information"
                  value={profile.contact_information}
                  onChange={(contact_information) =>
                    setProfile((current) => ({
                      ...current,
                      contact_information,
                    }))
                  }
                />
              </ProfileSection>

              <ProfileSection
                title="Your terms and conditions"
                description="Describe your terms and conditions. This information can appear on your marketplace listings."
              >
                <RichTextEditor
                  ariaLabel="Terms and conditions"
                  value={profile.terms_and_conditions}
                  onChange={(terms_and_conditions) =>
                    setProfile((current) => ({
                      ...current,
                      terms_and_conditions,
                    }))
                  }
                />
              </ProfileSection>

              <ProfileSection
                title="Your return policy"
                description="Describe your return policy for buyers."
              >
                <RichTextEditor
                  ariaLabel="Return policy"
                  value={profile.return_policy}
                  onChange={(return_policy) =>
                    setProfile((current) => ({ ...current, return_policy }))
                  }
                />
              </ProfileSection>

              <ProfileSection
                title="Push after an upload"
                description="Check this box to send your inventory automatically to the marketplaces after each time you upload a file. (pre-requisite: You also set up your push preferences)"
              >
                <PreferenceRow
                  label="Trigger a push after an upload"
                  checked={profile.push_after_upload}
                  onChange={(push_after_upload) =>
                    setProfile((current) => ({
                      ...current,
                      push_after_upload,
                    }))
                  }
                />
              </ProfileSection>

              <ProfileSection
                title="New version of the inventory page"
                description="Enable the new version of the inventory page. You can switch back at any time."
                last
              >
                <PreferenceRow
                  label="Use the new inventory page (beta version)"
                  checked={profile.use_new_inventory_page}
                  onChange={(use_new_inventory_page) =>
                    setProfile((current) => ({
                      ...current,
                      use_new_inventory_page,
                    }))
                  }
                />
              </ProfileSection>

              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save seller profile"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </main>
  );
}

function ProfileSection({
  title,
  description,
  children,
  last = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <section
      className={`py-6 ${last ? "" : "border-b border-dashed border-slate-200"}`}
    >
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PreferenceRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm text-slate-700">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
    </label>
  );
}
