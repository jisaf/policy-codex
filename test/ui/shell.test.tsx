import { describe, it, expect } from "vitest";
import { render } from "preact";
import { App } from "../../src/ui/App";

describe("app shell", () => {
  it("renders the product name into a container", () => {
    const host = document.createElement("div");
    render(<App />, host);
    expect(host.textContent).toContain("Benefits Codex");
  });
});
