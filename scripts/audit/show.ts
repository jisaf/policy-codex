/* Prints items for hand review: npx vite-node scripts/audit/show.ts -- <regex on identifier or id> [--meaning] */
import path from "node:path";
import { loadVolume } from "../../src/tools/volumes";

const root = path.resolve(import.meta.dirname, "../..");
const args = process.argv.slice(2).filter((a) => a !== "--");
const withMeaning = args.includes("--meaning");
const re = new RegExp(args.filter((a) => !a.startsWith("--"))[0] ?? ".");
const { vol } = loadVolume(root, "co");
for (const it of vol.items) {
  if (!re.test(it.identifier) && !re.test(it.id)) continue;
  console.log(`## ${it.id} ${it.identifier} [${it.program} ${it.kind} ${it.type} ${it.scope}] src=${(it.sources ?? []).join(",")}`);
  if (withMeaning) console.log(`  M: ${it.meaning}`);
  if (it.derived != null) console.log(`  D: ${JSON.stringify(it.derived)}`);
  if (it.versions?.length) console.log(`  V: ${JSON.stringify(it.versions.map((v) => [v.from, v.value]))}`);
  else if (it.value !== undefined) console.log(`  V: ${JSON.stringify(it.value)}`);
}
