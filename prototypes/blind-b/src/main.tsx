import { render } from "preact";
import { useState } from "preact/hooks";
import { load, D, trayCount, role } from "./store";
import { route, href, go } from "./ui";
import { ItemPage } from "./item";
import { HouseholdList, HouseholdPage } from "./households";
import { Desk, SignQueue, Programs, Program, Figures, Questions, QuestionPage, RoleSelect } from "./views";
import { Law, Changes, Search } from "./views2";
import { MapPage, OutcomeMap } from "./map";
import { ScreeningPage } from "./screening";

const NAV: Array<[string, string, string]> = [
  ["desk", "My desk", "M4 6h16M4 12h10M4 18h16"],
  ["programs", "Programs", "M5 4h14v16H5zM9 8h6M9 12h6M9 16h3"],
  ["households", "Households", "M3 11l9-7 9 7M6 10v9h12v-9"],
  ["questions", "Questions", "M9 9a3 3 0 1 1 4 3c-1 .6-1 1.4-1 2M12 18h.01M4 4h16v16H4z"],
  ["figures", "Figures", "M5 19V9M10 19V5M15 19v-7M20 19v-4"],
  ["map", "Map", "M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2zM9 4v14M15 6v14"],
  ["screening", "Screening", "M4 5h16l-6 7v6l-4 2v-8z"],
  ["law", "Law", "M12 4v16M6 8h12M6 8l-3 7h6zM18 8l-3 7h6zM8 20h8"],
  ["changes", "Changes", "M4 12a8 8 0 0 1 14-5l2-2v6h-6l2-2a5 5 0 0 0-9 3M20 12a8 8 0 0 1-14 5"],
];
function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

function Page() {
  const [a, b, c] = route.value.path;
  switch (a ?? "desk") {
    case "desk": return b === "sign" ? <SignQueue /> : <Desk />;
    case "programs": return b ? <Program id={b} /> : <Programs />;
    case "item": return <ItemPage id={b} key={b} />;
    case "figures": return <Figures />;
    case "households": return b ? <HouseholdPage id={b} key={b} /> : <HouseholdList />;
    case "questions": return b ? <QuestionPage id={b} key={b} /> : <Questions />;
    case "law": return <Law sub={b} id={c} key={(b ?? "") + (c ?? "")} />;
    case "changes": return <Changes sub={b} />;
    case "map": return b === "outcome" && c ? <OutcomeMap ident={c} key={c} /> : <MapPage />;
    case "screening": return <ScreeningPage sub={b} key={b ?? ""} />;
    case "search": return <Search />;
    case "more": return <MoreMenu />;
    default: return <p class="empty">That page does not exist. <a href={href("desk")}>Back to your desk</a></p>;
  }
}
function MoreMenu() {
  return (
    <div>
      <h1>More</h1>
      <ul class="plain moremenu">
        {NAV.slice(4).map(([k, l, d]) => <li><a class="row" href={href(k)}><Icon d={d} /><span class="row-main"><span class="row-name">{l}</span></span></a></li>)}
      </ul>
      <p class="small muted">Viewing as <RoleSelect /></p>
    </div>
  );
}
function SearchBox() {
  const [v, setV] = useState(route.value.path[0] === "search" ? route.value.q.q ?? "" : "");
  return (
    <form class="search" role="search" onSubmit={(e) => { e.preventDefault(); if (v.trim()) go("search", { q: v.trim() }); }}>
      <input type="search" aria-label="Search the rulebook" placeholder="Search rules, figures, citations, households…" value={v} onInput={(e) => setV((e.target as HTMLInputElement).value)} />
    </form>
  );
}
function App() {
  const cur = route.value.path[0] ?? "desk";
  const active = cur === "item" ? "programs" : cur === "search" ? "" : cur;
  const n = trayCount();
  return (
    <div class="shell">
      <aside class="side">
        <a class="brand" href={href("desk")}><span class="brand-m">CO</span><span><b>Rulebook</b><small>Colorado benefits, as rules</small></span></a>
        <nav aria-label="Main">
          {NAV.map(([k, l, d]) => <a class={active === k ? "on" : ""} href={href(k)} aria-current={active === k ? "page" : undefined}><Icon d={d} /><span>{l}</span>{k === "changes" && n > 0 && <b class="badge">{n}</b>}</a>)}
        </nav>
        <div class="side-foot">
          <label class="small">Viewing as<RoleSelect /></label>
          <p class="small muted">Draft of {D.generated}. {D.items.length.toLocaleString()} items, none approved yet.</p>
        </div>
      </aside>
      <div class="main">
        <header class="top">
          <a class="brand mini" href={href("desk")}><span class="brand-m">CO</span></a>
          <SearchBox />
          <a class={"tray" + (n ? " has" : "")} href={href("changes/proposal")} title="Your proposal">{n ? <>Your proposal <b>{n}</b></> : "No proposal"}</a>
        </header>
        <main id="content"><Page /></main>
      </div>
      <nav class="bottom" aria-label="Main">
        {NAV.slice(0, 4).map(([k, l, d]) => <a class={active === k ? "on" : ""} href={href(k)}><Icon d={d} /><span>{l}</span></a>)}
        <a class={["figures", "map", "screening", "law", "changes", "more"].includes(active) ? "on" : ""} href={href("more")}><Icon d="M5 12h.01M12 12h.01M19 12h.01" /><span>More{n > 0 && <b class="badge">{n}</b>}</span></a>
      </nav>
    </div>
  );
}

load().then(() => {
  void role.value;
  const el = document.getElementById("app")!;
  el.textContent = "";
  render(<App />, el);
}).catch((e) => {
  document.getElementById("app")!.innerHTML = `<p class="boot">The rulebook data could not be loaded (${String(e.message ?? e)}). Run the data step in README.md first.</p>`;
});
