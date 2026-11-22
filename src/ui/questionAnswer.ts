/* An answer to an open question, as an edit of open-questions.md: the
 * heading becomes "Resolved: <question>" (the status convention
 * docs/reviews/open-question-status.md states and questions.ts reads), and
 * the answer is appended as the question's last note, with who decided, on
 * what date, on what authority, and the follow-up edits it calls for. The
 * edit is staged as a file entry in the change tray and proposed like any
 * other change; nothing here writes anywhere. */
import { parseOpenQuestions } from "../ledger/markdown";
import { plainQuestionTitle } from "./questions";

export interface QuestionAnswer {
  /** The decision, in the decision-maker's words. */
  decision: string;
  /** The text or authority it rests on: a rule paragraph, a memo, a letter. */
  citation: string;
  /** Who decided. */
  by: string;
  /** The role they decided in (volume.yaml approval roles). */
  role: string;
  /** YYYY-MM-DD. */
  date: string;
  /** Items whose text or open-question reference must follow the answer. */
  followUps?: string[];
  /** An opinion given with the question kept open (Legal: "sec. 10102
   *  governs, revisit at the final rule"): the heading is not retitled
   *  "Resolved:". */
  keepOpen?: boolean;
  /** What the opinion is conditional on, or when to revisit it. */
  caveat?: string;
  /** Who at the agency was told, and when (a departure's notice). */
  agencyNotified?: string;
  /** "opinion" for a legal opinion (Blind B's form: the conclusion, the
   *  authority relied on, its effect). `citation` is then the authority. */
  kind?: "answer" | "opinion";
  /** A legal opinion's effect ("Federal statute governs over Colorado's
   *  text"). */
  effect?: string;
}

/** The effects a legal opinion can have (Blind B), in the order offered. */
export const OPINION_EFFECTS = [
  "The reading in force stands",
  "The reading in force must change",
  "Federal statute governs over Colorado's text",
  "Colorado's text governs",
  "Cannot be settled without rulemaking",
] as const;

function sentence(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (!t) return "";
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/** The note the answer appends: one paragraph, labelled so the question page
 *  reads it as the latest note. */
export function answerNote(a: QuestionAnswer): string {
  const who = [a.by.trim(), a.role.trim()].filter(Boolean).join(", ");
  const opinion = a.kind === "opinion";
  const head = opinion
    ? `Legal opinion${a.keepOpen ? ", question kept open" : ""} (${a.date}, ${who}): ${sentence(a.decision)}`
    : a.keepOpen
      ? `Opinion, question kept open (${a.date}, ${who}): ${sentence(a.decision)}`
      : `Answer (${a.date}, ${who}): ${sentence(a.decision)}`;
  const cite = opinion
    ? (a.citation.trim() ? `Authority: ${sentence(a.citation)}` : "No authority given.")
    : (a.citation.trim() ? `Citation: ${sentence(a.citation)}` : "No citation given.");
  const parts = [head, cite];
  if (opinion && a.effect?.trim()) parts.push(`Effect: ${sentence(a.effect)}`);
  if (a.caveat?.trim()) parts.push(`Caveat: ${sentence(a.caveat)}`);
  if (a.agencyNotified?.trim()) parts.push(`Agency notified: ${sentence(a.agencyNotified)}`);
  if (a.followUps?.length) {
    parts.push(`Follow-up edits: ${a.followUps.join(", ")} carry this question and are to be brought in line with the answer.`);
  }
  return parts.join(" ");
}

/** open-questions.md with `id` answered: its heading retitled "Resolved:"
 *  and the answer appended as its last note. Every other line is kept as
 *  written. Throws when the file has no such question. */
export function applyAnswer(md: string, id: string, a: QuestionAnswer): string {
  const lines = md.split("\n");
  const head = new RegExp(`^### ${id.replace(/[-]/g, "\\-")}\\.?\\s+(.*)$`);
  const at = lines.findIndex((l) => head.test(l.replace(/\r$/, "").trim()));
  if (at < 0) throw new Error(`open-questions.md has no ${id}`);
  const title = head.exec(lines[at].replace(/\r$/, "").trim())![1];
  // A partly resolved heading names its open part ("...; open: ..."): that
  // part is what the answer settles. An opinion that keeps the question open
  // leaves the heading as it is.
  if (!a.keepOpen) {
    const plain = plainQuestionTitle(title).replace(/;\s*open:\s*/i, "; answered: ");
    lines[at] = `### ${id}. Resolved: ${plain}`;
  }
  let end = lines.findIndex((l, i) => i > at && l.startsWith("#"));
  if (end < 0) end = lines.length;
  // Insert after the section's last non-blank line, keeping one blank line
  // before the next heading.
  let last = end - 1;
  while (last > at && !lines[last].trim()) last--;
  const note = answerNote(a);
  lines.splice(last + 1, 0, "", note);
  return lines.join("\n");
}

/** The ids of the questions `after` resolves that `before` had open: what a
 *  staged open-questions.md answers. */
export function answeredIds(before: string, after: string): string[] {
  const was = new Map(parseOpenQuestions(before).map((q) => [q.id, q.title]));
  return parseOpenQuestions(after)
    .filter((q) => /^resolved\b/i.test(q.title.trim()) && !/^resolved\b/i.test((was.get(q.id) ?? "").trim()))
    .map((q) => q.id);
}

export type StagedAnswer = "answered" | "opinion";

/** What a staged open-questions.md does to each question it touches: answered
 *  (retitled "Resolved:"), or an opinion recorded with the question kept open
 *  (its text grew, its heading did not change status). The queue moves the
 *  answered ones out of the open list and marks the others. */
export function stagedAnswers(before: string, after: string): Map<string, StagedAnswer> {
  const was = new Map(parseOpenQuestions(before).map((q) => [q.id, q]));
  const out = new Map<string, StagedAnswer>();
  for (const q of parseOpenQuestions(after)) {
    const old = was.get(q.id);
    const resolvedNow = /^resolved\b/i.test(q.title.trim());
    const resolvedThen = old ? /^resolved\b/i.test(old.title.trim()) : false;
    if (resolvedNow && !resolvedThen) out.set(q.id, "answered");
    else if (old && old.body !== q.body) out.set(q.id, "opinion");
  }
  return out;
}

/** The latest "Agency notified:" a question's text records, or null. */
export function agencyNotified(body: string): string | null {
  let last: string | null = null;
  for (const m of body.matchAll(/Agency notified:\s*([^\n]+?)(?=\s+(?:Follow-up edits|Caveat|Citation|Authority|Effect):|$)/gm)) last = m[1].trim();
  return last;
}
