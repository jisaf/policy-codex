/* Feeds a conformance suite to an external adapter and diffs its answers
 * against the codex's own. See docs/conformance.md for the adapter contract.
 * Run with
 *   npm run conform -- --adapter "<command>" [--volume <id>] [--batch] [--build]
 *   npm run conform -- --adapter "<command>" --suite <path> [--out <path>] [--batch]
 * Without --suite it grades conformance/<volume>/suite.json for every volume
 * in codex.json (or the ones --volume / CODEX_VOLUME name), writing
 * conformance/<volume>/results.json; --build (re)builds each suite first. */
import fs from "node:fs";
import path from "node:path";
import type { Suite } from "../src/export/conformance";
import { conformanceDir, selectedVolumeIds, withoutVolumeArgs } from "../src/tools/volumes";
import { formatResults, runConformance, writeSuite } from "../src/tools/conform";

interface Args { adapter: string; suite: string | null; out: string | null; batch: boolean; build: boolean }

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> & { batch: boolean; build: boolean } = {
    suite: null, out: null, batch: false, build: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--adapter") args.adapter = argv[++i];
    else if (a === "--suite") args.suite = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--batch") args.batch = true;
    else if (a === "--build") args.build = true;
    else throw new Error(`unknown argument "${a}"`);
  }
  if (!args.adapter) throw new Error("--adapter <command> is required");
  if (args.out && !args.suite) throw new Error("--out needs --suite (each volume's results go beside its suite)");
  return args as Args;
}

const root = path.resolve(import.meta.dirname, "..");
const args = parseArgs(withoutVolumeArgs(process.argv.slice(2)));

const runs: Array<{ suite: Suite; out: string }> = [];
if (args.suite) {
  const suite: Suite = JSON.parse(fs.readFileSync(path.resolve(root, args.suite), "utf8"));
  runs.push({ suite, out: path.resolve(root, args.out ?? path.join(path.dirname(args.suite), "results.json")) });
} else {
  for (const volume of selectedVolumeIds(root)) {
    const file = path.join(conformanceDir(root, volume), "suite.json");
    let suite: Suite;
    if (args.build) suite = writeSuite(root, volume).suite;
    else if (fs.existsSync(file)) suite = JSON.parse(fs.readFileSync(file, "utf8"));
    else {
      throw new Error(
        `no suite for volume ${volume} at ${path.relative(root, file)}: ` +
          "run `npm run conformance` first, or pass --build",
      );
    }
    runs.push({ suite, out: path.join(conformanceDir(root, volume), "results.json") });
  }
}

let failed = 0;
for (const { suite, out } of runs) {
  const results = runConformance(suite, args.adapter, args.batch, root);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  console.log(formatResults(results));
  failed += results.summary.failed;
}
if (failed > 0) process.exit(1);
