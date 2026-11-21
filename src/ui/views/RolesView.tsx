import { programOutcomes } from "../CasesView";
import { personaById, personaPrograms, personaRoles, PERSONAS } from "../personas";
import { buildHash } from "../router";
import { viewContext } from "./context";
import { NoLedger, ViewHeader } from "./ViewStub";

/** By role / agency home (phase 13, to be built). Route:
 *  `#/<volume>/roles/<persona id>` (src/ui/personas.ts). Shows, for now, the
 *  persona's programs and the approval roles it signs as. */
export function RolesView() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  const { route: r, engine } = ctx;
  const persona = personaById(r.arg) ?? ctx.persona;
  const programIds = programOutcomes(engine).map((p) => p.id);
  return (
    <section class="view workflow roles">
      <ViewHeader view="roles" building />
      <nav class="tabs">
        {PERSONAS.map((p) => (
          <a
            key={p.id} class={persona?.id === p.id ? "on" : ""}
            href={buildHash({ ...r, view: "roles", arg: p.id, params: {} })}
          >{p.label}</a>
        ))}
      </nav>
      {persona && (
        <div class="persona" data-persona={persona.id}>
          <h2>{persona.label} <small class="muted">{persona.agency}</small></h2>
          <p>{persona.body}</p>
          <p>
            <b>Programs:</b>{" "}
            {personaPrograms(persona, programIds).join(", ") || "none in this volume"}
          </p>
          <p><b>Signs as:</b> {personaRoles(persona, engine.meta).join(", ") || "no approval role"}</p>
        </div>
      )}
    </section>
  );
}
