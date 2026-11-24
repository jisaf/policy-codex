/* Argument parsing shared by the external sample check's scripts. */
export interface ExternalArgs { positional: string[]; volume: string; out: string | null; title: string | null }

export function parseExternalArgs(argv: readonly string[]): ExternalArgs {
  const a: ExternalArgs = { positional: [], volume: "co", out: null, title: null };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--volume") a.volume = argv[++i];
    else if (x.startsWith("--volume=")) a.volume = x.slice("--volume=".length);
    else if (x === "--out") a.out = argv[++i];
    else if (x === "--title") a.title = argv[++i];
    else if (x.startsWith("--")) throw new Error(`unknown option ${x}`);
    else a.positional.push(x);
  }
  return a;
}
