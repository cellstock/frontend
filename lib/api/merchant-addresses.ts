export type MerchantAddressRecord = {
  id: number;
  external_id: string;
  label: string | null;
  first_name: string | null;
  family_name: string | null;
  company_name: string | null;
  country_code: string | null;
  post_code: string | null;
  town: string | null;
  street_name: string | null;
  house_no: string | null;
  supplement: string | null;
  phone_number: string | null;
  type: "DELIVERY" | "RETURN";
  sync_status: "pending" | "synced" | "failed";
  sync_error: string | null;
  last_synced_at: string | null;
};

export type MerchantAddressInput = Omit<
  MerchantAddressRecord,
  "id" | "external_id" | "sync_status" | "sync_error" | "last_synced_at"
>;

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    cache: "no-store",
    ...options,
  });
  const result = await response.json();

  if (!response.ok)
    throw new Error(result.message || "Unable to save the merchant address.");

  return result as T;
}

export function getMerchantAddressRecords() {
  return request<{
    success: boolean;
    data: { addresses: MerchantAddressRecord[] };
  }>("/api/merchant-addresses");
}

export function createMerchantAddress(input: MerchantAddressInput) {
  return request("/api/merchant-addresses", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMerchantAddress(id: number, input: MerchantAddressInput) {
  return request(`/api/merchant-addresses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteMerchantAddress(id: number) {
  return request(`/api/merchant-addresses/${id}`, { method: "DELETE" });
}
