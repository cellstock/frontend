import assert from "node:assert/strict";
import { createServer, get } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const chromePath = process.env.CHROME_BINARY || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const profile = mkdtempSync(join(tmpdir(), "cellexa-hosting-browser-"));
const requests = [];
const server = createServer(async (req, res) => {
  for await (const _ of req) { void _; }
  requests.push(req.url);
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/api/auth/login") {
    res.end(JSON.stringify({ success: true, data: { token: "browser-test-token" } }));
  } else if (req.url === "/api/auth/me" && req.headers.authorization) {
    res.end(JSON.stringify({ success: true, data: { user: {
      id: 1, name: "Hosting Test", email: "hosting@example.test", role: { name: "Admin", slug: "admin" },
      status: "active", has_avatar: false, last_login_at: null,
    } } }));
  } else if (req.url === "/api/auth/logout") {
    res.end(JSON.stringify({ success: true }));
  } else {
    res.writeHead(404).end(JSON.stringify({ success: false, message: "Test record not found." }));
  }
});
const readHttp = (url) => new Promise((resolve, reject) => {
  get(url, (response) => {
    const chunks = [];
    response.on("data", (chunk) => chunks.push(chunk));
    response.on("end", () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString() }));
    response.on("error", reject);
  }).on("error", reject);
});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(fn, label) {
  for (let i = 0; i < 150; i++) {
    try { const result = await fn(); if (result) return result; } catch { /* startup/navigation */ }
    await wait(100);
  }
  throw new Error("Timed out: " + label);
}
async function port() {
  const s = createServer(); s.listen(0, "127.0.0.1"); await once(s, "listening");
  const value = s.address().port; await new Promise((r) => s.close(r)); return value;
}
let php, chrome, socket;
try {
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const previewPort = await port();
  const origin = "http://127.0.0.1:" + previewPort;
  php = spawn(process.env.PHP_BINARY || "php", ["-S", "127.0.0.1:" + previewPort, "-t", "out", "scripts/preview.php"], {
    windowsHide: true, stdio: "ignore",
    env: { ...process.env, LARAVEL_API_URL: "http://127.0.0.1:" + server.address().port + "/api" },
  });
  await until(async () => (await readHttp(origin + "/login/")).status === 200, "PHP preview startup");
  chrome = spawn(chromePath, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"], { windowsHide: true, stdio: "ignore" });
  await until(() => existsSync(join(profile, "DevToolsActivePort")), "Chrome startup");
  const debugPort = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0];
  const tabs = JSON.parse((await readHttp("http://127.0.0.1:" + debugPort + "/json")).body);
  socket = new WebSocket(tabs.find((tab) => tab.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
  let sequence = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const entry = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) entry?.reject(new Error(JSON.stringify(message.error)));
      else entry?.resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.navigate", { url: origin + "/dashboard/settings/" });
  await until(() => evaluate('location.pathname === "/login/" && !!document.querySelector("#email")'), "anonymous dashboard redirect");
  console.log("PASS anonymous dashboard redirects to login");
  const stylesheet = await evaluate('document.querySelector(\'link[rel="stylesheet"]\').getAttribute("href")');
  assert.ok(stylesheet.startsWith("/_next/"), stylesheet);
  assert.equal((await readHttp(origin + stylesheet)).status, 200);
  assert.equal(await evaluate('getComputedStyle(document.querySelector(\'button[type="submit"]\')).display'), "flex");
  console.log("PASS CSS loads and styles apply beneath /");
  await evaluate(`(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    for (const [id, value] of [["email", "hosting@example.test"], ["password", "password123"]]) {
      const input = document.getElementById(id); setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  })()`);
  await evaluate('document.querySelector("form").requestSubmit()');
  await until(() => evaluate('location.pathname === "/dashboard/" && document.body.innerText.includes("Hosting Test")'), "login and dashboard session");
  assert.equal(await evaluate('document.cookie.includes("cellexa_token")'), false);
  console.log("PASS login form sets HttpOnly cookie and opens authenticated dashboard");
  await send("Page.navigate", { url: origin + "/dashboard/settings/" });
  await until(() => evaluate('!!document.querySelector(\'a[href="/dashboard/settings/seller-profile/"]\')'), "settings export hydration");
  await evaluate('document.querySelector(\'a[href="/dashboard/settings/seller-profile/"]\').click()');
  await until(() => evaluate('location.pathname === "/dashboard/settings/seller-profile/" && document.body.innerText.includes("Seller profile")'), "client-side navigation");
  console.log("PASS static catch-all route and client navigation");
  for (const [path, expected] of [
    ["/dashboard/orders/detail/?orderId=9001", "/api/orders/9001"],
    ["/dashboard/marketplaces/detail/?slug=sample-market", "/api/marketplaces/sample-market"],
    ["/dashboard/inventory/offers/edit/?offerId=sku%20one", "/api/inventory/offers/sku%20one"],
  ]) {
    await send("Page.navigate", { url: origin + path });
    await until(() => requests.includes(expected), "query-driven detail " + path);
  }
  console.log("PASS order, marketplace and offer details request IDs from query parameters");
  await evaluate('document.cookie = "cellexa_locale=fr; Path=/; SameSite=Lax"');
  await send("Page.navigate", { url: origin + "/dashboard/settings/" });
  await until(() => evaluate('document.documentElement.lang === "fr"'), "locale restored after reload");
  console.log("PASS saved locale restored without server rendering");
  await evaluate('fetch("/api/auth/logout", { method: "POST", headers: { Accept: "application/json" } }).then(r => r.json())');
  await send("Page.navigate", { url: origin + "/dashboard/settings/" });
  await until(() => evaluate('location.pathname === "/login/"'), "logout");
  console.log("PASS sign-out prevents dashboard access");
  assert.deepEqual(errors, [], "Browser runtime errors");
} finally {
  socket?.close();
  for (const child of [chrome, php]) {
    if (child && child.exitCode === null) {
      const ended = once(child, "exit"); child.kill(); await ended;
    }
  }
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
  // Remove only the temporary Chrome profile created by this test.
  if (profile.startsWith(join(tmpdir(), "cellexa-hosting-browser-")))
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
