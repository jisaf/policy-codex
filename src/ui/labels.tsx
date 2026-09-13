import type { Kind, Scope } from "../engine/types";

/** Plain-language labels for the technical vocabulary, per
 *  docs/design-onboarding.md "Names first": the same words are used
 *  wherever a kind or scope reaches a reader, and in the docs. */
const KIND_LABEL: Record<Kind, string> = {
  supplied: "a fact we are told",
  derived: "a rule",
  parameter: "a number set by policy",
};

const SCOPE_LABEL: Record<Scope, string> = {
  person: "per person",
  "person-month": "per person, per month",
  case: "per household",
  month: "per month",
  global: "for everyone",
};

/** One sentence describing what a kind is, for the places that introduce it
 *  (the editor's "what are you adding?" step, the item page). */
const KIND_BLURB: Record<Kind, string> = {
  supplied: "Something a person or agency tells us directly, like a birthdate or an address.",
  derived: "Something the ledger works out from other facts, like an age range or a test the household must pass.",
  parameter: "A number or setting fixed by policy, like an income limit or a benefit amount.",
};

export function kindLabel(kind: Kind): string {
  return KIND_LABEL[kind];
}

export function scopeLabel(scope: Scope): string {
  return SCOPE_LABEL[scope];
}

export function kindBlurb(kind: Kind): string {
  return KIND_BLURB[kind];
}

/** The plain label for a kind or a scope, with the technical term kept
 *  alongside as an alias: a reader meets the plain words first, and the
 *  ledger's own vocabulary stays one glance away for anyone who needs it. */
export function Term(props: { kind: Kind } | { scope: Scope }) {
  const alias = "kind" in props ? props.kind : props.scope;
  const label = "kind" in props ? kindLabel(props.kind) : scopeLabel(props.scope);
  return (
    <span class="term">
      {label} <code class="alias" title={`the ledger's term: ${alias}`}>{alias}</code>
    </span>
  );
}
