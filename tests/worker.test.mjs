import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/worker.mjs";

function fetchAsset(
  path,
  { environment = "production", method = "GET", headers = {}, status = 200 } = {},
) {
  return worker.fetch(new Request(`https://saloojee.com${path}`, { method, headers }), {
    ENVIRONMENT: environment,
    ASSETS: {
      fetch: async () => new Response(status === 304 ? null : "asset", { status }),
    },
  });
}

const sameOriginFontHeaders = {
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-Dest": "font",
  Origin: "https://saloojee.com",
};

test("JetBrains Mono and its license are public in production and preview", async () => {
  for (const environment of ["production", "preview"]) {
    for (const [path, contentType] of [
      ["/fonts/jetbrains-mono-regular.ttf", "font/ttf"],
      ["/fonts/jetbrains-mono-OFL.txt", "text/plain; charset=utf-8"],
    ]) {
      const response = await fetchAsset(path, { environment });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Content-Type"), contentType);
      assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
      assert.equal(await response.text(), "asset");
    }
  }
});

test("public font assets support HEAD and reject unsupported methods", async () => {
  const path = "/fonts/jetbrains-mono-regular.ttf";
  const head = await fetchAsset(path, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  const post = await fetchAsset(path, { method: "POST" });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("Allow"), "GET, HEAD");
});

test("font asset responses preserve missing and not-modified statuses", async () => {
  for (const status of [404, 304]) {
    const response = await fetchAsset("/fonts/jetbrains-mono-regular.ttf", { status });
    assert.equal(response.status, status);
  }
});

test("commercial fonts still require a same-origin production font request", async () => {
  const path = "/fonts/die-grotesk-a-regular.woff2";
  assert.equal((await fetchAsset(path)).status, 404);
  assert.equal(
    (await fetchAsset(path, { environment: "preview", headers: sameOriginFontHeaders })).status,
    404,
  );
  assert.equal(
    (
      await fetchAsset(path, {
        headers: { ...sameOriginFontHeaders, Origin: "https://other.example" },
      })
    ).status,
    404,
  );
  const allowed = await fetchAsset(path, { headers: sameOriginFontHeaders });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get("Content-Type"), "font/woff2");
  assert.equal(allowed.headers.get("Cross-Origin-Resource-Policy"), "same-origin");
});

test("unlisted font paths stay blocked and other assets are served", async () => {
  assert.equal((await fetchAsset("/fonts/unlisted.ttf")).status, 404);
  assert.equal((await fetchAsset("/og-image.png")).status, 200);
});
