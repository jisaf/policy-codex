/* Relationship sentences read as English for every relationship role a
 * volume declares (the evaluators found "Person 4 is the gave birth to of
 * Person 5"). */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { RELATIONSHIP_VERB, relationshipPhrase, relationshipSentence } from "../../src/ui/people";

const root = path.resolve(__dirname, "../..");

function roles(volume: string): string[] {
  const meta = parse(fs.readFileSync(path.join(root, "volumes", volume, "volume.yaml"), "utf8")) as { relationship_roles?: Array<{ id: string }> };
  return (meta.relationship_roles ?? []).map((r) => r.id);
}

describe("relationship sentences", () => {
  it("has a verb for every relationship role in every volume", () => {
    for (const v of ["co", "mwr"]) {
      const missing = roles(v).filter((r) => !RELATIONSHIP_VERB[r]);
      expect(missing, v).toEqual([]);
    }
  });

  it("never reads 'is the <verb> of'", () => {
    for (const v of ["co", "mwr"]) {
      for (const role of roles(v)) {
        const s = relationshipSentence({ role, from: "p4", to: "p5" });
        expect(s, role).toMatch(/^Person 4 \S.* Person 5$/);
        expect(s, role).not.toMatch(/_|is the (gave|born|files|buys|shares|lives) | of of /);
      }
    }
  });

  it("reads the birth edge as the evaluators expected", () => {
    expect(relationshipSentence({ role: "gave_birth_to", from: "p4", to: "p5" })).toBe("Person 4 gave birth to Person 5");
    expect(relationshipPhrase("gave_birth_to", "p5")).toBe("gave birth to Person 5");
    expect(relationshipPhrase("parent", "p3")).toBe("a parent of Person 3");
  });
});
