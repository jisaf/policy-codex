/* The aid-code layer (phase 13): a volume's `aid-codes.yaml`, which gives each
 * program outcome option a code and a plain label, what CBMS would assign.
 * The codes are product-owner-approved PLACEHOLDERS until the CBMS list is
 * supplied (docs/plan-colorado.md), and the file says so in `status` and
 * `notice`, which every page that shows a code repeats.
 *
 * Nothing here is a rule. The outcomes and their options are defined by the
 * items the file names; `aidCodeWarnings` checks the file against them so a
 * renamed or added option is noticed (`npm run check`, as a warning). */
import { parse as parseYaml } from "yaml";
import type { Engine } from "../engine/engine";

export interface AidCode {
  /** The placeholder code, "PH-MA-CHILD". */
  code: string;
  /** What the code means, in plain words. */
  label: string;
  /** The `ma_funding_source` option the code is normally paid from. */
  funding?: string;
}

export interface AidCodeOutcome {
  /** The outcome item's identifier. */
  outcome: string;
  /** Other outcomes that must hold, option lists by identifier, for any code
   *  of this outcome to apply. */
  requires?: Record<string, string[]>;
  /** Option -> code. A yes/no outcome keys its options "yes" and "no". */
  codes: Record<string, AidCode>;
  /** Option -> why it carries no code. */
  no_code?: Record<string, string | null>;
}

export interface Participation {
  /** The per-person outcome: whether this person is a member. */
  outcome: string;
  /** The options that make the person a member. */
  member: string[];
}

export interface AidCodeMap {
  /** "placeholder" until the CBMS list replaces the codes. */
  status: string;
  notice: string;
  funding?: { outcome: string; programs: string[] };
  /** Program id -> the per-person participation outcome. */
  participation: Record<string, Participation>;
  outcomes: AidCodeOutcome[];
}

export const AID_CODES_FILE = "aid-codes.yaml";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** Parses `aid-codes.yaml`. Keys are kept as strings, so a yes/no outcome's
 *  `"yes"` and `"no"` and an unquoted option alike read as their names. */
export function parseAidCodes(text: string): AidCodeMap {
  const raw = asRecord(parseYaml(text));
  const outcomes: AidCodeOutcome[] = [];
  for (const o of Array.isArray(raw.outcomes) ? raw.outcomes : []) {
    const rec = asRecord(o);
    if (typeof rec.outcome !== "string") continue;
    const codes: Record<string, AidCode> = {};
    for (const [opt, c] of Object.entries(asRecord(rec.codes))) {
      const cr = asRecord(c);
      codes[String(opt)] = {
        code: String(cr.code ?? ""),
        label: String(cr.label ?? ""),
        ...(cr.funding !== undefined ? { funding: String(cr.funding) } : {}),
      };
    }
    const noCode: Record<string, string | null> = {};
    for (const [opt, why] of Object.entries(asRecord(rec.no_code))) {
      noCode[String(opt)] = why == null ? null : String(why);
    }
    const requires: Record<string, string[]> = {};
    for (const [id, opts] of Object.entries(asRecord(rec.requires))) {
      requires[id] = (Array.isArray(opts) ? opts : [opts]).map((x) => optionKey(x));
    }
    outcomes.push({
      outcome: rec.outcome,
      ...(Object.keys(requires).length ? { requires } : {}),
      codes,
      no_code: noCode,
    });
  }
  const participation: Record<string, Participation> = {};
  for (const [prog, p] of Object.entries(asRecord(raw.participation))) {
    const pr = asRecord(p);
    if (typeof pr.outcome !== "string") continue;
    participation[prog] = {
      outcome: pr.outcome,
      member: (Array.isArray(pr.member) ? pr.member : []).map((x) => optionKey(x)),
    };
  }
  const f = asRecord(raw.funding);
  return {
    status: String(raw.status ?? "placeholder"),
    notice: String(raw.notice ?? "").trim(),
    ...(typeof f.outcome === "string"
      ? { funding: { outcome: f.outcome, programs: (Array.isArray(f.programs) ? f.programs : []).map(String) } }
      : {}),
    participation,
    outcomes,
  };
}

