import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_TOKEN_COOKIE_NAME } from "@/lib/auth/constants";

const REQUEST_TIMEOUT_MS = 15_000;

type ProxyMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface LaravelProxyOptions {
  method?: ProxyMethod;
  body?: unknown;
}

function createErrorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
      },
    },
  );
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  return null;
}

export async function proxyLaravelRequest(
  endpoint: string,
  options: LaravelProxyOptions = {},
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    return createErrorResponse("Unauthenticated.", 401);
  }

  const laravelApiUrl = process.env.LARAVEL_API_URL?.replace(/\/+$/, "");

  if (!laravelApiUrl) {
    console.error("LARAVEL_API_URL is not configured.");

    return createErrorResponse("The CelleXa API is not configured.", 503);
  }

  const method = options.method ?? "GET";

  try {
    const response = await fetch(`${laravelApiUrl}${endpoint}`, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const result = await readResponseBody(response);

    const proxyResponse = NextResponse.json(
      result ?? {
        success: response.ok,
        message: response.ok
          ? "Request completed successfully."
          : "The CelleXa API returned an invalid response.",
      },
      {
        status: response.status,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          Pragma: "no-cache",
        },
      },
    );

    if (response.status === 401) {
      proxyResponse.cookies.set(AUTH_TOKEN_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
    }

    return proxyResponse;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      return createErrorResponse("The CelleXa API request timed out.", 504);
    }

    console.error(`Laravel proxy request failed: ${method} ${endpoint}`, error);

    return createErrorResponse("Unable to connect to the CelleXa API.", 503);
  }
}
