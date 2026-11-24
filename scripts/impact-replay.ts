/* Replays recent commits through the change-impact signals
 * (src/engine/impact.ts; docs/governance.md "Change impact") to measure their
 * noise before a threshold is changed. For each of the last N non-merge
 * commits that change an existing item's decision in the volume, it computes
 * the flags the check would raise against the commit's parent, and counts
 * them per signal; "later changed" counts flags whose item a later commit in
 * the window changed.
 *
 *   npx vite-node scripts/impact-replay.ts [N=30] [rev=HEAD] [volume=co]
 *
 * Reads git only; writes nothing. */
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parseItemFile } from "../src/engine/yaml";
import { buildIndex } from "../src/engine/ledger-index";
import { changedDecisions, impactFlags } from "../src/engine/impact";
import type { Item } from "../src/engine/types";

const root = path.resolve(import.meta.dirname, "..");
const N = Number(process.argv[2] ?? 30);
const rev = process.argv[3] ?? "HEAD";
const volume = process.argv[4] ?? "co";
const dir = `volumes/${volume}`;
const git = (args: string[], input?: string) =>
  execFileSync("git", args, { cwd: root, maxBuffer: 1 << 30, ...(input !== undefined ? { input } : {}) });

function itemsAt(at: string): Item[] {
  const files = git(["ls-tree", "-r", "--name-only", at, dir]).toString().split("\n")
    .filter((p) => /\/[A-Z]+-\d+\.yaml$/.test(p) && !p.includes("/tests/") && !p.includes("/documents/"));
  const buf = git(["cat-file", "--batch"], files.map((f) => `${at}:${f}`).join("\n") + "\n");
  const out: Item[] = [];
  let off = 0;
  while (off < buf.length) {
    const nl = buf.indexOf(10, off);
    const size = Number(buf.subarray(off, nl).toString().split(" ")[2]);
    const body = buf.subarray(nl + 1, nl + 1 + size).toString();
    off = nl + 1 + size + 1;
    try { out.push(parseItemFile(body)); } catch { /* an unparsable historical file is skipped */ }
  }
  return out;
}

const commits = git(["log", "--no-merges", "--format=%h", rev, "--", dir]).toString().trim().split("\n");
const runs: Array<{ c: string; subject: string; changed: string[]; flags: Array<{ flagged: string; signals: string[] }> }> = [];
for (const c of commits) {
  if (runs.length >= N) break;
  const before = itemsAt(`${c}^`);
  const after = itemsAt(c);
  const changed = changedDecisions(before, after);
  if (!changed.size) continue;
  const had = new Set(before.map((i) => i.id));
  const touched = new Set([...changed.keys(), ...after.filter((i) => !had.has(i.id)).map((i) => i.id)]);
  const flags = impactFlags({ ix: buildIndex(after, null), sourceTexts: {} }, changed, touched);
  runs.push({
    c, subject: git(["log", "-1", "--format=%s", c]).toString().trim(),
    changed: [...changed.keys()], flags: flags.map((f) => ({ flagged: f.flagged, signals: f.signals })),
  });
}

const has = (f: { signals: string[] }, p: string) => f.signals.some((s) => s.startsWith(p));
console.log("| commit | decisions changed | flags | excerpt | same facts | sibling | subject |");
console.log("|---|---|---|---|---|---|---|");
for (const r of runs) {
  const n = (p: string) => r.flags.filter((f) => has(f, p)).length;
  console.log(`| ${r.c} | ${r.changed.length} | ${r.flags.length} | ${n("excerpt")} | ${n("same facts")} | ${n("sibling")} | ${r.subject.replace(/\|/g, "/").slice(0, 80)} |`);
}
const changes = runs.reduce((n, r) => n + r.changed.length, 0);
for (const sig of ["", "excerpt", "same facts", "sibling"]) {
  let total = 0;
  let later = 0;
  runs.forEach((r, i) => {
    const after = new Set(runs.slice(0, i).flatMap((x) => x.changed));
    const fl = r.flags.filter((f) => !sig || has(f, sig));
    total += fl.length;
    later += fl.filter((f) => after.has(f.flagged)).length;
  });
  const per = runs.map((r) => r.flags.filter((f) => !sig || has(f, sig)).length).sort((a, b) => a - b);
  console.log(
    `${sig || "all"}: ${total} flags over ${runs.length} commits and ${changes} changed decisions ` +
      `(${(total / Math.max(1, changes)).toFixed(2)} per change; median ${per[Math.floor(per.length / 2)] ?? 0}, ` +
      `max ${per[per.length - 1] ?? 0} per commit); ${later} later changed`,
  );
}
