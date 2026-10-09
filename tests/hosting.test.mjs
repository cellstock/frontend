import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFileSync, existsSync } from "node:fs";

test("PHP gateway preserves authentication, routes, uploads, and access checks", async (t) => {
  const requests = [];
  const upstream = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    requests.push({
      url: req.url,
      method: req.method,
      headers: req.headers,
      body: Buffer.concat(chunks).toString(),
    });
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/api/auth/login" || req.url === "/api/auth/register") {
      if (requests.at(-1).body.includes("invalid")) {
        res
          .writeHead(422)
          .end(
            JSON.stringify({
              success: false,
              errors: { email: ["Invalid email."] },
            }),
          );
        return;
      }
      res.end(
        JSON.stringify({
          success: true,
          message: "Signed in.",
          data: { token: "test-secret-token", user: { id: 7 } },
        }),
      );
    } else if (req.url === "/api/auth/me") {
      if (req.headers.authorization === "Bearer expired") {
        res
          .writeHead(401)
          .end(JSON.stringify({ success: false, message: "Expired." }));
        return;
      }
      res.end(
        JSON.stringify({
          success: true,
          data: {
            user: {
              id: 7,
              name: "Test User",
              email: "test@example.test",
              role: { name: "Admin", slug: "admin" },
              status: "active",
              last_login_at: null,
              has_avatar: true,
            },
          },
        }),
      );
    } else if (req.url === "/api/auth/profile/avatar" && req.method === "GET") {
      res.setHeader("Content-Type", "image/png");
      res.end(Buffer.from([137, 80, 78, 71]));
    } else {
      res.end(JSON.stringify({ success: true, data: { upstream: req.url } }));
    }
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const reserved = createServer();
  reserved.listen(0, "127.0.0.1");
  await once(reserved, "listening");
  const port = reserved.address().port;
  await new Promise((resolve) => reserved.close(resolve));
  const origin = "http://127.0.0.1:" + port;
  const php = spawn(
    process.env.PHP_BINARY || "php",
    ["-S", "127.0.0.1:" + port, "tests/hosting-router.php"],
    {
      cwd: process.cwd(),
      windowsHide: true,
      env: {
        ...process.env,
        LARAVEL_API_URL: "http://127.0.0.1:" + upstream.address().port + "/api",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let logs = "";
  php.stdout.on("data", (data) => {
    logs += data;
  });
  php.stderr.on("data", (data) => {
    logs += data;
  });
  let spawnError;
  php.on("error", (error) => {
    spawnError = error;
  });
  t.after(async () => {
    if (php.exitCode === null) {
      const ended = once(php, "exit");
      php.kill();
      await ended;
    }
    upstream.closeAllConnections();
    await new Promise((resolve) => upstream.close(resolve));
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (spawnError) throw spawnError;
    try {
      await fetch(origin + "/api/auth/me");
      break;
    } catch {
      if (attempt === 99) throw new Error(logs);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  const call = (path, options = {}) =>
    fetch(origin + "/api" + path, {
      ...options,
      headers: {
        Origin: origin,
        Accept: "application/json",
        ...options.headers,
      },
    });

  await t.test(
    "protected APIs reject anonymous requests without calling Laravel",
    async () => {
      const before = requests.length;
      const response = await call("/orders");
      assert.equal(response.status, 401);
      assert.equal(requests.length, before);
      assert.match(response.headers.get("cache-control"), /no-store/);
    },
  );
  let cookie;
  await t.test(
    "login creates HttpOnly cookie and never exposes token in JSON",
    async () => {
      const response = await call("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.test",
          password: "password",
        }),
      });
      assert.equal(response.status, 200);
      const setCookie = response.headers.get("set-cookie");
      assert.match(setCookie, /HttpOnly/i);
      assert.match(setCookie, /SameSite=Lax/i);
      cookie = setCookie.split(";")[0];
      assert.equal(
        (await response.text()).includes("test-secret-token"),
        false,
      );
    },
  );
  await t.test("current user is mapped to the frontend shape", async () => {
    const response = await call("/auth/me", { headers: { Cookie: cookie } });
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.data.user.roleSlug, "admin");
    assert.equal(result.data.user.hasAvatar, true);
    assert.equal(
      requests.at(-1).headers.authorization,
      "Bearer test-secret-token",
    );
  });
  await t.test(
    "route aliases, query filters and PATCH bodies reach Laravel",
    async () => {
      for (const [path, expected] of [
        ["/subscription", "/api/my-subscription"],
        ["/subscription/plans", "/api/available-plans"],
        ["/admin/users?page=2", "/api/users?page=2"],
        ["/orders?search=phone&page=2", "/api/orders?search=phone&page=2"],
      ]) {
        const response = await call(path, { headers: { Cookie: cookie } });
        assert.equal(response.status, 200);
        assert.equal(requests.at(-1).url, expected);
      }
      const response = await call("/orders/12/status", {
        method: "PATCH",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: '{"status":"shipped"}',
      });
      assert.equal(response.status, 200);
      assert.equal(requests.at(-1).method, "PATCH");
      assert.equal(requests.at(-1).body, '{"status":"shipped"}');
    },
  );
  await t.test("uploads retain file bytes and metadata", async () => {
    const form = new FormData();
    form.append(
      "file",
      new Blob(["sku,quantity\\nphone,3"], { type: "text/csv" }),
      "inventory.csv",
    );
    form.append("marketplace", "refurbed");
    const response = await call("/inventory/import", {
      method: "POST",
      headers: { Cookie: cookie },
      body: form,
    });
    assert.equal(response.status, 200);
    assert.match(
      requests.at(-1).headers["content-type"],
      /multipart\/form-data/,
    );
    assert.match(requests.at(-1).body, /inventory.csv/);
    assert.match(requests.at(-1).body, /phone,3/);
    assert.match(requests.at(-1).body, /refurbed/);
  });
  await t.test("authenticated avatars remain binary", async () => {
    const response = await call("/auth/profile/avatar", {
      headers: { Cookie: cookie },
    });
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.deepEqual(
      [...new Uint8Array(await response.arrayBuffer())],
      [137, 80, 78, 71],
    );
  });
  await t.test("upstream validation errors are preserved", async () => {
    const response = await call("/auth/register", {
      method: "POST",
      body: '{"email":"invalid"}',
    });
    assert.equal(response.status, 422);
    assert.deepEqual((await response.json()).errors.email, ["Invalid email."]);
  });
  await t.test(
    "cross-origin mutations and invalid routes never reach Laravel",
    async () => {
      const before = requests.length;
      assert.equal(
        (
          await call("/orders/1/status", {
            method: "PATCH",
            headers: { Origin: "https://evil.example", Cookie: cookie },
            body: "{}",
          })
        ).status,
        403,
      );
      assert.equal(
        (await call("/admin/secrets", { headers: { Cookie: cookie } })).status,
        404,
      );
      assert.equal(
        (
          await call("/orders", {
            method: "DELETE",
            headers: { Cookie: cookie },
          })
        ).status,
        405,
      );
      assert.equal(
        (
          await call("/inventory/offers/%2Fadmin", {
            headers: { Cookie: cookie },
          })
        ).status,
        400,
      );
      assert.equal(requests.length, before);
    },
  );
  await t.test("expired tokens clear the browser cookie", async () => {
    const response = await call("/auth/me", {
      headers: { Cookie: "cellexa_token=expired" },
    });
    assert.equal(response.status, 401);
    assert.match(response.headers.get("set-cookie"), /Max-Age=0/i);
  });
  await t.test("logout revokes upstream token and clears cookie", async () => {
    const response = await call("/auth/logout", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    assert.equal(response.status, 200);
    assert.equal(requests.at(-1).url, "/api/auth/logout");
    assert.match(response.headers.get("set-cookie"), /Max-Age=0/i);
  });
  assert.doesNotMatch(logs, /PHP (Warning|Fatal|Parse)/);
});

test("export contains HTML pages and PHP gateway, without Node server output", () => {
  for (const file of [
    "index.html",
    ".htaccess",
    "api/index.php",
    "api/config.php",
    "login/index.html",
    "dashboard/orders/detail/index.html",
    "dashboard/inventory/offers/edit/index.html",
    "dashboard/marketplaces/detail/index.html",
    "dashboard/inventory/add/index.html",
    "dashboard/analytics/repricing/strategies/index.html",
  ]) {
    assert.ok(existsSync("out/" + file), "Missing export: " + file);
  }
  assert.equal(existsSync("out/server"), false);
  assert.equal(existsSync("out/package.json"), false);
  assert.match(readFileSync("out/.htaccess", "utf8"), /api\/index\.php/);
});
