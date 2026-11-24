import type { ComponentChildren } from "preact";
import { workflowView, type WorkflowView } from "./registry";

/** The heading and one-line purpose every workflow view opens with. While a
 *  view is still a stub, `building` adds a note saying so; the view's own
 *  content goes in `children`. */
export function ViewHeader(
  { view, building = false, children }:
  { view: WorkflowView["view"]; building?: boolean; children?: ComponentChildren },
) {
  const w = workflowView(view)!;
  return (
    <div class="viewhead" data-workflow={view}>
      <h1>{w.title}</h1>
      <p class="purpose">{w.purpose}</p>
      {building && (
        <p class="muted stubnote">This view is being built. Its address and place in the menu are final.</p>
      )}
      {children}
    </div>
  );
}

export function NoLedger() {
  return <p class="status">No ledger loaded.</p>;
}
