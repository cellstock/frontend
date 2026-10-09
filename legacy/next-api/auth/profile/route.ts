import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_TOKEN_COOKIE_NAME } from "@/lib/auth/constants";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_NAME)?.value;
  if (!token)
    return NextResponse.json(
      { success: false, message: "Unauthenticated." },
      { status: 401 },
    );
  const apiUrl = process.env.LARAVEL_API_URL?.replace(/\/+$/, "");
  if (!apiUrl)
    return NextResponse.json(
      { success: false, message: "The Cellexa API is not configured." },
      { status: 503 },
    );

  try {
    const response = await fetch(`${apiUrl}/auth/profile`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(await request.json()),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return NextResponse.json(
      {
        success: false,
        message: timedOut
          ? "The Cellexa API request timed out."
          : "Unable to connect to the Cellexa API.",
      },
      { status: timedOut ? 504 : 503 },
    );
  }
}
