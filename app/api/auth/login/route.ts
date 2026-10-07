import { NextResponse } from "next/server";

import {
  AUTH_TOKEN_COOKIE_NAME,
  AUTH_TOKEN_DURATION_SECONDS,
} from "@/lib/auth/constants";
import type { LoginCredentials } from "@/types/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUEST_TIMEOUT_MS = 10_000;

interface LaravelUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  last_login_at: string | null;
}

interface LaravelLoginResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    token_type: string;
    user: LaravelUser;
  };
}

function jsonResponse(
  data: {
    success: boolean;
    message: string;
    user?: LaravelUser;
  },
  status: number,
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

function isLoginCredentials(value: unknown): value is LoginCredentials {
  if (!value || typeof value !== "object") {
    return false;
  }

  const credentials = value as Record<string, unknown>;

  return (
    typeof credentials.email === "string" &&
    typeof credentials.password === "string"
  );
}

async function readLaravelResponse(
  response: Response,
): Promise<LaravelLoginResponse | null> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return null;
  }

  return response.json();
}

export async function POST(request: Request) {
  try {
    const requestBody: unknown = await request.json();

    if (!isLoginCredentials(requestBody)) {
      return jsonResponse(
        {
          success: false,
          message: "Email address and password are required.",
        },
        400,
      );
    }

    const credentials: LoginCredentials = {
      email: requestBody.email.trim().toLowerCase(),
      password: requestBody.password,
    };

    if (!credentials.email || !credentials.password) {
      return jsonResponse(
        {
          success: false,
          message: "Email address and password are required.",
        },
        400,
      );
    }

    const laravelApiUrl = process.env.LARAVEL_API_URL?.replace(/\/+$/, "");

    if (!laravelApiUrl) {
      console.error("LARAVEL_API_URL is not configured.");

      return jsonResponse(
        {
          success: false,
          message: "The Cellexa API is not configured.",
        },
        503,
      );
    }

    const laravelResponse = await fetch(`${laravelApiUrl}/auth/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const result = await readLaravelResponse(laravelResponse);

    if (!laravelResponse.ok) {
      return jsonResponse(
        {
          success: false,
          message:
            result?.message || "The email address or password is incorrect.",
        },
        laravelResponse.status,
      );
    }

    const token = result?.data?.token;
    const user = result?.data?.user;

    if (!result?.success || !token || !user) {
      console.error("Laravel returned an invalid login response.", result);

      return jsonResponse(
        {
          success: false,
          message: "The authentication server returned an invalid response.",
        },
        502,
      );
    }

    const response = jsonResponse(
      {
        success: true,
        message: result.message || "Login successful.",
        user,
      },
      200,
    );

    response.cookies.set(AUTH_TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: AUTH_TOKEN_DURATION_SECONDS,
      priority: "high",
    });

    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonResponse(
        {
          success: false,
          message: "The login request contains invalid data.",
        },
        400,
      );
    }

    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      return jsonResponse(
        {
          success: false,
          message: "The Cellexa API request timed out.",
        },
        504,
      );
    }

    console.error("Login API error:", error);

    return jsonResponse(
      {
        success: false,
        message: "Unable to connect to the Cellexa API.",
      },
      503,
    );
  }
}
