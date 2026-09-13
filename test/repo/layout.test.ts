import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");

describe("repository layout after the rebuild", () => {
  it("has no trace of the old site or author tooling", () => {
    for (const gone of [
      "site", "site_build.py", "site_views.py", "author", "ai_proxy.py", "deploy",
      "work-requirements/approach-a", "work-requirements/approach-b/ledger",
      "work-requirements/sources.md", "work-requirements/open-questions.md",
    ]) {
      expect(existsSync(join(ROOT, gone)), `${gone} should be deleted`).toBe(false);
    }
  });

  it("keeps the reference checker and the prose where the spec says", () => {
    expect(existsSync(join(ROOT, "scripts/codex_tool.py"))).toBe(true);
    expect(existsSync(join(ROOT, "docs/comparison.md"))).toBe(true);
    expect(existsSync(join(ROOT, "docs/conventions.md"))).toBe(true);
  });

  it("README points at the app, the manifest, and docs, and never mentions approach-a", () => {
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    expect(readme).toContain("codex.json");
    expect(readme).toContain("docs/conventions.md");
    expect(readme).toContain(".github/workflows/deploy.yml");
    expect(existsSync(join(ROOT, ".github/workflows/deploy.yml"))).toBe(true);
    expect(readme).not.toContain("approach-a");
    expect(readme).not.toContain("site_build.py");
  });

  it("README's engineer-door line names both downloads the Handoff view offers", () => {
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    const line = readme.split("\n").find((l) => l.includes("**Implement the rules**"))!;
    expect(line).toBeDefined();
    expect(line).toContain("handoff");
    expect(line).toContain("conformance suite");
  });

  it("the manifest lists every item file that exists and nothing else", () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, "codex.json"), "utf8"));
    const vol = manifest.volumes.find((v: { id: string }) => v.id === "mwr");
    expect(vol).toBeDefined();
    let count = 0;
    for (const chapter of vol.chapters) {
      for (const file of chapter.files) {
        expect(existsSync(join(ROOT, "volumes/mwr", chapter.dir, file)), file).toBe(true);
        count += 1;
      }
    }
    expect(count).toBe(138);
  });
});
