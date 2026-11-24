/* Report-only checks (docs/governance.md "Report-only checks"): findings
 * `npm run check` prints and counts but does not block, each with a switch
 * (REPORT_CHECKS below) that makes it blocking once its findings are worked
 * off. None of them changes an answer; they read the ledger and the stored
 * households only.
 *
 * 1. ignored-default (service-design finding FB-06): a supplied fact whose
 *    meaning or precision declares what an unstated answer means ("If not
 *    stated, SNAP reads this as false"), and a reader of that program that
 *    reads the fact bare, not under an `otherwise` (or `unknown`), so an
 *    unstated fact makes it cannot-determine instead of the declared default.
 * 2. shared-one-program (a preview of the four-test sharing rule,
 *    docs/reviews/cross-program-primitives.md): a shared item (program All,
 *    or in the shared chapter) whose program-regulation citations all belong
 *    to one program, or whose derivation reads a program-prefixed item.
 * 3. benefit-status-receipt (handoff 2026-11-24, section 3, item 4): in a
 *    stored household, a person stated as receiving SSI, Colorado Works cash
 *    or Adult Financial with no receipt of that kind in the determination
 *    month and no stated reason; and a receipt of that kind in the month with
 *    the status stated false. */
import type { HouseholdCase } from "../engine/cases";
import type { Engine } from "../engine/engine";
import { recordMonth } from "../engine/records";
import type { Expr, Item, VolumeMeta } from "../engine/types";

export type ReportCheckId = "ignored-default" | "shared-one-program" | "benefit-status-receipt";

export interface ReportCheckSpec {
  id: ReportCheckId;
  title: string;
  /** The switch: true makes every finding of the check block `npm run
   *  check`. Each starts report-only. */
  blocking: boolean;
}

/** The report-only checks, in the order they are printed. To make one
 *  blocking, set its `blocking` to true in a reviewed change; to try that
 *  locally first, name it in CHECK_BLOCKING (comma-separated ids, or `all`). */
export const REPORT_CHECKS: readonly ReportCheckSpec[] = [
  { id: "ignored-default", title: "ignored declared defaults (FB-06)", blocking: false },
  { id: "shared-one-program", title: "shared items citing or reading one program", blocking: false },
  { id: "benefit-status-receipt", title: "benefit status without a receipt, or a receipt without the status", blocking: false },
];

export interface ReportCheckResult {
  id: ReportCheckId;
  title: string;
  blocking: boolean;
  /** One line per finding. */
  findings: string[];
}

