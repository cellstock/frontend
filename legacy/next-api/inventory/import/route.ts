import { AUTH_TOKEN_COOKIE_NAME } from "@/lib/auth/constants";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_NAME)?.value;
  if (!token)
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  const baseUrl = process.env.LARAVEL_API_URL?.replace(/\/+$/, "");
  if (!baseUrl) {
    return NextResponse.json(
      { success: false, message: "Backend API URL is not configured." },
      { status: 503 },
    );
  }

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/inventory/import`,
    {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      body: await request.formData(),
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    },
  );
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}
