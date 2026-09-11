/* Codex AI proxy. A pass-through that adds CORS so the static app on GitHub
   Pages can talk to an OpenAI-compatible provider with the user's own key.
   It stores nothing, logs nothing, and holds no secret of its own.

   POST <worker>/ai/<provider>/<upstream path>
   header x-provider-key: the user's provider key, forwarded as a bearer token. */

export const PROVIDERS = {
  opencode: "https://opencode.ai/zen/go/v1",
  cerebras: "https://api.cerebras.ai/v1",
};

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-provider-key, accept",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders() },
  });
}

export async function handle(request, fetchImpl = fetch) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "ai" || parts.length < 3) {
    return jsonError("expected /ai/<provider>/<path>", 404);
  }

  const provider = parts[1];
  const base = PROVIDERS[provider];
  if (!base) return jsonError(`unknown provider "${provider}"`, 404);

  const key = request.headers.get("x-provider-key");
  if (!key) return jsonError("missing x-provider-key header", 401);

  const target = `${base}/${parts.slice(2).join("/")}${url.search}`;
  const upstream = await fetchImpl(target, {
    method: request.method,
    headers: {
      "Content-Type": request.headers.get("content-type") || "application/json",
      Accept: request.headers.get("accept") || "application/json",
      Authorization: `Bearer ${key}`,
      "User-Agent": "codex-ai-proxy/1.0",
    },
    body: request.method === "GET" ? undefined : request.body ?? (await request.text()),
    // Cloudflare needs this to stream a request body through.
    duplex: "half",
  });

  const headers = new Headers(upstream.headers);
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
  headers.delete("set-cookie");
  return new Response(upstream.body, { status: upstream.status, headers });
}

export default { fetch: (request) => handle(request) };
