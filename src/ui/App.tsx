import "./styles.css";
import { CasesView } from "./CasesView";
import { GraphView } from "./GraphView";
import { Header } from "./Header";
import { ItemEditor } from "./ItemEditor";
import { ItemView } from "./ItemView";
import { PrReview } from "./PrReview";
import { isPrRef } from "./router";
import { SearchView } from "./SearchView";
import { Settings } from "./Settings";
import { SourcesView } from "./SourcesView";
import { route, statusSig, volumeSig } from "./state";
import { TableView } from "./TableView";
import { Tray } from "./Tray";

function ViewSlot() {
  const r = route.value;
  if (r.view === "table") return <TableView />;
  if (r.view === "graph") return <GraphView />;
  if (r.view === "cases") return <CasesView />;
  if (r.view === "item") return <ItemView />;
  if (r.view === "source") return <SourcesView />;
  return <SearchView />;
}

export function App() {
  const status = statusSig.value;
  return (
    <div class="app">
      <Header />
      <main>
        {status.kind === "loading" && <p class="status">{status.message}</p>}
        {status.kind === "error" && <p class="status bad">{status.message}</p>}
        {status.kind === "idle" && volumeSig.value && <ViewSlot />}
      </main>
      <ItemEditor />
      {isPrRef(route.value.ref) ? <PrReview /> : <Tray />}
      <Settings />
    </div>
  );
}
