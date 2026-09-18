import { useMemo, useState } from "preact/hooks";
import type { Engine } from "../engine/engine";
import type { Expr, Item } from "../engine/types";
import { RELS } from "../engine/types";
import {
  LABEL, NARY, optionsFor, nodeAt, RESULT, setAt, SLOTNAME, SLOTS, spliceAt, template,
  type SlotCtx,
} from "./patterns";

interface Props { engine: Engine; draft: Item; onChange: (next: Item) => void }

interface FormProps extends Props {
  /** A new item answers to the governance rules that only adds carry: it needs
   *  a rationale and it acknowledges the items it may duplicate. */
  isNew?: boolean;
  /** Leave the editor for an existing item instead of adding this one. */
  onOpenInstead?: (id: string) => void;
}

function Slot({
  engine, draft, onChange, path, want, ctx, label,
}: Props & { path: number[]; want: string; ctx: SlotCtx; label: string }) {
  const realWant = want === "same" ? ctx.ctxType : want;
  const node = path.length ? nodeAt(draft.derived ?? null, path) : (draft.derived ?? null);
  const setNode = (v: unknown) =>
    onChange({ ...draft, derived: setAt(draft.derived ?? null, path, v) });
  const splice = (start: number, del: number, ...ins: unknown[]) =>
    onChange({ ...draft, derived: spliceAt(draft.derived ?? null, path, start, del, ...ins) });

  const labelText =
    label + (realWant && realWant !== "*" ? ` (${realWant === "ord" ? "number, date, or month" : realWant})` : "");

  if (node === null || node === undefined) {
    const o = optionsFor(engine, realWant, ctx, draft.identifier);
    return (
      <div class="slot">
        <span class="lbl">{labelText}</span>
        <select
          value=""
          onChange={(e) => {
            const [kind, val] = (e.target as HTMLSelectElement).value.split(":");
            if (kind === "fact") setNode(val);
            else if (kind === "const") setNode([val]);
            else if (kind === "pat") setNode(template(val));
            else if (kind === "lit") {
              setNode(val === "yes/no" ? false : val === "number" ? 0 : "");
            }
          }}
        >
          <option value="">choose…</option>
          {o.facts.length > 0 && (
            <optgroup label="Facts">
              {o.facts.map((f) => (
                <option key={f.identifier} value={`fact:${f.identifier}`}>
                  {f.name}
                  {f.kind === "parameter" ? ` (${engine.lit(engine.paramValue(f))})` : ""}
                  {f.scope === "person-month" ? " · per month" : ""}
                </option>
              ))}
            </optgroup>
          )}
          {o.consts.length > 0 && (
            <optgroup label="Constants">
              {o.consts.map(([k, l]) => <option key={k} value={`const:${k}`}>{l}</option>)}
            </optgroup>
          )}
          {o.pats.length > 0 && (
            <optgroup label="Patterns">
              {o.pats.map((p) => <option key={p} value={`pat:${p}`}>{LABEL[p]}</option>)}
            </optgroup>
          )}
          {o.lits.length > 0 && (
            <optgroup label="Literal">
              {o.lits.map((l) => <option key={l} value={`lit:${l}`}>type a {l}</option>)}
            </optgroup>
          )}
        </select>
      </div>
    );
  }

  if (typeof node === "string" && engine.item(node)) {
    const it = engine.item(node)!;
    return (
      <div class="slot">
        <span class="lbl">{labelText}</span>
        <span class="node leaf">
          <span class="tag">fact</span> {it.name}
          {it.scope === "person-month" && <small class="warn"> per month</small>}
          <button class="rm" onClick={() => setNode(null)}>✕</button>
        </span>
      </div>
    );
  }

  if (!Array.isArray(node)) {
    return (
      <div class="slot">
        <span class="lbl">{labelText}</span>
        <span class="node leaf">
          <span class="tag">literal</span>
          <input
            value={engine.lit(node)}
            onChange={(e) => {
              const raw = (e.target as HTMLInputElement).value.trim();
              setNode(
                /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw)
                  : raw === "yes" ? true : raw === "no" ? false : raw,
              );
            }}
          />
          <button class="rm" onClick={() => setNode(null)}>✕</button>
        </span>
      </div>
    );
  }

  const op = node[0] as string;
  if (["det_date", "det_month", "month", "P"].includes(op)) {
    return (
      <div class="slot">
        <span class="lbl">{labelText}</span>
        <span class="node leaf">
          <span class="tag">constant</span> {engine.inline(node as Expr)}
          <button class="rm" onClick={() => setNode(null)}>✕</button>
        </span>
      </div>
    );
  }

  const sub: SlotCtx = {
    ...ctx, root: false,
    ctxType: RESULTOF(op) === "*" ? ctx.ctxType : RESULTOF(op),
  };
  const child = (i: number, w: string, c: SlotCtx, l: string) => (
    <Slot
      key={i} engine={engine} draft={draft} onChange={onChange}
      path={[...path, i]} want={w} ctx={c} label={l}
    />
  );

  return (
    <div class="slot">
      <span class="lbl">{labelText}</span>
      <div class="node">
        <div class="head">
          <b>{LABEL[op] ?? op}</b>
          <button class="rm" onClick={() => setNode(null)}>✕</button>
        </div>
        {NARY.has(op) && (
          <>
            {node.slice(1).map((_: unknown, k: number) => (
              <div class="row" key={k}>
                {child(k + 1, SLOTS[op][0], sub, `${(SLOTNAME[op] ?? ["item"])[0]} ${k + 1}`)}
                {node.length > 3 && (
                  <button class="btn small" onClick={() => splice(k + 1, 1)}>remove</button>
                )}
              </div>
            ))}
            <button class="btn small" onClick={() => splice(node.length, 0, null)}>+ add</button>
          </>
        )}
        {op === "case" && (
          <>
            {node.slice(1).map((arm: any, k: number) =>
              arm[0] === "else" ? (
                <div class="slot" key={k}>
                  <span class="lbl">otherwise</span>
                  {child(k + 1, "same", { ...sub, ctxType: ctx.ctxType }, "value")}
                </div>
              ) : (
                <div class="slot" key={k}>
                  <span class="lbl">{k === 0 ? "if" : "else if"}</span>
                  <Slot
                    engine={engine} draft={draft} onChange={onChange}
                    path={[...path, k + 1, 0]} want="yes/no" ctx={sub} label="condition"
                  />
                  <Slot
                    engine={engine} draft={draft} onChange={onChange}
                    path={[...path, k + 1, 1]} want="same"
                    ctx={{ ...sub, ctxType: ctx.ctxType }} label="then"
                  />
                  <button class="btn small" onClick={() => splice(k + 1, 1)}>remove arm</button>
                </div>
              ),
            )}
            <button
              class="btn small"
              onClick={() => splice(node.length - 1, 0, [null, null])}
            >+ add condition</button>
          </>
        )}
        {op === "in" && (
          <>
            {child(1, "enum", sub, "enumeration")}
            <div class="slot">
              <span class="lbl">is one of</span>
              {(() => {
                const f = typeof node[1] === "string" ? engine.item(node[1]) : null;
                if (!f?.options) return <span>choose an enumeration fact first</span>;
                return f.options.map((o) => (
                  <label key={o} class="inline">
                    <input
                      type="checkbox"
                      checked={(node[2] as string[]).includes(o)}
                      onChange={() =>
                        onChange({
                          ...draft,
                          derived: setAt(
                            draft.derived ?? null, [...path, 2],
                            f.options!.filter((x) =>
                              x === o ? !(node[2] as string[]).includes(o)
                                : (node[2] as string[]).includes(x)),
                          ),
                        })
                      }
                    /> {o}
                  </label>
                ));
              })()}
            </div>
          </>
        )}
        {(op === "exists_related" || op === "rel") && (
          <>
            <div class="slot">
              <span class="lbl">relationships</span>
              {RELS.map((rel) => (
                <label key={rel} class="inline">
                  <input
                    type="checkbox"
                    checked={(node[1] as string[]).includes(rel)}
                    onChange={() =>
                      onChange({
                        ...draft,
                        derived: setAt(
                          draft.derived ?? null, [...path, 1],
                          RELS.filter((x) =>
                            x === rel ? !(node[1] as string[]).includes(rel)
                              : (node[1] as string[]).includes(x)),
                        ),
                      })
                    }
                  /> {rel}
                </label>
              ))}
            </div>
            {op === "exists_related"
              ? child(2, "yes/no", { ...sub, personOk: true }, "such that")
              : child(2, "person", sub, "of")}
          </>
        )}
        {op === "exists" && (
          <>
            {child(1, "group", sub, "group")}
            {child(2, "yes/no", { ...sub, personOk: true }, "such that")}
          </>
        )}
        {op === "filter" && (
          <>
            {child(1, "group", sub, "group")}
            {child(2, "yes/no", { ...sub, personOk: true }, "such that")}
          </>
        )}
        {op === "sum" && (
          <>
            {child(1, "group", sub, "group")}
            {child(2, "number", { ...sub, personOk: true }, "value")}
          </>
        )}
        {op === "reachable" && (
          <div class="slot">
            <span class="lbl">relationships</span>
            {RELS.map((rel) => (
              <label key={rel} class="inline">
                <input
                  type="checkbox"
                  checked={(node[1] as string[]).includes(rel)}
                  onChange={() =>
                    onChange({
                      ...draft,
                      derived: setAt(
                        draft.derived ?? null, [...path, 1],
                        RELS.filter((x) =>
                          x === rel ? !(node[1] as string[]).includes(rel)
                            : (node[1] as string[]).includes(x)),
                      ),
                    })
                  }
                /> {rel}
              </label>
            ))}
          </div>
        )}
        {op === "at" && (
          <>
            {child(1, "pm-fact", { ...sub, monthOk: true }, "per-month fact")}
            {child(2, "month", sub, "for month")}
          </>
        )}
        {(op === "each" || op === "some_month" || op === "count_months") && (
          <>
            {child(1, "months", sub, "months")}
            {child(2, "yes/no", { ...sub, monthOk: true }, "condition")}
          </>
        )}
        {op === "avg" && (
          <>
            {child(1, "pm-number", { ...sub, monthOk: true }, "fact")}
            {child(2, "months", sub, "months")}
          </>
        )}
        {op === "of" && (
          <>
            {child(1, "person", sub, "person")}
            {child(2, "fact", sub, "fact")}
          </>
        )}
        {!NARY.has(op) &&
          !["case", "in", "exists", "exists_related", "rel", "at", "each", "some_month",
            "count_months", "avg", "of", "filter", "sum", "reachable"].includes(op) &&
          (SLOTS[op] ?? []).map((st, k) =>
            child(k + 1, st, sub, (SLOTNAME[op] ?? [])[k] ?? `slot ${k + 1}`))}
      </div>
    </div>
  );
}

