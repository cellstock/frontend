import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return proxyLaravelRequest(
    `/inventory/instance?${url.searchParams.toString()}`,
  );
}
