import { describe, it, expect } from "vitest";
import {
  buildHash, canonicalRoute, defaultRoute, internalRoute, parseHash, prNumberOf, sameRoute,
} from "../../src/ui/router";

describe("router", () => {
  it("falls back to the default volume and the Desk", () => {
    expect(parseHash("")).toEqual(defaultRoute());
    expect(parseHash("#/")).toEqual(defaultRoute());
    expect(defaultRoute()).toEqual({
      volume: "mwr", view: "desk", arg: null, ref: null, params: {},
    });
    // An unknown view is the Desk too.
    expect(parseHash("#/mwr/nonsense/x").view).toBe("desk");
  });

  it("parses a filtered table", () => {
    expect(parseHash("#/mwr/table?kind=derived&program=snap&sort=name")).toEqual({
      volume: "mwr", view: "table", arg: null, ref: null,
      params: { kind: "derived", program: "snap", sort: "name" },
    });
  });

  it("parses an item, a graph focus, and a search", () => {
    expect(parseHash("#/mwr/item/WR-041").arg).toBe("WR-041");
    expect(parseHash("#/mwr/graph?focus=WR-041").params.focus).toBe("WR-041");
    expect(parseHash("#/mwr/search?q=abawd").params.q).toBe("abawd");
  });

  it("keeps every segment after the view as the arg", () => {
    const r = parseHash("#/co/households/CO-01/p1/snap_allotment?month=2026-10");
    expect(r.arg).toBe("CO-01/p1/snap_allotment");
    expect(buildHash(r)).toBe("#/co/households/CO-01/p1/snap_allotment?month=2026-10");
  });

  it("parses a branch ref and a pull request ref", () => {
    expect(parseHash("#/mwr/item/WR-041@feature-x").ref).toBe("feature-x");
    const pr = parseHash("#/mwr/item/WR-041@pr/12");
    expect(pr.ref).toBe("pr/12");
    expect(pr.arg).toBe("WR-041");
    expect(prNumberOf(pr.ref)).toBe(12);
    expect(prNumberOf("feature-x")).toBeNull();
    expect(parseHash("#/mwr/table@feature-x?kind=derived")).toEqual({
      volume: "mwr", view: "table", arg: null, ref: "feature-x", params: { kind: "derived" },
    });
  });

  it("round-trips every canonical shape", () => {
    for (const h of [
      "#/mwr/desk",
      "#/mwr/desk/sign?role=Legal",
      "#/mwr/programs/Medicaid",
      "#/mwr/programs/Medicaid?tab=aid-codes&code=PH-MA-CHILD",
      "#/mwr/figures?asof=2026-11-01",
      "#/mwr/households",
      "#/mwr/households/CO-01",
      "#/mwr/households/CO-01?tab=documents",
      "#/mwr/households/CO-01/p1/snap_allotment",
      "#/mwr/questions/OQ-12",
      "#/mwr/law",
      "#/mwr/law/doc/D-3?at=S8",
      "#/mwr/law/sources/S12",
      "#/mwr/changes",
      "#/mwr/changes/proposal",
      "#/mwr/table?kind=derived&program=snap&sort=name",
      "#/mwr/graph?focus=WR-041",
      "#/mwr/item/WR-041",
      "#/mwr/search?q=abawd",
      "#/mwr/item/WR-041@feature-x",
      "#/mwr/item/WR-041@pr/12",
      "#/mwr/handoff",
    ]) {
      expect(buildHash(parseHash(h)), h).toBe(h);
      // Canonical: no redirect, and the internal route links back to it.
      const c = parseHash(h);
      expect(sameRoute(canonicalRoute(c), c), h).toBe(true);
      expect(buildHash(internalRoute(c)), h).toBe(h);
    }
  });

  it("redirects every older address to its new home", () => {
    const home = (h: string) => buildHash(canonicalRoute(parseHash(h)));
    expect(home("#/co/start")).toBe("#/co/desk");
    expect(home("#/co/roles/hcpf?show=changes")).toBe("#/co/desk?show=changes&persona=hcpf");
    expect(home("#/co/inbox?role=Legal")).toBe("#/co/desk/sign?role=Legal");
    expect(home("#/co/inbox/CO-276")).toBe("#/co/desk/sign/CO-276");
    expect(home("#/co/cases")).toBe("#/co/households");
    expect(home("#/co/cases/new")).toBe("#/co/households/new");
    expect(home("#/co/cases/CO-01")).toBe("#/co/households/CO-01?tab=states");
    expect(home("#/co/walkthrough")).toBe("#/co/households");
    expect(home("#/co/walkthrough?program=SNAP")).toBe("#/co/households?program=SNAP");
    expect(home("#/co/walkthrough/CO-05")).toBe("#/co/households/CO-05");
    expect(home("#/co/walkthrough/CO-01?person=p3&program=SNAP&outcome=snap_allotment&all=1"))
      .toBe("#/co/households/CO-01/p3/snap_allotment?program=SNAP&all=1");
    expect(home("#/co/walkthrough/CO-01?person=p3")).toBe("#/co/households/CO-01/p3");
    expect(home("#/co/outcomes")).toBe("#/co/programs?tab=aid-codes");
    expect(home("#/co/outcomes/Medicaid?code=PH-MA-CHILD")).toBe("#/co/programs/Medicaid?tab=aid-codes&code=PH-MA-CHILD");
    expect(home("#/co/outcomes?tab=household&case=CO-83&month=2026-10-01")).toBe("#/co/households/CO-83?month=2026-10-01");
    expect(home("#/co/outcomes?tab=household")).toBe("#/co/households");
    expect(home("#/co/program/SNAP")).toBe("#/co/programs/SNAP");
    expect(home("#/co/program")).toBe("#/co/programs");
    expect(home("#/co/source/S12?excerpt=S12")).toBe("#/co/law/sources/S12?excerpt=S12");
    expect(home("#/co/documents")).toBe("#/co/law/doc");
    expect(home("#/co/document/D-3?excerpt=S8")).toBe("#/co/law/doc/D-3?at=S8");
    // The ref is kept.
    expect(home("#/co/walkthrough/CO-01@feature-x?person=p1")).toBe("#/co/households/CO-01/p1@feature-x");
  });

  it("serves each canonical page from the view that holds its content", () => {
    const view = (h: string) => internalRoute(parseHash(h));
    expect(view("#/co/desk/sign?role=Legal")).toMatchObject({ view: "inbox", arg: null, params: { role: "Legal" } });
    // Households, a household's tabs and a determination are the place's own pages.
    expect(view("#/co/households")).toMatchObject({ view: "households", arg: null });
    expect(view("#/co/households/CO-01?tab=states")).toMatchObject({ view: "households", arg: "CO-01", params: { tab: "states" } });
    expect(view("#/co/households/CO-01/p2/snap_allotment")).toMatchObject({ view: "households", arg: "CO-01/p2/snap_allotment" });
    expect(view("#/co/households/new")).toMatchObject({ view: "cases", arg: "new" });
    expect(view("#/co/programs/SNAP")).toMatchObject({ view: "program", arg: "SNAP" });
    expect(view("#/co/programs/SNAP?tab=aid-codes")).toMatchObject({ view: "outcomes", arg: "SNAP", params: {} });
    expect(view("#/co/law/doc/D-3?at=S8")).toMatchObject({ view: "document", arg: "D-3", params: { excerpt: "S8" } });
    expect(view("#/co/law/sources/S8")).toMatchObject({ view: "source", arg: "S8" });
    expect(view("#/co/law")).toMatchObject({ view: "law", arg: null });
    // A link an older view builds from its own route comes back canonical.
    const law = view("#/co/law");
    expect(buildHash({ ...law, view: "walkthrough", arg: "CO-01", params: { person: "p3", outcome: "snap_eligibility_status" } }))
      .toBe("#/co/households/CO-01/p3/snap_eligibility_status");
  });
});
