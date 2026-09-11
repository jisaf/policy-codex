import type { Engine } from "../engine/engine";
import type { Item, TestSpec } from "../engine/types";

export const PROPOSAL_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    notes: {
      type: "string",
      description:
        "Short reading notes for the SME: what the text establishes, what was left out and why.",
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          identifier: { type: "string" },
          kind: { type: "string", enum: ["supplied", "derived", "parameter"] },
          type: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          scope: {
            type: "string",
            enum: ["person", "person-month", "case", "month", "global"],
          },
          program: { type: "string", enum: ["All", "Medicaid", "SNAP"] },
          role: { type: "string", enum: ["", "outcome"] },
          meaning: { type: "string" },
          precision: { type: "string" },
          supplied_by: { type: "string" },
          value: { type: "string" },
          derived_text: {
            type: "string",
            description:
              "The derivation in pattern English exactly as the grammar specifies, " +
              "multi-line with two-space indentation for lists.",
          },
          sources: { type: "array", items: { type: "string" } },
          implemented: { type: "string", enum: ["", "assembly", "engine"] },
          tags: {
            type: "array",
            items: { type: "string", enum: ["legal", "medical", "state_election"] },
          },
          open_questions: { type: "array", items: { type: "string" } },
          examples: {
            type: "array",
            items: { type: "string" },
            description:
              "One example per string in the exact format " +
              "'T1: given fact=value; other=value => expected'.",
          },
          rationale: { type: "string" },
        },
        required: [
          "name", "identifier", "kind", "type", "options", "scope", "program", "role",
          "meaning", "precision", "supplied_by", "value", "derived_text", "sources",
          "implemented", "tags", "open_questions", "examples", "rationale",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["notes", "items"],
  additionalProperties: false,
};

export interface ProposalItem {
  name: string; identifier: string; kind: string; type: string; options: string[];
  scope: string; program: string; role: string; meaning: string; precision: string;
  supplied_by: string; value: string; derived_text: string; sources: string[];
  implemented: string; tags: string[]; open_questions: string[]; examples: string[];
  rationale: string;
}

export interface Proposal { notes: string; items: ProposalItem[] }

export function extractJson(text: string): unknown {
  const stripped = text.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(stripped);
  } catch {
    const first = stripped.indexOf("{");
    const last = stripped.lastIndexOf("}");
    if (first < 0 || last <= first) throw new Error("the model did not return JSON");
    try {
      return JSON.parse(stripped.slice(first, last + 1));
    } catch {
      throw new Error("the model did not return JSON");
    }
  }
}

export function parseProposal(text: string): Proposal {
  const raw = extractJson(text) as Partial<Proposal>;
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.items)) {
    throw new Error("the model returned JSON without an items list");
  }
  return { notes: raw.notes ?? "", items: raw.items };
}

/** Convert one proposed item into a codex item, parsing its derivation and
 *  examples with the engine. Failures are reported, never thrown, so a partly
 *  usable draft still reaches the editor. */
export function proposalToItem(
  engine: Engine, p: ProposalItem, id: string,
): { item: Item; errors: string[] } {
  const errors: string[] = [];
  const item: Item = {
    id,
    name: p.name,
    identifier: p.identifier || engine.slug(p.name),
    kind: (p.kind || "derived") as Item["kind"],
    type: p.type,
    scope: (p.scope || "person") as Item["scope"],
    program: (p.program || "All") as Item["program"],
    meaning: p.meaning,
    sources: p.sources ?? [],
    tests: [],
  };
  if (p.options?.length) item.options = p.options;
  if (p.role) item.role = p.role;
  if (p.precision) item.precision = p.precision;
  if (p.supplied_by) item.supplied_by = p.supplied_by;
  if (p.tags?.length) item.tags = p.tags;
  if (p.open_questions?.length) item.open = p.open_questions;
  if (p.value !== "" && p.value !== undefined && item.kind === "parameter") {
    item.value = /^-?\d+(\.\d+)?$/.test(p.value) ? Number(p.value)
      : p.value === "yes" ? true : p.value === "no" ? false : p.value;
  }
  if (item.kind === "derived") {
    item.implemented = (p.implemented || null) as Item["implemented"];
    if (p.derived_text) {
      try {
        item.derived = engine.parseDerivation(p.derived_text, item.options ?? []);
        item.derived_text = p.derived_text;
      } catch (e) {
        errors.push(`derivation: ${(e as Error).message}`);
      }
    }
  }
  const tests: TestSpec[] = [];
  for (const line of p.examples ?? []) {
    try {
      tests.push(engine.parseTestLine(line));
    } catch (e) {
      errors.push(`example: ${(e as Error).message}`);
    }
  }
  item.tests = tests;
  return { item, errors };
}
