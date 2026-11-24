import {
  changeSetSig, clearTray, draftsShown, draftsShownSig, editingSig, trayOpenSig,
} from "./state";

/** A banner across every view while this browser holds staged drafts: how
 *  many, whether the pages show them or the rules in force, and a way to
 *  switch, open the tray, or discard them (CDHS cash lead, F3). */
export function DraftBanner() {
  const cs = changeSetSig.value;
  const n = cs.entries.length + (cs.files?.length ?? 0);
  if (n === 0) return null;
  const shown = draftsShown();
  const what = `${n} draft change${n === 1 ? "" : "s"}`;
  return (
    <div class={`draftbanner${shown ? " shown" : ""}`} role="status">
      {shown
        ? <span><b>Draft view.</b> These pages include {what} staged in this browser. They are not the rules in force.</span>
        : <span>This browser holds {what} that are not shown. The pages show the rules in force.</span>}
      <button
        class="linkish drafts-toggle"
        onClick={() => { draftsShownSig.value = !shown; }}
      >{shown ? "Show the rules in force" : "Show my drafts"}</button>
      <button
        class="linkish"
        onClick={() => { editingSig.value = null; trayOpenSig.value = true; }}
      >Open the tray</button>
      <button
        class="linkish drafts-discard"
        onClick={() => {
          if (typeof confirm !== "function" || confirm(`Discard ${what}?`)) clearTray();
        }}
      >Discard drafts</button>
    </div>
  );
}
