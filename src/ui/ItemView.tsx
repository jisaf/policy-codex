import { useSignal } from "@preact/signals";
import type { Engine } from "../engine/engine";
import { referencesInCases, renameInCasesText } from "../engine/rename";
import type { Item } from "../engine/types";
import { fileEntries } from "../changes/types";
import { buildHash } from "./router";
import {
  changeSetSig, engineSig, modeSig, openEditor, putChangeEntry, putFileChange, route,
  sourceTitles, trayOpenSig, viewEngine, volumeSig,
} from "./state";
import { itemValidation } from "./validation";

interface RenameNote { msg: string; blocking: boolean }

/** The live checks shown under the rename form's input: the governance
 *  findings for a copy of `item` under the candidate identifier, plus a
 *  uniqueness check governance() does not itself make (it checks one item,
 *  never against the rest of the ledger). Empty candidates and the item's own
 *  current identifier show no notes. */
function renameNotes(engine: Engine, item: Item, candidate: string): RenameNote[] {
  if (!candidate || candidate === item.identifier) return [];
  const notes: RenameNote[] = engine.governance({ ...item, identifier: candidate }, { isNew: false })
    .map((f) => ({ msg: f.msg, blocking: f.level === "error" }));
  const existing = engine.item(candidate);
  if (existing) {
    notes.push({
      msg: `"${candidate}" is already the identifier of ${existing.id} (${existing.name})`,
      blocking: true,
    });
  }
  return notes;
}

