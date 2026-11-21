import { viewContext } from "./context";
import { NoLedger, ViewHeader } from "./ViewStub";

/** Case walkthrough (phase 13, to be built). Route: `#/<volume>/walkthrough`
 *  and `#/<volume>/walkthrough/<case id>`, with `?person=p1&program=SNAP`.
 *  A read-only step-through of the stored test households (`vol.cases`):
 *  each step is one rule's plain meaning (../Present.tsx `PlainRule`), the
 *  excerpts it cites, and the value the codex recorded for that household
 *  (`engine.explainCase`). It does not recalculate on demand or take intake;
 *  "what changes" compares stored cases before and after a staged change. */
export function WalkthroughView() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  return (
    <section class="view workflow walkthrough">
      <ViewHeader view="walkthrough" building />
    </section>
  );
}
