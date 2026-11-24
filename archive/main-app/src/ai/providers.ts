export interface Provider {
  id: string;
  label: string;
  hint: string;
  models: string[];
  defaultModel: string;
  maxTokensKey: "max_tokens" | "max_completion_tokens";
}

export const PROVIDERS: Provider[] = [
  {
    id: "opencode",
    label: "OpenCode Go",
    hint: "opencode.ai/zen/go/v1 · key from the OpenCode Zen console (Go plan)",
    models: [
      "kimi-k3", "glm-5.3-flash", "glm-5.3", "gpt-5.6-luna", "qwen3.8-max",
      "qwen3.8-flash", "grok-4.6", "minimax-m3", "qwen3.7-max", "kimi-k2.7-code",
      "mimo-v2.5-pro", "deepseek-v4-pro", "deepseek-v4-flash",
    ],
    defaultModel: "kimi-k3",
    maxTokensKey: "max_tokens",
  },
  {
    id: "cerebras",
    label: "Cerebras (free tier)",
    hint: "api.cerebras.ai/v1 · key from cloud.cerebras.ai",
    models: ["gpt-oss-120b", "gemma-4-31b"],
    defaultModel: "gpt-oss-120b",
    maxTokensKey: "max_completion_tokens",
  },
];

export function providerById(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}
