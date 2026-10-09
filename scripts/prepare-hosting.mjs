import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { writeFileSync, existsSync } from "node:fs";

loadEnvConfig(process.cwd(), false);
const value = process.env.LARAVEL_API_URL?.trim().replace(/\/+$/, "");
if (!value)
  throw new Error("Set LARAVEL_API_URL in .env.local before building.");
const url = new URL(value);
if (
  !["https:", "http:"].includes(url.protocol) ||
  url.username ||
  url.password ||
  url.search ||
  url.hash
)
  throw new Error(
    "LARAVEL_API_URL must be an HTTP(S) API base URL without credentials, query or fragment.",
  );
if (!existsSync("out/index.html"))
  throw new Error("Static export did not produce out/index.html.");
const phpString = value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
writeFileSync(
  "out/api/config.php",
  "<?php\n// Server-side configuration. Do not serve as text.\nreturn ['api_url' => '" +
    phpString +
    "'];\n",
);
console.log("Hostinger export ready: out/index.html and out/api/index.php.");
