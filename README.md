# CelleXa Wecell Frontend

Next.js frontend for CelleXa marketplace orders, inventory, shipping profiles, merchant addresses, returns, catalog imports, settings, and synchronization issues.

## Required software

- Node.js 20.9 or newer (Node.js 24 is currently used for development)
- npm 10 or newer
- Git
- A configured and running CelleXa Laravel backend

Main application versions:

- Next.js 16.3.5
- React 19.2.8
- TypeScript 5.x
- Tailwind CSS 4.x

Check the installed tools:

```bash
node --version
npm --version
git --version
```

## Local installation

1. Install and configure the backend first. Its README contains the database, migrations, queue worker, scheduler, and marketplace setup.

2. Clone the project and enter the frontend directory:

```bash
git clone <repository-url>
cd <repository-folder>/cellexa-wecell-frontend
```

3. Install the locked dependency versions:

```bash
npm ci
```

Use `npm install` only when intentionally updating dependencies.

4. Create `.env.local` in the frontend root.

Windows PowerShell:

```powershell
New-Item .env.local -ItemType File -Force
```

macOS/Linux:

```bash
touch .env.local
```

5. Add the Laravel API URL:

```dotenv
LARAVEL_API_URL=http://127.0.0.1:8000/api
```

`LARAVEL_API_URL` is server-only and must include Laravel's `/api` prefix. Do not add `NEXT_PUBLIC_` and do not store marketplace credentials in the frontend environment.

Keep the frontend and backend host style consistent. If Laravel uses `127.0.0.1`, open Next.js through `127.0.0.1` too. Mixing `localhost` and `127.0.0.1` can cause authentication-cookie problems.

6. Confirm the backend is available:

```text
http://127.0.0.1:8000/api/health
```

7. Start the frontend:

```bash
npm run dev
```

8. Open:

```text
http://127.0.0.1:3000
```

The frontend defaults to port `3000`. If it is occupied, Next.js selects another port and prints it in the terminal.

## Complete local startup

Run these processes in separate terminals.

Terminal 1 — Laravel API:

```bash
cd cellexa-wecell-backend
php artisan serve --host=127.0.0.1 --port=8000
```

Terminal 2 — marketplace queue:

```bash
cd cellexa-wecell-backend
php artisan queue:work --queue=marketplaces,default --tries=3 --timeout=900
```

Terminal 3 — automatic synchronization scheduler:

```bash
cd cellexa-wecell-backend
php artisan schedule:work
```

Terminal 4 — Next.js frontend:

```bash
cd cellexa-wecell-frontend
npm run dev
```

The queue worker and scheduler are required. Without them, marketplace operations remain pending and automatic synchronization does not run.

## Development accounts

When the backend is installed with `php artisan migrate --seed`, it creates:

- Administrator: `admin@cellexa.com`
- Standard user: `user@cellexa.com`
- Development password: `Password@1`

These credentials are for local development only.

## Available commands

Start development mode:

```bash
npm run dev
```

Check ESLint:

```bash
npm run lint
```

Check TypeScript:

```bash
npx tsc --noEmit
```

Check formatting:

```bash
npm run format:check
```

Run the resource-cache test:

```bash
npm run test:cache
```

Create and run a production build:

```bash
npm run build
npm run start
```

## First-use checklist

1. Verify Laravel `/api/health` responds successfully.
2. Verify the Laravel queue worker is running.
3. Verify `php artisan schedule:work` is running.
4. Start Next.js and sign in using the seeded administrator account.
5. Connect or configure a marketplace in **Settings**.
6. Select the locales CelleXa should manage for orders and offers.
7. Test the marketplace connection.
8. For Refurbed, configure instant-order notifications from the connection page.
9. Import the Refurbed catalog if catalog-based inventory creation is needed.
10. Check **Synchronization Issues** if a queued action fails.

## Common problems

- **`LARAVEL_API_URL is not configured`**: create `.env.local`, add the API URL, and restart Next.js.
- **API requests return 500/502**: confirm Laravel is running at the exact configured URL.
- **Login succeeds but the page remains signed out**: use the same hostname style for both applications and clear old cookies.
- **Marketplace actions remain pending**: start the Laravel queue worker.
- **Data does not synchronize automatically**: start Laravel's scheduler.
- **Changes to `.env.local` are ignored**: stop and restart Next.js.
- **Port 3000 is occupied**: use the printed URL, or run `npm run dev -- --port 3001`.
- **Build fails after moving machines**: delete `.next`, run `npm ci`, and build again.

Windows PowerShell cleanup:

```powershell
Remove-Item -Recurse -Force .next
npm ci
```

macOS/Linux cleanup:

```bash
rm -rf .next
npm ci
```

## Production setup

1. Set the production Laravel API URL in the deployment environment:

```dotenv
LARAVEL_API_URL=https://api.example.com/api
```

2. Install dependencies and build:

```bash
npm ci
npm run build
```

3. Run the application:

```bash
npm run start
```

Keep the Next.js process alive with the hosting platform, systemd, Supervisor, PM2, or a container process manager. Use HTTPS for both frontend and backend in production.
