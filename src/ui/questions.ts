/* Open questions as records a page can show: status read from the heading
 * ("Resolved:", "Partly resolved:", or neither), the items they touch, and the
 * programs those items belong to. Shared by the question page, search and
 * the decision-queue view. */
import type { Engine } from "../engine/engine";
import type { Item } from "../engine/types";
import type { OpenQuestion } from "../ledger/markdown";

export type QuestionStatus = "open" | "partly" | "resolved";

export const QUESTION_STATUS_LABEL: Record<QuestionStatus, string> = {
  open: "Open",
  partly: "Partly resolved",
  resolved: "Resolved",
};

export interface QuestionInfo {
  id: string;
  /** The heading without its status prefix. */
  title: string;
  /** The heading as written. */
  rawTitle: string;
  body: string;
  status: QuestionStatus;
  /** Items the question names (its "Items:" line) or that name it (`open`),
   *  in ledger order. */
  items: Item[];
  /** The distinct programs of those items, in first-seen order. */
  programs: string[];
}

const PREFIX = /^(partly resolved|resolved)\b[^:]*:\s*/i;

/** A question's status, from the convention docs/reviews/open-question-status.md
 *  states: "Resolved:" when every part is settled, "Partly resolved:" when a
 *  part is open, and no prefix while it is open. */
export function questionStatus(q: Pick<OpenQuestion, "title">): QuestionStatus {
  const m = PREFIX.exec(q.title.trim());
  if (!m) return "open";
  return m[1].toLowerCase().startsWith("partly") ? "partly" : "resolved";
}

export function plainQuestionTitle(title: string): string {
  const t = title.trim().replace(PREFIX, "");
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

export function questionInfo(engine: Engine, q: OpenQuestion): QuestionInfo {
  const named = new Set(q.items ?? []);
  const items = engine.items().filter((it) => named.has(it.id) || (it.open ?? []).includes(q.id));
  const programs: string[] = [];
  for (const it of items) if (!programs.includes(it.program)) programs.push(it.program);
  return {
    id: q.id, title: plainQuestionTitle(q.title), rawTitle: q.title, body: q.body,
    status: questionStatus(q), items, programs,
  };
}

export function questionInfos(engine: Engine, questions: readonly OpenQuestion[]): QuestionInfo[] {
  return questions.map((q) => questionInfo(engine, q));
}

/** Whether a question still needs an answer: open, or partly resolved. */
export function isOpen(status: QuestionStatus): boolean {
  return status !== "resolved";
}
