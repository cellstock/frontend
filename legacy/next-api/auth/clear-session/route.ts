import { NextResponse } from "next/server";

import { AUTH_TOKEN_COOKIE_NAME, LOGIN_ROUTE } from "@/lib/auth/constants";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const response = NextResponse.redirect(
    new URL(`${LOGIN_ROUTE}?reason=session-expired`, request.url),
    { status: 303 },
  );

  response.cookies.set(AUTH_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  response.headers.set("Cache-Control", "no-store");

  return response;
}
