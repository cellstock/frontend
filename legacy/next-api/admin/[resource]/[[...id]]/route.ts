import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_TOKEN_COOKIE_NAME } from "@/lib/auth/constants";
const allowed = new Set(["users", "roles", "plans", "subscriptions"]);
async function forward(
  request: Request,
  context: { params: Promise<{ resource: string; id?: string[] }> },
) {
  const { resource, id } = await context.params;
  if (!allowed.has(resource))
    return NextResponse.json(
      { success: false, message: "Not found." },
      { status: 404 },
    );
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_NAME)?.value;
  if (!token)
    return NextResponse.json(
      { success: false, message: "Unauthenticated." },
      { status: 401 },
    );
  const base = process.env.LARAVEL_API_URL?.replace(/\/+$/, "");
  if (!base)
    return NextResponse.json(
      { success: false, message: "API unavailable." },
      { status: 503 },
    );
  const source = new URL(request.url);
  const target = `${base}/${resource}${id?.length ? `/${id.map(encodeURIComponent).join("/")}` : ""}${source.search}`;
  try {
    const body = ["GET", "HEAD"].includes(request.method)
      ? undefined
      : await request.text();
    const response = await fetch(target, {
      method: request.method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to connect to CelleXa." },
      { status: 503 },
    );
  }
}
export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