/** A value as the file keys it: yes/no as "yes"/"no", anything else as its
 *  string. Null for an unknown value. */
export function optionKey(v: unknown): string {
  if (v === true) return "yes";
  if (v === false) return "no";
  return String(v);
}

/** The options an outcome item can take, as the file keys them. */
export function itemOptions(engine: Engine, identifier: string): string[] | null {
  const it = engine.item(identifier);
  if (!it) return null;
  if (engine.baseType(it) === "yes/no") return ["yes", "no"];
  return it.options ? it.options.slice() : null;
}

/** What `npm run check` warns about, one line each: an outcome option with
 *  neither a code nor a no-code reason; an option or outcome the ledger no
 *  longer has; a code used twice; a funding value that is not a funding
 *  option; a requirement or participation naming what does not exist; a
 *  declared program with no outcome in the file. */
export function aidCodeWarnings(engine: Engine, map: AidCodeMap): string[] {
  const out: string[] = [];
  const at = (s: string) => `${AID_CODES_FILE}: ${s}`;
  const fundingOpts = map.funding ? itemOptions(engine, map.funding.outcome) : null;
  if (map.funding && !fundingOpts) out.push(at(`funding outcome ${map.funding.outcome} is not an item with options`));
  const seenCodes = new Map<string, string>();
  const programsCovered = new Set<string>();
  const checkRef = (where: string, id: string, opts: string[]) => {
    const have = itemOptions(engine, id);
    if (!have) { out.push(at(`${where} names ${id}, which is not an item with options`)); return; }
    for (const o of opts) if (!have.includes(o)) out.push(at(`${where}: ${id} has no option "${o}"`));
  };
  for (const o of map.outcomes) {
    const it = engine.item(o.outcome);
    const opts = itemOptions(engine, o.outcome);
    if (!it || !opts) {
      out.push(at(`outcome ${o.outcome} is not an item with options`));
      continue;
    }
    programsCovered.add(it.program);
    const declared = (engine.meta.programs ?? []).find((p) => p.id === it.program);
    if (declared && !(declared.outcomes ?? []).includes(o.outcome)) {
      out.push(at(`${o.outcome} is not a declared outcome of ${it.program} in volume.yaml`));
    }
    const noCode = o.no_code ?? {};
    for (const opt of opts) {
      if (!(opt in o.codes) && !(opt in noCode)) {
        out.push(at(`${o.outcome} option "${opt}" has no aid code (add it under codes, or under no_code with the reason)`));
      }
    }
    for (const opt of [...Object.keys(o.codes), ...Object.keys(noCode)]) {
      if (!opts.includes(opt)) out.push(at(`${o.outcome} has no option "${opt}"`));
      if (opt in o.codes && opt in noCode) out.push(at(`${o.outcome} option "${opt}" is under both codes and no_code`));
    }
    for (const [opt, c] of Object.entries(o.codes)) {
      if (!/^PH-/.test(c.code) && map.status === "placeholder") {
        out.push(at(`${o.outcome} option "${opt}": code ${c.code} does not start PH- although the file is a placeholder`));
      }
      if (!c.label) out.push(at(`${o.outcome} option "${opt}" has no label`));
      const prior = seenCodes.get(c.code);
      if (prior) out.push(at(`code ${c.code} is used twice (${prior} and ${o.outcome} "${opt}")`));
      else seenCodes.set(c.code, `${o.outcome} "${opt}"`);
      if (c.funding !== undefined && fundingOpts && !fundingOpts.includes(c.funding)) {
        out.push(at(`${o.outcome} option "${opt}": funding "${c.funding}" is not an option of ${map.funding!.outcome}`));
      }
    }
    for (const [id, req] of Object.entries(o.requires ?? {})) checkRef(`${o.outcome} requires`, id, req);
  }
  for (const [prog, p] of Object.entries(map.participation)) {
    checkRef(`participation for ${prog}`, p.outcome, p.member);
  }
  for (const p of engine.meta.programs ?? []) {
    if (!(p.outcomes ?? []).length) continue;
    if (!programsCovered.has(p.id)) out.push(at(`program ${p.id} has no outcome with aid codes`));
  }
  return out;
}
