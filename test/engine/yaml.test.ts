import { describe, it, expect } from "vitest";
import { parse as parseYaml } from "yaml";
import { parseItemFile, stringifyItem, yamlScalar, flowValue } from "../../src/engine/yaml";
import ledger from "../fixtures/ledger.json";
import type { Item } from "../../src/engine/types";

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

  it("ends every item file with exactly one newline", () => {
    const text = stringifyItem(items[0]);
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
  });
});
