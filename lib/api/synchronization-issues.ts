import { apiFetch } from "@/lib/public-path";
export type SynchronizationIssue = {
  id: string;
  kind: "sync_run" | "merchant_address" | "connection";
  title: string;
  marketplace: string;
  account: string | null;
  message: string;
  occurred_at: string | null;
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
    ...options,
  });
  const result = await response.json();

  if (!response.ok)
    throw new Error(
      result.message || "Unable to process the synchronization issue.",
    );

  return result as T;
}

export function getSynchronizationIssues() {
  return request<{
    success: boolean;
    data: { issues: SynchronizationIssue[] };
  }>("/api/synchronization-issues");
}

export function retrySynchronizationIssue(id: string) {
  return request<{ success: boolean; message: string }>(
    `/api/synchronization-issues/${encodeURIComponent(id)}/retry`,
    { method: "POST" },
  );
}
