/* Serves the working tree's ledger to the app under `/__ledger/`, in both
 * `npm run dev` and `vite preview`, so policy staff and reviewers can read a
 * volume that is not on GitHub's main branch yet without anyone intercepting
 * raw.githubusercontent.com. The app probes `__ledger/__info` first and, when
 * it answers, reads `codex.json` and `volumes/**` from here
 * (src/ledger/source.ts, `localSource`).
 *
 * Only `codex.json`, `conformance/**`, `docs/**` and `volumes/**` are served, read-only;
 * any other path, and any path that tries to climb out of the checkout, is a
 * 404. Set CODEX_LOCAL_LEDGER=0 to turn it off (the app then reads GitHub). */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, normalize, resolve, sep } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

export const LEDGER_PREFIX = "/__ledger/";

type Next = (err?: unknown) => void;
type Middleware = (req: IncomingMessage, res: ServerResponse, next: Next) => void;
interface Server { middlewares: { use(fn: Middleware): void } }

/** The repo-relative path a request names, or null when it is not one this
 *  endpoint serves. Exported for tests. */
export function ledgerPath(url: string): string | null {
  const at = url.indexOf(LEDGER_PREFIX);
  if (at < 0) return null;
  let rel: string;
  try {
    rel = decodeURIComponent(url.slice(at + LEDGER_PREFIX.length).split(/[?#]/)[0]);
  } catch {
    return null;
  }
  if (rel === "__info") return rel;
  const clean = normalize(rel).split(sep).join("/");
  if (clean.startsWith("..") || clean.startsWith("/") || clean.includes("/../")) return null;
  if (clean === "codex.json") return clean;
  if (/^(volumes|conformance|docs)\/[^\0]+$/.test(clean)) return clean;
  return null;
}

function git(root: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

/** What `__info` answers: the tree's HEAD, branch and whether it is dirty. */
export function localInfo(root: string): { mode: "local"; head: string | null; branch: string | null; dirty: boolean } {
  const head = git(root, ["rev-parse", "HEAD"]);
  const branch = git(root, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const status = git(root, ["status", "--porcelain", "--", "codex.json", "volumes"]);
  return {
    mode: "local",
    head,
    branch: branch && branch !== "HEAD" ? branch : null,
    dirty: Boolean(status),
  };
}

export function ledgerMiddleware(root: string): Middleware {
  const base = resolve(root);
  return (req, res, next) => {
    const rel = ledgerPath(req.url ?? "");
    if (rel === null) {
      if ((req.url ?? "").includes(LEDGER_PREFIX)) {
        res.statusCode = 404;
        res.end("not found");
        return;
      }
      next();
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    if (rel === "__info") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(localInfo(base)));
      return;
    }
    const file = resolve(join(base, rel));
    if (!file.startsWith(base + sep) || !existsSync(file) || !statSync(file).isFile()) {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
    res.setHeader("Content-Type", rel.endsWith(".json") ? "application/json" : "text/plain; charset=utf-8");
    res.end(readFileSync(file));
  };
}

/** The Vite plugin: the same middleware on the dev and the preview server. */
export function localLedger(root: string = process.cwd()) {
  const enabled = process.env.CODEX_LOCAL_LEDGER !== "0";
  return {
    name: "codex-local-ledger",
    configureServer(server: Server) {
      if (enabled) server.middlewares.use(ledgerMiddleware(root));
    },
    configurePreviewServer(server: Server) {
      if (enabled) server.middlewares.use(ledgerMiddleware(root));
    },
  };
}
