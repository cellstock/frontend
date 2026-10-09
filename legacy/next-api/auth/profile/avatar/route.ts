import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_TOKEN_COOKIE_NAME } from "@/lib/auth/constants";

export const dynamic = "force-dynamic";
const endpoint = () => {
  const apiUrl = process.env.LARAVEL_API_URL?.replace(/\/+$/, "");
  return apiUrl ? `${apiUrl}/auth/profile/avatar` : null;
};

async function token() {
  return (await cookies()).get(AUTH_TOKEN_COOKIE_NAME)?.value;
}
function unavailable() {
  return NextResponse.json(
    { success: false, message: "Unauthenticated." },
    { status: 401 },
  );
}

export async function GET() {
  const authToken = await token();
  if (!authToken) return unavailable();
  const url = endpoint();
  if (!url) return new NextResponse(null, { status: 503 });
  try {
    const response = await fetch(url, {
      headers: { Accept: "image/*", Authorization: `Bearer ${authToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok)
      return new NextResponse(null, { status: response.status });
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authToken = await token();
  if (!authToken) return unavailable();
  const url = endpoint();
  if (!url)
    return NextResponse.json(
      { success: false, message: "The Cellexa API is not configured." },
      { status: 503 },
    );
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: await request.formData(),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
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
      { success: false, message: "Unable to upload the profile image." },
      { status: 503 },
    );
  }
}

export async function DELETE() {
  const authToken = await token();
  if (!authToken) return unavailable();
  const url = endpoint();
  if (!url)
    return NextResponse.json(
      { success: false, message: "The Cellexa API is not configured." },
      { status: 503 },
    );
  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
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
      { success: false, message: "Unable to remove the profile image." },
      { status: 503 },
    );
  }
}
