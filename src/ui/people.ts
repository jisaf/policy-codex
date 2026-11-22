/* The people of a stored household as a reader names them: "Person 3 —
 * grandchild of Person 1, age 16", and their relationships as sentences
 * ("Person 1 files taxes jointly with Person 2", not "is the files jointly
 * with of"). Read from the case's own relationship lists; nothing is
 * inferred that the case does not state. */
import type { HouseholdCase } from "../engine/cases";
import { personLabel } from "./present";

/** One stated edge: `from` is the `role` of `to`. */
export interface Edge { role: string; from: string; to: string }

/** Every relationship the case states, once: the case-level triples and each
 *  person's own `[role, other]` pairs. */
export function caseEdges(hc: HouseholdCase): Edge[] {
  const out: Edge[] = [];
  const seen = new Set<string>();
  const add = (role: string, from: string, to: string) => {
    const k = `${role}|${from}|${to}`;
    if (seen.has(k) || !role || !from || !to) return;
    seen.add(k);
    out.push({ role, from, to });
  };
  for (const r of hc.relationships ?? []) {
    if (r.length === 3) add(r[0], r[1] as string, r[2] as string);
  }
  for (const [pid, p] of Object.entries(hc.persons ?? {})) {
    for (const r of (p as { relationships?: Array<[string, string]> }).relationships ?? []) add(r[0], pid, r[1]);
  }
  return out;
}

/** Each relationship role as a verb phrase, so "p4 gave_birth_to p5" reads
 *  "Person 4 gave birth to Person 5" (the evaluators found "Person 4 is the
 *  gave birth to of Person 5"). Every role in every volume's
 *  `relationship_roles` has one; test/ui/people.test.ts checks that. */
export const RELATIONSHIP_VERB: Record<string, string> = {
  parent: "is a parent of", child: "is a child of", stepparent: "is a stepparent of", stepchild: "is a stepchild of",
  spouse: "is married to", surviving_spouse_of: "is the surviving spouse of", deceased_spouse_of: "was the spouse, now deceased, of",
  holds_out_as_spouse_with: "lives with, as a spouse,",
  grandparent: "is a grandparent of", grandchild: "is a grandchild of", sibling: "is a sibling of",
  other_relative: "is a relative of", relative: "is a relative of",
  gave_birth_to: "gave birth to", born_to: "was born to",
  legal_guardian: "is the legal guardian of", guardian: "is the guardian of", ward: "is the ward of",
  foster_parent: "is the foster parent of", foster_child: "is a foster child of",
  caretaker: "is the caretaker of", "caretaker relative": "is the caretaker relative of", dependent: "is a dependent of",
  has_primary_responsibility_for: "has primary responsibility for", in_primary_care_of: "is in the primary care of",
  provides_regular_care_to: "gives regular care to", receives_regular_care_from: "receives regular care from",
  tax_filer: "claims as a tax dependent", tax_dependent: "is claimed as a tax dependent by",
  buys_prepares_with: "buys and prepares food with", shares_heat_with: "shares heating costs with",
  lives_as_one_economic_unit_with: "lives as one economic unit with",
  files_jointly_with: "files taxes jointly with", sponsor: "is the sponsor (affidavit of support) of",
  sponsored_by: "is sponsored (affidavit of support) by",
  contributes_financially_to: "contributes financially to the welfare of",
  receives_financial_contribution_from: "receives financial support from",
};

/** A role this map does not know still reads as a sentence: "is related
 *  (<role in words>) to". */
function verbFor(role: string): string {
  return RELATIONSHIP_VERB[role] ?? `is related (${role.replace(/_/g, " ")}) to`;
}

/** "Person 1 files taxes jointly with Person 2". */
export function relationshipSentence(e: Edge): string {
  return `${personLabel(e.from)} ${verbFor(e.role)} ${personLabel(e.to)}`;
}

/** The same from the first person's side, without naming them: "gave birth
 *  to Person 5", "a parent of Person 3". */
