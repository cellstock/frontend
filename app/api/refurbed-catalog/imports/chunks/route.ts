import { AUTH_TOKEN_COOKIE_NAME } from "@/lib/auth/constants";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_NAME)?.value;
  const baseUrl = process.env.LARAVEL_API_URL?.replace(/\/+$/, "");

  if (!token || !baseUrl) {
    return NextResponse.json(
      { success: false, message: "The catalog import is not configured." },
      { status: token ? 503 : 401 },
    );
  }

  const response = await fetch(`${baseUrl}/refurbed-catalog/imports/chunks`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: await request.formData(),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}
