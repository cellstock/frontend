import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyLaravelRequest("/dashboard");
}
