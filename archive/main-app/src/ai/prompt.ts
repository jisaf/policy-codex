import { normalizeTags } from "../engine/tags";
import type { Engine } from "../engine/engine";
import type { Item, VolumeMeta } from "../engine/types";
import type { DocumentMeta } from "../ledger/documents";
import type { Source } from "../ledger/markdown";

export const GRAMMAR = `
PATTERN ENGLISH (the only language allowed in derived_text; the checker parses it back to a canonical form)

Facts are referenced by their exact Fact name from the glossary (case-insensitive). Parameters are referenced by name; you may append the value in parentheses, e.g. "Medicaid dependent child maximum age (13)".
Literals: numbers (19, 0.08, 217.5), dates (2027-01-01), months (2027-02), yes, no, and enumeration options (written bare, e.g. not yet in effect).
Constants: the Determination Date; the month containing the Determination Date; the month (only inside a per-month item or a months pattern); that person (only inside a person pattern).

Conditions (yes/no):
  all of the following are true:            followed by indented "- " items
  any of the following is true:             followed by indented "- " items
  it is not the case that <condition>
  <a> is less than | is at most | is at least | is more than | is equal to <b>     (numbers with numbers, dates with dates, months with months)
  <enumeration fact> is one of: option a, option b
  <fact> is unknown
  <condition>, otherwise <yes|no>           explicit default when the condition is unknown
  in each of <months>:                       followed by an indented condition (uses "the month")
  in at least one of <months>:               followed by an indented condition
  there is a person in <group fact> such that     followed by an indented condition about "that person"
  there is a person of whom this person is a parent, guardian, or caretaker relative such that   followed by an indented condition
  that person's <fact>          this person is a parent or spouse of that person          that person is in <group fact>

Numbers:
  <a> plus <b>   <a> minus <b>   <a> times <b>   <a> divided by <b>   the lesser of <a> and <b>
  the number of whole years between <date> and <date>
  the number of months in <months> for which <condition>
  <per-month number fact> averaged over <months>
  <table fact> for <month>, for that person
  (wrap a nested arithmetic or otherwise expression in parentheses when it is an operand)

Dates and months:
  the month containing <date>   the month before <month>   the month after <month>   the first day of <month>
  the <N> consecutive months ending with <month>      the months from <month> through <month>
  <per-month fact> for <month>          reads a per-month fact at a month; required when a per-person item reads a per-month fact

Enumerated results (for outcomes):
  if <condition>
    then <value>
  else if <condition>
    then <value>
  otherwise <value>

Layout: the first line of derived_text is the top pattern; indent nested lines by two spaces per level; list items start with "- ".

EXAMPLES (exact style)
  all of the following are true:
    - Age is at least Medicaid community engagement minimum age (19)
    - Age is less than Medicaid community engagement age ceiling (65)

  any of the following is true:
    - Is pregnant
    - Is entitled to postpartum medical assistance

  the number of whole years between Date of Birth and the Determination Date

  in each of Medicaid: application lookback months:
    Medicaid: community engagement satisfied for month for the month

  if the Determination Date is less than Medicaid community engagement implementation date (2027-01-01)
    then not yet in effect
  else if it is not the case that Medicaid: is an applicable individual
    then not subject
  otherwise not met

EXAMPLE LINES (the examples field; one string per test)
  T1: given date_of_birth="2008-03-16" => yes
  T2: given month 2027-02; hours_worked=90; is_enrolled_half_time_education=no => yes
  T3: given as of 2026-12-15 => not yet in effect
  Values: numbers, yes/no, "quoted strings" for dates and options, JSON lists/objects. Use identifiers (snake_case) in examples, never names. Stub derived inputs directly by identifier when convenient. A per-month item needs "month YYYY-MM".
`;

