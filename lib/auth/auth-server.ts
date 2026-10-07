import type {
  AuthenticatedUser,
  CurrentUserResponse,
  LaravelAuthenticatedUser,
} from "@/types/auth";
import { cache } from "react";

const REQUEST_TIMEOUT_MS = 10_000;

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

function isLaravelUser(value: unknown): value is LaravelAuthenticatedUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const user = value as Record<string, unknown>;

  return (
    typeof user.id === "number" &&
    typeof user.name === "string" &&
    typeof user.email === "string" &&
    user.role !== null &&
    typeof user.role === "object" &&
    "name" in user.role &&
    typeof user.role.name === "string" &&
    typeof user.status === "string" &&
    (typeof user.last_login_at === "string" || user.last_login_at === null) &&
    typeof user.has_avatar === "boolean"
  );
}

function mapUser(user: LaravelAuthenticatedUser): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    roleSlug: user.role.slug,
    status: user.status,
    lastLoginAt: user.last_login_at,
    hasAvatar: user.has_avatar,
  };
}

async function readJsonResponse(
  response: Response,
): Promise<CurrentUserResponse | null> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return null;
  }

  return response.json();
}

export async function fetchCurrentUserFromToken(
  token: string,
): Promise<AuthenticatedUser> {
  const laravelApiUrl = process.env.LARAVEL_API_URL?.replace(/\/+$/, "");

  if (!laravelApiUrl) {
    throw new AuthApiError("The Cellexa API is not configured.", 503);
  }

  try {
    const response = await fetch(`${laravelApiUrl}/auth/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const result = await readJsonResponse(response);

    if (!response.ok) {
      throw new AuthApiError(
        result?.message ||
          (response.status === 401
            ? "Your session has expired."
            : "Unable to retrieve the current user."),
        response.status,
      );
    }

    const user = result?.data?.user;

    if (!result?.success || !isLaravelUser(user)) {
      throw new AuthApiError(
        "The authentication server returned an invalid response.",
        502,
      );
    }

    return mapUser(user);
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error;
    }

    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new AuthApiError("The Cellexa API request timed out.", 504);
    }

    throw new AuthApiError("Unable to connect to the Cellexa API.", 503);
  }
}

export const getCurrentUserFromToken = cache(fetchCurrentUserFromToken);
