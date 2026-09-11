import { describe, it, expect } from "vitest";
import { PROVIDERS, corsHeaders, handle } from "../../worker/src/worker.js";

function upstream(body: string, status = 200, headers: Record<string, string> = {}) {
  const seen: Array<{ url: string; init: RequestInit }> = [];
  const impl = (async (url: string, init: RequestInit) => {
    seen.push({ url, init });
    return new Response(body, {
      status, headers: { "content-type": "text/event-stream", ...headers },
    });
  }) as unknown as typeof fetch;
  return { impl, seen };
}

describe("worker", () => {
  it("knows exactly the two launch providers", () => {
    expect(Object.keys(PROVIDERS).sort()).toEqual(["cerebras", "opencode"]);
    expect(PROVIDERS.cerebras).toBe("https://api.cerebras.ai/v1");
  });

  it("answers a CORS preflight", async () => {
    const r = await handle(new Request("https://w.dev/ai/cerebras/chat/completions", {
      method: "OPTIONS",
    }));
    expect(r.status).toBe(204);
    expect(r.headers.get("access-control-allow-origin")).toBe("*");
    expect(r.headers.get("access-control-allow-headers")).toContain("x-provider-key");
    expect(corsHeaders()["Access-Control-Allow-Methods"]).toContain("POST");
  });

  it("forwards to the provider base with the key as a bearer token", async () => {
    const { impl, seen } = upstream("data: hello\n\n");
    const r = await handle(
      new Request("https://w.dev/ai/cerebras/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", "x-provider-key": "sk-test" },
        body: '{"model":"gpt-oss-120b"}',
      }),
      impl,
    );
    expect(seen[0].url).toBe("https://api.cerebras.ai/v1/chat/completions");
    expect((seen[0].init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    expect(r.status).toBe(200);
    expect(r.headers.get("access-control-allow-origin")).toBe("*");
    expect(await r.text()).toBe("data: hello\n\n");
  });

  it("passes a streaming body through untouched", async () => {
    const { impl } = upstream("data: a\n\ndata: b\n\ndata: [DONE]\n\n");
    const r = await handle(
      new Request("https://w.dev/ai/opencode/chat/completions", {
        method: "POST", headers: { "x-provider-key": "k" }, body: "{}",
      }),
      impl,
    );
    expect(r.headers.get("content-type")).toBe("text/event-stream");
    expect(await r.text()).toContain("data: [DONE]");
  });

  it("refuses an unknown provider", async () => {
    const r = await handle(new Request("https://w.dev/ai/evilcorp/chat/completions", {
      method: "POST", headers: { "x-provider-key": "k" }, body: "{}",
    }));
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: "unknown provider \"evilcorp\"" });
  });

  it("refuses a request with no key", async () => {
    const r = await handle(new Request("https://w.dev/ai/cerebras/chat/completions", {
      method: "POST", body: "{}",
    }));
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: "missing x-provider-key header" });
  });

  it("refuses a path outside /ai/", async () => {
    const r = await handle(new Request("https://w.dev/whatever", { method: "POST" }));
    expect(r.status).toBe(404);
  });
});