export const RULES = `
RULES
1. Reuse existing glossary items whenever they carry the same meaning. Never re-create an existing fact under a new name. Reference existing items by their exact Fact name.
2. Supplied facts are raw facts about the world (a date, a yes/no reported or verified, a count). Never bake policy logic into a supplied fact; derive it instead.
3. Thresholds, ages, hour counts, and dates set by policy are parameters (kind parameter, scope global) with the value as a string; reference them by name in derivations.
4. Every derived item: a meaning an approver can sign, a derived_text in the grammar, implemented ("assembly" for data preparation such as ages, sums, and household composition; "engine" for eligibility logic and outcomes), at least two examples, at least one source.
5. Result type must match: comparisons and logic produce yes/no; arithmetic produces numbers; a case produces the item's enumeration (type "one of" with options listed).
6. Per-person items may only read per-month facts through "<fact> for <month>". Put "the month" only inside per-month items or months patterns.
7. When the text is ambiguous, choose the reading closest to the words, state it in open_questions as a full question with the assumption you took, and add the legal tag.
8. Names: prefix program-specific derived facts with "Medicaid: " or "SNAP: " and write them as predicates ("is …", "has …", "meets …"). Identifiers are snake_case, derived from the name.
9. Sources: cite existing source IDs (S1..) when the pasted text matches one; otherwise cite "NEW" and the checker will let the tech member add the excerpt.
10. Do not invent facts the text does not need. Prefer a small, complete set: the supplied facts the rule reads, the parameters it uses, the derivations, and one outcome if the text describes a determination.
11. Output only the JSON object for the schema. No prose outside the notes field.
12. Decide quickly. Do not deliberate at length over naming or structure; a deterministic checker validates the proposal and a human corrects it. Make a reasonable choice, record any doubt as an open question, and write the JSON.
`;

/** Programs (with their prefix and the outcomes each owns), the declared tag
 *  vocabulary, types, and scopes: everything a proposal's `program`, `tags`,
 *  `type`, and `scope` fields must stay inside. A volume written before
 *  phase 2 declares no programs or tags, so those lines are omitted. */
export function vocabularyText(meta: VolumeMeta): string {
  const lines: string[] = [];
  if (meta.programs?.length) {
    lines.push("Programs:");
    for (const p of meta.programs) {
      const prefix = p.prefix ? `prefix "${p.prefix}"` : "no prefix";
      const outcomes = p.outcomes?.length ? `; outcomes: ${p.outcomes.join(", ")}` : "";
      lines.push(`  ${p.id} (${prefix})${outcomes}`);
    }
  }
  if (meta.tags?.length) {
    const tags = normalizeTags(meta).map((t) => (t.parent ? `${t.id} (under ${t.parent})` : t.id));
    lines.push(`Tags: ${tags.join(", ")}`);
  }
  lines.push(`Types: ${meta.types.join(", ")}`);
  lines.push(`Scopes: ${meta.scopes.join(", ")}`);
  return "VOCABULARY\n" + lines.join("\n") + "\n";
}

/** The naming grammar in one paragraph, so a proposal's `identifier` needs no
 *  separate governance pass to be readable: lower_snake_case, no reserved
 *  operator, no bare digit token, and the owning program's prefix. */
export function namingRulesText(): string {
  return (
    "NAMING\n" +
    "Every identifier is lower_snake_case (lowercase letters, digits, and underscores, " +
    "starting with a letter) and never a bare numeral token standing for a value; name the " +
    "rule and put the number in a parameter instead. An identifier may not reuse a reserved " +
    "pattern operator (e.g. all, any, case, month, in). A derived rule owned by a program " +
    "starts with that program's declared prefix (e.g. \"medicaid_\", \"snap_\"); a program " +
    "with no declared prefix carries none, and a supplied fact stays program-neutral " +
    "regardless of which program reads it. Names read as predicates for yes/no facts " +
    "(\"is …\", \"has …\", \"meets …\") and as a plain noun phrase for everything else.\n"
  );
}

const PARA_SPLIT = /\n{2,}/;

/** A document's metadata plus its text, for a prompt. When `text` is longer
 *  than fits in `maxChars`, it is cut at the last paragraph boundary that
 *  still fits and a note says so, rather than leaving the model an object cut
 *  mid-sentence with no way to tell. */
export function documentContext(doc: DocumentMeta, text: string, maxChars = 60000): string {
  const header =
    `DOCUMENT ${doc.id}: ${doc.title} (${doc.kind})\n${doc.citation}` +
    (doc.date ? ` — ${doc.date}` : "") + "\n\n";
  const budget = Math.max(0, maxChars - header.length);
  if (text.length <= budget) return header + text;

  const paras = text.split(PARA_SPLIT);
  let body = "";
  for (const p of paras) {
    const next = body ? `${body}\n\n${p}` : p;
    if (next.length > budget) break;
    body = next;
  }
  if (!body) body = text.slice(0, budget);
  return (
    header + body +
    `\n\n[TRUNCATED at ${body.length} of ${text.length} characters, at a paragraph ` +
    "boundary; ask again with a smaller chunk of the document to read the rest.]"
  );
}

export interface DocumentChunk { heading: string; text: string }

/** Splits a document's text at each `#`/`##` heading, so a document too long
 *  for one prompt can be sent to the model one chunk at a time; the analyst
 *  picks the chunk in the panel. A document with no headings is one chunk:
 *  its whole text. */
