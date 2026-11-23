// Receipt spike: who reads what. For each identifier given, the items that
// read it directly. Usage: npx vite-node prototypes/receipt-spike/readers.ts <identifier> ...
import path from "node:path";
import { loadLedgerFromDisk } from "../../src/tools/check";
import { createEngine } from "../../src/engine/engine";

const root = path.resolve(import.meta.dirname, "../..");
const led = loadLedgerFromDisk(root, "co");
const eng = createEngine(led.items, led.meta);
for (const id of process.argv.slice(2)) {
  const by = eng.usedBy(id).map((x) => `${eng.item(x)?.id}:${x}[${eng.item(x)?.program}]`);
  console.log(`${eng.item(id)?.id} ${id} <- ${by.length}: ${by.join(" ")}`);
}
