import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const body: unknown = await request.json();

  return proxyLaravelRequest(
    `/marketplaces/${encodeURIComponent(slug)}/connection/options`,
    { method: "POST", body },
  );
}
