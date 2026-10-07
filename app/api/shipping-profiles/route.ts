import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.toString();
  const endpoint = query ? `/shipping-profiles?${query}` : "/shipping-profiles";

  return proxyLaravelRequest(endpoint);
}

export async function POST(request: Request) {
  return proxyLaravelRequest("/shipping-profiles", {
    method: "POST",
    body: await request.json(),
  });
}
