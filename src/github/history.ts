import type { Repo } from "../ledger/source";

export interface HistoryEntry {
  sha: string;
  date: string;
  message: string;
  url: string;
  pr?: { number: number; url: string };
}

interface RawCommit {
  sha: string;
  html_url: string;
  commit: { message: string; author?: { date?: string } };
}

const PR_IN_MESSAGE = /Merge pull request #(\d+)|\(#(\d+)\)/;

function prOf(repo: Repo, message: string): { number: number; url: string } | undefined {
  const m = PR_IN_MESSAGE.exec(message);
  if (!m) return undefined;
  const number = Number(m[1] ?? m[2]);
  return { number, url: `https://github.com/${repo.owner}/${repo.name}/pull/${number}` };
}

function toEntry(repo: Repo, raw: RawCommit): HistoryEntry {
  const message = raw.commit.message.split("\n")[0];
  return {
    sha: raw.sha,
    date: raw.commit.author?.date ?? "",
    message,
    url: raw.html_url,
    pr: prOf(repo, message),
  };
}

/** The commits that touched `path` at `ref`, newest first, fetched anonymously
 *  (no token is ever sent — reading needs no credentials): `null` on any
 *  failure, network or HTTP, so a reader without connectivity simply sees no
 *  history rather than an error. */
export async function fileHistory(
  repo: Repo, path: string, ref: string, fetchImpl: typeof fetch = fetch,
): Promise<HistoryEntry[] | null> {
  const url =
    `https://api.github.com/repos/${repo.owner}/${repo.name}/commits` +
    `?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(ref)}&per_page=20`;
  try {
    const r = await fetchImpl(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!r.ok) return null;
    const raw = (await r.json()) as unknown;
    if (!Array.isArray(raw)) return null;
    return (raw as RawCommit[]).map((c) => toEntry(repo, c));
  } catch {
    return null;
  }
}
