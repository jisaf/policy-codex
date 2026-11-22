/* The Map (src/ui/map) against the Colorado volume: what an item reads and
 * what reads it, the collapsed groups and their counts, the path finder, the
 * program filter read from the volume, the overlays and the address-bar
 * state; then the page itself renders the picture and the lists. */
import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import { render } from "preact";
import { loadVolume } from "../../src/tools/volumes";
import { declaredPrograms } from "../../src/engine/item-block";
import { emptyChangeSet } from "../../src/changes/types";
import { mapCounts } from "../../src/ui/counts";
import {
  buildMap, buildTree, downstreamSet, findPath, householdValues, moreLabel, nodeKind, overlayContext,
  overlayFlags, pathChoices, programComplexity, programOptions, recentred, resolveCenter, stateFromParams,
  statePath, stateToParams, upstreamSet, type MapCenter,
} from "../../src/ui/map/model";
import { MapPage, MapView, mapHref } from "../../src/ui/map/MapView";
import { changeSetSig, draftsShownSig, engineSig, modeSig, route, volumeSig } from "../../src/ui/state";
import { defaultRoute } from "../../src/ui/router";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const id = (coId: string) => engine.itemById(coId)!.identifier;
const center = (s: string) => resolveCenter(engine, s) as MapCenter;

const CHILD_LIMIT = "CO-191"; // MAGI income limit, Children category (a figure)
const DISREGARD = "CO-273"; // Colorado Works $90 earned income disregard
const CW_GRANT = "CO-914"; // Colorado Works basic cash assistance grant amount
const SNAP_ALLOTMENT = "CO-385";

describe("the centre", () => {
  it("names an item by id or identifier, or a program", () => {
    const c = center(CHILD_LIMIT);
    expect(c.type).toBe("item");
    expect(c.type === "item" && c.kind).toBe("figure");
    expect(center(id(CHILD_LIMIT)).key).toBe(c.key);
    const p = center("program:ColoradoWorks");
    expect(p.type).toBe("program");
    expect(p.type === "program" && p.outcomes.length).toBe(
      engine.meta.programs!.find((x) => x.id === "ColoradoWorks")!.outcomes!.length,
    );
    expect(center("SNAP").type).toBe("program");
    expect(resolveCenter(engine, "no-such-thing")).toBeNull();
  });

  it("calls a declared outcome an outcome, a parameter a figure, a supplied fact a fact", () => {
    expect(nodeKind(engine, engine.itemById(SNAP_ALLOTMENT)!)).toBe("outcome");
    expect(nodeKind(engine, engine.itemById(DISREGARD)!)).toBe("figure");
    const fact = engine.items().find((i) => i.kind === "supplied")!;
    expect(nodeKind(engine, fact)).toBe("fact");
    expect(nodeKind(engine, engine.item("cw_payment_countable_income")!)).toBe("rule");
  });
});

describe("upstream and downstream sets", () => {
  it("step 1 is exactly what the item reads, or what reads it", () => {
    const up = upstreamSet(engine, id(CW_GRANT), 1);
    expect([...up.keys()].sort()).toEqual(engine.usesOfItem(id(CW_GRANT)).filter((x) => engine.item(x)).sort());
    expect([...up.values()].every((d) => d === 1)).toBe(true);
    const down = downstreamSet(engine, id(CHILD_LIMIT), 1);
    expect([...down.keys()].sort()).toEqual([...engine.usedBy(id(CHILD_LIMIT))].sort());
  });

  it("at full depth, agrees with counts.ts mapCounts", () => {
    expect(upstreamSet(engine, id(CW_GRANT)).size).toBe(mapCounts(engine, id(CW_GRANT)).reads.total);
    expect(downstreamSet(engine, id(CHILD_LIMIT)).size).toBe(mapCounts(engine, id(CHILD_LIMIT)).readBy.total);
    expect(upstreamSet(engine, id(CHILD_LIMIT)).size).toBe(0);
    const c = mapCounts(engine, id(CW_GRANT)).reads;
    expect(c.facts + c.figures + c.rules + c.outcomes).toBe(c.total);
  });

  it("gives each item its shortest distance", () => {
    const up = upstreamSet(engine, id(CW_GRANT), 3);
    for (const [x, d] of up) {
      if (d === 1) continue;
      // Something one step nearer reads it.
      expect([...up].some(([y, dy]) => dy === d - 1 && engine.usesOfItem(y).includes(x))).toBe(true);
      expect(engine.usesOfItem(id(CW_GRANT)).includes(x)).toBe(false);
    }
  });
});

