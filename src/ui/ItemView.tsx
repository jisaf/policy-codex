import { useSignal } from "@preact/signals";
import type { Engine } from "../engine/engine";
import { referencesInCases, renameInCasesText } from "../engine/rename";
import type { Item, TestSpec } from "../engine/types";
import { fileEntries } from "../changes/types";
import { DecisionRecord } from "./DecisionRecord";
import { Term } from "./labels";
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

/** The derivation rendered as one leading claim: the block's first line
 *  folded into "<Name> is true when …" (yes/no items) or "<Name> is …"
 *  (everything else), the remaining lines kept indented beneath it exactly
 *  as `engine.block` produced them. */
function DerivedSentence({ engine, item }: { engine: Engine; item: Item }) {
  let lines: string[];
  try {
    lines = item.derived ? engine.block(item.derived) : ["(no derivation yet)"];
  } catch (e) {
    lines = [`(invalid: ${(e as Error).message})`];
  }
  const verb = engine.baseType(item) === "yes/no" ? "is true when" : "is";
  const head = item.derived ? `${item.name} ${verb} ${lines[0]}` : lines[0];
  return <pre class="derivation lead-sentence">{[head, ...lines.slice(1)].join("\n")}</pre>;
}

/** One worked example from the item's first test, "Given …, the answer is
 *  …", built the same way the test table reads a spec back to English. */
function workedExample(engine: Engine, t: TestSpec | undefined): string | null {
  if (!t) return null;
  const given = engine.formatTest(t)
    .replace(/^[^:]+: given /, "").replace(/ => .*$/, "");
  const expected = "expect_length" in t
    ? `${t.expect_length} months`
    : engine.fmt(t.expect === "unknown" ? null : t.expect);
  return `Given ${given}, the answer is ${expected}.`;
}

export function ItemView() {
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
  const sources = vol.sources.filter((s) => (item.sources ?? []).includes(s.id));
  const link = (id: string) => buildHash({ ...r, view: "item", arg: id, params: {} });
  const nameOf = (identifier: string) => engine.item(identifier)?.name ?? identifier;
  const idOf = (identifier: string) => engine.item(identifier)?.id ?? identifier;
  const example = workedExample(engine, (item.tests ?? [])[0]);

  return (
    <section class="view card">
      <div class="cardhead">
        <h1>{item.name}</h1>
        <p class="idline muted">
          <span class="mono">{item.id}</span> · <span class="mono">{item.identifier}</span>
        </p>
        <span class="tag"><Term kind={item.kind} /></span>
        <span class="tag"><Term scope={item.scope} /></span>
        <span class="spacer" />
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

      <div class="leading">
        {item.kind === "derived" && <DerivedSentence engine={engine} item={item} />}
        {item.kind === "supplied" && (
          <p class="lead-sentence">A fact we are told: {item.meaning}</p>
        )}
        {item.kind === "parameter" && (
          <p class="lead-sentence">
            A number set by policy: {engine.lit(engine.paramValue(item))}{" "}
            ({sources.length ? sources.map((s) => s.id).join(", ") : "no source cited"})
          </p>
        )}
        {example && <p class="worked-example"><b>Example.</b> {example}</p>}
      </div>

      <details class="section">
        <summary>Details</summary>
        <p><b>Type.</b> {item.type}
          {item.options && item.options.length ? `: ${item.options.join(", ")}` : ""}
        </p>
        <p><b>Scope.</b> {item.scope}</p>
        <p><b>Program.</b> <span class={`tag prog-${item.program.toLowerCase()}`}>{item.program}</span></p>
        {item.tags && item.tags.length > 0 && <p><b>Tags.</b> {item.tags.join(", ")}</p>}
        {item.precision && <p><b>Precision.</b> {item.precision}</p>}
        {item.assumption && <p><b>Assumption.</b> {item.assumption}</p>}
      </details>

      <details class="section">
        <summary>Tests</summary>
        <TestTable engine={engine} item={item} />
      </details>

      <details class="section">
        <summary>Dependencies</summary>
        <p class="uses">
          <b>Uses:</b>{" "}
          {uses.length
            ? uses.map((u, i) => (
                <span key={u}>
                  {i > 0 && ", "}
                  <a href={link(idOf(u))}>{nameOf(u)}</a> <small class="mono">{idOf(u)}</small>
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
                  <a href={link(idOf(u))}>{nameOf(u)}</a> <small class="mono">{idOf(u)}</small>
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
      </details>

      <details class="section">
        <summary>Approach A projection</summary>
        <p class="muted">{engine.projectionA(item.identifier, sourceTitles()).ledger}</p>
        <pre class="projection">
          {engine.projectionA(item.identifier, sourceTitles()).text}
        </pre>
      </details>

      <details class="section">
        <summary>Decision record</summary>
        <DecisionRecord item={item} vol={vol} route={r} />
      </details>

      {validation.messages.length > 0 && (
        <div class="problems">
          <h3>Problems</h3>
          <ul>
            {validation.messages.map((m) => <li key={m} class="bad">{m}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
