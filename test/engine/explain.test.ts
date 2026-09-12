import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildIndex, indexWith } from "../../src/engine/ledger-index";
import { evaluate, makeCase, type TraceEvent } from "../../src/engine/evaluate";
import { caseToSpec, parseCases, runCase } from "../../src/engine/cases";
import { explain, explainCase, type TraceNode } from "../../src/engine/explain";
import { createEngine } from "../../src/engine/engine";
import ledger from "../fixtures/ledger.json";
import ruleTests from "../fixtures/rule-tests.json";
import type { Item, TestSpec, VolumeMeta } from "../../src/engine/types";

const root = path.resolve(__dirname, "../..");
const items = ledger.items as unknown as Item[];
const meta = ledger.meta as unknown as VolumeMeta;
const ix = buildIndex(items);
const byId = new Map(items.map((i) => [i.id, i]));
const derivedCount = items.filter((i) => i.kind === "derived").length;
const cases = parseCases(fs.readFileSync(path.join(root, "volumes/mwr/tests/cases.yaml"), "utf8"));
const engine = createEngine(items, meta, null);

function caseOf(id: string) {
  const c = cases.find((x) => x.id === id)!;
  return { c, data: makeCase(ix, caseToSpec(c)) };
}

function walk(n: TraceNode, f: (n: TraceNode) => void): void {
  f(n);
  for (const k of n.children) walk(k, f);
}

function depth(n: TraceNode): number {
  return 1 + n.children.reduce((d, k) => Math.max(d, depth(k)), 0);
}

describe("traced evaluation", () => {
  it("returns the same value for every fixture rule test with and without a hook", () => {
    expect(ruleTests).toHaveLength(133);
    for (const rec of ruleTests) {
      const item = byId.get(rec.itemId)!;
      const t = (item.tests || []).find((x) => x.id === rec.testId)!;
      // The same case data and index runTest builds, so the only difference
      // between the two runs is the hook.
      const c = makeCase(ix, Object.assign({}, t, { as_of: t.as_of || meta.default_as_of }));
      const evalIx = indexWith(ix, [item]);
      const person = ["global", "case", "month"].includes(item.scope) ? null : "p1";
      const month = t.month == null ? null : t.month;
      const run = (trace?: (e: TraceEvent) => void) => {
        try {
          return { got: evaluate(evalIx, c, item.identifier, person, month, trace), err: null };
        } catch (ex) {
          return { got: null, err: (ex as Error).message };
        }
      };
      const plain = run();
      const events: TraceEvent[] = [];
      const traced = run((e) => events.push(e));
      expect(traced.got, rec.testId).toEqual(plain.got);
      expect(traced.err, rec.testId).toBe(plain.err);
      expect(events.length, rec.testId).toBeGreaterThan(0);
    }
  });

  it("reports each resolution once, in its own scope's context", () => {
    const { data } = caseOf("C-01");
    const events: TraceEvent[] = [];
    evaluate(ix, data, "medicaid_meets_hours_condition", "p1", "2027-02", (e) => events.push(e));
    const hours = events.find((e) => e.identifier === "hours_worked")!;
    expect(hours).toMatchObject({
      key: "hours_worked|p1|2027-02",
      identifier: "hours_worked",
      person: "p1",
      month: "2027-02",
      kind: "supplied",
      value: 90,
      origin: "default",
    });
    const required = events.find((e) => e.identifier === "medicaid_ce_required_hours")!;
    // A parameter is neither a person's nor a month's fact.
    expect(required).toMatchObject({
      key: "medicaid_ce_required_hours||", person: null, month: null,
      kind: "parameter", origin: "parameter", value: 80,
    });
    // Every event but the root names the derived fact that asked for it.
    const roots = events.filter((e) => e.parentKey === null);
    expect(roots).toHaveLength(1);
    expect(roots[0].identifier).toBe("medicaid_meets_hours_condition");
    const keys = new Set(events.map((e) => e.key));
    for (const e of events) {
      if (e.parentKey !== null) expect(keys.has(e.parentKey), e.identifier).toBe(true);
    }
  });
});

