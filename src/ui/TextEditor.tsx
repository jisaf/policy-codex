import { useSignal } from "@preact/signals";
import type { Engine } from "../engine/engine";
import type { Item } from "../engine/types";

interface Props { engine: Engine; draft: Item; onChange: (next: Item) => void }

export function TextEditor({ engine, draft, onChange }: Props) {
  const text = useSignal(engine.itemBlock(draft));
  const errors = useSignal<Array<{ line: number; msg: string }>>([]);

  const reparse = (next: string) => {
    text.value = next;
    const r = engine.parseItemBlock(next);
    errors.value = r.errors;
    if (r.errors.length) return;
    // The block renders a versioned parameter as one flat "Value" line. Reading
    // that back as `value` would shadow `versions` (value outranks versions in
    // paramValue), so a versioned draft keeps its history and ignores the line.
    const parsed: Partial<Item> = { ...r.item };
    if (draft.versions?.length) delete parsed.value;
    onChange({ ...draft, ...parsed });
  };

  let english = "";
  if (draft.kind === "derived" && draft.derived) {
    try { english = engine.block(draft.derived).join("\n"); }
    catch (e) { english = `(invalid: ${(e as Error).message})`; }
  }

  return (
    <div class="textsurface">
      <textarea
        class="block" rows={22} spellcheck={false} value={text.value}
        onInput={(e) => reparse((e.target as HTMLTextAreaElement).value)}
      />
      <aside>
        <h4>Diagnostics</h4>
        <ul class="diagnostics">
          {errors.value.length === 0
            ? <li class="ok">Parses cleanly.</li>
            : errors.value.map((e) => (
                <li key={`${e.line}:${e.msg}`} class="bad">line {e.line}: {e.msg}</li>
              ))}
        </ul>
        {english && (
          <>
            <h4>Derivation</h4>
            <pre class="derivation">{english}</pre>
            <p class="muted">Uses: {engine.uses(draft.derived ?? null).join(", ") || "nothing"}</p>
          </>
        )}
      </aside>
    </div>
  );
}
