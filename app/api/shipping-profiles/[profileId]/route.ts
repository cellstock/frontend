import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";
type Context = { params: Promise<{ profileId: string }> };
export async function PATCH(request: Request, context: Context) {
  const { profileId } = await context.params;
  return proxyLaravelRequest(
    `/shipping-profiles/${encodeURIComponent(profileId)}`,
    { method: "PATCH", body: await request.json() },
  );
}
export async function DELETE(_request: Request, context: Context) {
  const { profileId } = await context.params;
  return proxyLaravelRequest(
    `/shipping-profiles/${encodeURIComponent(profileId)}`,
    { method: "DELETE" },
  );
}