describe("the picture", () => {
  it("centres the $90 disregard on Colorado Works rules, not Medicaid (CDHS cash lead F2)", () => {
    const m = buildMap(engine, center(DISREGARD), { depth: 1 });
    const shown = [...m.nodes.values()].filter((n) => n.side !== "center");
    expect(shown.map((n) => n.key).sort()).toEqual([...engine.usedBy(id(DISREGARD))].sort());
    expect(shown.every((n) => n.item!.program === "ColoradoWorks")).toBe(true);
    expect(m.columns.map((c) => c.key)).toEqual(["center", "down-r1"]);
    // Every edge joins two shown boxes.
    for (const e of m.edges) {
      expect(m.nodes.has(e.from) && m.nodes.has(e.to)).toBe(true);
      expect(engine.usesOfItem(e.to)).toContain(e.from);
    }
  });

  it("keeps facts and figures leftmost, the centre between, outcomes rightmost", () => {
    const m = buildMap(engine, center(SNAP_ALLOTMENT), { depth: 2 });
    const keys = m.columns.map((c) => c.key);
    expect(keys[0]).toBe("up-ff");
    expect(keys.indexOf("up-r2")).toBeLessThan(keys.indexOf("up-r1"));
    expect(keys.indexOf("up-r1")).toBeLessThan(keys.indexOf("center"));
    const ff = m.columns[0].sections.flatMap((s) => s.nodes);
    expect(ff.every((n) => n.kind === "fact" || n.kind === "figure")).toBe(true);
    const down = buildMap(engine, center(CHILD_LIMIT), { depth: 3 });
    expect(down.columns[down.columns.length - 1].key).toBe("down-o1");
    expect(down.columns[down.columns.length - 1].sections.every((s) => s.kind === "outcome")).toBe(true);
  });

  it("collapses a group past its limit into a count, and opens it on request", () => {
    const p = center("program:ColoradoWorks");
    const m = buildMap(engine, p, { depth: 1 });
    const outcomes = m.groups.find((g) => g.key === "up:1:outcome")!;
    const total = p.type === "program" ? p.outcomes.length : 0;
    expect(outcomes.nodes.length).toBe(8);
    expect(outcomes.hidden.length).toBe(total - 8);
    expect(moreLabel("outcome", outcomes.hidden.length)).toBe(`+${total - 8} more outcomes`);
    expect(moreLabel("fact", 1)).toBe("+1 more fact");
    // The button sits in the outcomes column.
    expect(m.columns.find((c) => c.key === "up-r1")!.sections[0].more).toContain(outcomes);
    const open = buildMap(engine, p, { depth: 1, openGroups: new Set([outcomes.key]) });
    const og = open.groups.find((g) => g.key === "up:1:outcome")!;
    expect(og.nodes.length).toBe(total);
    expect(og.hidden.length).toBe(0);
  });

  it("counts every item once: shown plus collapsed is what lies at that distance", () => {
    const c = center(SNAP_ALLOTMENT);
    const m = buildMap(engine, c, { depth: 1, limit: 1 });
    const placed = m.groups.reduce((n, g) => n + g.nodes.length + g.hidden.length, 0);
    expect(placed).toBe(engine.usesOfItem(id(SNAP_ALLOTMENT)).length + engine.usedBy(id(SNAP_ALLOTMENT)).length);
    expect(m.groups.every((g) => g.nodes.length <= 1)).toBe(true);
  });

  it("shows a clicked box's next step, whatever the depth", () => {
    const c = center(CHILD_LIMIT);
    const m1 = buildMap(engine, c, { depth: 1 });
    const node = [...m1.nodes.values()].find((n) => n.canExpand)!;
    expect(node.distance).toBe(1);
    const m2 = buildMap(engine, c, { depth: 1, expanded: new Set([node.key]) });
    for (const r of engine.usedBy(node.key)) {
      const n = m2.nodes.get(r) ?? m2.groups.flatMap((g) => g.hidden).find((h) => h.key === r);
      expect(n, r).toBeTruthy();
    }
    expect(m2.nodes.get(node.key)!.expanded).toBe(true);
    expect(m2.nodes.size).toBeGreaterThan(m1.nodes.size);
  });
});

