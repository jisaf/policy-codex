/* Feeds `conformance/suite.json` to an external adapter and diffs its answers
 * against the codex's own. See docs/conformance.md for the adapter contract.
 * Run with `npm run conform -- --adapter "<command>" [--suite path]
 * [--out path] [--batch]`. */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { ConformanceResults, Suite, SuiteCase } from "../src/export/conformance";

/** Deep equality between two of the suite's own values, with float
 *  tolerance. Unlike `src/engine/values.ts`'s `valuesEqual`, both sides here
 *  are real evaluated values (never the ledger's `"unknown"` authoring
 *  sentinel), so a `null` must equal a `null`. */
function valuesMatch(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => valuesMatch(x, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

interface Args { adapter: string; suite: string; out: string; batch: boolean }

function parseArgs(argv: string[]): Args {
  const args: { adapter?: string; suite: string; out: string; batch: boolean } = {
    suite: "conformance/suite.json", out: "conformance/results.json", batch: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--adapter") args.adapter = argv[++i];
    else if (a === "--suite") args.suite = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--batch") args.batch = true;
    else throw new Error(`unknown argument "${a}"`);
  }
  if (!args.adapter) throw new Error("--adapter <command> is required");
  return args as Args;
}

interface AdapterValue { person: string | null; identifier: string; month: string | null; value: unknown }
type Failure = ConformanceResults["failures"][number];

const root = path.resolve(import.meta.dirname, "..");
const args = parseArgs(process.argv.slice(2));
const suite: Suite = JSON.parse(fs.readFileSync(path.resolve(root, args.suite), "utf8"));

/** Runs the adapter command once, writing `input` as JSON on its stdin and
 *  parsing its stdout as JSON. Throws with the adapter's stderr on a nonzero
 *  exit or unparsable output. */
function runAdapter(command: string, input: unknown): unknown {
  const res = spawnSync(command, [], {
    shell: true, input: JSON.stringify(input), encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`adapter "${command}" exited ${res.status}: ${(res.stderr || "").slice(0, 2000)}`);
  }
  const out = res.stdout.trim();
  try {
    return JSON.parse(out);
  } catch {
    throw new Error(`adapter "${command}" did not print JSON on stdout: ${out.slice(0, 500)}`);
  }
}

function expKey(e: { person: string | null; identifier: string; month: string | null }): string {
  return `${e.person ?? ""}|${e.identifier}|${e.month ?? ""}`;
}

let passed = 0;
let failed = 0;
let unimplemented = 0;
const failures: Failure[] = [];

function grade(c: SuiteCase, values: AdapterValue[]): void {
  const byKey = new Map(values.map((v) => [expKey(v), v.value]));
  for (const e of c.expect) {
    const k = expKey(e);
    if (!byKey.has(k)) { unimplemented++; continue; }
    const got = byKey.get(k);
    if (valuesMatch(got, e.value)) passed++;
    else {
      failed++;
      failures.push({ case: c.id, person: e.person, identifier: e.identifier, month: e.month, expected: e.value, got });
    }
  }
}

if (args.batch) {
  const out = runAdapter(args.adapter, { cases: suite.cases }) as {
    results: Array<{ id: string; values: AdapterValue[] }>;
  };
  const byId = new Map((out.results || []).map((r) => [r.id, r.values]));
  for (const c of suite.cases) grade(c, byId.get(c.id) || []);
} else {
  for (const c of suite.cases) {
    const out = runAdapter(args.adapter, { case: c }) as { values: AdapterValue[] };
    grade(c, out.values || []);
  }
}

const summary = { cases: suite.cases.length, checked: passed + failed, passed, failed, unimplemented };
const results: ConformanceResults = { codex: suite.codex, adapter: args.adapter, summary, failures };

const outPath = path.resolve(root, args.out);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

console.log(
  `conform (${args.adapter}) on codex@${suite.codex.sha}: ${summary.cases} cases, ` +
    `${summary.checked} checked, ${summary.passed} passed, ${summary.failed} failed, ` +
    `${summary.unimplemented} unimplemented`,
);
if (summary.failed > 0) process.exit(1);
