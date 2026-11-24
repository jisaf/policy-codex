/* Cross-program links (docs/conventions.md "Cross-program links"; product-
 * owner decision of 2026-11-23, docs/plan-colorado.md). Four classes:
 *
 * - primitive: one meaning everywhere (age, dates, relationships, a fact as
 *   stated, a published figure, a definition in law every reader applies as
 *   written). A shared item says so in one line; readers declare nothing.
 * - adopted method: a program adopts a method another program or body defines,
 *   by reference (the SSI financial methodology for SSI-related Medicaid).
 *   A shared item names each adopting program with the excerpt that adopts
 *   it (`adopted_by`); a program item reading another program's item lists
 *   it in `accepts_from` with the class and the citation.
 * - rule-required outcome link: a rule makes one program's outcome an input
 *   to another (SNAP's categorical eligibility on TANF receipt; Adult
 *   Financial barred by a Colorado Works sanction). Declared in
 *   `accepts_from` with the citation.
 * - program calculation: never shared. A shared item of this class is a
 *   violation the volume's dated allowlist holds until it is split.
 *
 * Pure: the allowlist is applied by `npm run check` (src/tools/check.ts),
 * which reports what it holds as warnings and refuses any growth. */
import { usesOf } from "./check";
import type { Finding } from "./governance";
import type { LedgerIndex } from "./ledger-index";
import {
  READ_LINK_CLASSES, SHARED_LINK_CLASSES,
  type AcceptsFrom, type EngineRefs, type Item, type ReadLinkClass, type VolumeMeta,
} from "./types";

/** One `accepts_from` entry as written: a classified object, or the bare
 *  identifier of the pre-2026-11-23 form (class and source undefined). */
export interface LinkDeclaration { from: string; class?: string; source?: string; bare: boolean }

export function linkDeclarations(it: Item): LinkDeclaration[] {
  return (it.accepts_from ?? []).map((e) =>
    typeof e === "string"
      ? { from: e, bare: true }
      : { from: String((e as AcceptsFrom).from ?? ""), class: (e as AcceptsFrom).class, source: (e as AcceptsFrom).source, bare: false });
}

/** The identifiers an item declares in accepts_from, whatever their form. */
export function acceptedIdentifiers(it: Item): string[] {
  return linkDeclarations(it).map((d) => d.from);
}

/** The program an excerpt's reader belongs to does not matter here; only that
 *  the excerpt exists, when the volume's excerpt ids are known. */
function knownSource(refs: EngineRefs | null | undefined, s: string | undefined): boolean {
  if (!s) return false;
  return !refs || !refs.sourceIds.length || refs.sourceIds.includes(s);
}

function directReads(ix: LedgerIndex, it: Item): string[] {
  if (it.kind !== "derived" || it.derived === undefined || it.derived === null) return [];
  try { return [...new Set(usesOf(ix, it.derived))].sort(); } catch { return []; }
}

/** The link findings for one item. Errors: a shared derived item without a
 *  valid class (`link.class`); a malformed accepts_from entry
 *  (`link.declaration`); an undeclared read of another program's item, or of
 *  an adopted method the reader's program does not adopt
 *  (`read.cross_program`); a shared program calculation, or a program item
 *  reading one (`link.shared_calculation`; the check's allowlist holds the
 *  existing ones as warnings). Warnings: an accepts_from entry the
 *  derivation does not read. */
