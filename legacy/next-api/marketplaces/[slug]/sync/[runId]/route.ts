import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; runId: string }> },
) {
  const { slug, runId } = await context.params;

  return proxyLaravelRequest(
    `/marketplaces/${encodeURIComponent(slug)}/sync/${encodeURIComponent(runId)}`,
  );
}
