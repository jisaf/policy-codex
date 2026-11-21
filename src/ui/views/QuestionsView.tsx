import { Ident } from "../Rich";
import { buildHash, type Route } from "../router";
import {
  isOpen, questionInfo, questionInfos, QUESTION_STATUS_LABEL, type QuestionInfo,
} from "../questions";
import { viewContext, type ViewContext } from "./context";
import { NoLedger, ViewHeader } from "./ViewStub";

function StatusTag({ q }: { q: QuestionInfo }) {
  return <span class={`tag qstatus qstatus-${q.status}`}>{QUESTION_STATUS_LABEL[q.status]}</span>;
}

/** One open question on its own page: its title and status, the programs it
 *  touches, the full text, and the items it names, each a link. */
export function QuestionPage({ ctx, id }: { ctx: ViewContext; id: string }) {
  const { engine, vol, route: r } = ctx;
  const raw = vol.openQuestions.find((q) => q.id === id);
  if (!raw) return <p class="status bad">No open question {id} in this volume.</p>;
  const q = questionInfo(engine, raw);
  const paras = q.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <section class="view question" data-question={q.id}>
      <div class="cardhead">
        <h1>{q.title}</h1>
        <span class="spacer" />
        <a class="btn" href={buildHash({ ...r, view: "questions", arg: null, params: {} })}>
          All questions
        </a>
      </div>
      <p class="idline muted">
        <span class="mono">{q.id}</span> · <StatusTag q={q} />
        {q.programs.length > 0 && <> · {q.programs.map((p) => (
          <span key={p} class={`tag prog-${p.toLowerCase()}`}>{p}</span>
        ))}</>}
      </p>
      <div class="qbody">
        {paras.map((p, i) => <p key={i}>{p.replace(/^Body:\s*/, "")}</p>)}
      </div>
      <h3>Items this question touches</h3>
      {q.items.length === 0
        ? <p class="muted">No item names this question.</p>
        : (
          <ul class="qitems">
            {q.items.map((it) => (
              <li key={it.id}>
                <a href={buildHash({ ...r, view: "item", arg: it.id, params: {} })}><b>{it.name}</b></a>{" "}
                <small class="mono">{it.id} · <Ident id={it.identifier} engine={engine} /></small>{" "}
                <span class={`tag prog-${it.program.toLowerCase()}`}>{it.program}</span>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}

function QuestionList({ qs, route: r }: { qs: QuestionInfo[]; route: Route }) {
  return (
    <ul class="qlist">
      {qs.map((q) => (
        <li key={q.id}>
          <a href={buildHash({ ...r, view: "questions", arg: q.id, params: {} })}>{q.title}</a>{" "}
          <small class="mono">{q.id}</small> <StatusTag q={q} />{" "}
          {q.programs.map((p) => <span key={p} class={`tag prog-${p.toLowerCase()}`}>{p}</span>)}
        </li>
      ))}
    </ul>
  );
}

/** The decision queue (phase 13, to be built): for now every question,
 *  open ones first, each linking to its own page. */
export function QuestionsView() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  if (ctx.route.arg) return <QuestionPage ctx={ctx} id={ctx.route.arg} />;
  const all = questionInfos(ctx.engine, ctx.vol.openQuestions);
  const open = all.filter((q) => isOpen(q.status));
  const resolved = all.filter((q) => !isOpen(q.status));
  return (
    <section class="view workflow questions">
      <ViewHeader view="questions" building />
      <h3>Still open ({open.length})</h3>
      <QuestionList qs={open} route={ctx.route} />
      <details>
        <summary>Resolved ({resolved.length})</summary>
        <QuestionList qs={resolved} route={ctx.route} />
      </details>
    </section>
  );
}
