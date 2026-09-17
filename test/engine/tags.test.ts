import { describe, it, expect } from "vitest";
import { normalizeTags, tagAncestors, tagGroups, tagIds, tagLabel } from "../../src/engine/tags";
import type { VolumeMeta } from "../../src/engine/types";

const base: Omit<VolumeMeta, "tags"> = {
  volume: "v", title: "t", version: "0.1", status: "Draft", default_as_of: "2027-01-01",
  approval_policy: { roles: [], by_program: {}, by_kind: {}, by_tag: {} },
  types: [], scopes: [],
};

const hierarchical: VolumeMeta = {
  ...base,
  tags: [
    { id: "ma" },
    { id: "magi", parent: "ma", label: "MAGI" },
    { id: "non_magi", parent: "ma" },
    { id: "ltc", parent: "ma" },
    { id: "snap" },
    { id: "abawd", parent: "snap" },
    { id: "household" },
  ],
};

const flat: VolumeMeta = { ...base, tags: ["legal", "medical"] };

const undeclared: VolumeMeta = { ...base };

describe("tags", () => {
  describe("normalizeTags", () => {
    it("wraps a flat vocabulary's bare ids as objects", () => {
      expect(normalizeTags(flat)).toEqual([{ id: "legal" }, { id: "medical" }]);
    });

    it("passes an object-form vocabulary through unchanged", () => {
      expect(normalizeTags(hierarchical)[1]).toEqual({ id: "magi", parent: "ma", label: "MAGI" });
    });

    it("is empty for a volume that declares no tags", () => {
      expect(normalizeTags(undeclared)).toEqual([]);
    });
  });

  describe("tagIds", () => {
    it("lists every declared id regardless of form", () => {
      expect(tagIds(flat)).toEqual(["legal", "medical"]);
      expect(tagIds(hierarchical)).toEqual([
        "ma", "magi", "non_magi", "ltc", "snap", "abawd", "household",
      ]);
    });
  });

  describe("tagLabel", () => {
    it("uses the declared label when there is one, else the id", () => {
      expect(tagLabel(hierarchical, "magi")).toBe("MAGI");
      expect(tagLabel(hierarchical, "non_magi")).toBe("non_magi");
      expect(tagLabel(flat, "legal")).toBe("legal");
    });
  });

  describe("tagGroups", () => {
    it("maps each parent to its declared children", () => {
      const groups = tagGroups(hierarchical);
      expect([...groups.keys()].sort()).toEqual(["ma", "snap"]);
      expect(groups.get("ma")!.sort()).toEqual(["ltc", "magi", "non_magi"]);
      expect(groups.get("snap")).toEqual(["abawd"]);
    });

    it("is empty for a flat vocabulary, which declares no parents", () => {
      expect(tagGroups(flat).size).toBe(0);
    });
  });

  describe("tagAncestors", () => {
    it("returns the parent chain, nearest first", () => {
      expect(tagAncestors(hierarchical, "magi")).toEqual(["ma"]);
      expect(tagAncestors(hierarchical, "abawd")).toEqual(["snap"]);
    });

    it("is empty for a top-level tag, an undeclared tag, or a flat vocabulary", () => {
      expect(tagAncestors(hierarchical, "ma")).toEqual([]);
      expect(tagAncestors(hierarchical, "household")).toEqual([]);
      expect(tagAncestors(hierarchical, "nope")).toEqual([]);
      expect(tagAncestors(flat, "legal")).toEqual([]);
    });

    it("does not loop forever on a cyclic parent declaration", () => {
      const cyclic: VolumeMeta = {
        ...base,
        tags: [{ id: "a", parent: "b" }, { id: "b", parent: "a" }],
      };
      expect(tagAncestors(cyclic, "a")).toEqual(["b"]);
    });
  });
});
