import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;

  if (!/^\d+$/.test(orderId)) {
    return NextResponse.json(
      { success: false, message: "The order identifier is invalid." },
      { status: 400 },
    );
  }

  return proxyLaravelRequest(
    `/orders/${encodeURIComponent(orderId)}/merchant-addresses`,
  );
}
