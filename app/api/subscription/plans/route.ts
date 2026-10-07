import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_TOKEN_COOKIE_NAME } from "@/lib/auth/constants";
export async function GET() {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_NAME)?.value;
  const base = process.env.LARAVEL_API_URL?.replace(/\/+$/, "");
  if (!token)
    return NextResponse.json(
      { success: false, message: "Unauthenticated." },
      { status: 401 },
    );
  if (!base)
    return NextResponse.json(
      { success: false, message: "API unavailable." },
      { status: 503 },
    );
  const response = await fetch(`${base}/available-plans`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