export function linkFindings(
  ix: LedgerIndex, meta: VolumeMeta, it: Item, refs?: EngineRefs | null,
): Finding[] {
  const F: Finding[] = [];
  const err = (rule: string, msg: string) => F.push({ ok: false, level: "error", rule, msg });
  const warn = (rule: string, msg: string) => F.push({ ok: false, level: "warn", rule, msg });
  if (!meta.programs) return F;
  if (!meta.link_classes) return legacyCrossProgram(ix, it);
  const programIds = new Set(meta.programs.map((p) => p.id));

  // 1. A shared derived item declares its class.
  if (it.kind === "derived" && it.program === "All") {
    const cls = it.link_class;
    if (!cls) {
      err("link.class", "A shared (All) rule declares link_class: primitive, adopted_method or program_calculation, with a one-line link_basis");
    } else if (!(SHARED_LINK_CLASSES as readonly string[]).includes(cls)) {
      err("link.class", `link_class "${cls}" is not primitive, adopted_method or program_calculation`);
    } else {
      if (!(it.link_basis || "").trim()) {
        err("link.class", cls === "primitive"
          ? "A primitive states in link_basis, in one line, that no program defines it differently"
          : `A shared ${cls} states its basis in one line (link_basis)`);
      } else if (/\n/.test(it.link_basis!.trim())) {
        err("link.class", "link_basis is one line");
      }
      if (cls === "adopted_method") {
        const by = it.adopted_by ?? [];
        if (!by.length) err("link.class", "An adopted method names each adopting program and the excerpt that adopts it (adopted_by)");
        for (const a of by) {
          if (!programIds.has(a.program) || a.program === "All") {
            err("link.class", `adopted_by names "${a.program}", which is not a declared program`);
          }
          if (!knownSource(refs, a.source)) {
            err("link.class", `adopted_by ${a.program} cites ${a.source ?? "no excerpt"}; cite the excerpt of ${a.program}'s rule that adopts the method`);
          }
        }
      } else if (it.adopted_by?.length) {
        err("link.class", `adopted_by is for an adopted_method; this item is ${cls}`);
      }
      if (cls === "program_calculation") {
        warn(
          "link.shared_calculation",
          "A program calculation is never shared (2026-11-23): split it into each reading program's own item. " +
            "Held only while the volume's cross-program allowlist lists it",
        );
      }
    }
  } else if (it.link_class || it.link_basis || it.adopted_by?.length) {
    err("link.class", "link_class, link_basis and adopted_by belong on a shared (All) rule only");
  }

  // 2. Declared reads are well formed.
  const decls = linkDeclarations(it);
  const declared = new Map<string, LinkDeclaration>();
  for (const d of decls) {
    const dep = ix.byIdentifier.get(d.from);
    if (!dep) {
      err("link.declaration", `accepts_from names ${d.from || "nothing"}, which is not in the ledger`);
      continue;
    }
    declared.set(d.from, d);
    if (d.bare) {
      err("link.declaration", `accepts_from lists ${d.from} without a class and citation; write {from: ${d.from}, class: adopted_method | rule_required | primitive, source: S-n}`);
      continue;
    }
    if (!(READ_LINK_CLASSES as readonly string[]).includes(d.class ?? "")) {
      err("link.declaration", `accepts_from ${d.from}: class "${d.class ?? ""}" is not adopted_method, rule_required or primitive (a program calculation is never shared)`);
    } else if (d.class === "primitive" && dep.kind !== "supplied") {
      err("link.declaration", `accepts_from ${d.from}: only a supplied fact is read as a primitive; a shared primitive rule belongs to All`);
    }
    if (!knownSource(refs, d.source)) {
      err("link.declaration", `accepts_from ${d.from} cites ${d.source ?? "no excerpt"}; cite the excerpt of the rule that requires or adopts the link`);
    }
  }

  // 3. Every read of another program's item is declared; a read of a shared
  //    adopted method is by an adopting program; a read of a shared program
  //    calculation is held by the allowlist.
  const reads = directReads(ix, it);
  for (const r of reads) {
    const dep = ix.byIdentifier.get(r);
    if (!dep || dep.id === it.id) continue;
    if (dep.kind !== "supplied" && dep.kind !== "derived") continue;
    if (dep.program === "All") {
      if (dep.kind !== "derived" || it.program === "All") continue;
      if (dep.link_class === "adopted_method" &&
          !(dep.adopted_by ?? []).some((a) => a.program === it.program) &&
          !isDeclared(declared.get(r))) {
        err(
          "read.cross_program",
          `${it.program} rule reads ${r} (${dep.id}), a method its adopted_by does not name ${it.program} as adopting; ` +
            `add ${it.program} with the excerpt that adopts it, or give ${it.program} its own item`,
        );
      }
      if (dep.link_class === "program_calculation") {
        warn(
          "link.shared_calculation",
          `${it.program} rule reads ${r} (${dep.id}), a program calculation shared across programs; ` +
            `read ${it.program}'s own item (held only while the allowlist lists this reader)`,
        );
      }
      continue;
    }
    if (dep.program === it.program) continue;
    if (isDeclared(declared.get(r))) continue;
    if (declared.has(r)) continue; // malformed: reported above
    err(
      "read.cross_program",
      `${it.program} rule reads ${dep.program}'s ${r} (${dep.id}) without declaring the link; ` +
        "list it in accepts_from with its class (adopted_method or rule_required) and the citation, " +
        "otherwise give this program its own item",
    );
  }
  const readSet = new Set(reads);
  for (const d of decls) {
    if (ix.byIdentifier.has(d.from) && !readSet.has(d.from)) {
      warn("link.declaration", `accepts_from lists ${d.from}, which the derivation does not read; remove it`);
    }
  }
  return F;
}

/** A volume that does not classify its links (no `link_classes` in
 *  volume.yaml) keeps the pre-2026-11-23 rule: a read of another program's
 *  supplied fact or rule that accepts_from does not list is a warning. */
function legacyCrossProgram(ix: LedgerIndex, it: Item): Finding[] {
  const F: Finding[] = [];
  const warn = (msg: string) => F.push({ ok: false, level: "warn", rule: "read.cross_program", msg });
  const accepted = new Set(acceptedIdentifiers(it));
  for (const r of directReads(ix, it)) {
    const dep = ix.byIdentifier.get(r);
    if (!dep || dep.id === it.id) continue;
    if (dep.kind !== "supplied" && dep.kind !== "derived") continue;
    if (dep.program === "All" || dep.program === it.program || accepted.has(r)) continue;
    warn(
      `${it.program} rule reads ${dep.program}'s ${r} (${dep.id}); ` +
        "list it in accepts_from if the rule names that program's result, " +
        "otherwise give this program its own fact",
    );
  }
  for (const r of accepted) {
    if (!ix.byIdentifier.has(r)) warn(`accepts_from names ${r}, which is not in the ledger`);
  }
  return F;
}

function isDeclared(d: LinkDeclaration | undefined): boolean {
  return !!d && !d.bare && (READ_LINK_CLASSES as readonly string[]).includes(d.class ?? "") && !!d.source;
}

/** Every declared or class-bearing link of a volume, for the ledger export
 *  and the audit: [reader id, identifier read, class, source]. */
export function declaredLinks(it: Item): Array<{ from: string; class: ReadLinkClass; source: string }> {
  return linkDeclarations(it)
    .filter((d) => !d.bare && d.class && d.source)
    .map((d) => ({ from: d.from, class: d.class as ReadLinkClass, source: d.source! }));
}
