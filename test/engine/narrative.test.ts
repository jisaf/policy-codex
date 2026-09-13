import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildIndex } from "../../src/engine/ledger-index";
import {
  evaluate, makeCase, isDecision, type DecisionEvent, type TraceEvent,
} from "../../src/engine/evaluate";
import { caseToSpec, parseCases } from "../../src/engine/cases";
import { decidedBy, explain, narrative, story } from "../../src/engine/explain";
import { fmt } from "../../src/engine/values";
import ledger from "../fixtures/ledger.json";
import ruleTests from "../fixtures/rule-tests.json";
import type { Expr, Item } from "../../src/engine/types";

const root = path.resolve(__dirname, "../..");
const items = ledger.items as unknown as Item[];
const ix = buildIndex(items);
const byId = new Map(items.map((i) => [i.id, i]));
const cases = parseCases(fs.readFileSync(path.join(root, "volumes/mwr/tests/cases.yaml"), "utf8"));

/** A one-rule ledger: the supplied facts a rule reads, and the rule. */
function supplied(identifier: string, type = "yes/no"): Item {
  return {
    id: "S-" + identifier, name: identifier.toUpperCase(), identifier,
    kind: "supplied", type, scope: "person", program: "All",
  };
}

function rule(identifier: string, derived: Expr, type = "yes/no"): Item {
  return {
    id: "D-" + identifier, name: identifier.toUpperCase(), identifier,
    kind: "derived", type, scope: "person", program: "All", derived,
  };
}

interface Run {
  value: unknown;
  events: TraceEvent[];
  decisions: DecisionEvent[];
  decisive: string[];
}

/** Evaluates `id` over a tiny ledger with a hook, and again without one, so
 *  every case here also checks that the hook changed no answer. */
function run(made: Item[], given: Record<string, unknown>, id = "r"): Run {
  const tiny = buildIndex(made);
  const data = makeCase(tiny, { id: "T", as_of: "2027-03-15", given });
  const events: TraceEvent[] = [];
  const value = evaluate(tiny, data, id, "p1", null, (e) => events.push(e));
  expect(value).toEqual(evaluate(tiny, data, id, "p1", null));
  return {
    value,
    events,
    decisions: events.filter(isDecision),
    decisive: events.filter((e) => e.decisive).map((e) => e.identifier),
  };
}

describe("decisive branches", () => {
  it("marks the first false input of `all`, and nothing when every input held", () => {
    const made = [supplied("a"), supplied("b"), supplied("c"), rule("r", ["all", "a", "b", "c"])];
    const no = run(made, { a: true, b: false, c: true });
    expect(no.value).toBe(false);
    expect(no.decisive).toEqual(["b"]);
    // The inputs after the one that decided were never asked for at all.
    expect(no.events.filter((e) => !isDecision(e)).map((e) => e.identifier))
      .toEqual(["a", "b", "r"]);
    expect(no.decisions).toHaveLength(1);
    expect(no.decisions[0]).toMatchObject({
      kind: "decision", op: "all", chosen: 1, parentKey: "r|p1|", identifier: "r",
    });

    const yes = run(made, { a: true, b: true, c: true });
    expect(yes.value).toBe(true);
    expect(yes.decisive).toEqual([]);
    expect(yes.decisions[0].chosen).toBeNull();
  });

  it("marks the first true input of `any`", () => {
    const made = [supplied("a"), supplied("b"), supplied("c"), rule("r", ["any", "a", "b", "c"])];
    const r = run(made, { a: false, b: true, c: false });
    expect(r.value).toBe(true);
    expect(r.decisive).toEqual(["b"]);
    expect(r.decisions[0]).toMatchObject({ op: "any", chosen: 1 });
  });

  it("marks the arm a `case` took, its condition and its result", () => {
    const made = [
      supplied("a"), supplied("b"), supplied("c"), supplied("d"),
      rule("r", ["case", [["=", "b", true], "c"], ["else", "d"]]),
    ];
    const arm = run(made, { a: true, b: true, c: false, d: true });
    expect(arm.value).toBe(false);
    // The condition read b, the arm's result read c; both decided.
    expect(arm.decisive).toEqual(["b", "c"]);
    const taken = arm.decisions.find((e) => e.op === "case")!;
    expect(taken).toMatchObject({ op: "case", chosen: 0 });
    expect(taken.detail).toBeUndefined();
    // A comparison is decided by both of its operands at once.
    const cmp = arm.decisions.find((e) => e.op === "=")!;
    expect(cmp).toMatchObject({ op: "=", chosen: null, detail: "both" });
    expect(arm.events.find((e) => e.identifier === "b")!.role).toBe("left");
    expect(arm.events.find((e) => e.identifier === "c")!.role).toBe("result");

    const other = run(made, { a: true, b: false, c: false, d: true });
    expect(other.value).toBe(true);
    expect(other.decisive).toEqual(["d"]);
    expect(other.decisions.find((e) => e.op === "case")).toMatchObject({
      op: "case", chosen: 1, detail: "else",
    });
  });

  it("marks the side an `otherwise` used", () => {
    const made = [supplied("a"), supplied("b"), rule("r", ["otherwise", "a", "b"])];
    // a is not supplied, so the right side answers.
    const right = run(made, { b: true });
    expect(right.value).toBe(true);
    expect(right.decisive).toEqual(["b"]);
    expect(right.decisions[0]).toMatchObject({ op: "otherwise", chosen: 1 });
    expect(right.events.find((e) => e.identifier === "b")!.role).toBe("right");

    const left = run(made, { a: false, b: true });
    expect(left.value).toBe(false);
    expect(left.decisive).toEqual(["a"]);
    expect(left.decisions[0]).toMatchObject({ op: "otherwise", chosen: 0 });
    // The right side was never asked for.
    expect(left.events.some((e) => e.identifier === "b")).toBe(false);
  });

  it("marks the only input of `not`", () => {
    const made = [supplied("a"), rule("r", ["not", "a"])];
    const r = run(made, { a: false });
    expect(r.value).toBe(true);
    expect(r.decisive).toEqual(["a"]);
    expect(r.decisions[0]).toMatchObject({ op: "not", chosen: 0 });
  });

  it("keeps the mark to the branch every enclosing operator chose", () => {
    // A case inside an all: the case decided the all, so what decided the
    // case decided the outcome; the all's first input did not.
    const made = [
      supplied("a"), supplied("b"), supplied("c"), supplied("d"),
      rule("r", ["all", "a", ["case", [["=", "b", true], "c"], ["else", "d"]]]),
    ];
    const r = run(made, { a: true, b: true, c: false, d: true });
    expect(r.value).toBe(false);
    expect(r.decisive).toEqual(["b", "c"]);
    expect(r.decisions.map((e) => e.op)).toEqual(["=", "case", "all"]);
    expect(r.decisions[2]).toMatchObject({ op: "all", chosen: 1 });
    // d sits in the arm the case did not take, so it was never asked for, and
    // a sits in the input the all did not choose, so it decided nothing.
    expect(r.events.find((e) => e.identifier === "a")!.decisive).toBeUndefined();

    // The same rule with the all deciding on its own first input instead.
    const first = run(made, { a: false, b: true, c: false, d: true });
    expect(first.value).toBe(false);
    expect(first.decisive).toEqual(["a"]);
  });

  it("leaves the tree and the answers alone when no hook is given", () => {
    // The fixtures pin the engine; this states the rule the decisions obey.
    expect(ruleTests.length).toBeGreaterThan(0);
    const made = [supplied("a"), supplied("b"), rule("r", ["all", "a", "b"])];
    const tiny = buildIndex(made);
    const data = makeCase(tiny, { id: "T", as_of: "2027-03-15", given: { a: true, b: false } });
    expect(evaluate(tiny, data, "r", "p1", null)).toBe(false);
    const seen: TraceEvent[] = [];
    expect(evaluate(tiny, data, "r", "p1", null, (e) => seen.push(e))).toBe(false);
    expect(seen.some(isDecision)).toBe(true);
  });
});

