import "./styles.css";
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
import { isPrRef } from "./router";
import { SearchView } from "./SearchView";
import { Settings } from "./Settings";
import { SourcesView } from "./SourcesView";
import { StartView } from "./StartView";
import { route, statusSig, volumeSig } from "./state";
import { TableView } from "./TableView";
import { Tour, tourBoxHeightSig, tourOpenSig } from "./Tour";
import { Tray } from "./Tray";

function ViewSlot() {
  const r = route.value;
  if (r.view === "start") return <StartView />;
  if (r.view === "table") return <TableView />;
  if (r.view === "graph") return <GraphView />;
  if (r.view === "cases") return <CasesView />;
  if (r.view === "program") return <ProgramView />;
  if (r.view === "item") return <ItemView />;
  if (r.view === "source") return <SourcesView />;
  if (r.view === "documents" || r.view === "document") return <DocumentsView />;
  if (r.view === "handoff") return <HandoffView />;
  return <SearchView />;
}

export function App() {
  const status = statusSig.value;
  const tourOpen = tourOpenSig.value;
  return (
    <div
      class={`app${tourOpen ? " tour-open" : ""}`}
      style={tourOpen ? { "--tourbox-h": `${tourBoxHeightSig.value}px` } : undefined}
    >
      <Header />
      <main>
        {status.kind === "loading" && <p class="status">{status.message}</p>}
        {status.kind === "error" && <p class="status bad">{status.message}</p>}
        {status.kind === "idle" && volumeSig.value && <ViewSlot />}
      </main>
      <ItemEditor />
      {isPrRef(route.value.ref) ? <PrReview /> : <Tray />}
      <Settings />
      <Tour />
      <HelpPanel />
    </div>
  );
}
