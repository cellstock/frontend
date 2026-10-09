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
function start(command, args, env) {
  const child = spawn(command, args, { stdio: "inherit", env });
  children.push(child);
  child.on("error", (error) => { console.error(error.message); stop(1); });
  child.on("exit", (code) => stop(code ?? 1));
  return child;
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
start("php", ["-S", `127.0.0.1:${port}`, "scripts/dev-router.php"], {
  ...process.env, CELLEXA_BASE_PATH: "",
});
let ready = false;
for (let attempt = 0; attempt < 50 && !stopping; attempt++) {
  try {
    await fetch(`${gateway}/api/auth/me`, { signal: AbortSignal.timeout(1000) });
    ready = true;
    break;
  } catch { await setTimeout(100); }
}
if (!stopping && ready) {
  start(process.execPath, ["node_modules/next/dist/bin/next", "dev", ...process.argv.slice(2)], {
    ...process.env, CELLEXA_DEV_GATEWAY_URL: gateway,
  });
} else if (!stopping) {
  console.error("The PHP development gateway did not start.");
  stop(1);
}
