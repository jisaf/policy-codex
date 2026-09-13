import { describe, it, expect } from "vitest";
import { render } from "preact";
import { kindBlurb, kindLabel, scopeLabel, Term } from "../../src/ui/labels";

describe("labels", () => {
  it("gives the spec's plain-language phrase for each kind", () => {
    expect(kindLabel("supplied")).toBe("a fact we are told");
    expect(kindLabel("derived")).toBe("a rule");
    expect(kindLabel("parameter")).toBe("a number set by policy");
  });

  it("gives the spec's plain-language phrase for each scope", () => {
    expect(scopeLabel("person-month")).toBe("per person, per month");
    expect(scopeLabel("person")).toBe("per person");
    expect(scopeLabel("case")).toBe("per household");
    expect(scopeLabel("month")).toBe("per month");
    expect(scopeLabel("global")).toBe("for everyone");
  });

  it("gives one sentence per kind for kindBlurb", () => {
    expect(kindBlurb("supplied")).toMatch(/\.$/);
    expect(kindBlurb("derived")).toMatch(/\.$/);
    expect(kindBlurb("parameter")).toMatch(/\.$/);
  });

  it("renders the plain label with the technical term as a code alias", () => {
    const host = document.createElement("div");
    render(<Term kind="supplied" />, host);
    expect(host.textContent).toContain("a fact we are told");
    const code = host.querySelector("code.alias")!;
    expect(code.textContent).toBe("supplied");
    expect(code.getAttribute("title")).toContain("supplied");
  });

  it("renders a scope term the same way", () => {
    const host = document.createElement("div");
    render(<Term scope="person-month" />, host);
    expect(host.textContent).toContain("per person, per month");
    expect(host.querySelector("code.alias")!.textContent).toBe("person-month");
  });
});
