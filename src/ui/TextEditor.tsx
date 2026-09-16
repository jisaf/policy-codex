import { useSignal } from "@preact/signals";
import { useLayoutEffect, useRef } from "preact/hooks";
import type { Engine } from "../engine/engine";
import type { Item } from "../engine/types";
import {
  contextAt, details, suggestions, tokenAt, tokenize,
  type DetailsVolume, type EditorContext, type Suggestion, type TokenDetails,
} from "./highlight";

interface Props {
  engine: Engine;
  draft: Item;
  onChange: (next: Item) => void;
  /** The loaded volume, for excerpt ids and the token cards' links. */
  vol?: DetailsVolume | null;
  /** Whether the base ledger has no version of this item, so the checker
   *  reports the rules that only apply to a new item. */
  isNew?: boolean;
}

type Tab = "checker" | "preview" | "examples";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "checker", label: "Checker" },
  { key: "preview", label: "Preview" },
  { key: "examples", label: "Examples" },
];

/** Shortest prefix that opens the completion popup on its own; a trigger
 *  character (@, #, /) opens it immediately. */
const MIN_PREFIX = 2;

/** Where the caret sits inside the textarea's own box, measured with a mirror
 *  element the way the retired editor did. Returns the origin when the layout
 *  is not measurable (jsdom, or a hidden editor). */
function caretXY(ta: HTMLTextAreaElement): { x: number; y: number } {
  try {
    const st = getComputedStyle(ta);
    const div = document.createElement("div");
    const copy = [
      "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
      "padding", "border", "boxSizing", "tabSize",
    ] as const;
    for (const p of copy) {
      (div.style as unknown as Record<string, string>)[p] =
        (st as unknown as Record<string, string>)[p];
    }
    div.style.position = "absolute";
    div.style.visibility = "hidden";
    div.style.whiteSpace = "pre";
    div.style.width = `${ta.clientWidth}px`;
    div.style.overflow = "hidden";
    div.textContent = ta.value.slice(0, ta.selectionStart);
    const mark = document.createElement("span");
    mark.textContent = "​";
    div.appendChild(mark);
    document.body.appendChild(div);
    const x = mark.offsetLeft - ta.scrollLeft;
    const y = mark.offsetTop - ta.scrollTop + (parseFloat(st.lineHeight) || 18);
    document.body.removeChild(div);
    return { x, y };
  } catch {
    return { x: 0, y: 0 };
  }
}

function Card({ card }: { card: TokenDetails }) {
  return (
    <div class="tokcard">
      <div class="tip-title"><span class={`tk ${card.cls}`}>{card.title}</span></div>
      {card.rows.map(([k, v]) => (
        <div key={k} class="tip-row"><span class="tip-k">{k}</span><span>{v}</span></div>
      ))}
      {card.link && <a class="tip-open" href={card.link}>open in the item browser</a>}
    </div>
  );
}

