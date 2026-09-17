import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  parseItemFile, parseVolumeFile, stringifyItem, stringifyVolume, yamlScalar, flowValue,
} from "../../src/engine/yaml";
import ledger from "../fixtures/ledger.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

const items = ledger.items as unknown as Item[];

describe("yaml", () => {
  it("quotes only what needs quoting", () => {
    expect(yamlScalar("Age")).toBe("Age");
    expect(yamlScalar("Medicaid: is a dependent child")).toBe('"Medicaid: is a dependent child"');
    expect(yamlScalar("2027-01-01")).toBe('"2027-01-01"');
    expect(yamlScalar("0.1")).toBe('"0.1"');
    expect(yamlScalar("yes/no")).toBe("yes/no");
    expect(yamlScalar(80)).toBe("80");
    expect(yamlScalar(false)).toBe("false");
  });

  it("writes flow collections", () => {
    expect(flowValue(["years_between", "date_of_birth", ["det_date"]])).toBe(
      "[years_between, date_of_birth, [det_date]]",
    );
    expect(flowValue([">=", "age", "medicaid_ce_min_age"])).toBe(
      '[">=", age, medicaid_ce_min_age]',
    );
    expect(flowValue({ from: "2027-01-01", to: "present" })).toBe(
      '{from: "2027-01-01", to: present}',
    );
  });

  it("emits an item whose YAML parses back to the same object", () => {
    for (const it of items) {
      const text = stringifyItem(it);
      expect(parseYaml(text), it.id).toEqual(JSON.parse(JSON.stringify(it)));
    }
  });

  it("is byte-stable: writing what it read reproduces the text", () => {
    for (const it of items) {
      const text = stringifyItem(it);
      expect(stringifyItem(parseItemFile(text)), it.id).toBe(text);
    }
  });

  it("writes the governance keys after open and before tests", () => {
    const it0: Item = {
      ...items.find((x) => x.id === "WR-003")!,
      rationale: "Nothing else turns a date of birth into whole years.",
      nearest: ["WR-001", "WR-002"],
    };
    const text = stringifyItem(it0);
    expect(text).toContain("nearest: [WR-001, WR-002]");
    expect(text.indexOf("rationale:")).toBeLessThan(text.indexOf("nearest:"));
    expect(text.indexOf("nearest:")).toBeLessThan(text.indexOf("tests:"));
    expect(parseYaml(text)).toEqual(JSON.parse(JSON.stringify(it0)));
    expect(stringifyItem(parseItemFile(text))).toBe(text);
  });

  it("round-trips the volume file, declared vocabulary included", () => {
    const p = path.resolve(__dirname, "../../volumes/mwr/volume.yaml");
    const text = fs.readFileSync(p, "utf8");
    const meta = parseVolumeFile(text);
    expect(meta.programs?.map((x) => x.id)).toEqual(["All", "Medicaid", "SNAP"]);
    expect(meta.programs?.[0].prefix).toBe(null);
    expect(meta.tags).toEqual(["legal", "medical", "state_election"]);
    expect(stringifyVolume(meta)).toBe(text);
  });

  it("round-trips a tag vocabulary declared as a hierarchy", () => {
    const p = path.resolve(__dirname, "../../volumes/mwr/volume.yaml");
    const meta = parseVolumeFile(fs.readFileSync(p, "utf8"));
    const withHierarchy: VolumeMeta = {
      ...meta,
      tags: [
        { id: "ma" },
        { id: "magi", parent: "ma", label: "MAGI" },
        { id: "non_magi", parent: "ma" },
        { id: "household" },
      ],
    };
    const text = stringifyVolume(withHierarchy);
    expect(parseVolumeFile(text)).toEqual(withHierarchy);
    expect(text).toContain("tags: [{id: ma}, {id: magi, parent: ma, label: MAGI}");
  });

  it("ends every item file with exactly one newline", () => {
    const text = stringifyItem(items[0]);
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
  });
});
