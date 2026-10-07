import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  return proxyLaravelRequest(`/orders/${encodeURIComponent(orderId)}/refresh`, {
    method: "POST",
  });
}
