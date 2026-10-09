import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export function GET() {
  return proxyLaravelRequest("/merchant-addresses");
}

export async function POST(request: Request) {
  return proxyLaravelRequest("/merchant-addresses", {
    method: "POST",
    body: await request.json(),
  });
}