describe("explain", () => {
  it("explains Age from the date of birth the case supplies", () => {
    // WR-003-T2: born 2007-03-15, determined 2026-03-15, so 19.
    const item = byId.get("WR-003")!;
    const t = (item.tests || []).find((x) => x.id === "WR-003-T2")! as TestSpec;
    const data = makeCase(ix, Object.assign({}, t, { as_of: t.as_of }));
    const node = explain(ix, data, "age", "p1", null);
    expect(node.value).toBe(t.expect);
    expect(node.identifier).toBe("age");
    expect(node.name).toBe("Age");
    expect(node.kind).toBe("derived");
    expect(node.scope).toBe("person");
    expect(node.origin).toBe("evaluated");
    expect(node.key).toBe("age|p1|");
    expect(node.rule).toEqual([
      "the number of whole years between Date of Birth and the Determination Date",
    ]);
    const dob = node.children.find((k) => k.identifier === "date_of_birth")!;
    expect(dob.origin).toBe("case");
    expect(dob.value).toBe("2007-03-15");
    expect(dob.rule).toBeNull();
    // The determination date reaches Age through the det_date operator, which
    // is not a fact and so is not traced; asked for as a fact it is a case node.
    const det = explain(ix, data, "determination_date", null, null);
    expect(det.kind).toBe("case");
    expect(det.origin).toBe("case");
    expect(det.value).toBe("2026-03-15");
  });

  it("expands a derived-of-derived outcome and stops at a memo hit", () => {
    const { data } = caseOf("C-03");
    const node = explain(ix, data, "snap_time_limit_status", "p1", null);
    expect(node.value).toBe("not subject");
    expect(depth(node)).toBeGreaterThanOrEqual(3);
    const all: TraceNode[] = [];
    walk(node, (n) => all.push(n));
    for (const n of all) {
      if (n.kind === "derived") expect(n.rule, n.identifier).not.toBeNull();
      else expect(n.rule, n.identifier).toBeNull();
    }
    expect(all.some((n) => n.rule !== null && n.rule.length > 1)).toBe(true);
    const supplied = all.find((n) => n.identifier === "date_of_birth")!;
    expect(supplied.kind).toBe("supplied");
    expect(supplied.rule).toBeNull();
    // Age in the month is asked for twice for p1: computed, then remembered.
    const ages = all.filter((n) => n.key === "age_at_month|p1|2027-03");
    expect(ages).toHaveLength(2);
    expect(ages.map((n) => n.origin)).toEqual(["evaluated", "memo"]);
    expect(ages[0].value).toBe(38);
    expect(ages[1].value).toBe(38);
    expect(ages[0].children.length).toBeGreaterThan(0);
    expect(ages[1].children).toEqual([]);
    // The same fact for another person is its own evaluation, not a memo hit.
    const child = all.find((n) => n.key === "age_at_month|c1|2027-03")!;
    expect(child.origin).toBe("evaluated");
    expect(child.value).toBe(13);
    // A derived node cites the sources its item cites.
    expect(node.sources).toEqual(["S20", "S21", "S22", "S33"]);
  });

  it("marks a supplied fact the case does not answer as missing", () => {
    const data = makeCase(ix, { id: "T", as_of: "2026-03-15" });
    const bare = explain(ix, data, "date_of_birth", "p1", null);
    expect(bare.origin).toBe("missing");
    expect(bare.value).toBeNull();
    expect(bare.children).toEqual([]);
    // An unknown input makes the derived fact that needs it unknown too.
    const node = explain(ix, data, "age", "p1", null);
    expect(node.value).toBeNull();
    expect(node.origin).toBe("evaluated");
    const dob = node.children.find((k) => k.identifier === "date_of_birth")!;
    expect(dob.origin).toBe("missing");
    expect(dob.value).toBeNull();
  });

  it("carries the error when evaluation throws", () => {
    const data = makeCase(ix, { id: "T", as_of: "2026-03-15" });
    const node = explain(ix, data, "no_such_fact", "p1", null);
    expect(node.identifier).toBe("no_such_fact");
    expect(node.error).toMatch(/unknown fact no_such_fact/);
    expect(node.value).toBeNull();
  });
});

describe("explainCase", () => {
  it("returns one root per expectation of C-01, each carrying what runCase got", () => {
    const { c } = caseOf("C-01");
    const report = runCase(ix, c);
    const explained = explainCase(ix, c);
    expect(explained).toHaveLength(report.results.length);
    expect(explained).toHaveLength(4);
    explained.forEach((e, i) => {
      const r = report.results[i];
      expect(e.person).toBe(r.person);
      expect(e.identifier).toBe(r.identifier);
      expect(e.month).toBe(r.month);
      expect(e.expect).toEqual(r.expect);
      expect(e.root.identifier).toBe(r.identifier);
      expect(e.root.value, r.identifier).toEqual(r.got);
    });
    const status = explained.find((e) => e.identifier === "medicaid_ce_status_at_application")!;
    expect(status.root.value).toBe("met");
    expect(depth(status.root)).toBeGreaterThanOrEqual(3);
  });

  it("evaluates each fact at most once per trace, so the trace stays bounded", () => {
    for (const e of explainCase(ix, caseOf("C-01").c)) {
      const evaluated: string[] = [];
      walk(e.root, (n) => { if (n.origin === "evaluated") evaluated.push(n.key); });
      expect(new Set(evaluated).size, e.identifier).toBe(evaluated.length);
      expect(evaluated.length, e.identifier).toBeLessThanOrEqual(derivedCount);
    }
  });
});

describe("engine facade", () => {
  it("explains a rule-test spec and a household case", () => {
    const node = engine.explain(
      { id: "T", as_of: "2026-03-15", given: { date_of_birth: "2007-03-15" } },
      "age", "p1", null,
    );
    expect(node.value).toBe(19);
    expect(node.children.map((k) => k.identifier)).toEqual(["date_of_birth"]);
    // With no as_of the volume's default determination date applies.
    const dflt = engine.explain(
      { id: "T", given: { date_of_birth: "2007-03-15" } }, "age", "p1", null,
    );
    expect(dflt.value).toBe(20);
    expect(engine.meta.default_as_of).toBe("2027-03-15");
    const explained = engine.explainCase(caseOf("C-01").c);
    expect(explained.map((e) => e.identifier)).toEqual(
      runCase(ix, caseOf("C-01").c).results.map((r) => r.identifier),
    );
  });
});
