import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyLaravelRequest(
    `/refurbed-catalog/imports/${encodeURIComponent(id)}`,
  );
}