describe("narrative", () => {
  function caseData(id: string) {
    return makeCase(ix, caseToSpec(cases.find((c) => c.id === id)!));
  }

  it("tells the story of C-03's SNAP time limit status in a dozen lines", () => {
    const node = explain(ix, caseData("C-03"), "snap_time_limit_status", "p1", null);
    expect(node.value).toBe("not subject");
    const lines = narrative(node, fmt);
    expect(lines.length).toBeLessThanOrEqual(12);
    expect(lines.length).toBeGreaterThan(0);
    // The arm the case took read the exemption, and the exemption was decided
    // by the one condition that held: the dependent child.
    expect(lines[0]).toBe("SNAP: is exempt from the ABAWD time limit is yes");
    const text = lines.join("\n");
    expect(text).toContain("SNAP: has responsibility for a dependent child under 14 is yes");
    // The conditions the exemption tried first are not part of the story.
    expect(text).not.toContain("SNAP: is in the ABAWD age range");
    const decisive = node.children.filter((k) => k.decisive);
    expect(decisive.map((k) => k.identifier)).toEqual(["snap_is_exempt_from_time_limit"]);
  });

  it("lists every child when none of them decided on its own", () => {
    const item = byId.get("WR-003")!;
    const t = (item.tests || []).find((x) => x.id === "WR-003-T2")!;
    const node = explain(ix, makeCase(ix, Object.assign({}, t, { as_of: t.as_of })), "age", "p1", null);
    expect(node.children.every((k) => k.decisive === undefined)).toBe(true);
    expect(decidedBy(node)).toEqual(node.children);
    expect(narrative(node, fmt)).toEqual(["Date of Birth is 2007-03-15"]);
    // A leaf has no story at all.
    expect(narrative(node.children[0], fmt)).toEqual([]);
  });

  it("recurses one level into a decisive derived child and no further", () => {
    const node = explain(ix, caseData("C-03"), "snap_time_limit_status", "p1", null);
    const told = story(node);
    expect(told.map((s) => s.depth)).toEqual(told.map((s) => s.depth).sort());
    expect(Math.max(...told.map((s) => s.depth))).toBe(1);
    const sub = narrative(node, fmt).filter((l) => l.startsWith("  "));
    expect(sub.length).toBeGreaterThan(0);
  });

  it("stops a long story and counts what it left out", () => {
    const wide: Item[] = [];
    const inputs: string[] = [];
    for (let i = 0; i < 20; i++) {
      wide.push(supplied("f" + i));
      inputs.push("f" + i);
    }
    wide.push(rule("r", ["all", ...inputs]));
    const tiny = buildIndex(wide);
    const given: Record<string, unknown> = {};
    for (const f of inputs) given[f] = true;
    const data = makeCase(tiny, { id: "T", as_of: "2027-03-15", given });
    const node = explain(tiny, data, "r", "p1", null);
    // Every input held, so every one of them is part of the story.
    expect(node.value).toBe(true);
    expect(node.children).toHaveLength(20);
    const lines = narrative(node, fmt);
    expect(lines).toHaveLength(12);
    expect(lines[11]).toBe("… and 9 more");
  });
});
