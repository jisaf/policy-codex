/* The phase 13 workflow views: one entry each, so the header's workflow nav,
 * the start page, the help panel and the App's view slot all read the same
 * list. A view's component lives beside this file (InboxView.tsx and so on)
 * and is wired into App.tsx's ViewSlot by `view`. */
import type { ViewName } from "../router";

export interface WorkflowView {
  view: Extract<ViewName, "inbox" | "questions" | "walkthrough" | "roles" | "outcomes">;
  /** The nav link's text. */
  label: string;
  /** The page's heading. */
  title: string;
  /** One line: what the page is for, in the reader's words. */
  purpose: string;
  /** What the route's `arg` names on this view, when it takes one. */
  arg?: string;
}

export const WORKFLOW_VIEWS: WorkflowView[] = [
  {
    view: "inbox", label: "Approvals", title: "Approvals inbox",
    purpose: "What is waiting on whom: each change grouped, its effect in plain words, and the sign-offs it still needs.",
    arg: "a change or item id",
  },
  {
    view: "questions", label: "Questions", title: "Open questions",
    purpose: "The decision queue: each open question with the text it turns on, the assumption in force, who must answer it, and what changes if answered the other way.",
    arg: "an open question id (OQ-n) opens that question's own page",
  },
  {
    view: "walkthrough", label: "Walkthrough", title: "Case walkthrough",
    purpose: "Step through a stored test household rule by rule: each step's plain meaning, the text it cites, and the value the codex recorded.",
    arg: "a household case id",
  },
  {
    view: "roles", label: "By role", title: "By role",
    purpose: "What each agency and role owns, has to approve, and has open: HCPF, CDHS, CDEC, Legal.",
    arg: "a persona id (hcpf, cdhs, cdec, legal, county, engineer)",
  },
  {
    view: "outcomes", label: "By outcome", title: "By aid code and outcome",
    purpose: "Each program outcome a household can end in, the rules that lead to it and the figures it depends on.",
    arg: "a program id or an outcome identifier",
  },
];

export function workflowView(view: ViewName): WorkflowView | undefined {
  return WORKFLOW_VIEWS.find((w) => w.view === view);
}
