/* Writes conformance/<volume>/suite.json from the checked-in ledger, pinned to
 * the current git commit, for every volume in codex.json (or the volumes
 * named with --volume / CODEX_VOLUME). Run with `npm run conformance`. */
import path from "node:path";
import { selectedVolumeIds } from "../src/tools/volumes";
import { writeSuite } from "../src/tools/conform";

const root = path.resolve(import.meta.dirname, "..");

for (const volume of selectedVolumeIds(root)) {
  const { suite, file } = writeSuite(root, volume);
  const count = (k: string) => suite.cases.filter((c) => c.kind === k).length;
  console.log(
    `wrote ${path.relative(root, file)}: ${suite.cases.length} cases ` +
      `(${count("rule-test")} rule-test, ${count("household")} household, ` +
      `${count("cannot-determine")} cannot-determine), codex@${suite.codex.sha}` +
      (suite.notes.length ? `, ${suite.notes.length} note(s)` : ""),
  );
  for (const n of suite.notes) console.log(`  note: ${n}`);
  if (suite.cannot_determine_gaps?.length) {
    console.log(
      `  ${suite.cannot_determine_gaps.length} outcome(s) with no cannot-determine case: ` +
        suite.cannot_determine_gaps.join(", "),
    );
  }
}
