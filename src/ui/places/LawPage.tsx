/* Law: where a statute governs over a Colorado rule, the figures whose
 * source is unverified or missing and what depends on them, and the sources
 * and documents (docs/design-unified-ui.md). A first version for the Law
 * track. Routes: `law` (the overview), `law/departures`, `law/unverified`,
 * `law/sources[/S-n]` and `law/doc[/D-n?at=S-n]` (the Sources and Documents
 * views). */
import {
  citedUnverified, departureItems, dependentsOf, figuresWithoutValue, itemsCitingUnverified, restingOnUnverified,
} from "../counts";
import { formatDate } from "../present";
import { programLabel } from "../roles";
import { argParts, buildHash } from "../router";
import { unverifiedIds } from "../provenance";
import { viewContext } from "../views/context";
import { ItemLink, excerptHref } from "../views/parts";
import { Departures } from "../views/RolesView";
import { NoLedger } from "../views/ViewStub";
import { PlaceHeader } from "./PlaceHeader";
import "../views/workflow-views.css";

export function LawPage() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  const { engine, vol, route: r, today } = ctx;
  const section = argParts(r)[0] ?? "";
  const at = (arg: string | null) => buildHash({ ...r, view: "law", arg, params: {} });
  const unverified = unverifiedIds(vol.sources);
  const deps = departureItems(engine, { asOf: today });
  const citing = itemsCitingUnverified(engine, unverified);
  const tainted = restingOnUnverified(engine, unverified);
  const missing = figuresWithoutValue(engine, today);

  if (section === "departures") {
    return (
      <section class="view place law">
        <PlaceHeader place="law" title="Statute over rule" interim />
        <p class="muted">{deps.length} items follow a statute over the Colorado rule text, in force on {formatDate(today)}.</p>
        <Departures ctx={ctx} items={deps} />
      </section>
    );
  }
  if (section === "unverified") {
    return (
      <section class="view place law">
        <PlaceHeader place="law" title="Unverified and missing figures" interim />
        <h2>Citing an unverified source ({citing.length})</h2>
        <p class="muted">
          Each item cites an excerpt that is not a verified quotation of its document. {tainted.size} items in all rest
          on one, through the rules.
        </p>
        <ul class="plainlist unverified">
          {citing.map((it) => {
            const readers = dependentsOf(engine, it.identifier).length;
            return (
              <li key={it.id}>
                <ItemLink route={r} item={it} /> <span class="tag">{programLabel(it.program)}</span>{" "}
                <span class="muted">
                  cites {citedUnverified(it, unverified).map((s, i) => <span key={s}>{i > 0 && ", "}<a href={excerptHref(r, s)}>{s}</a></span>)};{" "}
                  {readers} {readers === 1 ? "item reads" : "items read"} it
                </span>
              </li>
            );
          })}
        </ul>
        <h2>No value on {formatDate(today)} ({missing.length})</h2>
        <p class="muted">A household determined today gets "cannot determine" where one of these is read.</p>
        <ul class="plainlist missing">
          {missing.map((it) => {
            const readers = dependentsOf(engine, it.identifier).length;
            return (
              <li key={it.id}>
                <ItemLink route={r} item={it} /> <span class="tag">{programLabel(it.program)}</span>{" "}
                <span class="muted">{(it.versions ?? []).length ? "no version in force today" : "no version loaded"}; {readers} {readers === 1 ? "item reads" : "items read"} it</span>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }
  return (
    <section class="view place law">
      <PlaceHeader place="law" interim />
      <ul class="countcards lawcards">
        <li class="countcard">
          <a href={at("departures")}><span class="num">{deps.length}</span> statute-over-rule departures</a>
          <small class="muted">items that follow a statute over the Colorado rule text, in force today</small>
        </li>
        <li class="countcard">
          <a href={at("unverified")}><span class="num">{citing.length}</span> items cite an unverified source</a>
          <small class="muted">{tainted.size} items rest on one through the rules; {missing.length} figures have no value today</small>
        </li>
        <li class="countcard">
          <a href={at("sources")}><span class="num">{vol.sources.length}</span> excerpts</a>
          <small class="muted">the words of the law each item cites</small>
        </li>
        <li class="countcard">
          <a href={at("doc")}><span class="num">{vol.documents.length}</span> documents</a>
          <small class="muted">the full texts the excerpts come from</small>
        </li>
      </ul>
    </section>
  );
}
