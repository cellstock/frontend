import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export async function GET() {
  return proxyLaravelRequest("/refurbed-catalog");
}
