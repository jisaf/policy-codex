import type { Provider } from "./providers";

export interface ChatRequest {
  workerBase: string;
  provider: Provider;
  model: string;
  key: string;
  system: string;
  user: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

export interface StreamChunk {
  content: string;
  reasoningChars: number;
  finishReason: string | null;
  done: boolean;
}

/** Streams a chat completion through the Worker and resolves with the full
 *  content. `onChunk` sees each delta as it arrives. */
export async function streamChat(
  req: ChatRequest, onChunk: (c: StreamChunk) => void,
): Promise<string> {
  const f = req.fetchImpl ?? fetch;
  const body: Record<string, unknown> = {
    model: req.model,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
    temperature: 0.2,
    reasoning_effort: "low",
    stream: true,
    stream_options: { include_usage: true },
  };
  body[req.provider.maxTokensKey] = 24000;

  const r = await f(`${req.workerBase.replace(/\/$/, "")}/ai/${req.provider.id}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      "x-provider-key": req.key,
    },
    body: JSON.stringify(body),
    signal: req.signal,
  });

  if (!r.ok) {
    const text = await r.text();
    let message = `the provider returned ${r.status}`;
    try {
      const payload = JSON.parse(text) as { error?: { message?: string } | string };
      const e = payload.error;
      message = typeof e === "string" ? e : e?.message ?? message;
    } catch { /* keep the status message */ }
    throw new Error(message);
  }
  if (!r.body) throw new Error("the provider returned no body");

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let reasoningChars = 0;
  let finishReason: string | null = null;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      let ev: any;
      try { ev = JSON.parse(data); } catch { continue; }
      for (const ch of ev.choices ?? []) {
        const d = ch.delta ?? {};
        if (d.content) {
          content += d.content;
          onChunk({ content: d.content, reasoningChars, finishReason, done: false });
        }
        const reasoning = d.reasoning ?? d.reasoning_content;
        if (reasoning) {
          reasoningChars += String(reasoning).length;
          onChunk({ content: "", reasoningChars, finishReason, done: false });
        }
        if (ch.finish_reason) finishReason = ch.finish_reason;
      }
    }
  }
  onChunk({ content: "", reasoningChars, finishReason, done: true });
  if (finishReason === "length") {
    throw new Error(
      "the model ran out of output budget before finishing the JSON; " +
        "try a lighter model or a shorter passage",
    );
  }
  return content;
}
