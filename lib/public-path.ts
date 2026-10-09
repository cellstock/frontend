/** Prefix browser URLs for deployments below the domain root. */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function publicPath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || !basePath) return path;
  if (path === basePath || path.startsWith(basePath + "/")) return path;
  return basePath + path;
}

/** API requests stay on the frontend origin so HttpOnly cookies work. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(publicPath(path), init);
}
