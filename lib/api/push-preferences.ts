import { apiFetch } from "@/lib/public-path";

export interface PushSlot {
  key: string;
  from: string;
  to: string;
  active: boolean;
  start_at: string;
  every: string;
}

export interface PushPreference {
  marketplace_slug: string;
  slots: PushSlot[];
  last_pushed_at: string | null;
  updated_at: string | null;
}

export interface PushMarketplace {
  marketplace_slug: string;
  name: string;
  logo: string | null;
  connected: boolean;
  pending_count: number;
  preference: PushPreference;
}

export interface PushTarget {
  id: string;
  marketplace_slug: string;
  market_code: string;
  name: string;
  logo: string | null;
  connected: boolean;
  enabled: boolean;
  pending_count: number;
  last_pushed_at: string | null;
  disabled_message: string | null;
}

async function pushRequest<T>(url: string, options?: RequestInit) {
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
        "Push preferences request failed.",
    );
  }

  return payload as T;
}

export function getPushPreferences() {
  return pushRequest<{
    success: boolean;
    data: {
      marketplaces: PushMarketplace[];
      targets: PushTarget[];
    };
  }>("/api/push-preferences");
}

export function updatePushPreferences(
  marketplaceSlug: string,
  slots: PushSlot[],
) {
  return pushRequest<{
    success: boolean;
    message?: string;
    data: { preference: PushPreference };
  }>(`/api/push-preferences/${encodeURIComponent(marketplaceSlug)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slots }),
  });
}

export function runMarketplacePush(targets: string[]) {
  return pushRequest<{
    success: boolean;
    message?: string;
    data: {
      results: Array<{
        marketplace: string;
        market_code?: string;
        pushed: number;
        skipped?: string;
      }>;
      marketplaces: PushMarketplace[];
      targets: PushTarget[];
    };
  }>("/api/push-preferences/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targets }),
  });
}
