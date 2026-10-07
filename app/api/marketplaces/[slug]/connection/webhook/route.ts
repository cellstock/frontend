import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(_: Request, context: RouteContext) {
  const { slug } = await context.params;
  return proxyLaravelRequest(
    `/marketplaces/${encodeURIComponent(slug)}/connection/webhook`,
  );
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return proxyLaravelRequest(
    `/marketplaces/${encodeURIComponent(slug)}/connection/webhook`,
    {
      method: "POST",
      body: await request.json(),
    },
  );
}
