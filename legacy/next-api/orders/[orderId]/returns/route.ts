import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  return proxyLaravelRequest(`/orders/${encodeURIComponent(orderId)}/returns`);
}
