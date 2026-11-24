/* External check: how county and State staff can send us cases shaped like
 * real ones, with the answers they expect, so we can compare the engine's
 * answers (the kit in external-check/, guide in docs/external-check.md). */
import { useMemo, useState } from "preact/hooks";
import { D, byIdent } from "./store";
import { href, route, setQ } from "./ui";

interface ExtSheet { file: string; title: string; columns: string[] }
interface ExtDictRow { sheet: string; column: string; identifier: string; item: string; meaning: string; type: string; allowed: string; always: string; neededFor: string; blank: string }
interface External { sheets: ExtSheet[]; dictionary: ExtDictRow[]; example: { cases: Array<{ id: string; description: string; date: string }>; report: Array<Record<string, string>> }; privacy: string[] }

const ext = (): External | undefined => (D as unknown as { external?: External }).external;

function copy(text: string, done: (ok: boolean) => void) {
  try {
    navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
  } catch { done(false); }
}

function SheetRow({ s }: { s: ExtSheet }) {
  const [msg, setMsg] = useState("");
  return (
    <li class="ext-sheet">
      <details>
        <summary><b>{s.file}</b> · {s.title} <span class="small muted">{s.columns.length} columns</span></summary>
        <p class="small ext-cols">{s.columns.join(" · ")}</p>
        <button class="btn small" onClick={() => copy(s.columns.join(","), (ok) => setMsg(ok ? "Headings copied; paste them into row 1 of a new sheet." : "Copy did not work here; select the headings above instead."))}>Copy the headings</button>
        {msg && <span class="small muted" role="status"> {msg}</span>}
      </details>
    </li>
  );
}

function Dictionary({ rows }: { rows: ExtDictRow[] }) {
  const q = route.value.q.dq ?? "";
  const sheet = route.value.q.ds ?? "";
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => (!sheet || r.sheet === sheet) && (!t || `${r.column} ${r.item} ${r.meaning} ${r.identifier}`.toLowerCase().includes(t)));
  }, [q, sheet, rows]);
  const sheets = [...new Set(rows.map((r) => r.sheet))];
  return (
    <section class="card" id="dictionary">
      <h2>Data dictionary <span class="small muted">{rows.length} columns and facts</span></h2>
      <p class="small">What each column means, what values it takes, and which codex item it fills. Generated from the volume, so it matches the rules shown elsewhere in this rulebook.</p>
      <div class="ext-tools">
        <input type="search" aria-label="Search the data dictionary" placeholder="Search: income, pregnant, county…" value={q} onInput={(e) => setQ({ dq: (e.target as HTMLInputElement).value || undefined, keep: "1" })} />
        <label class="small">Sheet <select value={sheet} onChange={(e) => setQ({ ds: (e.target as HTMLSelectElement).value || undefined, keep: "1" })}>
          <option value="">All</option>{sheets.map((s) => <option value={s}>{s}</option>)}
        </select></label>
        <span class="small muted">{shown.length} shown</span>
      </div>
      <div class="tablewrap"><table class="outs ext-dict"><thead><tr><th>Sheet</th><th>Column or fact</th><th>Meaning</th><th>Needed</th><th>Blank means</th></tr></thead><tbody>
        {shown.slice(0, 200).map((r) => {
          const it = r.identifier ? byIdent.get(r.identifier) : undefined;
          return <tr>
            <td class="small">{r.sheet}</td>
            <td><b>{r.column}</b>{it && <><br /><a class="small" href={href("item/" + it.id)}>{it.name}</a></>}{r.type && <span class="small muted"> · {r.type}</span>}{r.allowed && <div class="small muted">Values: {r.allowed.length > 160 ? r.allowed.slice(0, 159) + "…" : r.allowed}</div>}</td>
            <td class="small">{r.meaning}</td>
            <td class="small">{r.always === "always" ? <b>Always</b> : r.neededFor || r.always}</td>
            <td class="small">{r.blank}</td>
          </tr>;
        })}
      </tbody></table></div>
      {shown.length > 200 && <p class="small muted">Showing the first 200. Narrow the search to see the rest.</p>}
    </section>
  );
}

