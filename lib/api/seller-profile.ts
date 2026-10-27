import { apiFetch } from "@/lib/public-path";

export interface SellerProfile {
  id: number;
  has_logo: boolean;
  logo_url: string | null;
  about_me: string;
  contact_information: string;
  terms_and_conditions: string;
  return_policy: string;
  push_after_upload?: boolean;
  use_new_inventory_page: boolean;
  updated_at: string | null;
}

async function sellerProfileRequest<T>(url: string, options?: RequestInit) {
  const response = await apiFetch(url, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...options?.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | (T & {
        message?: string;
        errors?: Record<string, string[] | string>;
      })
    | null;

  if (!response.ok) {
    const firstError = payload?.errors
      ? Object.values(payload.errors).flat()[0]
      : undefined;
    throw new Error(
      (typeof firstError === "string" && firstError) ||
        payload?.message ||
        "Seller profile request failed.",
    );
  }

  return payload as T;
}

export function getSellerProfile() {
  return sellerProfileRequest<{
    success: boolean;
    data: { profile: SellerProfile };
  }>("/api/seller-profile");
}

export function updateSellerProfile(
  body: Partial<
    Pick<
      SellerProfile,
      | "about_me"
      | "contact_information"
      | "terms_and_conditions"
      | "return_policy"
      | "use_new_inventory_page"
    >
  >,
) {
  return sellerProfileRequest<{
    success: boolean;
    message?: string;
    data: { profile: SellerProfile };
  }>("/api/seller-profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function uploadSellerLogo(file: File) {
  const form = new FormData();
  form.append("logo", file);

  return sellerProfileRequest<{
    success: boolean;
    message?: string;
    data: { profile: SellerProfile };
  }>("/api/seller-profile/logo", {
    method: "POST",
    body: form,
  });
}

export function deleteSellerLogo() {
  return sellerProfileRequest<{
    success: boolean;
    message?: string;
    data: { profile: SellerProfile };
  }>("/api/seller-profile/logo", {
    method: "DELETE",
  });
}
