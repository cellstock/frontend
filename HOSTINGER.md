# Hostinger deployment (PHP hosting, no Node.js runtime)

Live URL: https://cellcheck.pro/

## Build locally

Keep the existing LARAVEL_API_URL in frontend/.env.local and leave the frontend prefix empty:

    NEXT_PUBLIC_BASE_PATH=

Run npm run build. The deployment files are generated in frontend/out, including index.html, _next, api, .htaccess, and all page directories.

For local frontend development, use npm run dev at http://localhost:3000/. This starts Next.js and a local PHP API gateway using LARAVEL_API_URL from .env.local. Restart npm run dev after changing environment settings. For the complete exported PHP preview, use npm run start at http://127.0.0.1:8080/. PHP must be on PATH.

## Upload

Upload **all contents of frontend/out directly into public_html** for cellcheck.pro:

    public_html/index.html
    public_html/.htaccess
    public_html/_next/
    public_html/api/
    public_html/dashboard/
    public_html/login/
    ...all other exported files and folders

Do not place these files inside public_html/frontend/out or public_html/out. Include the hidden .htaccess file. Replace the HTML, scripts and styles together from the same build, then clear the hosting cache and hard-refresh the browser.

Back up existing frontend files first. Keep the Laravel backend deployment separate and do not overwrite its files.

Enable PHP 8.1+, cURL, HTTPS, and Apache/LiteSpeed rewrite support. Node.js is required only on the build computer, not on Hostinger.

## API and authentication

The PHP gateway at /api/index.php forwards requests to the existing Laravel API. The generated api/config.php contains its API URL and an empty base_path. A server LARAVEL_API_URL environment variable overrides the generated API URL.

Tokens stay in host-only HttpOnly, SameSite=Lax cookies (Secure under HTTPS). Laravel enforces roles and permissions. Browser requests use the same frontend origin, so the gateway does not need cross-origin CORS.

Source files, .env.local, node_modules, .next and legacy do not need uploading.

## Verify after uploading

- Open https://cellcheck.pro/ and check styles and images.
- /api/auth/me returns JSON with HTTP 401 when signed out.
- Check login, navigation, orders, inventory, uploads and sign-out.
- Detail pages use /dashboard/orders/detail/?orderId=123 and /dashboard/marketplaces/detail/?slug=refurbed.
- Large imports require suitable PHP upload_max_filesize, post_max_size and execution limits.

CSS and scripts must now load from **/_next/**. Old HTML pointing to /frontend/out/_next/ must be replaced. Uploading only new CSS without the matching HTML and JavaScript is insufficient.

## Tests and alternate paths

npm run test:hosting checks gateway authentication, uploads, routing and exported assets. node tests/hosting-browser.mjs checks the root deployment with a mock API in headless Chrome.

If deploying to a subfolder later, set NEXT_PUBLIC_BASE_PATH to that URL prefix and rebuild before uploading. Local next dev remains at / regardless of the production prefix.

The previous Next.js handlers remain in legacy/next-api for reference and are excluded from the export.
