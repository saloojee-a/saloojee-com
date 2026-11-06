const FONT_PATHS = new Set(
  ["a", "b", "c", "d"].flatMap((cut) =>
    ["regular", "bold"].map((weight) => `/fonts/die-grotesk-${cut}-${weight}.woff2`),
  ),
);

const PUBLIC_FONT_ASSETS = new Map([
  ["/fonts/jetbrains-mono-regular.ttf", "font/ttf"],
  ["/fonts/jetbrains-mono-OFL.txt", "text/plain; charset=utf-8"],
]);

const PRODUCTION_HOSTS = new Set(["saloojee.com", "www.saloojee.com"]);

function isSameOriginFontRequest(request, url) {
  if (!PRODUCTION_HOSTS.has(url.hostname)) return false;
  if (request.headers.get("Sec-Fetch-Site") !== "same-origin") return false;
  if (request.headers.get("Sec-Fetch-Dest") !== "font") return false;

  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return false;

  const referer = request.headers.get("Referer");
  if (referer) {
    try {
      if (new URL(referer).origin !== url.origin) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export default {
  async fetch(request, env) {
    let url;
    try {
      url = new URL(request.url);
    } catch {
      return new Response(null, { status: 400 });
    }
    if (!url.pathname.startsWith("/fonts/")) {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    const publicContentType = PUBLIC_FONT_ASSETS.get(url.pathname);
    if (
      !publicContentType &&
      (!FONT_PATHS.has(url.pathname) ||
        env.ENVIRONMENT !== "production" ||
        !isSameOriginFontRequest(request, url))
    ) {
      return new Response(null, { status: 404 });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 200 && response.status !== 304) return response;

    const headers = new Headers(response.headers);
    headers.set("Content-Type", publicContentType ?? "font/woff2");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Cross-Origin-Resource-Policy", "same-origin");
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(request.method === "HEAD" ? null : response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
