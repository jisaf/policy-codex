import type { Engine } from "../engine/engine";
import type { Item } from "../engine/types";
import type { LoadedVolume } from "../ledger/load";

function derivedEnglish(engine: Engine, it: Item): string {
  if (!it.derived) return "(no derivation)";
  try { return engine.block(it.derived).join("\n"); }
  catch (e) { return `(invalid: ${(e as Error).message})`; }
}

/** The engineer-facing document: the supplied-fact interface, the parameter
 *  table, and one section per derived fact with its pattern English. */
export function handoffMarkdown(engine: Engine, vol: LoadedVolume): string {
  const L: string[] = [];
  L.push(`# Engineer handoff: ${vol.title}`);
  L.push("");
  L.push(
    `Generated from \`${vol.path}/\`. One line per item. \`@assembly\` items are ` +
      "implemented in the fact-assembly layer; `@engine` items in the determination " +
      "engine. Types and scopes are those of the codex. `unknown` propagates: any " +
      "derivation whose inputs are unknown is unknown unless an `otherwise` supplies a " +
      "default, and an unknown outcome is reported as *cannot determine* with the list " +
      "of unknown supplied facts.",
  );
  L.push("");

  L.push("## Supplied facts (the interface the fact-assembly layer must deliver)");
  L.push("");
  L.push("| Identifier | Type | Scope | Program | Consumed by |");
  L.push("|---|---|---|---|---|");
  for (const it of engine.items().filter((i) => i.kind === "supplied")) {
    L.push(
      `| \`${it.identifier}\` | ${it.type} | ${it.scope} | ${it.program} | ` +
        `${engine.usedBy(it.identifier).join(", ")} |`,
    );
  }
  L.push("");

  L.push("## Parameters");
  L.push("");
  L.push("| Identifier | Type | Value | Program | Source |");
  L.push("|---|---|---|---|---|");
  for (const it of engine.items().filter((i) => i.kind === "parameter")) {
    L.push(
      `| \`${it.identifier}\` | ${it.type} | ${engine.lit(engine.paramValue(it))} | ` +
        `${it.program} | ${(it.sources ?? []).join(", ")} |`,
    );
  }
  L.push("");

  L.push("## Derived facts");
  L.push("");
  for (const it of engine.items().filter((i) => i.kind === "derived")) {
    L.push(`### ${it.id} ${it.name} \`@${it.implemented ?? "unassigned"}\``);
    L.push("");
    if (it.meaning) { L.push(it.meaning); L.push(""); }
    if (it.precision) { L.push(`Precision. ${it.precision}`); L.push(""); }
    L.push(`Type ${it.type}, scope ${it.scope}, program ${it.program}.`);
    const uses = engine.usesOfItem(it.identifier);
    L.push(`Uses: ${uses.length ? uses.map((u) => `\`${u}\``).join(", ") : "nothing"}.`);
    L.push("");
    L.push("```");
    L.push(derivedEnglish(engine, it));
    L.push("```");
    L.push("");
    const tests = it.tests ?? [];
    if (tests.length) {
      const failing = tests.filter((t) => !engine.runTest(it, t).ok).length;
      L.push(
        `Examples: ${tests.length}, ` +
          (failing === 0 ? "all passing." : `${failing} failing.`),
      );
    } else {
      L.push("Examples: none.");
    }
    L.push("");
  }

  return L.join("\n");
}
