export type CredentialKind = "ai" | "github";

export const CREDENTIAL_KEYS: Record<CredentialKind, string> = {
  ai: "codex.cred.ai",
  github: "codex.cred.github",
};

export interface Credentials {
  get(kind: CredentialKind): string | null;
  set(kind: CredentialKind, value: string): void;
  clear(kind: CredentialKind): void;
}

export function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => { map.delete(k); },
    setItem: (k: string, v: string) => { map.set(k, v); },
  } as Storage;
}

function defaultStorage(): Storage {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch { /* storage blocked */ }
  return memoryStorage();
}

export function createCredentials(storage: Storage = defaultStorage()): Credentials {
  return {
    get(kind) {
      try {
        const v = storage.getItem(CREDENTIAL_KEYS[kind]);
        return v && v.trim() ? v.trim() : null;
      } catch { return null; }
    },
    set(kind, value) {
      const v = (value ?? "").trim();
      try {
        if (v) storage.setItem(CREDENTIAL_KEYS[kind], v);
        else storage.removeItem(CREDENTIAL_KEYS[kind]);
      } catch { /* storage blocked: the value is simply not remembered */ }
    },
    clear(kind) {
      try { storage.removeItem(CREDENTIAL_KEYS[kind]); } catch { /* nothing to clear */ }
    },
  };
}
