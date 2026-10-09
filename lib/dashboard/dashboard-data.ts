import { apiFetch } from "@/lib/public-path";
import type { DashboardData } from "@/types/dashboard";

export async function getDashboardData(
  signal?: AbortSignal,
): Promise<DashboardData> {
  const response = await apiFetch("/api/dashboard", {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (response.status === 401) {
    window.dispatchEvent(new Event("cellexa:session-expired"));
    throw new Error("Your session has expired. Please sign in again.");
  }
  const result = await response.json();
  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message || "Unable to load dashboard.");
  }
  return result.data;
}
