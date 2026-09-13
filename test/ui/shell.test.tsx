import { describe, it, expect } from "vitest";
import { render } from "preact";
import { App } from "../../src/ui/App";
import { tourOpenSig } from "../../src/ui/Tour";

describe("app shell", () => {
  it("renders the product name into a container", () => {
    const host = document.createElement("div");
    render(<App />, host);
    expect(host.textContent).toContain("Benefits Codex");
  });

  it("adds a tour-open class and a --tourbox-h padding hook while the tour is open", async () => {
    tourOpenSig.value = false;
    const host = document.createElement("div");
    render(<App />, host);
    expect(host.querySelector(".app")!.classList.contains("tour-open")).toBe(false);

    tourOpenSig.value = true;
    await new Promise((r) => setTimeout(r));
    const root = host.querySelector(".app") as HTMLElement;
    expect(root.classList.contains("tour-open")).toBe(true);
    expect(root.style.getPropertyValue("--tourbox-h")).toMatch(/^\d+px$/);

    tourOpenSig.value = false;
    await new Promise((r) => setTimeout(r));
    expect(host.querySelector(".app")!.classList.contains("tour-open")).toBe(false);
  });
});