function RESULTOF(op: string): string {
  return RESULT[op] ?? "*";
}

export function FormEditor({ engine, draft, onChange, isNew, onOpenInstead }: FormProps) {
  const set = (patch: Partial<Item>) => onChange({ ...draft, ...patch });
  const monthOk = draft.scope === "person-month" || draft.scope === "month";
  // The candidate search walks the whole ledger, so it is recomputed only when
  // one of the fields it reads changes, not on every keystroke elsewhere.
  const near = useMemo(
    () => (isNew ? engine.nearest(draft) : []),
    [
      isNew, engine, draft.name, draft.identifier, draft.meaning,
      JSON.stringify(draft.derived ?? null),
    ],
  );
  const acknowledged = new Set(draft.nearest ?? []);

  // A new item is guided to the fields its chosen kind needs; an existing
  // item opens with everything reachable, since it may carry fields outside
  // its kind's usual set. Either way the toggle can override the default.
  const [allFields, setAllFields] = useState(!isNew);
  const showScope = allFields || draft.kind !== "parameter";
  const showSuppliedBy = allFields || draft.kind === "supplied";
  const showValue = allFields || draft.kind === "parameter";
  const showDerivation = allFields || draft.kind === "derived";

  return (
    <div class="form">
      <label>Fact name
        <input
          name="name" value={draft.name}
          onInput={(e) => {
            const name = (e.target as HTMLInputElement).value;
            set(draft.identifier === engine.slug(draft.name)
              ? { name, identifier: engine.slug(name) }
              : { name });
          }}
        />
      </label>
      <label>Identifier
        <input
          name="identifier" value={draft.identifier}
          onInput={(e) => set({ identifier: (e.target as HTMLInputElement).value.trim() })}
        />
      </label>
      <label>Kind
        <select
          name="kind" value={draft.kind}
          onChange={(e) => set({ kind: (e.target as HTMLSelectElement).value as Item["kind"] })}
        >
          <option value="supplied">supplied</option>
          <option value="derived">derived</option>
          <option value="parameter">parameter</option>
        </select>
      </label>
      <label class="wide allfields">
        <input
          type="checkbox" class="allfieldstoggle" checked={allFields}
          onChange={(e) => setAllFields((e.target as HTMLInputElement).checked)}
        /> All fields
      </label>
      <label class="wide">Meaning
        <textarea
          name="meaning" rows={2} value={draft.meaning ?? ""}
          onInput={(e) => set({ meaning: (e.target as HTMLTextAreaElement).value })}
        />
      </label>
      <label>Type
        <select
          name="type" value={draft.type}
          onChange={(e) => set({ type: (e.target as HTMLSelectElement).value })}
        >
          {engine.meta.types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      {draft.type === "one of" && (
        <label>Options (comma separated)
          <input
            name="options" value={(draft.options ?? []).join(", ")}
            onInput={(e) => set({
              options: (e.target as HTMLInputElement).value
                .split(",").map((x) => x.trim()).filter(Boolean),
            })}
          />
        </label>
      )}
      {showScope && (
        <label>Scope
          <select
            name="scope" value={draft.scope}
            onChange={(e) => set({ scope: (e.target as HTMLSelectElement).value as Item["scope"] })}
          >
            {engine.meta.scopes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      )}
      <label>Program
        <select
          name="program" value={draft.program}
          onChange={(e) => set({ program: (e.target as HTMLSelectElement).value as Item["program"] })}
        >
          <option value="All">All</option>
          <option value="Medicaid">Medicaid</option>
          <option value="SNAP">SNAP</option>
        </select>
      </label>
      <label class="wide">Precision
        <textarea
          name="precision" rows={2} value={draft.precision ?? ""}
          onInput={(e) => set({ precision: (e.target as HTMLTextAreaElement).value || undefined })}
        />
      </label>
      {isNew && (
        <label class="wide">Rationale
          <textarea
            name="rationale" rows={3} required value={draft.rationale ?? ""}
            onInput={(e) => set({ rationale: (e.target as HTMLTextAreaElement).value })}
          />
        </label>
      )}
      {isNew && (
        <div class="wide similar">
          <h4>Similar existing items</h4>
          {near.length === 0
            ? <p class="muted">Nothing in the ledger looks like this item yet.</p>
            : (
              <ul class="candidates">
                {near.map((c) => (
                  <li key={c.id} class="candidate">
                    <span class="tag">{c.reason}</span>
                    <span class="score">{c.score.toFixed(2)}</span>
                    <strong>{engine.itemById(c.id)?.name ?? c.identifier}</strong>
                    <small>{c.identifier}</small>
                    <button
                      class="btn small open"
                      onClick={() => onOpenInstead?.(c.id)}
                    >Open instead</button>
                    <button
                      class="btn small ack"
                      disabled={acknowledged.has(c.id)}
                      onClick={() => set({ nearest: [...(draft.nearest ?? []), c.id] })}
                    >{acknowledged.has(c.id) ? "Acknowledged" : "Acknowledge"}</button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}
      {showSuppliedBy && (
        <label class="wide">Supplied by
          <input
            name="supplied_by" value={draft.supplied_by ?? ""}
            onInput={(e) => set({ supplied_by: (e.target as HTMLInputElement).value })}
          />
        </label>
      )}
      {showValue && (
        <label>Value
          <input
            name="value" value={draft.value == null ? "" : engine.lit(draft.value)}
            onInput={(e) => {
              const raw = (e.target as HTMLInputElement).value.trim();
              set({
                value: /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw)
                  : raw === "yes" ? true : raw === "no" ? false : raw || undefined,
              });
            }}
          />
        </label>
      )}
      <label>Implemented in
        <select
          name="implemented" value={draft.implemented ?? ""}
          onChange={(e) => set({
            implemented: ((e.target as HTMLSelectElement).value || null) as Item["implemented"],
          })}
        >
          <option value="">choose…</option>
          <option value="assembly">Fact assembly</option>
          <option value="engine">Determination engine</option>
        </select>
      </label>
      {showDerivation && (
        <div class="wide tree">
          <h4>Derivation</h4>
          <Slot
            engine={engine} draft={draft} onChange={onChange}
            path={[]} want={engine.baseType(draft)}
            ctx={{ root: true, monthOk, personOk: false, ctxType: engine.baseType(draft) }}
            label="result"
          />
        </div>
      )}
      <div class="wide also">
        <h4>Also</h4>
        <label class="wide">Sources (comma separated ids)
          <input
            name="sources" value={(draft.sources ?? []).join(", ")}
            onInput={(e) => set({
              sources: (e.target as HTMLInputElement).value
                .split(",").map((x) => x.trim()).filter(Boolean),
            })}
          />
        </label>
        <label class="wide">Open questions (comma separated ids)
          <input
            name="open" value={(draft.open ?? []).join(", ")}
            onInput={(e) => set({
              open: (e.target as HTMLInputElement).value
                .split(",").map((x) => x.trim()).filter(Boolean),
            })}
          />
        </label>
        <label class="wide">Tags (comma separated)
          <input
            name="tags" value={(draft.tags ?? []).join(", ")}
            onInput={(e) => set({
              tags: (e.target as HTMLInputElement).value
                .split(",").map((x) => x.trim()).filter(Boolean),
            })}
          />
        </label>
      </div>
    </div>
  );
}