/** Whether a check blocks: its switch, or CHECK_BLOCKING naming it. */
export function reportCheckBlocks(spec: ReportCheckSpec, env: string | undefined = process.env.CHECK_BLOCKING): boolean {
  if (spec.blocking) return true;
  const named = (env ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return named.includes("all") || named.includes(spec.id);
}

export interface ReportCheckInput {
  engine: Engine;
  items: readonly Item[];
  meta: VolumeMeta;
  /** item id -> chapter directory. */
  chapterOf: Record<string, string>;
  /** excerpt id -> its citation line (the paragraph it quotes). */
  sourceCitations: Record<string, string>;
  cases: readonly HouseholdCase[];
}

export function runReportChecks(input: ReportCheckInput, env?: string): ReportCheckResult[] {
  const run: Record<ReportCheckId, () => string[]> = {
    "ignored-default": () => ignoredDeclaredDefaults(input.engine).map(formatIgnoredDefault),
    "shared-one-program": () => sharedItemsOfOneProgram(input).map(formatSharedFinding),
    "benefit-status-receipt": () => benefitStatusFindings(input.cases).map(formatBenefitFinding),
  };
  return REPORT_CHECKS.map((spec) => ({
    id: spec.id, title: spec.title,
    blocking: reportCheckBlocks(spec, env ?? process.env.CHECK_BLOCKING),
    findings: run[spec.id](),
  }));
}

// ---------------------------------------------------------------------------
// 1. Ignored declared defaults

/** The program names a default statement uses, by program id. */
const PROGRAM_NAMES: Record<string, readonly string[]> = {
  SNAP: ["SNAP"],
  Medicaid: ["Medicaid", "Medical Assistance", "Health First Colorado"],
  "CHP+": ["CHP+"],
  ColoradoWorks: ["Colorado Works"],
  AdultFinancial: ["Adult Financial"],
  CCCAP: ["CCCAP"],
  LEAP: ["LEAP"],
  SunBucks: ["SUN Bucks"],
};

/** A sentence that says what an unstated value is read as. */
const DEFAULT_STATEMENTS: readonly RegExp[] = [
  // "If not stated, SNAP reads this as false", "When unstated, ... treats it as 0"
  /\b(?:if|when)\s+(?:it is\s+|this is\s+)?(?:not stated|unstated|left unstated|absent)\b[^.;]*?\b(?:reads?|treats?|takes?)\b[^.;]*?\bas\b/i,
  // "read as false when not stated", "reads it as no when unstated"
  /\b(?:reads?|read|treats?)\b[^.;]*?\bas\b[^.;]*?\bwhen\s+(?:not stated|unstated|absent)\b/i,
];

/** Sentences that mention the words but declare no default: history ("no
 *  longer", "before", "until that round") or a required fact. */
const NOT_A_DEFAULT = /cannot be determined|cannot determine|\bno longer\b|\bbefore[,:]|\buntil that round\b|required where read|\bis unknown\b|\bunknown, not\b|\(unknown\)/i;

export interface DeclaredDefault {
  item: Item;
  /** the sentence that declares it. */
  statement: string;
  /** the programs it names outside parentheses (ids); empty when it names
   *  none ("every program", "a program"). */
  programs: string[];
  /** programs the sentence names as requiring the fact: not covered. */
  excluded: string[];
  /** the item ids (CO-n) and identifiers it names, anywhere in it: when
   *  some of them are readers of the fact, the default is declared for those
   *  readers only. */
  names: string[];
}

/** The default a supplied fact declares in its meaning or precision, if any. */
export function declaredDefault(it: Item): DeclaredDefault | null {
  if (it.kind !== "supplied") return null;
  for (const text of [it.precision, it.meaning]) {
    if (!text) continue;
    for (const sentence of text.split(/(?<=\.)\s+/)) {
      // Quotations and parentheses (a cited rule's words, a history note)
      // do not unmake the statement; "Left unstated (unknown)" does.
      if (NOT_A_DEFAULT.test(sentence.replace(/'[^']*'|"[^"]*"|\([^()]*\)/g, " ")) || /\(unknown\)/i.test(sentence)) continue;
      if (!DEFAULT_STATEMENTS.some((re) => re.test(sentence))) continue;
      // The programs it is declared for are those named before its verb
      // ("If not stated, LEAP, SNAP and Medicaid read this as false"), outside
      // parentheses; a program named as one that requires it is not.
      const outside = sentence.replace(/\([^()]*\)/g, " ");
      const verb = /\b(?:reads?|treats?|takes?)\b/i.exec(outside);
      const subject = verb ? outside.slice(0, verb.index) : outside;
      const requiring = outside.split(/[;:]/).filter((c) => /\brequires?\b/i.test(c)).join(" ");
      const named = (text: string) => Object.entries(PROGRAM_NAMES)
        .filter(([, names]) => names.some((n) => new RegExp(`(^|[^A-Za-z])${n.replace(/[+]/g, "\\+")}([^A-Za-z+]|$)`).test(text)))
        .map(([id]) => id);
      const programs = named(subject);
      const excluded = named(requiring).filter((p) => !programs.includes(p));
      const names = [...new Set(sentence.match(/\b(?:[A-Z]+-\d+|[a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b/g) ?? [])];
      return { item: it, statement: sentence.trim(), programs, excluded, names };
    }
  }
  return null;
}

/** Whether `e` reads `identifier` outside the first argument of an
 *  `otherwise` (or the argument of `unknown`): a bare read, which is unknown
 *  when the fact is unstated. */
export function readsBare(e: Expr, identifier: string, guarded = false): boolean {
  if (typeof e === "string") return e === identifier && !guarded;
  if (!Array.isArray(e)) return false;
  const op = e[0];
  if (op === "otherwise") {
    return readsBare(e[1] as Expr, identifier, true) ||
      e.slice(2).some((x) => readsBare(x as Expr, identifier, guarded));
  }
  if (op === "unknown") return e.slice(1).some((x) => readsBare(x as Expr, identifier, true));
  return e.some((x) => readsBare(x as Expr, identifier, guarded));
}

export interface IgnoredDefault {
  fact: Item;
  statement: string;
  programs: string[];
  reader: Item;
}

/** Whether `e` tests `[unknown, ...]` of an expression that reads
 *  `identifier`: the reader handles the fact's absence itself. */
export function testsUnknown(e: Expr, identifier: string): boolean {
  if (!Array.isArray(e)) return false;
  if (e[0] === "unknown" && e.slice(1).some((x) => mentions(x as Expr, identifier))) return true;
  return e.some((x) => testsUnknown(x as Expr, identifier));
}

function mentions(e: Expr, identifier: string): boolean {
  if (typeof e === "string") return e === identifier;
  return Array.isArray(e) && e.some((x) => mentions(x as Expr, identifier));
}

/** Every reader the declared default covers that reads the fact bare and
 *  does not test its absence. The default covers the readers its sentence
 *  names (by id or identifier), when it names any; else every reader of the
 *  programs it names; else every reader. */
export function ignoredDeclaredDefaults(engine: Engine): IgnoredDefault[] {
  const out: IgnoredDefault[] = [];
  for (const it of engine.items()) {
    const d = declaredDefault(it);
    if (!d) continue;
    const readers = engine.usedBy(it.identifier).map((rid) => engine.item(rid))
      .filter((r): r is Item => !!r && r.kind === "derived" && r.derived !== undefined && r.derived !== null);
    const named = readers.filter((r) => d.names.includes(r.id) || d.names.includes(r.identifier));
    for (const reader of named.length ? named : readers) {
      if (!named.length && d.programs.length && !d.programs.includes(reader.program)) continue;
      if (!named.length && d.excluded.includes(reader.program)) continue;
      if (readsBare(reader.derived!, it.identifier) && !testsUnknown(reader.derived!, it.identifier)) {
        out.push({ fact: it, statement: d.statement, programs: d.programs, reader });
      }
    }
  }
  return out.sort((a, b) => byId(a.fact.id, b.fact.id) || byId(a.reader.id, b.reader.id));
}

function formatIgnoredDefault(f: IgnoredDefault): string {
  return `${f.fact.id} ${f.fact.identifier} declares "${clip(f.statement, 140)}"; ` +
    `${f.reader.id} ${f.reader.identifier} (${f.reader.program}) reads it bare`;
}

// ---------------------------------------------------------------------------
// 2. Shared items citing or reading one program

/** Each program's own regulations, by the citation line of the excerpt
 *  (sources.md). Statutes, federal SSI rules (20 CFR 416, a method several
 *  programs adopt) and guidance are no one program's. */
const PROGRAM_REGULATIONS: ReadonlyArray<readonly [string, RegExp]> = [
  ["SNAP", /^(?:7 CFR 27[1-4]|10 CCR 2506-1)\b/],
  ["Medicaid", /^(?:42 CFR 43[0-9]|10 CCR 2505-10)\b/],
  ["CHP+", /^(?:42 CFR 457|10 CCR 2505-3)\b/],
  ["ColoradoWorks", /^(?:9 CCR 2503-6|45 CFR 26[0-5])\b/],
  ["AdultFinancial", /^9 CCR 2503-5\b/],
  ["CCCAP", /^(?:8 CCR 1403-1|45 CFR 98)\b/],
  ["LEAP", /^9 CCR 2503-7\b/],
  ["SunBucks", /^7 CFR 292\b/],
];

/** The program whose regulation an excerpt's citation is, or null. */
export function regulationProgram(citation: string | undefined): string | null {
  const c = (citation ?? "").trim();
  for (const [p, re] of PROGRAM_REGULATIONS) if (re.test(c)) return p;
  return null;
}

export interface SharedFinding {
  item: Item;
  /** the one program whose regulations it cites, with those excerpts. */
  citesOnly?: { program: string; sources: string[] };
  /** program-prefixed items its derivation reads, and whether it declares
   *  each in accepts_from. */
  reads: Array<{ identifier: string; id: string; program: string; declared: boolean }>;
}

export function isSharedItem(it: Item, chapterOf: Record<string, string>): boolean {
  return it.program === "All" || chapterOf[it.id] === "shared";
}

export function sharedItemsOfOneProgram(input: Pick<ReportCheckInput, "engine" | "items" | "meta" | "chapterOf" | "sourceCitations">): SharedFinding[] {
  const prefixes = (input.meta.programs ?? [])
    .filter((p): p is typeof p & { prefix: string } => !!p.prefix)
    .map((p) => [p.id, p.prefix] as const);
  const out: SharedFinding[] = [];
  for (const it of input.items) {
    if (!isSharedItem(it, input.chapterOf)) continue;
    const cited = [...new Set([...(it.sources ?? []), ...(it.versions ?? []).map((v) => v.source).filter((s): s is string => !!s)])];
    const byProgram = new Map<string, string[]>();
    for (const s of cited) {
      const p = regulationProgram(input.sourceCitations[s]);
      if (p) byProgram.set(p, [...(byProgram.get(p) ?? []), s]);
    }
    const finding: SharedFinding = { item: it, reads: [] };
    if (byProgram.size === 1) {
      const [[program, sources]] = [...byProgram];
      finding.citesOnly = { program, sources };
    }
    if (it.kind === "derived") {
      const declared = new Set((it.accepts_from ?? []).map((a) => (typeof a === "string" ? a : a.from)));
      for (const ref of input.engine.usesOfItem(it.identifier)) {
        const pre = prefixes.find(([, prefix]) => ref.startsWith(prefix));
        const dep = input.engine.item(ref);
        if (!pre || !dep) continue;
        finding.reads.push({ identifier: ref, id: dep.id, program: pre[0], declared: declared.has(ref) });
      }
    }
    if (finding.citesOnly || finding.reads.length) out.push(finding);
  }
  return out.sort((a, b) => byId(a.item.id, b.item.id));
}

function formatSharedFinding(f: SharedFinding): string {
  const parts: string[] = [];
  if (f.citesOnly) {
    parts.push(`cites only ${f.citesOnly.program}'s regulation (${f.citesOnly.sources.join(", ")})`);
  }
  if (f.reads.length) {
    parts.push(`reads ${f.reads.map((r) => `${r.identifier} (${r.id}${r.declared ? ", declared in accepts_from" : ""})`).join(", ")}`);
  }
  return `${f.item.id} ${f.item.identifier} (${f.item.kind}, ${f.item.program}): ${parts.join("; ")}`;
}

// ---------------------------------------------------------------------------
// 3. Benefit status without a receipt

interface BenefitSpec {
  benefit: string;
  /** the status fact and what counts as "receiving" (and as "not"). */
  status: string;
  receiving: (v: unknown) => boolean | null;
  /** the receipt kind that is the payment. */
  kind: string;
  /** a stated fact that gives status without a payment. */
  reasons: readonly string[];
}

export const BENEFITS: readonly BenefitSpec[] = [
  {
    benefit: "SSI", status: "receives_ssi", kind: "ssi",
    receiving: (v) => (typeof v === "boolean" ? v : null),
    reasons: ["retains_ssi_status_without_payment"],
  },
  {
    benefit: "TANF cash", status: "receives_tanf_cash", kind: "colorado_works_cash",
    receiving: (v) => (typeof v === "boolean" ? v : null),
    reasons: [],
  },
  {
    benefit: "Adult Financial", status: "adult_financial_program_received", kind: "adult_financial_cash",
    receiving: (v) => (typeof v === "string" ? v !== "none" : null),
    reasons: [],
  },
];

export interface BenefitFinding {
  caseId: string;
  person: string;
  benefit: string;
  month: string;
  /** "status-without-receipt" or "receipt-without-status". */
  kind: "status-without-receipt" | "receipt-without-status";
  status: string;
  statusValue: unknown;
  receiptKind: string;
  /** other persons of the case with a receipt of the kind in the month
   *  (a payee, say): context, not a stated reason. */
  othersWithReceipt: string[];
}

/** Whether a receipt comes in `month`: its `month` or its `date`'s month;
 *  with neither, a stream of payments recurs in every month from its
 *  start_date through its end_date (each when stated), unless it is paid
 *  once, when it cannot be placed. */
export function receivedIn(r: Record<string, unknown>, month: string): boolean {
  const m = recordMonth(r);
  if (m !== undefined) return m === month;
  if (r.frequency === "once") return false;
  const from = typeof r.start_date === "string" ? r.start_date.slice(0, 7) : null;
  const to = typeof r.end_date === "string" ? r.end_date.slice(0, 7) : null;
  return (from === null || from <= month) && (to === null || month <= to);
}

function receiptsOf(facts: Record<string, unknown> | undefined): Array<Record<string, unknown>> {
  const list = facts?.receipts;
  return Array.isArray(list) ? list.filter((r): r is Record<string, unknown> => !!r && typeof r === "object") : [];
}

/** The findings for every stored household, in file order. The status facts
 *  are person facts as of the determination date, so the month compared is
 *  the determination month. */
export function benefitStatusFindings(cases: readonly HouseholdCase[]): BenefitFinding[] {
  const out: BenefitFinding[] = [];
  for (const c of cases) {
    const month = String(c.case_facts?.determination_date ?? c.as_of ?? "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    const persons = Object.entries(c.persons ?? {});
    for (const b of BENEFITS) {
      const withReceipt = new Set(persons
        .filter(([, p]) => receiptsOf(p.facts).some((r) => r.kind === b.kind && receivedIn(r, month)))
        .map(([pid]) => pid));
      for (const [pid, p] of persons) {
        const facts = (p.facts ?? {}) as Record<string, unknown>;
        if (!(b.status in facts)) continue;
        const receiving = b.receiving(facts[b.status]);
        if (receiving === null) continue;
        const has = withReceipt.has(pid);
        const reason = b.reasons.some((r) => facts[r] === true);
        const base = {
          caseId: c.id, person: pid, benefit: b.benefit, month, status: b.status,
          statusValue: facts[b.status], receiptKind: b.kind,
          othersWithReceipt: [...withReceipt].filter((o) => o !== pid),
        };
        if (receiving && !has && !reason) out.push({ ...base, kind: "status-without-receipt" });
        if (!receiving && has) out.push({ ...base, kind: "receipt-without-status" });
      }
    }
  }
  return out;
}

function formatBenefitFinding(f: BenefitFinding): string {
  const others = f.othersWithReceipt.length ? ` (${f.othersWithReceipt.join(", ")} states one)` : "";
  return f.kind === "status-without-receipt"
    ? `${f.caseId} ${f.person}: ${f.status} ${JSON.stringify(f.statusValue)}, but no receipt of kind ${f.receiptKind} in ${f.month} and no stated reason${others}`
    : `${f.caseId} ${f.person}: a receipt of kind ${f.receiptKind} in ${f.month}, but ${f.status} ${JSON.stringify(f.statusValue)}`;
}

// ---------------------------------------------------------------------------

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ");
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function byId(a: string, b: string): number {
  const n = (s: string) => Number(/(\d+)$/.exec(s)?.[1] ?? NaN);
  const pa = a.replace(/\d+$/, "");
  const pb = b.replace(/\d+$/, "");
  return pa === pb && !Number.isNaN(n(a)) && !Number.isNaN(n(b)) ? n(a) - n(b) : a.localeCompare(b);
}
