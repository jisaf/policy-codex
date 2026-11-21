/* Relationship roles are declared in volume.yaml (`relationship_roles`) and
 * the engine reads them: the inverse recorded for a case-level edge, the
 * inverse `shared_relative` looks through, and a warning for a role no
 * declaration names. */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildIndex, DEFAULT_INVERSE_ROLE, inverseRoleTable } from "../../src/engine/ledger-index";
import { createEngine } from "../../src/engine/engine";
import { makeCase } from "../../src/engine/evaluate";
import { parseVolumeFile } from "../../src/engine/yaml";
import { check } from "../../src/engine/check";
import type { Item } from "../../src/engine/types";

const root = path.resolve(__dirname, "../..");
const volumeMeta = (id: string) =>
  parseVolumeFile(fs.readFileSync(path.join(root, "volumes", id, "volume.yaml"), "utf8"));

describe("declared relationship roles", () => {
  it("both volumes declare their roles, with the inverses the engine always used", () => {
    for (const id of ["co", "mwr"]) {
      const roles = volumeMeta(id).relationship_roles!;
      expect(roles.length).toBeGreaterThan(0);
      expect(inverseRoleTable(roles)).toEqual(DEFAULT_INVERSE_ROLE);
    }
    expect(volumeMeta("mwr").relationship_roles!.map((r) => r.id)).toContain("caretaker relative");
  });

  it("the engine records the inverse the volume declares", () => {
    const meta = {
      ...volumeMeta("mwr"),
      relationship_roles: [{ id: "parent", inverse: "child" }, { id: "child", inverse: "parent" }, { id: "spouse" }],
    };
    const engine = createEngine([], meta);
    const c = makeCase(engine.index, {
      id: "T", as_of: "2027-03-15",
      persons: { p1: {}, p2: {}, p3: {} },
      relationships: [["parent", "p1", "p2"], ["spouse", "p1", "p3"]],
    });
    expect(c.rels.p2).toEqual([["child", "p1"]]);
    // spouse is declared with no inverse here, so p3 records nothing.
    expect(c.rels.p3).toBeNull();
  });

  it("a volume that declares none falls back to the default table", () => {
    expect(buildIndex([]).inverseRole).toBe(DEFAULT_INVERSE_ROLE);
    expect(buildIndex([]).roles).toBeNull();
  });

  it("warns on a role in a derivation that the volume does not declare", () => {
    const meta = volumeMeta("co");
    const ix = buildIndex([], meta.relationship_roles);
    const r = check(ix, ["exists_related", ["spuse"], true], "person");
    expect(r.warnings).toEqual(['relationship role "spuse" is not declared in volume.yaml relationship_roles']);
    expect(check(ix, ["exists_related", ["spouse"], true], "person").warnings).toEqual([]);
    // With no declaration, any role is accepted.
    expect(check(buildIndex([] as Item[]), ["rel", ["spuse"], ["P"]], "person").warnings).toEqual([]);
  });
});
