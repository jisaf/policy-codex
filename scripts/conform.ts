/* Feeds `conformance/suite.json` to an external adapter and diffs its answers
 * against the codex's own. See docs/conformance.md for the adapter contract.
 * Run with `npm run conform -- --adapter "<command>" [--suite path]
 * [--out path] [--batch]`. */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { gradeCase, type AdapterValue, type ConformanceResults, type Suite, type SuiteCase } from "../src/export/conformance";

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

let passed = 0;
let failed = 0;
let unimplemented = 0;
const failures: ConformanceResults["failures"] = [];

function grade(c: SuiteCase, values: AdapterValue[]): void {
  const r = gradeCase(c, values);
  passed += r.passed;
  failed += r.failed;
  unimplemented += r.unimplemented;
  failures.push(...r.failures);
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
