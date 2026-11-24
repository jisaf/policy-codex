import { render } from "preact";
import { App } from "./ui/App";
// The design system's shared classes, after every page's own stylesheet.
import "./ui/design.css";
import { startRouter } from "./ui/state";

const host = document.getElementById("app");
if (!host) throw new Error("missing #app");
void startRouter();
render(<App />, host);
