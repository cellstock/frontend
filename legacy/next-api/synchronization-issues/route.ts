import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export function GET() {
  return proxyLaravelRequest("/synchronization-issues");
}
