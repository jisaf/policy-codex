/* The persistent left sidebar (docs/design-unified-ui.md, "Seven places, one
 * sidebar"): the brand, the seven places, the "For implementers" menu, the
 * role picker (the only one in the app), and the volume and ledger
 * selectors. At phone width it is a drawer the top bar's Menu button opens;
 * it closes on a choice or Escape. */
import { useEffect } from "preact/hooks";
import { proposalCount, RefSelect, VolumeSelect } from "./Header";
import { PERSONAS, personaById, personaSig, setPersona, type PersonaId } from "./personas";
import { buildHash, canonicalRoute, type Route } from "./router";
import { IMPLEMENTER_LINKS, navOpenSig, PLACES, placeOf } from "./shell";
import { engineSig, navigate, route, setDoor, viewEngine } from "./state";

export { navOpenSig };

/** The role the pages read: a `?persona=` link names one for that page;
 *  otherwise the one chosen here. */
export function activePersonaId(): PersonaId | null {
  return personaById(route.value.params.persona)?.id ?? personaSig.value;
}

/** The role picker. Choosing a role remembers it and drops a `?persona=`
 *  that named another one, so the page shows the role just chosen. */
export function RolePicker() {
  const current = activePersonaId();
  return (
    <label class="rolepicker">
      <span>Working as</span>
      <select
        aria-label="Working as" value={current ?? ""}
        onChange={(e) => {
          const id = (e.target as HTMLSelectElement).value as PersonaId | "";
          const p = personaById(id);
          setPersona(p ? p.id : null);
          if (p) setDoor(p.door);
          if (route.value.params.persona) {
            const params = { ...route.value.params };
            delete params.persona;
            navigate({ params });
          }
        }}
      >
        <option value="">Choose your role…</option>
        {PERSONAS.map((p) => <option key={p.id} value={p.id}>{p.label} ({p.agency})</option>)}
      </select>
    </label>
  );
}

export function Sidebar() {
  const r = route.value;
  const c = canonicalRoute(r);
  const here = placeOf(c, viewEngine() ?? engineSig.value);
  const n = proposalCount();
  const open = navOpenSig.value;
  const close = () => { navOpenSig.value = false; };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && navOpenSig.value) close(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
  const at = (patch: Partial<Route>) => buildHash({ ...r, arg: null, params: {}, ...patch });
  return (
    <>
      {open && <div class="navscrim" onClick={close} />}
      <aside id="sidebar" class={`sidebar${open ? " open" : ""}`} aria-label="Places" onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) close();
      }}>
        <a class="brand" href={at({ view: "desk" })}>
          <b>Benefits Codex</b>
          <small>Policy as rules</small>
        </a>
        <nav class="places" aria-label="Places">
          {PLACES.map((p) => (
            <a
              key={p.id} data-place={p.id} class={here === p.id ? "on" : ""}
              aria-current={here === p.id ? "page" : undefined}
              href={at({ view: p.id })} title={p.purpose}
            >
              <span>{p.label}</span>
              {p.id === "changes" && n > 0 && <b class="badge" aria-label={`${n} in your proposal`}>{n}</b>}
            </a>
          ))}
        </nav>
        <details class={`implementers${here === "implementers" ? " on" : ""}`} open={here === "implementers"}>
          <summary>For implementers</summary>
          <nav aria-label="For implementers">
            {IMPLEMENTER_LINKS.map((l) => {
              const on = c.view === l.view && (c.params.show ?? "") === (l.params?.show ?? "");
              return (
                <a key={l.label} class={on ? "on" : ""} aria-current={on ? "page" : undefined} href={at({ view: l.view, params: l.params ?? {} })}>
                  {l.label}
                </a>
              );
            })}
          </nav>
        </details>
        <div class="sidefoot">
          <RolePicker />
          <label class="ledgerpick">
            <span>Volume</span>
            <VolumeSelect />
          </label>
          <label class="ledgerpick">
            <span>Copy of the rules</span>
            <RefSelect />
          </label>
        </div>
      </aside>
    </>
  );
}
