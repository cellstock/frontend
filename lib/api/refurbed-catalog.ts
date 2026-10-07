export interface RefurbedCatalogImport {
  id: number;
  file_name: string;
  status: "queued" | "processing" | "completed" | "failed";
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export interface RefurbedCatalogItem {
  instance_id: string;
  name: string | null;
  name_de: string | null;
  attributes: string | null;
  attributes_de: string | null;
  main_category: string | null;
}

async function catalogRequest<T>(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...options?.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    (T & { message?: string }) | null;

  if (!response.ok || !payload) {
    throw new Error(payload?.message || "Unable to load the Refurbed catalog.");
  }

  return payload;
}

export function getRefurbedCatalog() {
  return catalogRequest<{
    success: boolean;
    data: {
      items_count: number;
      categories: string[];
      latest_import: RefurbedCatalogImport | null;
    };
  }>("/api/refurbed-catalog");
}

export async function uploadRefurbedCatalog(
  file: File,
  onProgress?: (percentage: number) => void,
) {
  const chunkSize = 1024 * 1024;
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
  const uploadId = crypto.randomUUID();
  let finalResponse: {
    success: boolean;
    message: string;
    data: { complete: boolean; import?: RefurbedCatalogImport };
  } | null = null;

  for (let index = 0; index < totalChunks; index++) {
    const body = new FormData();
    body.append("upload_id", uploadId);
    body.append("chunk_index", String(index));
    body.append("total_chunks", String(totalChunks));
    body.append("file_name", file.name);
    body.append(
      "chunk",
      file.slice(index * chunkSize, (index + 1) * chunkSize),
      `${file.name}.part`,
    );

    finalResponse = await catalogRequest(
      "/api/refurbed-catalog/imports/chunks",
      {
        method: "POST",
        body,
      },
    );
    onProgress?.(Math.round(((index + 1) / totalChunks) * 100));
  }

  if (!finalResponse?.data.import) {
    throw new Error("The catalog upload did not finish correctly.");
  }

  return {
    ...finalResponse,
    data: { import: finalResponse.data.import },
  };
}

export function getRefurbedCatalogImport(id: number) {
  return catalogRequest<{
    success: boolean;
    data: { import: RefurbedCatalogImport };
  }>(`/api/refurbed-catalog/imports/${id}`);
}

export function searchRefurbedCatalog(
  options: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const query = new URLSearchParams({
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 24),
  });
  if (options.search) query.set("search", options.search);
  if (options.category) query.set("category", options.category);

  return catalogRequest<{
    success: boolean;
    data: {
      items: RefurbedCatalogItem[];
      pagination: {
        current_page: number;
        last_page: number;
        total: number;
      };
    };
  }>(`/api/refurbed-catalog/items?${query.toString()}`);
}
