import { describe, it, expect } from "vitest";
import { buildHash, defaultRoute, parseHash, prNumberOf } from "../../src/ui/router";

describe("router", () => {
  it("falls back to the default volume and table view", () => {
    expect(parseHash("")).toEqual(defaultRoute());
    expect(parseHash("#/")).toEqual(defaultRoute());
    expect(defaultRoute()).toEqual({
      volume: "mwr", view: "table", arg: null, ref: null, params: {},
    });
  });

  it("parses a filtered table", () => {
    expect(parseHash("#/mwr/table?kind=derived&program=snap&sort=name")).toEqual({
      volume: "mwr", view: "table", arg: null, ref: null,
      params: { kind: "derived", program: "snap", sort: "name" },
    });
  });

  it("parses an item, a source, a graph focus, and a search", () => {
    expect(parseHash("#/mwr/item/WR-041").arg).toBe("WR-041");
    expect(parseHash("#/mwr/source/S12").arg).toBe("S12");
    expect(parseHash("#/mwr/graph?focus=WR-041").params.focus).toBe("WR-041");
    expect(parseHash("#/mwr/search?q=abawd").params.q).toBe("abawd");
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

  it("round-trips every shape", () => {
    for (const h of [
      "#/mwr/table?kind=derived&program=snap&sort=name",
      "#/mwr/graph?focus=WR-041",
      "#/mwr/item/WR-041",
      "#/mwr/source/S12",
      "#/mwr/search?q=abawd",
      "#/mwr/item/WR-041@feature-x",
      "#/mwr/item/WR-041@pr/12",
    ]) {
      expect(buildHash(parseHash(h)), h).toBe(h);
    }
  });
});
