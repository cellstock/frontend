import { NextResponse } from "next/server";

import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    orderId: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { orderId } = await context.params;

  if (!/^\d+$/.test(orderId)) {
    return NextResponse.json(
      {
        success: false,
        message: "The order identifier is invalid.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          Pragma: "no-cache",
        },
      },
    );
  }

  return proxyLaravelRequest(`/orders/${encodeURIComponent(orderId)}`);
}
