import { describe, it, expect } from "vitest";
import { h, render } from "preact";
import { inlineParts, renderMarkdown, renderMarkdownNodes } from "../../src/ui/markdown";

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

describe("renderMarkdownNodes", () => {
  function show(md: string): HTMLElement {
    const host = document.createElement("div");
    render(
      h("div", null, renderMarkdownNodes(md, (text, block) =>
        h("b", { class: block ? "fence" : "span" }, text))),
      host,
    );
    return host;
  }

  it("splits a line into its literal stretches and its code spans", () => {
    expect(inlineParts("Uses: `age`, `dob`.")).toEqual([
      { code: false, text: "Uses: " },
      { code: true, text: "age" },
      { code: false, text: ", " },
      { code: true, text: "dob" },
      { code: false, text: "." },
    ]);
  });

  it("renders the same document as elements, handing code to the caller", () => {
    const host = show([
      "# Engineer handoff: t",
      "",
      "Uses: `age`.",
      "",
      "| Identifier | Type |",
      "|---|---|",
      "| `age` | number |",
      "",
      "- one `two`",
      "",
      "```",
      "Age is at least 19",
      "  - a nested line",
      "```",
    ].join("\n"));
    expect(host.querySelector("h1")!.textContent).toBe("Engineer handoff: t");
    expect(host.querySelector("p")!.textContent).toBe("Uses: age.");
    expect(host.querySelector("p b.span")!.textContent).toBe("age");
    expect(host.querySelector("table th")!.textContent).toBe("Identifier");
    expect(host.querySelector("table td b.span")!.textContent).toBe("age");
    expect(host.querySelector("ul li")!.textContent).toBe("one two");
    expect(host.querySelector("pre code b.fence")!.textContent)
      .toBe("Age is at least 19\n  - a nested line");
  });

  it("escapes what it renders, because Preact writes text as text", () => {
    const host = show("a < b & c > d");
    expect(host.querySelector("p")!.textContent).toBe("a < b & c > d");
    expect(host.innerHTML).toContain("a &lt; b &amp; c &gt; d");
  });
});