export function TextEditor({ engine, draft, onChange, vol = null, isNew }: Props) {
  const text = useSignal(engine.itemBlock(draft));
  const caret = useSignal(0);
  const tab = useSignal<Tab>("checker");
  const acItems = useSignal<Suggestion[]>([]);
  const acIndex = useSignal(0);
  const acCtx = useSignal<EditorContext | null>(null);
  const acPos = useSignal<{ x: number; y: number }>({ x: 0, y: 0 });
  const tip = useSignal<{ card: TokenDetails; x: number; y: number } | null>(null);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const pendingCaret = useRef<number | null>(null);

  // Preact rewrites the textarea's value on every render, which drops the
  // selection, so a programmatic insertion restores the caret afterwards.
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (ta && pendingCaret.current !== null) {
      ta.selectionStart = ta.selectionEnd = pendingCaret.current;
      pendingCaret.current = null;
    }
  });

  const closeAc = () => {
    acItems.value = [];
    acCtx.value = null;
    acIndex.value = 0;
  };

  /** Recomputes the completion popup for wherever the caret now is. */
  const completion = () => {
    const ta = taRef.current;
    if (!ta) return;
    const ctx = contextAt(engine, text.value, ta.selectionStart ?? 0);
    if (ctx.kind === null || (!ctx.trigger && ctx.prefix.length < MIN_PREFIX)) {
      closeAc();
      return;
    }
    const items = suggestions(engine, ctx, undefined, {
      sources: vol?.sources, questions: vol?.openQuestions,
    });
    if (!items.length) { closeAc(); return; }
    acItems.value = items;
    acCtx.value = ctx;
    acIndex.value = 0;
    const xy = caretXY(ta);
    acPos.value = { x: xy.x, y: (wrapRef.current?.offsetTop ?? 0) + xy.y };
  };

  /** The one place a change reaches the draft: only a clean parse commits. */
  const reparse = (next: string) => {
    text.value = next;
    const r = engine.parseItemBlock(next);
    if (r.errors.length) return;
    // The block renders a versioned parameter as one flat "Value" line. Reading
    // that back as `value` would shadow `versions` (value outranks versions in
    // paramValue), so a versioned draft keeps its history and ignores the line.
    const parsed: Partial<Item> = { ...r.item };
    if (draft.versions?.length) delete parsed.value;
    onChange({ ...draft, ...parsed });
  };

  const setText = (next: string, at: number) => {
    const ta = taRef.current;
    if (ta) { ta.value = next; ta.selectionStart = ta.selectionEnd = at; }
    pendingCaret.current = at;
    caret.value = at;
    reparse(next);
  };

  const accept = (k: number) => {
    const ctx = acCtx.value;
    const item = acItems.value[k];
    const ta = taRef.current;
    if (!ctx || !item || !ta) return;
    const to = ta.selectionStart ?? ctx.start;
    const next = text.value.slice(0, ctx.start) + item.insert + text.value.slice(to);
    closeAc();
    setText(next, ctx.start + item.insert.length);
    ta.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const ta = taRef.current;
    if (!acItems.value.length) {
      if (e.key === "Tab" && ta) {
        e.preventDefault();
        const s = ta.selectionStart ?? 0;
        setText(`${text.value.slice(0, s)}  ${text.value.slice(ta.selectionEnd ?? s)}`, s + 2);
      }
      return;
    }
    const n = acItems.value.length;
    if (e.key === "ArrowDown") { e.preventDefault(); acIndex.value = (acIndex.value + 1) % n; }
    else if (e.key === "ArrowUp") { e.preventDefault(); acIndex.value = (acIndex.value - 1 + n) % n; }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); accept(acIndex.value); }
    else if (e.key === "Escape") { e.preventDefault(); closeAc(); }
  };

  const syncCaret = () => {
    const ta = taRef.current;
    if (ta) caret.value = ta.selectionStart ?? 0;
  };

  /** Hover hit-testing: the painted copy sits behind a transparent textarea,
   *  so the two swap pointer-events for the length of one hit test. */
  const onMouseMove = (e: MouseEvent) => {
    const ta = taRef.current;
    const pre = preRef.current;
    if (!ta || !pre || typeof document.elementFromPoint !== "function") return;
    ta.style.pointerEvents = "none";
    pre.style.pointerEvents = "auto";
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    ta.style.pointerEvents = "";
    pre.style.pointerEvents = "";
    const span = el && typeof el.closest === "function"
      ? el.closest("span[data-start]") as HTMLElement | null
      : null;
    if (!span) { tip.value = null; return; }
    const card = details(engine, vol, tokenAt(engine, text.value, Number(span.dataset.start)));
    if (!card) { tip.value = null; return; }
    const box = wrapRef.current?.parentElement?.getBoundingClientRect();
    tip.value = {
      card,
      x: box ? e.clientX - box.left + 12 : 12,
      y: box ? e.clientY - box.top + 16 : 16,
    };
  };

  const r = engine.parseItemBlock(text.value);
  const parsed: Item = { ...draft, ...r.item };
  const lines = tokenize(engine, text.value, {
    errorLines: r.errors.map((e) => e.line),
    sourceIds: vol?.sources?.map((s) => s.id),
    questionIds: vol?.openQuestions?.map((q) => q.id),
  });

  const typed = parsed.kind === "derived" && parsed.derived
    ? engine.check(parsed.derived, parsed.scope)
    : null;
  const report = engine.constraints(parsed);
  const findings = engine.governance(parsed, { isNew });
  const problems = r.errors.length
    + (typed?.errors.length ?? 0)
    + report.filter((c) => !c.ok && c.level === "error").length
    + findings.filter((f) => f.level === "error").length;

  let english = "";
  if (parsed.kind === "derived" && parsed.derived) {
    try { english = engine.block(parsed.derived).join("\n"); }
    catch (e) { english = `(invalid: ${(e as Error).message})`; }
  }
  const tests = parsed.tests ?? [];
  const inspected = details(engine, vol, tokenAt(engine, text.value, caret.value));

  return (
    <div class="textsurface">
      <div class="editorcol">
        <div class="statusline">
          <span class={`pill ${problems ? "bad" : "ok"}`}>
            {problems ? `${problems} problem(s)` : "parses, all constraints satisfied"}
          </span>
          <span class="legend">
            <span class="tk fact">supplied</span>
            <span class="tk derived">derived</span>
            <span class="tk param">parameter</span>
            <span class="tk phrase">pattern</span>
            <span class="tk literal">literal</span>
            <span class="tk unknown">not recognised</span>
            <span class="muted">@ facts · # sources · / patterns</span>
          </span>
        </div>

        <div class="edwrap" ref={wrapRef}>
          <pre class="hl" aria-hidden="true" ref={preRef}>
            {lines.flatMap((line) => [
              <span key={line.number} class={line.error ? "line errline" : "line"}>
                {line.tokens.length
                  ? line.tokens.map((t) => (
                    <span
                      key={t.start} class={`tk ${t.cls}`}
                      data-tok={t.cls} data-start={t.start}
                    >{t.text}</span>
                  ))
                  : " "}
              </span>,
              "\n",
            ])}
          </pre>
          <textarea
            class="block" spellcheck={false} autocomplete="off" ref={taRef}
            value={text.value}
            onInput={(e) => {
              reparse((e.target as HTMLTextAreaElement).value);
              syncCaret();
              completion();
            }}
            onKeyDown={onKeyDown}
            onKeyUp={syncCaret}
            onClick={() => { syncCaret(); completion(); }}
            onMouseMove={onMouseMove}
            onMouseLeave={() => { tip.value = null; }}
            onBlur={() => { closeAc(); tip.value = null; }}
            onScroll={() => {
              const ta = taRef.current;
              const pre = preRef.current;
              if (ta && pre) { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; }
            }}
          />
        </div>

        {acItems.value.length > 0 && (
          <ul class="ac" style={{ left: `${acPos.value.x}px`, top: `${acPos.value.y}px` }}>
            {acItems.value.map((s, k) => (
              <li
                key={`${s.label}:${k}`} class={k === acIndex.value ? "on" : ""}
                onMouseDown={(e) => { e.preventDefault(); accept(k); }}
              >
                <span class={`tk ${s.cls}`}>{s.label}</span>
                <small>{s.detail}</small>
              </li>
            ))}
          </ul>
        )}

        {tip.value && (
          <div class="tip" style={{ left: `${tip.value.x}px`, top: `${tip.value.y}px` }}>
            <Card card={tip.value.card} />
          </div>
        )}

        <div class="inspector">
          {inspected
            ? <Card card={inspected} />
            : (
              <p class="muted">
                Place the caret on a fact, pattern, literal, source, or field name to read it here.
              </p>
            )}
        </div>
      </div>

      <aside>
        <div class="tabs subtabs">
          {TABS.map((t) => (
            <button
              key={t.key} data-tab={t.key} class={tab.value === t.key ? "on" : ""}
              onClick={() => { tab.value = t.key; }}
            >{t.label}</button>
          ))}
        </div>

        {tab.value === "checker" && (
          <ul class="diagnostics">
            {r.errors.map((e) => (
              <li key={`p${e.line}:${e.msg}`} class="bad">
                <span class="ln">line {e.line}</span>{e.msg}
              </li>
            ))}
            {(typed?.errors ?? []).map((m) => <li key={`t${m}`} class="bad">{m}</li>)}
            {(typed?.warnings ?? []).map((m) => <li key={`w${m}`} class="warn">{m}</li>)}
            {report.filter((c) => !c.ok).map((c) => (
              <li key={`c${c.msg}`} class={c.level === "warn" ? "warn" : "bad"}>{c.msg}</li>
            ))}
            {report.filter((c) => c.ok && c.level === "warn").map((c) => (
              <li key={`cw${c.msg}`} class="warn">{c.msg}</li>
            ))}
            {findings.map((f) => (
              <li key={`g${f.rule}:${f.msg}`} class={f.level === "error" ? "bad" : "warn"}>
                <span class="tag">{f.rule}</span> {f.msg}
              </li>
            ))}
            {problems === 0 && (
              <li class="ok">No problems. {report.length} constraints satisfied.</li>
            )}
          </ul>
        )}

        {tab.value === "preview" && (
          <>
            <h4>Reads as</h4>
            <pre class="derivation">{english || "(nothing to read yet)"}</pre>
            <h4>Uses</h4>
            <p class="muted">
              {(parsed.derived ? engine.uses(parsed.derived) : [])
                .map((u) => engine.item(u)?.name ?? u).join(", ") || "nothing"}
            </p>
          </>
        )}

        {tab.value === "examples" && (
          tests.length
            ? (
              <table class="grid examples">
                <thead>
                  <tr><th>id</th><th>given</th><th>expected</th><th>result</th></tr>
                </thead>
                <tbody>
                  {tests.map((t) => {
                    const x = engine.runTest(parsed, t);
                    const given = engine.formatTest(t)
                      .replace(/^[^:]+: given /, "").replace(/ => .*$/, "");
                    const expected = "expect_length" in t
                      ? `${t.expect_length} months`
                      : engine.fmt(t.expect === "unknown" ? null : t.expect);
                    return (
                      <tr key={t.id}>
                        <td>{t.id}</td>
                        <td class="mono">{given}</td>
                        <td>{expected}</td>
                        <td class={x.ok ? "ok" : "bad"}>
                          {x.err ? x.err : x.ok ? "pass" : `got ${engine.fmt(x.got)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
            : <p class="muted">No examples yet. Write them under an Examples line.</p>
        )}
      </aside>
    </div>
  );
}
