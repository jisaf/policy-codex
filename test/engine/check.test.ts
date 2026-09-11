import { describe, it, expect } from "vitest";
import { buildIndex } from "../../src/engine/ledger-index";
import { check, usesOf } from "../../src/engine/check";
import ledger from "../fixtures/ledger.json";
import checks from "../fixtures/checks.json";
import type { Item, Scope } from "../../src/engine/types";

const items = ledger.items as unknown as Item[];
const ix = buildIndex(items);
const byId = new Map(items.map((i) => [i.id, i]));

describe("check", () => {
  it("reproduces every fixture type-check report", () => {
    for (const c of checks) {
      const it = byId.get(c.id)!;
      if (!it.derived) continue;
      const got = check(ix, it.derived, it.scope as Scope);
      expect(got.type, c.id).toBe(c.type);
      expect(got.errors, c.id).toEqual(c.errors);
      expect(got.warnings, c.id).toEqual(c.warnings);
      expect([...got.refs].sort(), c.id).toEqual(c.refs);
    }
  });

  it("reports a per-month fact read without a month", () => {
    const r = check(ix, ["not", "hours_worked"], "person");
    expect(r.errors[0]).toContain('say which month');
  });

  it("reports an unknown reference", () => {
    const r = check(ix, ["not", "no_such_fact"], "person");
    expect(r.errors).toEqual(['unknown reference "no_such_fact"']);
  });

  it("lists the facts a derivation uses", () => {
    expect(usesOf(ix, ["years_between", "date_of_birth", ["det_date"]])).toEqual([
      "date_of_birth",
    ]);
  });
});
