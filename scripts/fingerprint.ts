/* Prints the approval fingerprint of one or more items (docs/governance.md
 * "Stale approvals"): the string a signature records in its approval row's
 * `fingerprint`, and whether each signature the item carries still matches.
 *
 *   npm run fingerprint -- --item CO-12                      one item (any volume)
 *   npm run fingerprint -- --volume co --item CO-12          one item in one volume
 *   npm run fingerprint -- --volume co --item CO-12,CO-40    several
 *   npm run fingerprint -- --volume co --signed              every Reviewed/Approved item
 *   ... --explain    also list what the fingerprint covers: each item it
 *                    reads and each excerpt it cites
 *   ... --json       machine-readable
 *
 * The app writes the fingerprint when a role signs; a signature made by
 * editing the item file by hand copies it from here. Nothing is written:
 * re-signing is the signer's act, not this script's. Exits 1 when an item is
 * not found or a signature on a Reviewed or Approved item is stale. */
import path from "node:path";
import { loadVolume, selectedVolumeIds, withoutVolumeArgs } from "../src/tools/volumes";
import { approvableContent, canonicalJson, citedExcerpts, readClosure, staleSignatures } from "../src/engine/fingerprint";
import { sourceTextMap } from "../src/ledger/markdown";
import { sha256Hex } from "../src/engine/sha256";

const root = path.resolve(import.meta.dirname, "..");
const argv = withoutVolumeArgs(process.argv.slice(2));
const asked: string[] = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--item" && argv[i + 1]) asked.push(...argv[++i].split(","));
  else if (argv[i].startsWith("--item=")) asked.push(...argv[i].slice(7).split(","));
}
const explain = argv.includes("--explain");
const json = argv.includes("--json");
const signed = argv.includes("--signed");
if (!asked.length && !signed) {
  console.error("usage: npm run fingerprint -- --volume <id> --item <CO-n>[,<CO-m>] [--explain] [--json] | --signed");
  process.exit(2);
}

let failed = false;
const out: unknown[] = [];
const found = new Set<string>();
for (const volume of selectedVolumeIds(root)) {
  const { vol, engine } = loadVolume(root, volume);
  const basis = { ix: engine.index, sourceTexts: sourceTextMap(vol.sources) };
  const items = signed
    ? vol.items.filter((it) => it.status === "Reviewed" || it.status === "Approved")
    : asked.map((id) => id.trim()).filter(Boolean).flatMap((id) => {
      const it = engine.itemById(id) ?? engine.item(id);
      if (it) found.add(id);
      return it ? [it] : [];
    });
  for (const it of items) {
    const fingerprint = engine.fingerprint(it)!;
    const stale = staleSignatures(basis, it);
    const rows = (it.approval ?? []).map((a) => ({
      role: a.role, by: a.by, date: a.date, fingerprint: a.fingerprint ?? null,
      matches: a.fingerprint === fingerprint,
    }));
    if (stale) failed = true;
    const reads = explain
      ? [...readClosure(basis, it).values()].filter((x) => x.id !== it.id).map((x) => ({
        id: x.id, identifier: x.identifier, content: sha256Hex(canonicalJson(approvableContent(x))).slice(0, 12),
      }))
      : undefined;
    const excerpts = explain
      ? [...new Set([...readClosure(basis, it).values()].flatMap(citedExcerpts))].sort().map((s) => ({
        id: s, text: basis.sourceTexts[s] === undefined ? null : sha256Hex(basis.sourceTexts[s].replace(/\s+/g, " ").trim()).slice(0, 12),
      }))
      : undefined;
    if (json) {
      out.push({ volume, id: it.id, identifier: it.identifier, status: it.status ?? "Draft", fingerprint, approval: rows, stale: !!stale, reads, excerpts });
      continue;
    }
    console.log(`${it.id} ${it.identifier} (${it.status ?? "Draft"}): ${fingerprint}`);
    for (const r of rows) {
      console.log(`  ${r.role} (${r.by ?? "?"}, ${r.date}): ${r.fingerprint ?? "no fingerprint"} ${r.matches ? "matches" : "STALE"}`);
    }
    if (reads) {
      console.log(`  reads ${reads.length} item(s):`);
      for (const r of reads) console.log(`    ${r.id} ${r.identifier} ${r.content}`);
      console.log(`  cites ${excerpts!.length} excerpt(s):`);
      for (const e of excerpts!) console.log(`    ${e.id} ${e.text ?? "missing from sources.md"}`);
    }
  }
}
for (const id of asked.map((x) => x.trim()).filter(Boolean)) {
  if (!found.has(id)) { console.error(`no item ${id} in ${selectedVolumeIds(root).join(", ")}`); failed = true; }
}
if (json) process.stdout.write(JSON.stringify(out.length === 1 ? out[0] : out, null, 2) + "\n");
process.exitCode = failed ? 1 : 0;
