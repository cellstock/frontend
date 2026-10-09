import { apiFetch } from "@/lib/public-path";
import type {
  LoginCredentials,
  LoginResponse,
  SignupCredentials,
} from "@/types/auth";

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export async function signup(
  credentials: SignupCredentials,
): Promise<LoginResponse> {
  const response = await apiFetch("/api/auth/register", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const result = (await response.json().catch(() => ({
    success: false,
    message: "The authentication server returned an invalid response.",
  }))) as LoginResponse;
  if (!response.ok || !result.success)
    throw new AuthenticationError(
      result.message || "Unable to create your account.",
      response.status,
    );
  return result;
}

export async function login(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  const response = await apiFetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const contentType = response.headers.get("content-type");

  const result: LoginResponse = contentType?.includes("application/json")
    ? await response.json()
    : {
        success: false,
        message: "The authentication server returned an invalid response.",
      };

  if (!response.ok || !result.success) {
    throw new AuthenticationError(
      result.message || "Unable to sign in.",
      response.status,
    );
  }

  return result;
}
