/* What keeps a click quick on a loaded machine (the e2e's first click after
 * choosing a role took ~25s under load): the resting index is built once, a
 * household at a time, and shared by every page that asks; a household's
 * trace is explained once whichever way the index is built; and moving
 * between pages neither rebuilds the draft engine nor validates an empty
 * tray against a second engine. */
import { describe, it, expect, vi } from "vitest";
import path from "node:path";
import { loadVolume } from "../../src/tools/volumes";
import { restingIndex, restingIndexInSteps, restingReady } from "../../src/ui/counts";
import { caseReads, expectationReads } from "../../src/ui/questionEffects";
import { sameChangeSet } from "../../src/ui/state";
import { emptyChangeSet } from "../../src/changes/types";
import { validateChangeSet } from "../../src/changes/validate";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");

describe("the resting index", () => {
  it("is built once for every page that asks, and the index built at once is the same one", async () => {
    const cases = vol.cases.slice(0, 4);
    const a = restingIndexInSteps(engine, cases);
    const b = restingIndexInSteps(engine, cases);
    expect(b).toBe(a);
    const ix = await a;
    expect(restingReady(engine, cases)).toBe(true);
    expect(restingIndex(engine, cases)).toBe(ix);
  });

  it("explains each household's trace once, however the reads are asked for", () => {
    const e = engine.withItems(engine.items());
    const spy = vi.spyOn(e, "explainCase");
    const c = vol.cases[5];
    const one = caseReads(e, c);
    expectationReads(e, [c]);
    expectationReads(e, [c, vol.cases[6]]);
    expect(caseReads(e, c)).toBe(one);
    expect(spy.mock.calls.filter(([x]) => x === c)).toHaveLength(1);
  });
});

describe("moving between pages", () => {
  it("an empty tray validates against the base engine, no second engine built", () => {
    const spy = vi.spyOn(engine, "withItems");
    const report = validateChangeSet(engine, emptyChangeSet("co", "local"));
    expect(report.valid).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("a change set read again from storage is the same one", () => {
    const a = { ...emptyChangeSet("co", "local"), entries: [{ id: "CO-1", chapter: "x", before: null, after: null }] };
    const b = JSON.parse(JSON.stringify(a));
    expect(sameChangeSet(a as never, b)).toBe(true);
    expect(sameChangeSet(a as never, { ...b, entries: [] })).toBe(false);
    expect(sameChangeSet(a as never, { ...b, baseRef: "main" })).toBe(false);
  });
});
