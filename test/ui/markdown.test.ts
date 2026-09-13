import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../../src/ui/markdown";

describe("renderMarkdown", () => {
  it("renders headings at every level used by the handoff export", () => {
    const html = renderMarkdown("# Engineer handoff: t\n\n## Supplied facts\n\n### WR-200 Name `@engine`");
    expect(html).toContain("<h1>Engineer handoff: t</h1>");
    expect(html).toContain("<h2>Supplied facts</h2>");
    expect(html).toContain("<h3>WR-200 Name <code>@engine</code></h3>");
  });

  it("renders a bare line as a paragraph", () => {
    expect(renderMarkdown("Generated from `volumes/mwr/`.")).toBe(
      "<p>Generated from <code>volumes/mwr/</code>.</p>",
    );
  });

  it("renders a fenced code block verbatim, without treating its lines as markdown", () => {
    const html = renderMarkdown("```\nAge is at least 19\n  - a nested line\n```");
    expect(html).toBe("<pre><code>Age is at least 19\n  - a nested line</code></pre>");
  });

  it("renders a bullet list", () => {
    const html = renderMarkdown("- one\n- two `three`");
    expect(html).toBe("<ul><li>one</li><li>two <code>three</code></li></ul>");
  });

  it("renders a table with a header and a separator row", () => {
    const html = renderMarkdown(
      "| Identifier | Type |\n|---|---|\n| `age` | number |\n| `dob` | date |",
    );
    expect(html).toBe(
      "<table><thead><tr><th>Identifier</th><th>Type</th></tr></thead>" +
        "<tbody><tr><td><code>age</code></td><td>number</td></tr>" +
        "<tr><td><code>dob</code></td><td>date</td></tr></tbody></table>",
    );
  });

  it("escapes HTML outside of code spans", () => {
    expect(renderMarkdown("a < b & c > d")).toBe("<p>a &lt; b &amp; c &gt; d</p>");
  });

  it("renders the real handoff export without throwing and hits every construct", async () => {
    const { handoffMarkdown } = await import("../../src/export/handoff");
    const { createEngine } = await import("../../src/engine/engine");
    const ledger = (await import("../fixtures/ledger.json")).default;
    const refs = (await import("../fixtures/refs.json")).default;
    const engine = createEngine(ledger.items as never, ledger.meta as never, refs as never);
    const vol = { path: "volumes/mwr", title: "t" } as never;
    const html = renderMarkdown(handoffMarkdown(engine, vol));
    expect(html).toContain("<h1>Engineer handoff: t</h1>");
    expect(html).toContain("<h2>Supplied facts");
    expect(html).toContain("<table>");
    expect(html).toContain("<pre><code>");
  });
});
