import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthApiError, getCurrentUserFromToken } from "@/lib/auth/auth-server";
import { AUTH_TOKEN_COOKIE_NAME } from "@/lib/auth/constants";

export const dynamic = "force-dynamic";

function createJsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

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

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    return createJsonResponse(
      {
        success: false,
        message: "Unauthenticated.",
      },
      401,
    );
  }

  try {
    const user = await getCurrentUserFromToken(token);

    return createJsonResponse({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      const response = createJsonResponse(
        {
          success: false,
          message: error.message,
        },
        error.status,
      );

      if (error.status === 401) {
        clearAuthenticationCookie(response);
      }

      return response;
    }

    console.error("Unexpected current-user error:", error);

    return createJsonResponse(
      {
        success: false,
        message: "Unable to retrieve the current user.",
      },
      500,
    );
  }
}
