import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

type Context = { params: Promise<{ sku: string }> };

export async function GET(_request: Request, context: Context) {
  const { sku } = await context.params;
  return proxyLaravelRequest(`/inventory/offers/${encodeURIComponent(sku)}`);
}

export async function PATCH(request: Request, context: Context) {
  const { sku } = await context.params;
  return proxyLaravelRequest(`/inventory/offers/${encodeURIComponent(sku)}`, {
    method: "PATCH",
    body: await request.json(),
  });
}

export async function DELETE(_request: Request, context: Context) {
  const { sku } = await context.params;
  return proxyLaravelRequest(`/inventory/offers/${encodeURIComponent(sku)}`, {
    method: "DELETE",
  });
}
