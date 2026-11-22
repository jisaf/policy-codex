import { mapHref } from "./map/MapView";
import { useSignal } from "@preact/signals";
import type { Engine } from "../engine/engine";
import { referencesInCases, renameInCasesText } from "../engine/rename";
import type { Item, TestSpec } from "../engine/types";
import { fileEntries } from "../changes/types";
import { DecisionRecord } from "./DecisionRecord";
import { Term } from "./labels";
import { Ident, Rich } from "./Rich";
import { buildHash } from "./router";
import {
  changeSetSig, engineSig, modeSig, openEditor, putChangeEntry, putFileChange, route,
  sourceTitles, trayOpenSig, viewEngine, volumeSig,
} from "./state";
import { itemValidation } from "./validation";
import { approvalStatus } from "./approvals";
import { FplFigures, noVersionReason, PlainRule, Value } from "./Present";
import { formatDate, formatValue } from "./present";
import { unverifiedIds } from "./provenance";
import { unverifiedUpstream } from "./counts";
import { todayIso } from "./views/context";
import { paramInForce } from "../engine/versions";

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
              <td class="mono"><Rich engine={engine} text={given} mode="example" as="span" /></td>
              <td><Rich engine={engine} text={expected} mode="example" as="span" /></td>
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

/** The dated values of a parameter, oldest first: the range each value is in
 *  force for, and the excerpt that states it when the version cites one of
 *  its own. An open `to` is the value still in force. */
