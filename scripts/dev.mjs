import nextEnv from "@next/env";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout } from "node:timers/promises";

nextEnv.loadEnvConfig(process.cwd(), true);
if (!process.env.LARAVEL_API_URL) {
  throw new Error("Set LARAVEL_API_URL in .env.local before starting development.");
}
const reservation = createServer();
await new Promise((resolve, reject) => {
  reservation.once("error", reject);
  reservation.listen(0, "127.0.0.1", resolve);
});
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const gateway = `http://127.0.0.1:${port}`;
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
function start(command, args, env, options = {}) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env,
    stdio: options.pipeLogs ? ["ignore", "pipe", "pipe"] : ["ignore", "inherit", "inherit"],
    windowsHide: true,
    ...options.spawn,
  });
  children.push(child);
  if (options.pipeLogs) {
    child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr?.on("data", (chunk) => process.stderr.write(chunk));
  }
  child.on("error", (error) => { console.error(error.message); stop(1); });
  if (options.exitStops !== false) {
    child.on("exit", (code) => stop(code ?? 1));
  }
  return child;
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
const phpEnv = {
  ...process.env,
  CELLEXA_BASE_PATH: "",
  LARAVEL_API_URL: process.env.LARAVEL_API_URL,
};
const phpBinary = process.env.PHP_BINARY || "php";
const php = start(
  phpBinary,
  ["-S", `127.0.0.1:${port}`, "scripts/dev-router.php"],
  phpEnv,
  { exitStops: false },
);
let phpExit = null;
php.on("exit", (code) => { phpExit = code ?? 1; });
let ready = false;
let lastError = "";
for (let attempt = 0; attempt < 100 && !stopping && phpExit === null; attempt++) {
  try {
    const response = await fetch(`${gateway}/api/auth/me`, { signal: AbortSignal.timeout(2000) });
    if (response.status < 500) {
      ready = true;
      break;
    }
    lastError = `gateway returned HTTP ${response.status}`;
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
  }
  await setTimeout(100);
}
if (!stopping && ready) {
  php.on("exit", (code) => stop(code ?? 1));
  start(process.execPath, ["node_modules/next/dist/bin/next", "dev", ...process.argv.slice(2)], {
    ...process.env,
    CELLEXA_DEV_GATEWAY_URL: gateway,
  });
} else if (!stopping) {
  if (phpExit !== null) {
    console.error(`The PHP development gateway exited with code ${phpExit}.`);
  } else {
    console.error("The PHP development gateway did not start.");
    if (lastError) console.error(lastError);
  }
  stop(1);
}
