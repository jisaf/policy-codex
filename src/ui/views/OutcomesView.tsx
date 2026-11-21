import { viewContext } from "./context";
import { NoLedger, ViewHeader } from "./ViewStub";

/** By aid code / outcome (phase 13, to be built). Route:
 *  `#/<volume>/outcomes` and `#/<volume>/outcomes/<program or outcome>`.
 *  Aid codes are placeholders until the CBMS list is supplied (product-owner
 *  decision, docs/plan-colorado.md); label outcome values with
 *  `optionLabel()` in ../present.ts. */
export function OutcomesView() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  return (
    <section class="view workflow outcomes">
      <ViewHeader view="outcomes" building />
    </section>
  );
}
