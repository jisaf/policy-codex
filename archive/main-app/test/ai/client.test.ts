import { describe, it, expect } from "vitest";
import { streamChat } from "../../src/ai/client";
import { providerById } from "../../src/ai/providers";

function sseResponse(lines: string[]) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const l of lines) controller.enqueue(new TextEncoder().encode(l));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

describe("streamChat", () => {
  it("posts to the worker with the key header and streams content", async () => {
    let seenUrl = "";
    let seenInit: RequestInit = {};
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seenUrl = url;
      seenInit = init;
      return sseResponse([
        'data: {"choices":[{"delta":{"content":"all "}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"of the"}}]}\n\n',
        'data: {"choices":[{"finish_reason":"stop","delta":{}}]}\n\n',
        "data: [DONE]\n\n",
      ]);
    }) as unknown as typeof fetch;

    const chunks: string[] = [];
    const text = await streamChat(
      {
        workerBase: "https://w.dev", provider: providerById("cerebras")!,
        model: "gpt-oss-120b", key: "sk-test", system: "sys", user: "usr", fetchImpl,
      },
      (c) => { if (!c.done) chunks.push(c.content); },
    );

    expect(seenUrl).toBe("https://w.dev/ai/cerebras/chat/completions");
    expect((seenInit.headers as Record<string, string>)["x-provider-key"]).toBe("sk-test");
    const sent = JSON.parse(seenInit.body as string);
    expect(sent.model).toBe("gpt-oss-120b");
    expect(sent.stream).toBe(true);
    expect(sent.max_completion_tokens).toBe(24000);
    expect(sent.messages[0]).toEqual({ role: "system", content: "sys" });
    expect(text).toBe("all of the");
    expect(chunks).toEqual(["all ", "of the"]);
  });

  it("counts reasoning characters separately", async () => {
    const fetchImpl = (async () => sseResponse([
      'data: {"choices":[{"delta":{"reasoning":"thinking"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
      "data: [DONE]\n\n",
    ])) as unknown as typeof fetch;
    let reasoning = 0;
    const text = await streamChat(
      {
        workerBase: "https://w.dev", provider: providerById("opencode")!,
        model: "kimi-k3", key: "k", system: "s", user: "u", fetchImpl,
      },
      (c) => { reasoning = c.reasoningChars; },
    );
    expect(text).toBe("ok");
    expect(reasoning).toBe(8);
  });

  it("surfaces an error response body", async () => {
    const fetchImpl = (async () => new Response(
      JSON.stringify({ error: { message: "rate limited" } }), { status: 429 },
    )) as unknown as typeof fetch;
    await expect(streamChat(
      {
        workerBase: "https://w.dev", provider: providerById("cerebras")!,
        model: "m", key: "k", system: "s", user: "u", fetchImpl,
      },
      () => {},
    )).rejects.toThrow("rate limited");
  });
});
