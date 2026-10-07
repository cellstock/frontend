import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

type Context = { params: Promise<{ addressId: string }> };

export async function PATCH(request: Request, context: Context) {
  const { addressId } = await context.params;
  return proxyLaravelRequest(
    `/merchant-addresses/${encodeURIComponent(addressId)}`,
    {
      method: "PATCH",
      body: await request.json(),
    },
  );
}

export async function DELETE(_request: Request, context: Context) {
  const { addressId } = await context.params;
  return proxyLaravelRequest(
    `/merchant-addresses/${encodeURIComponent(addressId)}`,
    {
      method: "DELETE",
    },
  );
}
