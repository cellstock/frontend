import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const body: unknown = await request.json();

  return proxyLaravelRequest(
    `/marketplaces/${encodeURIComponent(slug)}/connection`,
    {
      method: "POST",
      body,
    },
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const body: unknown = await request.json();

  return proxyLaravelRequest(
    `/marketplaces/${encodeURIComponent(slug)}/connection`,
    {
      method: "PATCH",
      body,
    },
  );
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  return proxyLaravelRequest(
    `/marketplaces/${encodeURIComponent(slug)}/connection`,
    {
      method: "DELETE",
    },
  );
}