function VersionTable({ engine, item }: { engine: Engine; item: Item }) {
  return (
    <table class="versions grid">
      <thead>
        <tr><th>From</th><th>To</th><th>Value</th><th>Source</th></tr>
      </thead>
      <tbody>
        {(item.versions ?? []).map((v) => (
          <tr key={v.from}>
            <td>{v.from}</td>
            <td>{v.to ?? "present"}</td>
            <td class="value"><Value item={item} value={v.value} /></td>
            <td>{v.source ? <Rich engine={engine} text={v.source} mode="inline" as="span" /> : ""}</td>
          </tr>
        ))}
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
  return (
    <Rich
      engine={engine} text={[head, ...lines.slice(1)].join("\n")} mode="expr"
      class="derivation lead-sentence"
    />
  );
}

/** One worked example from the item's first test, "Given …, the answer is
 *  …", built the same way the test table reads a spec back to English. */
function workedExample(
  engine: Engine, t: TestSpec | undefined,
): { given: string; expected: string; expectedIsProse: boolean } | null {
  if (!t) return null;
  const given = engine.formatTest(t)
    .replace(/^[^:]+: given /, "").replace(/ => .*$/, "");
  return "expect_length" in t
    ? { given, expected: `${t.expect_length} months`, expectedIsProse: true }
    : { given, expected: engine.fmt(t.expect === "unknown" ? null : t.expect), expectedIsProse: false };
}

/** Where the item stands in approval: status, the roles that must sign
 *  (the volume's approval policy, upstream_of_outcomes included), and who
 *  has signed. */
function StatusLine({ engine, item }: { engine: Engine; item: Item }) {
  const a = approvalStatus(engine, item);
  return (
    <p class="status-line">
      <span class={`tag status-${a.status.toLowerCase()}`}>{a.status}</span>{" "}
      {a.required.length === 0
        ? <span class="muted">No sign-off required by the approval policy.</span>
        : (
          <span>
            Needs sign-off from {a.required.join(", ")}{" "}
            <span class="muted">({a.required.length - a.missing.length} of {a.required.length} signed)</span>
          </span>
        )}
      {a.signed.length > 0 && (
        <span class="signed">
          {" "}Signed: {a.signed.map((s) => `${s.role}${s.by ? ` (${s.by})` : ""}, ${s.date}`).join("; ")}
        </span>
      )}
    </p>
  );
}

/** A flag when this item, or anything it rests on, cites an excerpt that is
 *  not a verified quotation. */
function UnverifiedNote({ engine, item }: { engine: Engine; item: Item }) {
  const vol = volumeSig.value;
  const uses = vol ? unverifiedUpstream(engine, item.identifier, unverifiedIds(vol.sources)) : [];
  if (!uses.length) return null;
  const own = uses.find((u) => u.item.id === item.id);
  const others = uses.filter((u) => u.item.id !== item.id);
  return (
    <p class="unverified-note">
      <span class="flag unverified">Unverified source</span>{" "}
      {own && <>This item cites {own.sources.join(", ")}, which is not a verified quotation. </>}
      {others.length > 0 && (
        <>
          It rests on {others.length} item{others.length === 1 ? "" : "s"} that cite
          {others.length === 1 ? "s" : ""} one:{" "}
          {others.slice(0, 6).map((u, i) => (
            <span key={u.item.id}>
              {i > 0 && ", "}
              <Ident id={u.item.identifier} label={u.item.name} engine={engine} /> ({u.sources.join(", ")})
            </span>
          ))}
          {others.length > 6 && `, and ${others.length - 6} more`}.
        </>
      )}
    </p>
  );
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
  const nameOf = (identifier: string) => engine.item(identifier)?.name ?? identifier;
  const idOf = (identifier: string) => engine.item(identifier)?.id ?? identifier;
  const example = workedExample(engine, (item.tests ?? [])[0]);
  const today = todayIso();

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

      {modeSig.value === "edit" && renameOpen.value && (() => {
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
        {item.kind === "supplied" && (
          <p class="lead-sentence">A fact we are told: {item.meaning}</p>
        )}
        {item.kind !== "supplied" && item.meaning && (
          <p class="lead-meaning">{item.meaning}</p>
        )}
        <StatusLine engine={engine} item={item} />
        {item.statute_override && (
          <p class="override-note">
            <span class="flag override">Statute over rule</span> {item.statute_override}
          </p>
        )}
        <UnverifiedNote engine={engine} item={item} />
        {item.kind === "derived" && (
          <>
            <PlainRule engine={engine} item={item} asOf={today} />
            <p class="muted ledger-words">In the ledger's own words:</p>
            <DerivedSentence engine={engine} item={item} />
          </>
        )}
        {item.kind === "parameter" && (() => {
          const value = item.versions?.length ? paramInForce(item, today) : engine.paramValue(item);
          const reason = noVersionReason(item, today);
          const isTable = value !== null && typeof value === "object";
          return (
            <div class="lead-sentence param-value">
              <p>
                A number set by policy{item.versions?.length ? `, in force on ${formatDate(today)}` : ""}:{" "}
                {isTable ? null : <b>{formatValue(item, value)}</b>}{" "}
                <span class="muted">
                  ({sources.length ? sources.map((s) => s.id).join(", ") : "no source cited"})
                </span>
              </p>
              {isTable && <Value item={item} value={value} />}
              {reason && <p class="warn no-version">{reason}</p>}
              <FplFigures engine={engine} item={item} value={value} asOf={today} />
            </div>
          );
        })()}
        {example && (
          <p class="worked-example">
            <b>Example.</b> Given{" "}
            <Rich engine={engine} text={example.given} mode="example" as="span" />, the answer is{" "}
            {example.expectedIsProse
              ? example.expected
              : <Rich engine={engine} text={example.expected} mode="example" as="span" />}.
          </p>
        )}
      </div>

      <details class="section">
        <summary>Details</summary>
        <p><b>Type.</b> {item.type}</p>
        {item.options && item.options.length > 0 && (
          <div class="options">
            <b>Possible results.</b>
            <ul>
              {item.options.map((o) => (
                <li key={o}>{formatValue(item, o)} <code class="alias">{o}</code></li>
              ))}
            </ul>
          </div>
        )}
        <p><b>Scope.</b> <Term scope={item.scope} /></p>
        <p><b>Program.</b> <span class={`tag prog-${item.program.toLowerCase()}`}>{item.program}</span></p>
        {item.tags && item.tags.length > 0 && <p><b>Tags.</b> {item.tags.join(", ")}</p>}
        {item.effective && (
          <p><b>Effective.</b> {item.effective.from} to {item.effective.to}</p>
        )}
        {item.precision && <p><b>Precision.</b> {item.precision}</p>}
        {item.assumption && <p><b>Assumption.</b> {item.assumption}</p>}
        {item.versions && item.versions.length > 0 && (
          <>
            <p><b>Versions.</b></p>
            <VersionTable engine={engine} item={item} />
          </>
        )}
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
                  <Ident id={u} label={nameOf(u)} engine={engine} />{" "}
                  <small class="mono">{idOf(u)}</small>
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
                  <Ident id={u} label={nameOf(u)} engine={engine} />{" "}
                  <small class="mono">{idOf(u)}</small>
                </span>
              ))
            : "nothing"}
        </p>
        <p>
          <a href={mapHref(r, item.id)}>Open in the Map</a>
        </p>
      </details>

      <details class="section">
        <summary>For implementers: Approach A projection</summary>
        <p class="muted">{engine.projectionA(item.identifier, sourceTitles()).ledger}</p>
        <pre class="projection">
          {engine.projectionA(item.identifier, sourceTitles()).text}
        </pre>
      </details>

      <details class="section" open={r.params.section === "record"}>
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
