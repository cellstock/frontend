import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_TOKEN_COOKIE_NAME, LOGIN_ROUTE } from "@/lib/auth/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUEST_TIMEOUT_MS = 10_000;

function clearAuthenticationCookie(response: NextResponse) {
  response.cookies.set(AUTH_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const originHeader = request.headers.get("origin");

  if (originHeader && originHeader !== requestUrl.origin) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid logout request.",
      },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value;

  const laravelApiUrl = process.env.LARAVEL_API_URL?.replace(/\/+$/, "");

  if (token && laravelApiUrl) {
    try {
      const laravelResponse = await fetch(`${laravelApiUrl}/auth/logout`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!laravelResponse.ok && laravelResponse.status !== 401) {
        console.error(
          `Laravel logout failed with status ${laravelResponse.status}.`,
        );
      }
    } catch (error) {
      console.error("Unable to revoke the Laravel token:", error);
    }
  }

  const response = request.headers.get("accept")?.includes("application/json")
    ? NextResponse.json({ success: true })
    : NextResponse.redirect(new URL(LOGIN_ROUTE, request.url), { status: 303 });

  clearAuthenticationCookie(response);

  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");

  return response;
}
