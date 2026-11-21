import { render } from "preact";
import { App } from "./ui/App";
import { startRouter } from "./ui/state";

const host = document.getElementById("app");
if (!host) throw new Error("missing #app");
void startRouter();
render(<App />, host);
