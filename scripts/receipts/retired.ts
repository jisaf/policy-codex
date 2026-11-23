// The old facts a migration retired, as each stored household stated them
// (retired-facts.yaml). Read only by the translation, so a household's
// receipts stay the translation of everything it ever stated; no rule reads
// these facts any more (translate.ts, RETIRED).
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { root } from "./ledgers";
import type { RetiredFacts } from "./translate";

const file = path.join(root, "scripts/receipts/retired-facts.yaml");
const HEADER = "# Old facts retired by the receipts migration (scripts/receipts/translate.ts, RETIRED), as each\n" +
  "# stored household stated them: case -> person -> fact -> value. Written by npm run receipts:translate;\n" +
  "# read only by the translation. No rule reads these facts.\n";

export function loadRetired(): RetiredFacts {
  return fs.existsSync(file) ? ((parseYaml(fs.readFileSync(file, "utf8")) ?? {}) as RetiredFacts) : {};
}

export function saveRetired(r: RetiredFacts): void {
  if (!Object.keys(r).length) return;
  fs.writeFileSync(file, HEADER + stringifyYaml(r, { defaultStringType: "QUOTE_DOUBLE", defaultKeyType: "PLAIN" }));
}
