/* Disk access for the external sample check's scripts (scripts/external/):
 * the volume, its dictionary and triage references, a template folder, and
 * the converted cases file. */
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { loadLedgerFromDisk } from "../tools/check";
import { buildIndex, type LedgerIndex } from "../engine/ledger-index";
import type { HouseholdCase } from "../engine/cases";
import { parseOpenQuestions } from "../ledger/markdown";
import { buildDictionary, type Dictionary } from "./dictionary";
import type { ExternalCase } from "./importer";
import { parseKnownLimits, type TriageRefs } from "./runner";

export interface ExternalContext {
  volume: string;
  ix: LedgerIndex;
  dict: Dictionary;
  refs: TriageRefs;
  /** The volume's stored households (the dictionary's evidence of use). */
  stored: HouseholdCase[];
}

/** The known limits the triage hints match against. */
export const KNOWN_LIMITS_FILE = "docs/reviews/known-limits.md";

export function loadContext(root: string, volume: string): ExternalContext {
  const led = loadLedgerFromDisk(root, volume);
  const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
  const dict = buildDictionary(ix, led.meta, led.cases);
  const oqPath = path.join(root, led.volumePath, "open-questions.md");
  const klPath = path.join(root, KNOWN_LIMITS_FILE);
  const refs: TriageRefs = {
    openQuestions: fs.existsSync(oqPath) ? parseOpenQuestions(fs.readFileSync(oqPath, "utf8")) : [],
    knownLimits: volume === "co" && fs.existsSync(klPath) ? parseKnownLimits(fs.readFileSync(klPath, "utf8")) : [],
  };
  return { volume, ix, dict, refs, stored: led.cases };
}

/** The CSV files of a folder, by file name. */
export function readFolder(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fs.readdirSync(dir).sort()) {
    if (f.toLowerCase().endsWith(".csv") && fs.statSync(path.join(dir, f)).isFile()) {
      out[f] = fs.readFileSync(path.join(dir, f), "utf8");
    }
  }
  return out;
}

/** The converted cases file, with a header saying where it came from. */
export function casesYaml(cases: readonly ExternalCase[], from: string, volume: string): string {
  const head = [
    `# External sample check cases (volume ${volume}), converted from ${from} by npm run external:import.`,
    "# Not stored households: these never join volumes/<volume>/tests/cases.yaml or the check's gate.",
    "# Each case keeps its expected answers, their sources and notes under `external`; `expect` is the same",
    "# answers in the stored-household shape (\"unknown\" is cannot determine). See docs/external-check.md.",
    "",
  ].join("\n");
  return head + stringifyYaml(cases, { defaultStringType: "QUOTE_DOUBLE", defaultKeyType: "PLAIN", lineWidth: 0 });
}

export function readCasesYaml(file: string): ExternalCase[] {
  const raw = parseYaml(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(raw)) throw new Error(`${file} is not a list of cases`);
  return raw as ExternalCase[];
}
