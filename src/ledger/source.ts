export interface Repo { owner: string; name: string }

export interface LedgerSource {
  ref: string;
  readText(path: string): Promise<string>;
  /** Commit sha for the ref, or null when it cannot be resolved. */
  head(): Promise<string | null>;
}

async function shaOf(
  repo: Repo, ref: string, token: string | null, f: typeof fetch,
): Promise<string | null> {
  const headers: Record<string, string> = { Accept: "application/vnd.github.sha" };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const r = await f(
      `https://api.github.com/repos/${repo.owner}/${repo.name}/commits/${encodeURIComponent(ref)}`,
      { headers },
    );
    if (!r.ok) return null;
    const text = (await r.text()).trim();
    return /^[0-9a-f]{7,40}$/.test(text) ? text : null;
  } catch {
    return null;
  }
}

export function rawSource(repo: Repo, ref: string, fetchImpl: typeof fetch = fetch): LedgerSource {
  return {
    ref,
    async readText(path) {
      const url =
        `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${ref}/${path}`;
      const r = await fetchImpl(url);
      if (!r.ok) throw new Error(`${path} not found at ${ref} (${r.status})`);
      return await r.text();
    },
    head: () => shaOf(repo, ref, null, fetchImpl),
  };
}

export function apiSource(
  repo: Repo, ref: string, token: string, fetchImpl: typeof fetch = fetch,
): LedgerSource {
  return {
    ref,
    async readText(path) {
      const url =
        `https://api.github.com/repos/${repo.owner}/${repo.name}/contents/${path}` +
        `?ref=${encodeURIComponent(ref)}`;
      const r = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      });
      if (!r.ok) throw new Error(`${path} not found at ${ref} (${r.status})`);
      const body = (await r.json()) as { content: string; encoding: string };
      if (body.encoding !== "base64") throw new Error(`${path}: unexpected encoding`);
      return new TextDecoder().decode(
        Uint8Array.from(atob(body.content.replace(/\n/g, "")), (c) => c.charCodeAt(0)),
      );
    },
    head: () => shaOf(repo, ref, token, fetchImpl),
  };
}

export function pickSource(
  repo: Repo, ref: string, token: string | null, fetchImpl: typeof fetch = fetch,
): LedgerSource {
  return token ? apiSource(repo, ref, token, fetchImpl) : rawSource(repo, ref, fetchImpl);
}
