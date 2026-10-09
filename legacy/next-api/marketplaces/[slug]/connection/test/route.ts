import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  return proxyLaravelRequest(
    `/marketplaces/${encodeURIComponent(slug)}/connection/test`,
    {
      method: "POST",
    },
  );
}
