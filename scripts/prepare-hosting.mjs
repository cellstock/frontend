import nextEnv from "@next/env";
import { writeFileSync, readFileSync, existsSync } from "node:fs";

nextEnv.loadEnvConfig(process.cwd(), false);
const value = process.env.LARAVEL_API_URL?.trim().replace(/\/+$/, "");
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");
if (!/^(\/[a-zA-Z0-9_-]+)*$/.test(basePath)) throw new Error("Invalid NEXT_PUBLIC_BASE_PATH.");
if (!value) throw new Error("Set LARAVEL_API_URL in .env.local before building.");
const url = new URL(value);
if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash)
  throw new Error("LARAVEL_API_URL must be an HTTP(S) API base URL without credentials, query or fragment.");
if (!existsSync("out/index.html")) throw new Error("Static export did not produce out/index.html.");
const phpString = value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
writeFileSync("out/api/config.php", "<?php\n// Server-side deployment configuration.\nreturn ['api_url' => '" + phpString + "', 'base_path' => '" + basePath + "'];\n");
// Rewrite targets and the error page must use the same prefix as the HTML.
const rules = readFileSync("public/.htaccess", "utf8")
  .replace("ErrorDocument 404 /404.html", "ErrorDocument 404 " + basePath + "/404.html")
  .replaceAll(" /dashboard/", " " + basePath + "/dashboard/");
writeFileSync("out/.htaccess", rules);
console.log("Hostinger export ready at " + (basePath || "/") + ": out/index.html and out/api/index.php.");
