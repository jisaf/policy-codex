import { describe, it, expect, beforeEach } from "vitest";
import { render } from "preact";
import { StartView } from "../../src/ui/StartView";
import { defaultRoute } from "../../src/ui/router";
import { doorSig, modeSig, resolveEmptyHash, route, setDoor } from "../../src/ui/state";
import { tourOpenSig } from "../../src/ui/Tour";

function click(host: HTMLElement, door: string) {
  (host.querySelector(`button[data-door="${door}"]`) as HTMLButtonElement).dispatchEvent(
    new MouseEvent("click", { bubbles: true }),
  );
}

describe("StartView", () => {
  beforeEach(() => {
    route.value = defaultRoute();
    location.hash = "";
    setDoor(null);
    modeSig.value = "read";
  });

  it("renders the four doors", () => {
    const host = document.createElement("div");
    render(<StartView />, host);
    const doors = [...host.querySelectorAll("button.door")].map((b) => b.getAttribute("data-door"));
    expect(doors).toEqual(["admin", "reader", "sme", "engineer"]);
  });

  it("the admin door sets the door, keeps reader mode, and opens Cases", () => {
    const host = document.createElement("div");
    render(<StartView />, host);
    click(host, "admin");
    expect(doorSig.value).toBe("admin");
    expect(modeSig.value).toBe("read");
    expect(location.hash).toBe("#/mwr/cases");
  });

  it("the reader door opens Programs in reader mode", () => {
    const host = document.createElement("div");
    render(<StartView />, host);
    click(host, "reader");
    expect(doorSig.value).toBe("reader");
    expect(modeSig.value).toBe("read");
    expect(location.hash).toBe("#/mwr/program");
  });

  it("the sme door turns edit mode on and opens Programs", () => {
    const host = document.createElement("div");
    render(<StartView />, host);
    click(host, "sme");
    expect(doorSig.value).toBe("sme");
    expect(modeSig.value).toBe("edit");
    expect(location.hash).toBe("#/mwr/program");
  });

  it("\"Take the tour\" restarts the tour", () => {
    tourOpenSig.value = false;
    const host = document.createElement("div");
    render(<StartView />, host);
    ([...host.querySelectorAll("button")].find((b) => b.textContent === "Take the tour")!)
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(tourOpenSig.value).toBe(true);
  });

  it("the engineer door sets the door (Task 4 wires the Handoff route)", () => {
    const host = document.createElement("div");
    render(<StartView />, host);
    click(host, "engineer");
    expect(doorSig.value).toBe("engineer");
    expect(modeSig.value).toBe("read");
    // TODO(handoff): this should become "#/mwr/handoff" once Task 4 builds it.
    expect(location.hash).toBe("#/mwr/table");
  });
});

describe("resolveEmptyHash", () => {
  beforeEach(() => { setDoor(null); });

  it("goes to start on a first visit and to the Programs home once a door is chosen", () => {
    setDoor(null);
    expect(resolveEmptyHash().view).toBe("start");
    setDoor("reader");
    expect(resolveEmptyHash().view).toBe("program");
    setDoor(null);
  });
});
