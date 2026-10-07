import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string; type: string }> },
) {
  const { orderId, type } = await params;
  return proxyLaravelRequest(
    `/orders/${encodeURIComponent(orderId)}/address/${encodeURIComponent(type)}`,
    { method: "PATCH", body: await request.json() },
  );
}