export function ExternalPage() {
  const x = ext();
  if (!x) return <p class="empty">The external check kit is not in this build.</p>;
  const rep = x.example.report;
  const differ = rep.filter((r) => r["match or differ"] === "differ");
  const match = rep.filter((r) => r["match or differ"] === "match").length;
  return (
    <div class="extpage">
      <p class="eyebrow">External check</p>
      <h1>Check our answers against yours</h1>
      <p class="lede">If you determine eligibility in a Colorado county or for the State, you can test this rulebook. Send us households shaped like real ones, with the answers you expect. We run them through the engine and send back a report: for every person, program and month, whether the engine agrees with you, and where it does not, why it answered as it did.</p>
      <div class="deskgrid">
        <section class="card">
          <h2>How to take part</h2>
          <ol class="ext-steps">
            <li>Ask the codex team for the template folder: nine spreadsheet sheets (CSV) with plain headings, plus the data dictionary below. Its headings are also listed here, and each can be copied.</li>
            <li>Fill in one or more households. You do not need to know the engine: the dictionary says what each column means.</li>
            <li>For each household, write the results you expect, and where each answer comes from: a CBMS result, a worker determination, or a policy expert.</li>
            <li>Send the folder through the channel agreed with the codex team.</li>
            <li>You get back a report, readable and as a spreadsheet, that shows match or differ for each answer and our first guess at the cause of each difference.</li>
          </ol>
        </section>
        <section class="card ext-privacy">
          <h2>Send de-identified cases only</h2>
          <ul>{x.privacy.map((p) => <li>{p}</li>)}</ul>
          <p class="small">The converter refuses a column or a cell that looks like a name, Social Security number, case or ID number, address, phone number or email, and converts nothing until it is removed. Folders received are never added to the repository.</p>
        </section>
      </div>
      <section class="card">
        <h2>The sheets <span class="small muted">{x.sheets.reduce((s, sh) => s + sh.columns.length, 0)} columns in {x.sheets.length} sheets</span></h2>
        <p class="small">Every sheet starts with a <b>case</b> column: your short label for the household, the same on every sheet. Income and resources are listed as one row per job, payment or holding.</p>
        <ul class="plain">{x.sheets.map((s) => <SheetRow s={s} />)}</ul>
      </section>
      <section class="card">
        <h2>What comes back: the worked example</h2>
        <p class="small">Four made-up households, each built from a stored household, run end to end. {rep.length} expected answers: <b>{match} match</b>, <b>{differ.length} differ</b>. The differences are deliberate, to show what a difference looks like.</p>
        <ul class="plain ext-cases">{x.example.cases.map((c) => <li><b>{c.id}</b> · {c.description} <span class="small muted">determined {c.date}</span></li>)}</ul>
        <div class="tablewrap"><table class="outs"><thead><tr><th>Case</th><th>Result</th><th>Month</th><th>Expected</th><th>Engine</th><th></th></tr></thead><tbody>
          {rep.map((r) => {
            const it = byIdent.get(r["result identifier"]);
            return <tr class={r["match or differ"] === "differ" ? "ext-differ" : ""}>
              <td class="small">{r.case} · {r.person}</td>
              <td>{it ? <a href={href("item/" + it.id)}>{r.result}</a> : r.result}</td>
              <td class="small">{r.month}</td>
              <td>{r["expected answer"]}</td>
              <td>{r["engine answer"]}</td>
              <td><span class={"pill " + (r["match or differ"] === "differ" ? "warn" : "ok")}>{r["match or differ"]}</span></td>
            </tr>;
          })}
        </tbody></table></div>
        {differ.length > 0 && <div class="ext-why">
          <h3>Why the differences</h3>
          {differ.map((r) => <p class="small"><b>{r.case} · {r.result}, {r.month}:</b> expected {r["expected answer"]}, engine {r["engine answer"]}. First guess: <b>{r["first triage hint"] || "rule gap"}</b>{r["decisive rules"] && <>. Decided by: {r["decisive rules"]}</>}{r.notes && <>. Your note: {r.notes}</>}</p>)}
          <p class="small">A first guess of a known limit points to <a href={href("law/limits")}>Law › Known limits</a>; an open question points to <a href={href("questions")}>Questions</a>.</p>
        </div>}
      </section>
      <Dictionary rows={x.dictionary} />
    </div>
  );
}
