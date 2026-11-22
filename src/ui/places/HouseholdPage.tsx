/* Households: the stored test households, one page each with tabs
 * (docs/design-unified-ui.md). A first version for the Households track:
 * the list is the walkthrough's case list; a household's tabs show what the
 * app already had (each person's aid codes, the documents still needed with
 * their due dates, the facts the case states); a determination
 * (`households/<case>/<person>/<outcome>`) is the step-by-step walkthrough.
 * The tab is `?tab=` (results, the default, documents, whatif, states). */
import type { ComponentChildren } from "preact";
import { CasesView } from "../CasesView";
import { buildHash, canonicalRoute, HOUSEHOLD_TABS, householdTab, type Route } from "../router";
import { HOUSEHOLD_TAB_LABEL } from "../shell";
import { modeSig, route } from "../state";
import { plainCaseTitle } from "../walkthrough";
import { viewContext } from "../views/context";
import { HouseholdTab } from "../views/OutcomesView";
import { NoLedger } from "../views/ViewStub";
import { CaseList, DocumentsChecklist } from "../views/WalkthroughView";
import { PlaceHeader } from "./PlaceHeader";
import "../views/walkthrough.css";
import "../views/workflow-views.css";

/** The households list. */
export function HouseholdsList() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  return (
    <section class="view place households workflow walkthrough">
      <PlaceHeader place="households" interim>
        {modeSig.value === "edit" && (
          <p><a class="btn" href={buildHash({ ...ctx.route, view: "cases", arg: "new", params: {} })}>Add a stored household</a></p>
        )}
      </PlaceHeader>
      <CaseList ctx={ctx} />
    </section>
  );
}

/** One household's page: its title and tabs, then the tab. */
export function HouseholdPage() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  const c = canonicalRoute(route.value);
  const caseId = (c.arg ?? "").split("/")[0];
  const hc = ctx.vol.cases.find((x) => x.id === caseId);
  if (!hc) {
    return (
      <section class="view place households">
        <PlaceHeader place="households" />
        <p class="status bad">
          No stored household {caseId} in this volume. <a href={buildHash({ ...c, arg: null, params: {} })}>All households</a>
        </p>
      </section>
    );
  }
  const tab = householdTab(c);
  const tabHref = (t: string): string => buildHash({ ...c, params: t === "results" ? {} : { tab: t } } as Route);
  const persons = Object.keys(hc.persons ?? {});
  let body: ComponentChildren;
  if (tab === "results") {
    const map = ctx.vol.aidCodes ?? null;
    body = map ? <HouseholdTab ctx={ctx} map={map} /> : <p class="status">This volume has no aid-code layer yet.</p>;
  } else if (tab === "documents") {
    body = <DocumentsChecklist ctx={ctx} hc={hc} person={persons[0] ?? "p1"} />;
  } else if (tab === "whatif") {
    body = (
      <p class="status">
        Being built: move an amount this household states (a person's wages, say) and see which results change, and at
        what amount. Meanwhile, open a person's result under Results and aid codes to read it step by step.
      </p>
    );
  } else {
    body = <CasesView embedded />;
  }
  return (
    <section class="view place household workflow walkthrough" data-case={hc.id}>
      <div class="placehead">
        <h1>{plainCaseTitle(hc.title).title}</h1>
        <p class="purpose"><span class="code">{hc.id}</span> · {persons.length} {persons.length === 1 ? "person" : "people"} · as of {hc.as_of}</p>
      </div>
      <nav class="tabs hhtabs" aria-label="This household">
        {HOUSEHOLD_TABS.map((t) => (
          <a key={t} class={tab === t ? "on" : ""} aria-current={tab === t ? "page" : undefined} href={tabHref(t)} data-tab={t}>
            {HOUSEHOLD_TAB_LABEL[t]}
          </a>
        ))}
      </nav>
      <div class="hhtab">{body}</div>
    </section>
  );
}
