import { viewContext } from "./context";
import { NoLedger, ViewHeader } from "./ViewStub";

/** Approvals inbox (phase 13, to be built). Route: `#/<volume>/inbox`, with
 *  `?role=<approval role>` to filter to one role's queue. Start from
 *  `viewContext()` (engine, volume, persona) and `approvalStatus()` in
 *  ../approvals.ts. */
export function InboxView() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  return (
    <section class="view workflow inbox">
      <ViewHeader view="inbox" building />
    </section>
  );
}