export function relationshipPhrase(role: string, other: string): string {
  return `${verbFor(role).replace(/^is /, "")} ${personLabel(other)}`;
}

/** A family role from the person's side, and its inverse. */
const NOUN: Record<string, string> = {
  parent: "parent", child: "child", stepparent: "stepparent", stepchild: "stepchild", spouse: "spouse",
  holds_out_as_spouse_with: "partner", grandparent: "grandparent", grandchild: "grandchild", sibling: "sibling",
  other_relative: "relative", legal_guardian: "legal guardian", ward: "ward", foster_parent: "foster parent",
  foster_child: "foster child", has_primary_responsibility_for: "caretaker", in_primary_care_of: "in the care",
  sponsor: "sponsor", sponsored_by: "sponsored",
};
const INVERSE: Record<string, string> = {
  parent: "child", child: "parent", stepparent: "stepchild", stepchild: "stepparent", spouse: "spouse",
  holds_out_as_spouse_with: "holds_out_as_spouse_with", grandparent: "grandchild", grandchild: "grandparent",
  sibling: "sibling", other_relative: "other_relative", legal_guardian: "ward", ward: "legal_guardian",
  foster_parent: "foster_child", foster_child: "foster_parent",
  has_primary_responsibility_for: "in_primary_care_of", in_primary_care_of: "has_primary_responsibility_for",
  sponsor: "sponsored_by", sponsored_by: "sponsor",
};
/** The order a description prefers: family first, then care, then sponsorship. */
const PREFER = [
  "spouse", "holds_out_as_spouse_with", "parent", "child", "stepparent", "stepchild", "grandparent", "grandchild",
  "sibling", "foster_parent", "foster_child", "legal_guardian", "ward", "other_relative",
  "has_primary_responsibility_for", "in_primary_care_of", "sponsor", "sponsored_by",
];

function people(ids: string[]): string {
  const nums = ids.map((x) => /^p(\d+)$/.exec(x)?.[1]);
  if (nums.every(Boolean) && ids.length > 1) {
    return `Persons ${nums.slice(0, -1).join(", ")} and ${nums[nums.length - 1]}`;
  }
  return ids.map(personLabel).join(" and ");
}

/** What the case says a person is to the others, in at most two phrases:
 *  "grandparent of Persons 2 and 3", "spouse of Person 1; parent of Person 3".
 *  Empty when the case states no family or care relationship for them. */
export function relationDescription(hc: HouseholdCase, pid: string): string {
  const by = new Map<string, string[]>();
  for (const e of caseEdges(hc)) {
    let role: string | null = null;
    let other: string | null = null;
    if (e.from === pid && NOUN[e.role]) { role = e.role; other = e.to; }
    else if (e.to === pid && INVERSE[e.role] && NOUN[INVERSE[e.role]]) { role = INVERSE[e.role]; other = e.from; }
    if (!role || !other || other === pid) continue;
    const list = by.get(role) ?? [];
    if (!list.includes(other)) list.push(other);
    by.set(role, list);
  }
  const roles = [...by.keys()].sort((a, b) => PREFER.indexOf(a) - PREFER.indexOf(b));
  return roles.slice(0, 2).map((r) => {
    const noun = NOUN[r];
    if (r === "in_primary_care_of") return `in the care of ${people(by.get(r)!)}`;
    if (r === "sponsored_by") return `sponsored by ${people(by.get(r)!)}`;
    return `${noun} of ${people(by.get(r)!)}`;
  }).join("; ");
}

/** "Person 3 — grandchild of Person 1, age 16"; "Person 2, age 81" when the
 *  case states no relationship for them. */
export function describePerson(hc: HouseholdCase, pid: string, age: number | null): string {
  const rel = relationDescription(hc, pid);
  const a = age !== null ? `age ${age}` : "";
  if (!rel) return personLabel(pid) + (a ? `, ${a}` : "");
  return `${personLabel(pid)} — ${rel}${a ? `, ${a}` : ""}`;
}
