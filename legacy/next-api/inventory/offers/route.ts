import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export async function POST(request: Request) {
  return proxyLaravelRequest("/inventory/offers", {
    method: "POST",
    body: await request.json(),
  });
}
