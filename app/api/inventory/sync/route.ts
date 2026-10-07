import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export async function POST() {
  return proxyLaravelRequest("/inventory/sync", { method: "POST" });
}
