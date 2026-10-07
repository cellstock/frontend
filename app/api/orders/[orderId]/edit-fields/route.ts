import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  return proxyLaravelRequest(
    `/orders/${encodeURIComponent(orderId)}/edit-fields`,
    { method: "PATCH", body: await request.json() },
  );
}
