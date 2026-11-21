import { viewContext } from "./context";
import { NoLedger, ViewHeader } from "./ViewStub";

/** Case walkthrough (phase 13, to be built). Route: `#/<volume>/walkthrough`
 *  and `#/<volume>/walkthrough/<case id>`, with `?person=p1&program=SNAP`.
 *  Start from `viewContext()`, `engine.explain`, the household form model in
 *  ../household.ts, and the plain-language helpers in ../present.ts and
 *  ../plain.ts. */
export function WalkthroughView() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  return (
    <section class="view workflow walkthrough">
      <ViewHeader view="walkthrough" building />
    </section>
  );
}
