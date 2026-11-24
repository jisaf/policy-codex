import type { Repo } from "../ledger/source";

export class GitHubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

export interface PullRequest {
  number: number; title: string; body: string;
  headRef: string; headSha: string; baseRef: string;
  url: string; state: string;
}

export interface PutFileArgs {
  path: string; content: string; message: string; branch: string; sha?: string | null;
}
export interface DeleteFileArgs { path: string; message: string; branch: string; sha: string }

export interface GitHubClient {
  readonly repo: Repo;
  readonly hasToken: boolean;
  getRefSha(ref: string): Promise<string>;
  getFileSha(path: string, ref: string): Promise<string | null>;
  branchExists(name: string): Promise<boolean>;
  createBranch(name: string, fromSha: string): Promise<void>;
  putFile(args: PutFileArgs): Promise<void>;
  deleteFile(args: DeleteFileArgs): Promise<void>;
  findPullRequest(headRef: string): Promise<PullRequest | null>;
  createPullRequest(
    args: { title: string; body: string; headRef: string; baseRef: string },
  ): Promise<PullRequest>;
  updatePullRequest(num: number, body: string): Promise<PullRequest>;
  getPullRequest(num: number): Promise<PullRequest>;
}

export function encodeContent(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

interface RawPull {
  number: number; title: string; body: string | null; state: string; html_url: string;
  head: { ref: string; sha: string }; base: { ref: string };
}

function toPull(raw: RawPull): PullRequest {
  return {
    number: raw.number, title: raw.title, body: raw.body ?? "", state: raw.state,
    url: raw.html_url, headRef: raw.head.ref, headSha: raw.head.sha, baseRef: raw.base.ref,
  };
}

export function createGitHubClient(
  repo: Repo, token: string | null, fetchImpl: typeof fetch = fetch,
): GitHubClient {
  const base = `https://api.github.com/repos/${repo.owner}/${repo.name}`;

  async function call<T>(
    method: string, url: string, body?: unknown, allow404 = false,
  ): Promise<T | null> {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const r = await fetchImpl(url, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (r.status === 404 && allow404) return null;
    const payload = (await r.json().catch(() => ({}))) as { message?: string };
    if (!r.ok) {
      throw new GitHubError(payload.message || `GitHub returned ${r.status}`, r.status);
    }
    return payload as T;
  }

  function requireToken(): void {
    if (!token) {
      throw new GitHubError("a GitHub token is required to propose changes", 401);
    }
  }

  return {
    repo,
    hasToken: Boolean(token),

    async getRefSha(ref) {
      const r = await call<{ object: { sha: string } }>(
        "GET", `${base}/git/ref/${encodeURIComponent("heads/" + ref)}`,
      );
      return r!.object.sha;
    },

    async getFileSha(path, ref) {
      const r = await call<{ sha: string }>(
        "GET", `${base}/contents/${path}?ref=${encodeURIComponent(ref)}`, undefined, true,
      );
      return r ? r.sha : null;
    },

    async branchExists(name) {
      const r = await call<unknown>(
        "GET", `${base}/git/ref/${encodeURIComponent("heads/" + name)}`, undefined, true,
      );
      return r !== null;
    },

    async createBranch(name, fromSha) {
      requireToken();
      await call("POST", `${base}/git/refs`, { ref: `refs/heads/${name}`, sha: fromSha });
    },

    async putFile({ path, content, message, branch, sha }) {
      requireToken();
      await call("PUT", `${base}/contents/${path}`, {
        message, branch, content: encodeContent(content), ...(sha ? { sha } : {}),
      });
    },

    async deleteFile({ path, message, branch, sha }) {
      requireToken();
      await call("DELETE", `${base}/contents/${path}`, { message, branch, sha });
    },

    async findPullRequest(headRef) {
      const q = `head=${encodeURIComponent(`${repo.owner}:${headRef}`)}&state=open`;
      const list = await call<RawPull[]>("GET", `${base}/pulls?${q}`);
      return list && list.length ? toPull(list[0]) : null;
    },

    async createPullRequest({ title, body, headRef, baseRef }) {
      requireToken();
      const raw = await call<RawPull>(
        "POST", `${base}/pulls`, { title, body, head: headRef, base: baseRef },
      );
      return toPull(raw!);
    },

    async updatePullRequest(num, body) {
      requireToken();
      const raw = await call<RawPull>("PATCH", `${base}/pulls/${num}`, { body });
      return toPull(raw!);
    },

    async getPullRequest(num) {
      const raw = await call<RawPull>("GET", `${base}/pulls/${num}`);
      return toPull(raw!);
    },
  };
}
