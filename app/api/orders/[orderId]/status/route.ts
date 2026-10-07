import { NextResponse } from "next/server";

import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

interface RouteContext {
  params: Promise<{ orderId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { orderId } = await context.params;

  if (!/^\d+$/.test(orderId)) {
    return NextResponse.json(
      { success: false, message: "The order identifier is invalid." },
      { status: 400 },
    );
  }

  return proxyLaravelRequest(`/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    body: await request.json(),
  });
}
