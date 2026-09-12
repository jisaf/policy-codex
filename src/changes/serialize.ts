import type { Engine } from "../engine/engine";
import { stringifyItem } from "../engine/yaml";
import { changedIdentifiers } from "./apply";
import { entryKind, isUnchanged, type ChangeEntry, type ChangeSet } from "./types";
import type { ChangeSetReport } from "./validate";

export interface FileWrite {
  id: string;
  path: string;
  /** The new file body, or null for a deletion. */
  content: string | null;
}

/** One write per changed item. An entry whose after equals its before is
 *  skipped, so a file with no changes is never rewritten. */
export function entryFiles(cs: ChangeSet, volumePath: string): FileWrite[] {
  const out: FileWrite[] = [];
  for (const e of cs.entries) {
    if (isUnchanged(e)) continue;
    out.push({
      id: e.id,
      path: `${volumePath}/${e.chapter}/${e.id}.yaml`,
      content: e.after ? stringifyItem(e.after) : null,
    });
  }
  return out;
}

export function shortId(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function branchName(cs: ChangeSet, id: string = shortId()): string {
  return `codex/${cs.volume}/${id}`;
}

export function proposalTitle(cs: ChangeSet): string {
  const n = cs.entries.filter((e) => !isUnchanged(e)).length;
  return `Codex: ${n} item${n === 1 ? "" : "s"} in ${cs.volume}`;
}

/** The entries that add an item. Governance asks a new item for a rationale
 *  and for the nearest existing items it does not serve, so the reviewer reads
 *  both in the pull request rather than opening the app. */
function additions(cs: ChangeSet): ChangeEntry[] {
  return cs.entries.filter((e) => !isUnchanged(e) && !e.before && e.after);
}

/** Every outcome the volume declares, in the order the programs declare them. */
function declaredOutcomes(base: Engine): string[] {
  const out: string[] = [];
  for (const p of base.meta.programs ?? []) {
    for (const o of p.outcomes ?? []) if (!out.includes(o)) out.push(o);
  }
  return out;
}

export function proposalBody(
  base: Engine, cs: ChangeSet, report: ChangeSetReport,
): string {
  const lines: string[] = [];
  lines.push(`Change set for volume \`${cs.volume}\`, based on \`${cs.baseRef}\`.`);
  lines.push("");
  lines.push("## Items changed");
  for (const e of cs.entries) {
    if (isUnchanged(e)) continue;
    const item = e.after ?? e.before!;
    lines.push(`- \`${e.id}\` ${item.name} — ${entryKind(e)}`);
  }

  const added = additions(cs);
  if (added.length) {
    lines.push("");
    lines.push("### Rationale");
    for (const e of added) {
      const item = e.after!;
      const why = (item.rationale ?? "").trim();
      lines.push(`- \`${e.id}\` ${item.name}: ${why || "_no rationale given_"}`);
    }
    // The candidates are recomputed against the base ledger: a new item is not
    // in it, so every existing item is a fair comparison.
    const withNearest = added
      .map((e) => ({ entry: e, near: base.nearest(e.after!) }))
      .filter((x) => x.near.length > 0);
    if (withNearest.length) {
      lines.push("");
      lines.push("### Nearest existing items");
      for (const { entry, near } of withNearest) {
        lines.push(`- \`${entry.id}\` ${entry.after!.name}`);
        const acknowledged = new Set(entry.after!.nearest ?? []);
        for (const c of near) {
          lines.push(
            `  - \`${c.id}\` ${c.identifier} — ${c.reason} (${c.score.toFixed(2)})` +
              (acknowledged.has(c.id) ? ", acknowledged" : ""),
          );
        }
      }
    }
  }

  lines.push("");
  lines.push("## Impact");
  if (report.impact.length === 0) {
    lines.push("No downstream items depend on the changed facts.");
  } else {
    lines.push(`${report.impact.length} downstream item(s):`);
    for (const id of report.impact) {
      lines.push(`- \`${id}\` ${base.item(id)?.name ?? ""}`.trimEnd());
    }
  }

  // An outcome is what a program administrator is accountable for, so a change
  // to one, or to anything upstream of one, is named on its own.
  const touched = new Set([...changedIdentifiers(cs), ...report.impact]);
  const affected = declaredOutcomes(base).filter((o) => touched.has(o));
  lines.push("");
  lines.push("### Outcomes affected");
  if (affected.length === 0) {
    lines.push("No declared program outcome is changed or downstream of a change.");
  } else {
    for (const o of affected) {
      lines.push(`- \`${o}\` ${base.item(o)?.name ?? ""}`.trimEnd());
    }
  }
  return lines.join("\n") + "\n";
}
