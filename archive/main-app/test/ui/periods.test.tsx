/* Editing a figure set by dated periods (CDHS cash lead retest, section 2):
 * a Value edit on a versioned parameter becomes an edited version instead of
 * being dropped as "no change"; a new period is added from a date with its
 * value and source; a figure with no period yet refuses a bare value rather
 * than dropping it. */
import { describe, it, expect } from "vitest";
import path from "node:path";
import { render } from "preact";
import { act } from "preact/test-utils";
import { loadVolume } from "../../src/tools/volumes";
import {
  addVersion, mergeBlock, parseValueText, setVersionValue, valueEditIssue,
} from "../../src/engine/item-block";
import type { Item } from "../../src/engine/types";
import { paramInForce } from "../../src/engine/versions";
import { FormEditor } from "../../src/ui/FormEditor";
import { TextEditor } from "../../src/ui/TextEditor";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const chart = engine.item("cw_grant_standard_table")!;

describe("a Value edit on a dated figure", () => {
  it("edits the latest period's value, never a flat value the periods would shadow", () => {
    expect(chart.versions!.length).toBeGreaterThan(1);
    const latest = chart.versions![chart.versions!.length - 1];
    const raised = Object.fromEntries(Object.entries(latest.value as Record<string, number>).map(([k, v]) => [k, Math.round(v * 1.02)]));
    const block = engine.itemBlock(chart).replace(/^Value\s+.*$/m, `Value         ${JSON.stringify(raised)}`);
    const parsed = engine.parseItemBlock(block);
    expect(parsed.errors).toEqual([]);
    const merged = mergeBlock(chart, parsed.item);
    expect(merged.value).toBeUndefined();
    expect(merged.versions!.length).toBe(chart.versions!.length);
    expect(merged.versions![merged.versions!.length - 1].value).toEqual(raised);
    // Earlier periods are untouched, and the change is a real change.
    expect(merged.versions!.slice(0, -1)).toEqual(chart.versions!.slice(0, -1));
    expect(paramInForce(merged, latest.from)).toEqual(raised);
  });

  it("an untouched Value line changes nothing", () => {
    const merged = mergeBlock(chart, engine.parseItemBlock(engine.itemBlock(chart)).item);
    expect(merged.versions).toEqual(chart.versions);
    expect(merged.value).toBeUndefined();
  });

  it("refuses a value on a dated figure with no period yet, with a reason", () => {
    const empty: Item = { ...chart, versions: [] };
    const parsed = engine.parseItemBlock(engine.itemBlock(empty).replace(/^Value\s+.*$/m, "Value         120"));
    expect(valueEditIssue(empty, parsed.item)).toMatch(/Add a new dated period/);
    expect(valueEditIssue(chart, parsed.item)).toBeNull();
  });

  it("the text editor says which period the Value line is", () => {
    const host = document.createElement("div");
    render(<TextEditor engine={engine} draft={chart} onChange={() => {}} vol={vol} />, host);
    expect(host.querySelector(".periodsnote")!.textContent).toMatch(/dated periods.*Add a new dated period/s);
  });
});

describe("adding a dated period", () => {
  it("ends the running period the day the new one starts, and keeps the source", () => {
    const next = addVersion(chart, { from: "2028-07-01", value: { "0": 382 }, source: "S1800" });
    expect(typeof next).not.toBe("string");
    const it = next as Item;
    const added = it.versions!.find((v) => v.from === "2028-07-01")!;
    expect(added).toMatchObject({ value: { "0": 382 }, source: "S1800" });
    const before = it.versions!.filter((v) => v.from < "2028-07-01");
    expect(before.every((v) => v.to !== undefined && v.to <= "2028-07-01")).toBe(true);
    expect(paramInForce(it, "2028-07-01")).toEqual({ "0": 382 });
    expect(paramInForce(it, "2027-01-01")).toEqual(paramInForce(chart, "2027-01-01"));
  });

  it("a period inside an earlier gap ends at the next period", () => {
    const it: Item = { ...chart, versions: [{ from: "2025-01-01", to: "2025-07-01", value: 1 }, { from: "2026-01-01", value: 3 }] };
    const out = addVersion(it, { from: "2025-07-01", value: 2 }) as Item;
    expect(out.versions!.map((v) => [v.from, v.to ?? null, v.value])).toEqual([
      ["2025-01-01", "2025-07-01", 1], ["2025-07-01", "2026-01-01", 2], ["2026-01-01", null, 3],
    ]);
  });

  it("refuses a missing date, a missing value or a duplicate start", () => {
    expect(addVersion(chart, { from: "", value: 1 })).toMatch(/start date/);
    expect(addVersion(chart, { from: "2029-01-01", value: "" })).toMatch(/value/);
    expect(addVersion(chart, { from: chart.versions![0].from, value: 1 })).toMatch(/already exists/);
  });

  it("reads typed values as numbers, yes/no and JSON tables", () => {
    expect(parseValueText("120")).toEqual({ value: 120 });
    expect(parseValueText("yes")).toEqual({ value: true });
    expect(parseValueText('{"1": 2}')).toEqual({ value: { 1: 2 } });
    expect(parseValueText("{oops")).toHaveProperty("error");
    expect(setVersionValue(chart, 0, 5).versions![0].value).toBe(5);
  });

  it("the form editor's 'Add a new dated period' stages the period", () => {
    let draft: Item = chart;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const draw = () => render(<FormEditor engine={engine} draft={draft} onChange={(n) => { draft = n; draw(); }} />, host);
    act(draw);
    const set = (name: string, v: string) => {
      const el = host.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    act(() => { set("period-from", "2028-07-01"); set("period-value", '{"0": 382, "1": 498}'); set("period-source", "S1800"); });
    act(() => { host.querySelector<HTMLButtonElement>("button.addperiodbtn")!.click(); });
    expect(draft.versions!.some((v) => v.from === "2028-07-01" && v.source === "S1800")).toBe(true);
    expect(host.querySelector('tr[data-from="2028-07-01"]')).not.toBeNull();
    host.remove();
  });
});