describe("the path finder", () => {
  it("finds how the $90 disregard reaches the Colorado Works grant, step by step", () => {
    const p = findPath(engine, id(DISREGARD), id(CW_GRANT));
    expect(p[0]).toBe(id(DISREGARD));
    expect(p[p.length - 1]).toBe(id(CW_GRANT));
    for (let i = 0; i + 1 < p.length; i++) expect(engine.usedBy(p[i])).toContain(p[i + 1]);
    expect(p.length).toBeLessThanOrEqual(upstreamSet(engine, id(CW_GRANT)).get(id(DISREGARD))! + 1);
    expect(findPath(engine, id(CHILD_LIMIT), id(CW_GRANT))).toEqual([]);
  });

  it("offers the outcomes an item reaches, or what an outcome reads", () => {
    const fromItem = pathChoices(engine, center(DISREGARD));
    expect(fromItem.fromFixed).toBe(id(DISREGARD));
    expect(fromItem.toOptions).toContain(id(CW_GRANT));
    const down = downstreamSet(engine, id(DISREGARD));
    expect(fromItem.toOptions.every((o) => down.has(o) && nodeKind(engine, engine.item(o)!) === "outcome")).toBe(true);
    const toOutcome = pathChoices(engine, center(SNAP_ALLOTMENT));
    expect(toOutcome.toFixed).toBe(id(SNAP_ALLOTMENT));
    expect(toOutcome.fromOptions.length).toBe(upstreamSet(engine, id(SNAP_ALLOTMENT)).size);
    const prog = pathChoices(engine, center("program:SNAP"), id(SNAP_ALLOTMENT));
    expect(prog.toOptions).toContain(id(SNAP_ALLOTMENT));
    expect(prog.fromOptions.length).toBe(upstreamSet(engine, id(SNAP_ALLOTMENT)).size);
  });

  it("keeps the path on the map at depth 1 and marks its edges", () => {
    const c = center(DISREGARD);
    const p = statePath(engine, c, { from: null, to: id(CW_GRANT) });
    expect(p.length).toBeGreaterThan(2);
    const m = buildMap(engine, c, { depth: 1, path: p });
    for (const x of p) expect(m.nodes.get(x)?.onPath, x).toBe(true);
    expect(m.edges.filter((e) => e.onPath).length).toBe(p.length - 1);
    // A program's path ends at the program.
    const figure = engine.itemById("CO-130")!.identifier; // SNAP maximum allotment table
    const pp = statePath(engine, center("program:SNAP"), { from: figure, to: id(SNAP_ALLOTMENT) });
    expect(pp[0]).toBe(figure);
    expect(pp[pp.length - 1]).toBe("program:SNAP");
    expect(pp[pp.length - 2]).toBe(id(SNAP_ALLOTMENT));
  });
});

describe("the program filter", () => {
  it("offers the volume's own programs, not the old MWR list", () => {
    const opts = programOptions(engine);
    for (const p of declaredPrograms(engine.meta)) expect(opts).toContain(p);
    expect(opts).toContain("ColoradoWorks");
    expect(opts).toContain("AdultFinancial");
    for (const it of engine.items()) expect(opts).toContain(it.program);
  });

  it("leaves other programs out, and says how many", () => {
    const c = center(CHILD_LIMIT);
    const all = buildMap(engine, c, { depth: 2 });
    expect([...all.nodes.values()].some((n) => n.item?.program === "CHP+")).toBe(true);
    const med = buildMap(engine, c, { depth: 2, programs: ["Medicaid"] });
    const shown = [...med.nodes.values()].filter((n) => n.side !== "center");
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.every((n) => n.item!.program === "Medicaid")).toBe(true);
    expect(med.hiddenByProgram.length).toBeGreaterThan(0);
    expect(med.hiddenByProgram.every((x) => engine.item(x)!.program !== "Medicaid")).toBe(true);
    expect(med.nodes.has(c.key)).toBe(true);
  });
});

