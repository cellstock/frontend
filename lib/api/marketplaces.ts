import { apiFetch } from "@/lib/public-path";
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  ConnectMarketplaceRequest,
  MarketplaceActionResponse,
  MarketplaceListResponse,
  MarketplaceConnectionOptionsResponse,
  MarketplaceResponse,
  SyncMarketplaceRequest,
  SyncMarketplaceResponse,
  UpdateMarketplaceConnectionRequest,
  ValidationErrors,
} from "@/types/marketplace";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
}

export class MarketplaceApiError extends Error {
  readonly status: number;
  readonly validationErrors: ValidationErrors;

  constructor(
    message: string,
    status: number,
    validationErrors: ValidationErrors = {},
  ) {
    super(message);

    this.name = "MarketplaceApiError";
    this.status = status;
    this.validationErrors = validationErrors;
  }
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<ApiErrorResponse>;

  return (
    candidate.message === undefined || typeof candidate.message === "string"
  );
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";

  let response: Response;

  try {
    response = await apiFetch(endpoint, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new MarketplaceApiError(
      "Unable to connect to CelleXa. Please try again.",
      0,
    );
  }

  const result = await readJsonResponse(response);
  options.signal?.throwIfAborted();

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cellexa:session-expired"));
    }

    throw new MarketplaceApiError(
      "Your session has expired. Please sign in again.",
      401,
    );
  }

  if (!response.ok) {
    const errorResponse = isApiErrorResponse(result) ? result : null;

    const defaultMessage =
      response.status === 404
        ? "The requested marketplace or connection was not found."
        : response.status === 422
          ? "Please correct the highlighted fields."
          : response.status >= 500
            ? "Something went wrong. Please try again."
            : "Unable to complete the request.";

    throw new MarketplaceApiError(
      errorResponse?.message || defaultMessage,
      response.status,
      errorResponse?.errors ?? {},
    );
  }

  if (result === null) {
    throw new MarketplaceApiError(
      "The server returned an invalid response.",
      response.status,
    );
  }

  if (method !== "GET" && typeof window !== "undefined") {
    window.dispatchEvent(new Event("cellexa:data-changed"));
  }
  return result as T;
}

export function getMarketplaces(
  signal?: AbortSignal,
): Promise<MarketplaceListResponse> {
  return apiRequest<MarketplaceListResponse>("/api/marketplaces", { signal });
}

export function getMarketplace(
  slug: string,
  signal?: AbortSignal,
): Promise<MarketplaceResponse> {
  return apiRequest<MarketplaceResponse>(
    `/api/marketplaces/${encodeURIComponent(slug)}`,
    { signal },
  );
}

export function connectMarketplace(
  slug: string,
  input: ConnectMarketplaceRequest,
): Promise<MarketplaceActionResponse> {
  return apiRequest<MarketplaceActionResponse>(
    `/api/marketplaces/${encodeURIComponent(slug)}/connection`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function getMarketplaceConnectionOptions(
  slug: string,
  apiKey?: string,
): Promise<MarketplaceConnectionOptionsResponse> {
  return apiRequest<MarketplaceConnectionOptionsResponse>(
    `/api/marketplaces/${encodeURIComponent(slug)}/connection/options`,
    {
      method: "POST",
      body: apiKey ? { credentials: { api_key: apiKey } } : {},
    },
  );
}

export function updateMarketplaceConnection(
  slug: string,
  input: UpdateMarketplaceConnectionRequest,
): Promise<MarketplaceActionResponse> {
  return apiRequest<MarketplaceActionResponse>(
    `/api/marketplaces/${encodeURIComponent(slug)}/connection`,
    {
      method: "PATCH",
      body: input,
    },
  );
}

export function testMarketplaceConnection(
  slug: string,
): Promise<MarketplaceActionResponse> {
  return apiRequest<MarketplaceActionResponse>(
    `/api/marketplaces/${encodeURIComponent(slug)}/connection/test`,
    {
      method: "POST",
    },
  );
}

export function synchronizeMarketplace(
  slug: string,
  input: SyncMarketplaceRequest,
): Promise<SyncMarketplaceResponse> {
  return apiRequest<SyncMarketplaceResponse>(
    `/api/marketplaces/${encodeURIComponent(slug)}/sync`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function getMarketplaceSyncRun(
  slug: string,
  runId: number,
): Promise<SyncMarketplaceResponse> {
  return apiRequest<SyncMarketplaceResponse>(
    `/api/marketplaces/${encodeURIComponent(slug)}/sync/${runId}`,
  );
}

export function disconnectMarketplace(
  slug: string,
): Promise<ApiSuccessResponse> {
  return apiRequest<ApiSuccessResponse>(
    `/api/marketplaces/${encodeURIComponent(slug)}/connection`,
    {
      method: "DELETE",
    },
  );
}

export interface MarketplaceWebhookDetails {
  status:
    | "not_requested"
    | "generated"
    | "pending"
    | "requested"
    | "active"
    | "failed";
  manages_orders: boolean;
  notification_url: string | null;
  requested_at: string | null;
  activated_at: string | null;
  last_received_at: string | null;
}

interface MarketplaceWebhookResponse {
  success: boolean;
  message?: string;
  data: MarketplaceWebhookDetails;
}

export function getMarketplaceWebhook(
  slug: string,
): Promise<MarketplaceWebhookResponse> {
  return apiRequest(
    `/api/marketplaces/${encodeURIComponent(slug)}/connection/webhook`,
  );
}

export function generateMarketplaceWebhook(
  slug: string,
): Promise<MarketplaceWebhookResponse> {
  return apiRequest(
    `/api/marketplaces/${encodeURIComponent(slug)}/connection/webhook`,
    { method: "POST", body: { action: "generate" } },
  );
}

export function requestMarketplaceWebhookActivation(
  slug: string,
): Promise<MarketplaceWebhookResponse> {
  return apiRequest(
    `/api/marketplaces/${encodeURIComponent(slug)}/connection/webhook`,
    {
      method: "POST",
      body: { action: "request_activation" },
    },
  );
}
