import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.toString();
  return proxyLaravelRequest(`/refurbed-catalog/items?${query}`);
}
