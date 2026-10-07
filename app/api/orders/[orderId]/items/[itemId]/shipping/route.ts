import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string; itemId: string }> },
) {
  const { orderId, itemId } = await params;
  return proxyLaravelRequest(
    `/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/shipping`,
    { method: "PATCH", body: await request.json() },
  );
}