export function chunkByHeadings(text: string): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let heading = "(start)";
  let body: string[] = [];
  const flush = () => {
    const t = body.join("\n").trim();
    if (t) chunks.push({ heading, text: t });
    body = [];
  };
  for (const line of text.split("\n")) {
    const m = /^#{1,2}\s+(.*)$/.exec(line);
    if (m) {
      flush();
      heading = m[1].trim();
    } else {
      body.push(line);
    }
  }
  flush();
  return chunks.length ? chunks : [{ heading: "(whole document)", text: text.trim() }];
}

export function glossaryText(
  items: readonly Item[],
  lit: (v: unknown) => string,
  paramValue: (it: Item) => unknown,
): string {
  return items.map((it) => {
    let extra = "";
    if (it.options?.length) extra = " options: " + it.options.join(", ");
    if (it.kind === "parameter") extra = ` value: ${lit(paramValue(it))}`;
    return `${it.id} | ${it.name} | ${it.identifier} | ${it.kind} | ${it.type} | ` +
      `${it.scope} | ${it.program}${extra}`;
  }).join("\n");
}

export function sourcesText(sources: readonly Source[]): string {
  return sources
    .map((s) => `${s.id}: ${s.title} (${s.citation.slice(0, 90)})`)
    .join("\n");
}

export function systemPrompt(engine: Engine, sources: readonly Source[]): string {
  return (
    "You draft items for a benefits policy codex: an engine-agnostic, human-approvable ledger of facts, parameters, and derived facts " +
    "written in a controlled pattern English that a deterministic checker parses. Your output is a first draft that policy SMEs will " +
    "correct and approve; be precise, cite the text, and surface every interpretation choice as an open question.\n\n" +
    "CONVENTIONS\n" +
    "Every item is a fact of one of three kinds: supplied (raw, gathered, never computed), derived (computed by a derivation; a rule is a derived fact; " +
    "a program outcome is a derived fact with role outcome), parameter (set by policy, global, versioned). Types: " +
    engine.meta.types.join(", ") + ". " +
    "Scopes: " + engine.meta.scopes.join(", ") + ". Every fact is known or unknown; a derivation with an unknown input is unknown unless an explicit " +
    "otherwise supplies a default.\n" +
    GRAMMAR + RULES + "\n" + vocabularyText(engine.meta) + "\n" + namingRulesText() +
    "\nEXISTING GLOSSARY (id | name | identifier | kind | type | scope | program)\n" +
    glossaryText(engine.items(), engine.lit, engine.paramValue) +
    "\n\nEXISTING SOURCES\n" + sourcesText(sources)
  );
}

export function draftFromSourcePrompt(source: Source, hints: string): string {
  return (
    `Draft the codex items this text establishes.\n\nSOURCE ${source.id}: ${source.title}\n` +
    `${source.citation}\n\n${source.text}\n\n` +
    (hints ? `HINTS FROM THE ANALYST\n${hints}\n\n` : "") +
    "Return only the JSON object."
  );
}

export function draftFromDocumentPrompt(doc: DocumentMeta, text: string, hints: string): string {
  return (
    "Draft the codex items this document establishes.\n\n" +
    documentContext(doc, text) + "\n\n" +
    (hints ? `HINTS FROM THE ANALYST\n${hints}\n\n` : "") +
    "Return only the JSON object."
  );
}

export function extractExcerptsPrompt(doc: DocumentMeta, text: string, hints: string): string {
  return (
    "Extract the passages of this document an analyst would cite as a source excerpt: " +
    "the operative text a derivation could reference, each as a short, exact quotation " +
    "(no summarising or paraphrasing).\n\n" +
    documentContext(doc, text) + "\n\n" +
    (hints ? `HINTS FROM THE ANALYST\n${hints}\n\n` : "") +
    'Return only the JSON object {"excerpts": [{"citation": "...", "text": "..."}, ...]}.'
  );
}

export function suggestDerivationPrompt(engine: Engine, draft: Item, hints: string): string {
  return (
    "Suggest a derivation for the item below. Return the JSON object with exactly one item, " +
    "keeping its name, identifier, kind, type, scope, and program unchanged.\n\n" +
    engine.itemBlock(draft) + "\n\n" +
    (hints ? `HINTS FROM THE ANALYST\n${hints}\n\n` : "") +
    "Return only the JSON object."
  );
}

export function explainDerivationPrompt(engine: Engine, item: Item): string {
  return (
    "Explain this derivation to a policy analyst in plain English: what it decides, which inputs " +
    "drive the answer, and where it could be misread. Put the whole explanation in the notes " +
    "field and return an empty items list.\n\n" + engine.itemBlock(item) + "\n\n" +
    "Return only the JSON object."
  );
}
