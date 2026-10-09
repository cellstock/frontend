import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const apiUrl = process.env.LARAVEL_API_URL?.replace(/\/+$/, "");
    if (!apiUrl)
      return NextResponse.json(
        { success: false, message: "The Cellexa API is not configured." },
        { status: 503 },
      );
    const response = await fetch(`${apiUrl}/contact`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
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
