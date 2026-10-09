import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  return proxyLaravelRequest(
    `/orders/${encodeURIComponent(orderId)}/refund/calculate`,
    {
      method: "POST",
      body: await request.json(),
    },
  );
}
