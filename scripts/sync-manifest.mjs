// Rewrites a volume's chapter file lists in codex.json from the item files on
// disk, so an author who adds items never edits the manifest by hand (and two
// authors adding items at once cannot lose each other's entries: the last run
// reflects the whole directory). Usage: node scripts/sync-manifest.mjs co
import fs from "node:fs";
import path from "node:path";
const id = process.argv[2];
if (!id) { console.error("usage: node scripts/sync-manifest.mjs <volume id>"); process.exit(2); }
const manifestPath = path.resolve("codex.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const vol = manifest.volumes.find((v) => v.id === id);
if (!vol) { console.error(`no volume "${id}" in codex.json`); process.exit(2); }
for (const ch of vol.chapters) {
  const dir = path.join(vol.path, ch.dir);
  ch.files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".yaml")).sort()
    : [];
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(vol.chapters.map((c) => `${c.dir}: ${c.files.length}`).join(", "));
