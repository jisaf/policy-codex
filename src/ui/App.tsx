import "./styles.css";
import "./phase13.css";
import "./shell.css";
import { CasesView } from "./CasesView";
import { DocumentsView } from "./DocumentsView";
import { GraphView } from "./GraphView";
import { HandoffView } from "./HandoffView";
import { Header } from "./Header";
import { HelpPanel } from "./Help";
import { ItemEditor } from "./ItemEditor";
import { ItemView } from "./ItemView";
import { PrReview } from "./PrReview";
import { ProgramView } from "./ProgramView";
import { TokenPopover } from "./Rich";
import { argParts, canonicalRoute, isPrRef } from "./router";
import { SearchView } from "./SearchView";
import { Settings } from "./Settings";
import { Sidebar } from "./Sidebar";
import { SourcesView } from "./SourcesView";
import { navOpenSig } from "./shell";
import { route, statusSig, volumeSig } from "./state";
import { TableView } from "./TableView";
import { Tour, tourBoxHeightSig, tourOpenSig } from "./Tour";
import { Tray } from "./Tray";
import { DraftBanner } from "./DraftBanner";
import { ChangesPage } from "./places/ChangesPage";
import { DeskPage } from "./places/DeskPage";
import { FiguresPage } from "./places/FiguresPage";
import { HouseholdPage, HouseholdsList } from "./places/HouseholdPage";
import { LawPage } from "./places/LawPage";
import { InboxView } from "./views/InboxView";
import { OutcomesView } from "./views/OutcomesView";
import { QuestionsView } from "./views/QuestionsView";
import { WalkthroughView } from "./views/WalkthroughView";
import { MapPage } from "./map/MapView";

/** The page for the address. It dispatches on the canonical route (what the
 *  address bar shows; router.ts): each place, its sub-pages, the item,
 *  search and the implementer views. A page still served by an older view
 *  reads that view's own route from `route.value` (router.ts
 *  `internalRoute`). A track that builds a place's page replaces its line
 *  here. */
export function ViewSlot() {
  const c = canonicalRoute(route.value);
  const parts = argParts(c);
  switch (c.view) {
    case "desk": return parts[0] === "sign" ? <InboxView /> : <DeskPage />;
    case "programs": return c.params.tab === "aid-codes" ? <OutcomesView /> : <ProgramView />;
    case "figures": return <FiguresPage />;
    case "households":
      if (!parts.length) return <HouseholdsList />;
      if (parts[0] === "new") return <CasesView />;
      if (parts[1]) return <WalkthroughView />;
      return <HouseholdPage />;
    case "questions": return <QuestionsView />;
    case "law":
      if (parts[0] === "sources") return <SourcesView />;
      if (parts[0] === "doc") return <DocumentsView />;
      return <LawPage />;
    case "changes": return <ChangesPage />;
    case "item": return <ItemView />;
    case "map": return <MapPage />;
    case "search": return <SearchView key={c.params.q ?? ""} />;
    case "table": return <TableView />;
    case "graph": return <GraphView />;
    case "handoff": return <HandoffView />;
    default: return <DeskPage />;
  }
}

export function App() {
  const status = statusSig.value;
  const tourOpen = tourOpenSig.value;
  return (
    <div
      class={`app shell${tourOpen ? " tour-open" : ""}${navOpenSig.value ? " nav-open" : ""}`}
      style={tourOpen ? { "--tourbox-h": `${tourBoxHeightSig.value}px` } : undefined}
    >
      <a class="skiplink" href="#content" onClick={(e) => { e.preventDefault(); document.getElementById("content")?.focus(); }}>
        Skip to the page
      </a>
      <Sidebar />
      <div class="mainwrap">
        <Header />
        <DraftBanner />
        <main id="content" tabIndex={-1}>
          {status.kind === "loading" && <p class="status">{status.message}</p>}
          {status.kind === "error" && <p class="status bad">{status.message}</p>}
          {status.kind === "idle" && volumeSig.value && <ViewSlot />}
        </main>
      </div>
      <ItemEditor />
      {isPrRef(route.value.ref) ? <PrReview /> : <Tray />}
      <Settings />
      <Tour />
      <HelpPanel />
      <TokenPopover />
    </div>
  );
}
