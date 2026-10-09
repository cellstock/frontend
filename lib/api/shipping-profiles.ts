import { apiFetch } from "@/lib/public-path";
export interface ShippingProfileDestination {
  market_code: string;
  market_name?: string | null;
  is_site_market: boolean;
  currency_code?: string | null;
  shipping_costs?: string | null;
  site_market_currency_code?: string | null;
  site_market_shipping_costs?: string | null;
  min_delivery_days?: number | null;
  max_delivery_days?: number | null;
}

export interface ShippingProfile {
  id: string;
  version?: string | null;
  is_current: boolean;
  is_deletable: boolean;
  name?: string | null;
  source_country_code?: string | null;
  source_country_market_name?: string | null;
  num_offers_assigned: number;
  created_at?: string | null;
  destinations: ShippingProfileDestination[];
  details: Record<string, unknown>;
  last_synced_at?: string | null;
}

export interface ShippingCarrier {
  slug: string;
  name: string;
}

export interface ShippingProfileQuery {
  search?: string;
  source_country?: string;
  deletable?: "yes" | "no";
  sort?: "name" | "newest" | "offers";
  page?: number;
  per_page?: number;
}

export interface ShippingProfilePagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export class ShippingProfileApiError extends Error {}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json", ...options.headers },
    ...options,
  });
  const body = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;
  if (!response.ok) {
    throw new ShippingProfileApiError(
      body?.message || "Unable to complete the shipping profile request.",
    );
  }

  return body as T;
}

export const getShippingProfiles = (query: ShippingProfileQuery = {}) => {
  const parameters = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      parameters.set(key, String(value));
    }
  });

  return request<{
    success: boolean;
    data: {
      profiles: ShippingProfile[];
      pagination: ShippingProfilePagination;
      filters: { source_countries: string[] };
    };
  }>(`/api/shipping-profiles?${parameters.toString()}`);
};

export const syncShippingProfiles = () =>
  request<{
    success: boolean;
    message: string;
    data: { profiles: ShippingProfile[]; synchronized: number };
  }>("/api/shipping-profiles/sync", { method: "POST" });

export const getShippingCarriers = () =>
  request<{
    success: boolean;
    data: { carriers: ShippingCarrier[] };
  }>("/api/shipping-profiles/carriers");

export const saveShippingProfile = (
  profile: Record<string, unknown>,
  id?: string,
) =>
  request<{
    success: boolean;
    message: string;
    data: { profile?: ShippingProfile; operation_id?: number };
  }>(
    id
      ? `/api/shipping-profiles/${encodeURIComponent(id)}`
      : "/api/shipping-profiles",
    {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    },
  );

export const deleteShippingProfile = (id: string) =>
  request<{ success: boolean; message: string }>(
    `/api/shipping-profiles/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
