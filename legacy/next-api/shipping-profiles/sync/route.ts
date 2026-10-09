import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";
export async function POST() {
  return proxyLaravelRequest("/shipping-profiles/sync", { method: "POST" });
}
