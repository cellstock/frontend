import { apiFetch } from "@/lib/public-path";
import type {
  InventoryInstance,
  InventoryOffer,
  InventoryOfferDetails,
  InventoryResponse,
} from "@/types/inventory";

export interface InventoryImportFailure {
  row?: number | null;
  sku: string;
  stock?: string;
  code: number;
  message: string;
}

export interface InventoryDiagnostic {
  code: string;
  message: string;
  skus: string[];
}

export interface InventoryDiagnosticsResponse {
  success: boolean;
  data: {
    marketplace: {
      name: string;
      slug: string;
      logo?: string | null;
      account_name?: string | null;
    };
    errors: InventoryDiagnostic[];
    last_synced_at?: string | null;
  };
}

export class InventoryApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly refurbedCode?: number,
  ) {
    super(message);
    this.name = "InventoryApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json", ...options.headers },
    ...options,
  });
  const payload = (await response.json().catch(() => null)) as {
    message?: string;
    errors?: { refurbed_code?: number };
  } | null;
  if (!response.ok)
    throw new InventoryApiError(
      payload?.message || "Unable to complete the inventory request.",
      response.status,
      payload?.errors?.refurbed_code,
    );
  return payload as T;
}

export function getInventory(
  options: {
    page?: number;
    limit?: number;
    search?: string;
    search_by?: string;
    status?: string;
    grade?: string;
    stock?: string;
    sort?: string;
    market?: string;
  } = {},
): Promise<InventoryResponse> {
  const query = new URLSearchParams({ limit: String(options.limit ?? 25) });
  if (options.page) query.set("page", String(options.page));
  for (const key of [
    "search",
    "search_by",
    "status",
    "grade",
    "stock",
    "sort",
    "market",
  ] as const)
    if (options[key]) query.set(key, options[key]);
  return request<InventoryResponse>(`/api/inventory?${query.toString()}`);
}

export function syncInventory(): Promise<{
  success: boolean;
  message: string;
  data: { synchronized: number; complete: boolean };
}> {
  return request("/api/inventory/sync", { method: "POST" });
}

export function getInventoryDiagnostics(): Promise<InventoryDiagnosticsResponse> {
  return request("/api/inventory/diagnostics");
}

export function findInventoryInstance(
  identifier: string,
  identifierType: "gtin" | "id" | "mpn",
): Promise<{ success: boolean; data: { instance: InventoryInstance } }> {
  const query = new URLSearchParams({
    identifier,
    identifier_type: identifierType,
  });
  return request(`/api/inventory/instance?${query.toString()}`);
}

export function createInventoryOffer(input: Record<string, unknown>): Promise<{
  success: boolean;
  message: string;
  data: { offer?: InventoryOffer; operation_id?: number };
}> {
  return request("/api/inventory/offers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function updateInventoryOffer(
  offerId: string,
  input: Record<string, unknown>,
): Promise<{
  success: boolean;
  message: string;
  data: { offer?: InventoryOffer; operation_id?: number };
}> {
  return request(`/api/inventory/offers/${encodeURIComponent(offerId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function getInventoryOffer(
  offerId: string,
): Promise<{ success: boolean; data: { offer: InventoryOfferDetails } }> {
  return request(`/api/inventory/offers/${encodeURIComponent(offerId)}`);
}

export function deleteInventoryOffer(
  offerId: string,
): Promise<{ success: boolean; message: string }> {
  return request(`/api/inventory/offers/${encodeURIComponent(offerId)}`, {
    method: "DELETE",
  });
}

export function importInventoryFile(
  file: File,
  marketCode: string,
): Promise<{
  success: boolean;
  message: string;
  data: {
    market_code: string;
    processed: number;
    successful: number;
    failed: number;
    failures: InventoryImportFailure[];
  };
}> {
  const body = new FormData();
  body.append("file", file);
  body.append("market_code", marketCode);
  return request("/api/inventory/import", { method: "POST", body });
}

export function updateInventoryBulk(input: {
  offer_ids: string[];
  action:
    | "queue_upload"
    | "inactive"
    | "out_of_stock"
    | "add_tag"
    | "delete_tag"
    | "delete_all_tags";
  tag?: string;
}): Promise<{
  success: boolean;
  message: string;
  data: { updated: number; failed: number };
}> {
  return request("/api/inventory/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
