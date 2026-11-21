/* The reference conformance adapter: the codex engine evaluating its own
 * suite. Proves the harness (`npm run conform:self` must report 0 failed and
 * 0 unimplemented on every volume) and doubles as the simplest possible
 * example of an adapter. Reads a case (or, with `--batch`, every case) as
 * JSON on stdin and writes its values as JSON on stdout. See
 * docs/conformance.md for the exact contract. */
import { evaluateCase, resolveVolume } from "./codex-self-lib";
import type { SuiteCase } from "../../src/export/conformance";

/** Reads stdin to its end. A pipe carrying a large batch arrives in many
 *  chunks (and a non-blocking pipe makes a synchronous read fail with
 *  EAGAIN), so the stream is read asynchronously, chunk by chunk. */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Writes all of `s` to stdout and resolves once it is flushed. */
function writeStdout(s: string): Promise<void> {
  return new Promise((resolve, reject) => {
    process.stdout.write(s, (err) => (err ? reject(err) : resolve()));
  });
}

async function main(): Promise<void> {
  const raw = JSON.parse(await readStdin());
  const volume = resolveVolume(raw?.codex?.volume);
  if (raw && Array.isArray(raw.cases)) {
    const results = (raw.cases as SuiteCase[]).map((c) => ({ id: c.id, values: evaluateCase(c, volume) }));
    await writeStdout(JSON.stringify({ results }));
  } else if (raw && raw.case) {
    await writeStdout(JSON.stringify({ values: evaluateCase(raw.case as SuiteCase, volume) }));
  } else {
    throw new Error('codex-self adapter expects {"case": ...} or {"cases": [...]} on stdin');
  }
}

main().catch((err) => {
  process.stderr.write(`${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
