import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export const dynamic = "force-dynamic";

const ALLOWED_FILTERS = [
  "search",
  "marketplace",
  "status",
  "country_code",
  "page",
  "per_page",
] as const;

function normalizePositiveInteger(
  value: string | null,
  maximum?: number,
): string | null {
  if (!value) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return null;
  }

  if (maximum !== undefined) {
    return String(Math.min(parsedValue, maximum));
  }

  return String(parsedValue);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const query = new URLSearchParams();

  for (const filter of ALLOWED_FILTERS) {
    const value = requestUrl.searchParams.get(filter)?.trim();

    if (!value) {
      continue;
    }

    if (filter === "page") {
      const page = normalizePositiveInteger(value);

      if (page) {
        query.set("page", page);
      }

      continue;
    }

    if (filter === "per_page") {
      const perPage = normalizePositiveInteger(value, 100);

      if (perPage) {
        query.set("per_page", perPage);
      }

      continue;
    }

    query.set(filter, value);
  }

  const queryString = query.toString();

  return proxyLaravelRequest(`/orders${queryString ? `?${queryString}` : ""}`);
}
