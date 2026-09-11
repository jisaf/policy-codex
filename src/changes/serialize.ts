import type { Engine } from "../engine/engine";
import { stringifyItem } from "../engine/yaml";
import { entryKind, isUnchanged, type ChangeSet } from "./types";
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
  return lines.join("\n") + "\n";
}