describe("the lists", () => {
  it("nest what each item reads under it, to the depth, grouped by kind", () => {
    const c = center(CW_GRANT);
    const t1 = buildTree(engine, c, "up", { depth: 1 });
    const first = t1.flatMap((g) => g.nodes);
    expect(first.map((n) => n.key).sort()).toEqual([...engine.usesOfItem(id(CW_GRANT))].sort());
    expect(first.every((n) => n.children === null)).toBe(true);
    expect(first.some((n) => n.canExpand)).toBe(true);
    const t2 = buildTree(engine, c, "up", { depth: 2 });
    const n2 = t2.flatMap((g) => g.nodes).find((n) => n.key === "cw_grant_before_sanction")!;
    const kids = n2.children!.flatMap((g) => [...g.nodes.map((x) => x.key)]);
    const hidden = n2.children!.reduce((s, g) => s + g.hidden, 0);
    expect(kids.length + hidden).toBe(engine.usesOfItem("cw_grant_before_sanction").length);
    // Opened on click, at depth 1.
    const t3 = buildTree(engine, c, "up", { depth: 1, expanded: new Set(["cw_grant_before_sanction"]) });
    expect(t3.flatMap((g) => g.nodes).find((n) => n.key === "cw_grant_before_sanction")!.children).not.toBeNull();
  });

  it("collapse past the limit with the same count, and list a repeat once", () => {
    const c = center("program:ColoradoWorks");
    const t = buildTree(engine, c, "up", { depth: 2 });
    const og = t.find((g) => g.kind === "outcome")!;
    expect(og.nodes.length).toBe(8);
    expect(og.hidden).toBe(c.type === "program" ? c.outcomes.length - 8 : -1);
    const keys: string[] = [];
    const walk = (gs: typeof t) => gs.forEach((g) => g.nodes.forEach((n) => { if (!n.repeated) keys.push(n.key); if (n.children) walk(n.children); }));
    walk(t);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("complexity at a glance", () => {
  it("counts the facts, figures and rules feeding each outcome, biggest first on request", () => {
    const rows = programComplexity(engine, "ColoradoWorks");
    const p = center("program:ColoradoWorks");
    expect(rows.map((r) => r.identifier)).toEqual(p.type === "program" ? p.outcomes : []);
    const grant = rows.find((r) => r.identifier === id(CW_GRANT))!;
    const c = mapCounts(engine, id(CW_GRANT)).reads;
    expect([grant.facts, grant.figures, grant.rules, grant.total]).toEqual([c.facts, c.figures, c.rules + c.outcomes, c.total]);
    const big = programComplexity(engine, "ColoradoWorks", true);
    for (let i = 1; i < big.length; i++) expect(big[i - 1].total).toBeGreaterThanOrEqual(big[i].total);
  });
});

describe("overlays", () => {
  const ctx = overlayContext(engine, vol, null);

  it("flag statute over rule, open questions and unverified sources with the app's badges", () => {
    const statute = engine.items().find((i) => i.statute_override)!;
    const f = overlayFlags(engine, ctx, statute, ["statute"]);
    expect(f.map((x) => [x.key, x.badge])).toEqual([["statute", "flag override"]]);
    expect(overlayFlags(engine, ctx, statute, [])).toEqual([]);
    const withQ = engine.items().find((i) => (i.open ?? []).some((q) => ctx.openQuestions.has(q)))!;
    expect(overlayFlags(engine, ctx, withQ, ["questions"])[0].badge).toBe("tag qstatus-open");
    const unv = engine.items().find((i) => (i.sources ?? []).some((s) => ctx.unverified.has(s)));
    if (unv) expect(overlayFlags(engine, ctx, unv, ["unverified"])[0].label).toBe("Unverified source");
  });

  it("mark what my proposal changes and what reads it", () => {
    const before = engine.itemById(DISREGARD)!;
    const cs = { entries: [{ id: DISREGARD, chapter: "cash", before, after: { ...before, value: 120 } }] };
    const c = overlayContext(engine, vol, cs);
    expect(overlayFlags(engine, c, before, ["proposal"])[0].label).toBe("Changed by my proposal");
    expect(overlayFlags(engine, c, engine.itemById(CW_GRANT)!, ["proposal"])[0].label).toBe("Reads my change");
    expect(overlayFlags(engine, c, engine.itemById(CHILD_LIMIT)!, ["proposal"])).toEqual([]);
  });
});

describe("a stored household's values", () => {
  it("gives the CO-07 grant computation its values", () => {
    const hc = vol.cases.find((c) => c.id === "CO-07")!;
    const v = householdValues(engine, hc, id(CW_GRANT), "p1", "2026-10");
    expect(v.get(id(CW_GRANT))).toBe((hc.expect.p1.cw_grant_amount as Record<string, number>)["2026-10"]);
    expect(v.get("cw_grant_before_sanction")).toBe((hc.expect.p1.cw_grant_before_sanction as Record<string, number>)["2026-10"]);
  });
});

describe("the address", () => {
  it("round-trips the map's state", () => {
    const s = stateFromParams({
      center: "CO-273", depth: "2", expand: "a,b", open: "up:1:rule", programs: "ColoradoWorks",
      overlays: "questions,bogus", biggest: "1", to: "cw_grant_amount", lists: "1", case: "CO-07", person: "p1",
    });
    expect(s.depth).toBe(2);
    expect(s.overlays).toEqual(["questions"]);
    expect(s.household).toEqual({ caseId: "CO-07", person: "p1", month: null });
    expect(stateFromParams(stateToParams(s))).toEqual(s);
    expect(stateFromParams({ depth: "9" }).depth).toBe(3);
    const r = recentred(s, "CO-914");
    expect([r.center, r.expanded, r.to, r.depth, r.programs]).toEqual(["CO-914", [], null, 2, ["ColoradoWorks"]]);
    expect(stateFromParams({}, "CO-191").center).toBe("CO-191");
  });
});

describe("the page", () => {
  beforeEach(() => {
    volumeSig.value = vol;
    engineSig.value = engine;
    changeSetSig.value = emptyChangeSet("co", "local");
    modeSig.value = "read";
    draftsShownSig.value = null;
  });

  it("draws the disregard's readers as boxes and opens a collapsed group as lists", () => {
    route.value = { ...defaultRoute(), volume: "co", view: "map", arg: null, params: { center: DISREGARD } };
    const host = document.createElement("div");
    render(<MapPage />, host);
    expect(host.querySelector("h1")!.textContent).toContain("earned income disregard");
    expect(host.querySelectorAll(".mapcanvas .mnode").length).toBe(1 + engine.usedBy(id(DISREGARD)).length);
    expect(host.querySelector(".mcenter")!.getAttribute("data-id")).toBe(DISREGARD);
    // The program filter lists the volume's programs.
    const progs = [...host.querySelectorAll(".mapprogs-menu label")].map((l) => l.textContent!.trim());
    expect(progs).toContain("Colorado Works");

    route.value = { ...route.value, params: { center: "program:ColoradoWorks", lists: "1" } };
    render(<MapPage />, host);
    expect(host.querySelector(".mapcanvas")).toBeNull();
    const more = host.querySelector<HTMLButtonElement>(".tside .mmore")!;
    expect(more.textContent).toMatch(/^\+16 more outcomes/);
    expect(host.querySelectorAll(".mcomplexity li").length).toBe(24);
  });

  it("embeds with its own state, and links to the standalone page", () => {
    route.value = { ...defaultRoute(), volume: "co", view: "item", arg: CW_GRANT, params: {} };
    const host = document.createElement("div");
    render(<MapView center={CW_GRANT} household={{ caseId: "CO-07", person: "p1", month: "2026-10" }} />, host);
    expect(host.querySelector(".mapview")!.getAttribute("data-mode")).toBe("embed");
    expect(host.querySelector(".mcenter .mvalue")!.textContent).toContain("$387");
    const open = [...host.querySelectorAll("a")].find((a) => a.textContent === "Open in the Map")!;
    expect(open.getAttribute("href")).toContain("#/co/map?center=CO-914");
    expect(mapHref(route.value, "program:SNAP", { depth: 2 })).toBe("#/co/map?center=program%3ASNAP&depth=2");
  });
});