export function TestTable({ engine, item }: { engine: Engine; item: Item }) {
  const tests = item.tests ?? [];
  if (!tests.length) return <p class="muted">No examples yet.</p>;
  return (
    <table class="tests grid">
      <thead>
        <tr><th>ID</th><th>Given</th><th>Expected</th><th>Result</th></tr>
      </thead>
      <tbody>
        {tests.map((t) => {
          const r = engine.runTest(item, t);
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
              <td class={r.ok ? "ok" : "bad"}>
                {r.err ? r.err : r.ok ? "pass" : `got ${engine.fmt(r.got)}`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function ItemView() {
  const tab = useSignal<"b" | "a">("b");
  const renameOpen = useSignal(false);
  const renameValue = useSignal("");
  const engine = viewEngine() ?? engineSig.value;
  const vol = volumeSig.value;
  const r = route.value;
  if (!engine || !vol) return <p class="status">No ledger loaded.</p>;
  const item = r.arg ? engine.itemById(r.arg) : undefined;
  if (!item) return <p class="status bad">No item {r.arg} in this volume.</p>;

  const validation = itemValidation(engine, item.id);
  const uses = engine.usesOfItem(item.identifier);
  const usedBy = engine.usedBy(item.identifier);
  const questions = vol.openQuestions.filter((q) => (item.open ?? []).includes(q.id));
  const sources = vol.sources.filter((s) => (item.sources ?? []).includes(s.id));
  const link = (id: string) => buildHash({ ...r, view: "item", arg: id, params: {} });
  const nameOf = (identifier: string) => engine.item(identifier)?.name ?? identifier;
  const idOf = (identifier: string) => engine.item(identifier)?.id ?? identifier;

  let english = "";
  if (item.kind === "derived" && item.derived) {
    try { english = engine.block(item.derived).join("\n"); }
    catch (e) { english = `(invalid: ${(e as Error).message})`; }
  }

  return (
    <section class="view card">
      <div class="cardhead">
        <h1>{item.name}</h1>
        <span class="tag">{item.id}</span>
        <span class="tag">{item.kind}</span>
        <span class="tag">{item.type}</span>
        <span class="tag">{item.scope}</span>
        <span class={`tag prog-${item.program.toLowerCase()}`}>{item.program}</span>
        {item.role && <span class="tag">{item.role}</span>}
        <span class="spacer" />
        <div class="tabs">
          <button
            data-tab="b" class={tab.value === "b" ? "on" : ""}
            onClick={() => { tab.value = "b"; }}
          >B+ codex</button>
          <button
            data-tab="a" class={tab.value === "a" ? "on" : ""}
            onClick={() => { tab.value = "a"; }}
          >Approach A</button>
        </div>
        {modeSig.value === "edit" && (
          <>
            <button class="btn" onClick={() => openEditor(item.id)}>Edit</button>
            <button
              class="btn rename"
              onClick={() => { renameValue.value = item.identifier; renameOpen.value = true; }}
            >Rename</button>
          </>
        )}
      </div>

      {renameOpen.value && (() => {
        const candidate = renameValue.value.trim();
        const notes = renameNotes(engine, item, candidate);
        const ready = candidate !== "" && candidate !== item.identifier &&
          !notes.some((n) => n.blocking);
        return (
          <div class="rename-form card">
            <label>New identifier
              <input
                class="mono rename-input"
                value={renameValue.value}
                onInput={(e) => { renameValue.value = (e.target as HTMLInputElement).value; }}
              />
            </label>
            {notes.length > 0 && (
              <ul class="problems">
                {notes.map((n) => (
                  <li key={n.msg} class={n.blocking ? "bad" : "warn"}>{n.msg}</li>
                ))}
              </ul>
            )}
            <button
              class="btn confirm-rename"
              disabled={!ready}
              onClick={() => {
                const result = engine.rename(item.identifier, candidate);
                if (result.errors.length) return;
                const base = engineSig.value ?? engine;
                for (const changedItem of result.changed) {
                  putChangeEntry({
                    id: changedItem.id,
                    chapter: vol.chapterOf[changedItem.id] ?? "supplied",
                    before: base.itemById(changedItem.id) ?? null,
                    after: changedItem,
                  });
                }
                // A rename that reaches household cases rewrites
                // tests/cases.yaml too, textually (so its comments survive),
                // staged on top of whatever the tray already holds for it.
                const cases = vol.cases ?? [];
                if (referencesInCases(cases, item.identifier).length > 0) {
                  const path = `${vol.path}/tests/cases.yaml`;
                  const staging = fileEntries(changeSetSig.value).find((f) => f.path === path);
                  const before = staging?.after ?? vol.casesText;
                  if (before != null) {
                    putFileChange({
                      path,
                      before: vol.casesText,
                      after: renameInCasesText(before, cases, item.identifier, candidate),
                      label: `${path}: rename ${item.identifier} to ${candidate}`,
                    });
                  }
                }
                trayOpenSig.value = true;
                renameOpen.value = false;
                renameValue.value = "";
              }}
            >Confirm rename</button>
            <button class="btn" onClick={() => { renameOpen.value = false; }}>Cancel</button>
          </div>
        );
      })()}

      {tab.value === "a" ? (
        <>
          <p class="muted">{engine.projectionA(item.identifier, sourceTitles()).ledger}</p>
          <pre class="projection">
            {engine.projectionA(item.identifier, sourceTitles()).text}
          </pre>
        </>
      ) : (
        <>
          <p class="meaning">{item.meaning}</p>
          {item.precision && <p class="muted"><b>Precision.</b> {item.precision}</p>}
          {item.assumption && <p class="muted"><b>Assumption.</b> {item.assumption}</p>}
          {item.kind === "supplied" && (
            <p><b>Supplied by.</b> {item.supplied_by}</p>
          )}
          {item.kind === "parameter" && (
            <p><b>Value.</b> {engine.lit(engine.paramValue(item))}</p>
          )}
          {item.kind === "derived" && (
            <>
              <h3>Derivation</h3>
              <pre class="derivation">{english}</pre>
              <p class="muted">
                Implemented in {item.implemented === "assembly"
                  ? "fact assembly" : "the determination engine"}.
              </p>
            </>
          )}

          {questions.length > 0 && (
            <div class="questions">
              <h3>Open questions</h3>
              {questions.map((q) => (
                <details key={q.id}>
                  <summary>{q.id} {q.title}</summary>
                  <p>{q.body}</p>
                </details>
              ))}
            </div>
          )}

          <h3>Sources</h3>
          {sources.length === 0 && <p class="muted">No source cited.</p>}
          {sources.map((s) => (
            <details key={s.id} class="source">
              <summary>{s.id}. {s.title}</summary>
              <p class="citation">{s.citation}</p>
              <pre class="statute">{s.text}</pre>
              <a href={buildHash({ ...r, view: "source", arg: s.id, params: {} })}>
                Open in Sources
              </a>
            </details>
          ))}

          <h3>Examples</h3>
          <TestTable engine={engine} item={item} />

          <h3>Dependencies</h3>
          <p class="uses">
            <b>Uses:</b>{" "}
            {uses.length
              ? uses.map((u, i) => (
                  <span key={u}>
                    {i > 0 && ", "}
                    <a href={link(idOf(u))}>{nameOf(u)}</a>
                  </span>
                ))
              : "nothing"}
          </p>
          <p class="used-by">
            <b>Used by:</b>{" "}
            {usedBy.length
              ? usedBy.map((u, i) => (
                  <span key={u}>
                    {i > 0 && ", "}
                    <a href={link(idOf(u))}>{nameOf(u)}</a>
                  </span>
                ))
              : "nothing"}
          </p>
          <p>
            <a
              href={buildHash({
                ...r, view: "graph", arg: null, params: { focus: item.identifier },
              })}
            >View in the graph</a>
          </p>

          {validation.messages.length > 0 && (
            <div class="problems">
              <h3>Problems</h3>
              <ul>
                {validation.messages.map((m) => <li key={m} class="bad">{m}</li>)}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
