# Hostinger deployment (PHP hosting, no Node.js runtime)

The frontend exports HTML/CSS/JavaScript to `out`. A PHP gateway at `out/api/index.php` forwards API calls to the existing Laravel backend. PHP 8.1+ with cURL and Apache/LiteSpeed rewrite support is required on the **frontend domain**, as well as on the backend. Enable HTTPS on both domains.

## Build locally

1. Keep the existing `LARAVEL_API_URL=https://your-api-domain/api` in `frontend/.env.local`. It must be the reachable Laravel API base URL, not a frontend URL or filesystem path.
2. Run `npm ci`, then `npm run build`.
3. The build generates `out/index.html`, page directories, `_next`, `.htaccess`, and `api/config.php`.
4. Preview the export locally with `npm run start` (PHP must be on PATH), then visit `http://127.0.0.1:8080`.

Node.js is needed only on the build computer. Do not run `next start` on the host. `npm run dev` can preview frontend edits, but the PHP API requires the exported PHP preview.

## Upload

Upload the **contents** of `frontend/out` to the frontend domain's document root (usually `public_html`), including the hidden `.htaccess` file. The result should be `public_html/index.html`, not `public_html/out/index.html`.

Keep the existing Laravel backend deployment. Do not overwrite its files or use its document root for the frontend. This export assumes the frontend is served at the domain root, not at a `/frontend` URL prefix. Back up existing frontend files before replacing them.

No `node_modules`, `.next`, source files, or `.env.local` need uploading. `out/api/config.php` contains only the configured API base URL. Change its `api_url` value on the server if the backend address changes, or rebuild locally. A server environment variable `LARAVEL_API_URL` takes precedence.

## Verify after upload

- Open the homepage, login page, and a dashboard URL directly.
- `/api/auth/me` should return JSON with HTTP 401 when signed out (not an HTML 404 page).
- Sign in with an existing account and check orders, inventory, subscription, avatar uploads and sign-out.
- Detail URLs use `/dashboard/orders/detail/?orderId=123`, `/dashboard/marketplaces/detail/?slug=refurbed`, and `/dashboard/inventory/offers/edit/?offerId=...`. Apache redirects old detail bookmarks.
- For large inventory/catalog imports, set PHP `upload_max_filesize`, `post_max_size`, and execution limits to match the Laravel limits.

The gateway stores the Laravel bearer token in a host-only HttpOnly, SameSite=Lax cookie (Secure under HTTPS). It checks the origin of mutations and forwards authorization to Laravel. Laravel still enforces roles and account access. Dashboard HTML is an empty public shell; private data loads only after session validation.

If API calls return HTML or 404, confirm `.htaccess` was uploaded and PHP/rewrite support is enabled. A 503 means the API base URL, PHP cURL, or server-to-server connectivity needs checking. Cross-origin browser CORS configuration is unnecessary because the browser calls its own frontend PHP gateway.

## Source organization

The replaced Next.js handlers are preserved in `legacy/next-api` for reference and are excluded from the static application. Do not upload the legacy folder.
