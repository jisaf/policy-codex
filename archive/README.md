# Archive

Two user interfaces that are no longer developed. The Colorado Rulebook
(`prototypes/blind-b`) is the only UI going forward.

Nothing under `archive/` is compiled, tested, linted or built: `tsconfig.json`
and `vitest.config.ts` exclude it, no `package.json` script or CI workflow
reads it, and `npm run check` reads only the ledger. The files are kept as they
were, folder structure included, so a path under `archive/main-app/` or
`archive/blind-a/` is the path the file had at the repository root or under
`prototypes/`. Their relative imports point at the root layout, so they resolve
again only once the files are moved back.

## When and why

Archived on 2026-11-24, with the product owner's approval: the product owner
chose the Colorado Rulebook (blind-b) as the design going forward
(docs/handoff-2026-11-24.md, section 7), so the original app and the first
Rulebook prototype were kept only as history.

## Last commit where they ran

`90a091b69babead66de57f3586f0adbc3f1d9772` (2026-11-24, branch
`ccr-9d19bf4c-wmnwcl`), the commit before the archive. There `npm run build`
built the original app, `npm run build:blind-a` built blind-a into
`.artifacts/blind-a/`, and `npx vitest run` passed (108 files, 1,214 tests,
the UI tests included).

## main-app: the original app

The static Preact app this repository was first built around: seven places in
a left sidebar (Desk, Programs, Figures, Households, Questions, Law, Changes;
docs/design-unified-ui.md), item pages and an editor, a change tray that opened
a pull request from the browser with the user's own GitHub token, AI drafting
through a CORS-only relay, and the implementer tools (table, handoff,
conformance, graph). It was deployed to GitHub Pages from `dist/`.

| Archived path | What it was |
|---|---|
| `index.html`, `vite.config.ts` | the app's page and its vite config (the vite config also held the unit-test config, now `vitest.config.ts` at the root) |
| `playwright.config.ts`, `e2e/` | the Playwright end-to-end tests, against `vite preview` |
| `src/main.tsx`, `src/ui/` | the app |
| `src/ai/` | AI drafting: providers, prompts, the streaming client |
| `src/github/` | the GitHub client (file history, pull requests) |
| `src/credentials/` | the browser's token and key storage |
| `src/changes/store.ts`, `serialize.ts` | the change tray's storage and the pull request's files and body |
| `src/ledger/mode.ts` | the default ref and volume, and the ref label |
| `scripts/build-bundle.ts` | `npm run build:bundle`: the static preview build in `.artifacts/app/` |
| `scripts/vite-local-ledger.ts` | the dev and preview servers' `/__ledger/` endpoint for the working tree |
| `worker/` | the Cloudflare Worker that added CORS for AI providers |
| `test/ui/`, `test/ai/`, `test/github/`, `test/worker/`, `test/credentials.test.ts` | their unit tests |
| `test/changes/changes.test.ts`, `test/ledger/bundled.test.ts`, `test/ledger/local-mode.test.ts` | the whole files as they were; the copies at the root keep only the parts that test kept modules |

Kept at the root because the check, the scripts, the export or the Rulebook
read them: `src/engine`, `src/tools`, `src/export`, `src/external`, all of
`src/ledger` but `mode.ts` (the source readers, cache and bundle reader stay
with it), `src/config.ts`, and `src/changes/types.ts`, `apply.ts` and
`validate.ts` (the check validates the recorded changes through them).

The counts the app's UI tests pinned against the Colorado volume that the
Rulebook still shows (the questions still to answer and their Owner lines,
statute over rule, the unverified sources and what rests on them, the figures
with no value on a date) moved to `test/repo/co-counts.test.ts`.

## blind-a: the first Rulebook prototype

`prototypes/blind-a`: an independent design for the Colorado codex, plain
TypeScript with no framework, bundled with the repository's esbuild together
with the engine it reads from `src/engine`. It was built blind alongside blind-b
and compared with it and the original app (docs/reviews/compare-eval-1.md and
compare-eval-2.md). Its README, DESIGN and ASSESSMENT are archived with it.

## Deleted rather than archived

- `prototypes/blind-a/screenshots/`: 24 PNG screenshots, 11 MB, which its
  README and ASSESSMENT refer to. They are in git history at the commit above;
  take them again from the restored prototype if needed.
- The build outputs (`dist/`, `.artifacts/app/`, `.artifacts/blind-a/`,
  blind-a's `public/data/`) were never committed.
- Dependencies only the original app used were removed from `package.json`:
  `@dagrejs/dagre` 1.1.4, `@preact/preset-vite` 2.9.4, `jsdom` 25.0.1 and
  `wrangler` 3.99.0.

## How to restore

To run either one as it was, check out the last commit where it ran:

```bash
git worktree add ../codex-before-archive 90a091b69babead66de57f3586f0adbc3f1d9772
cd ../codex-before-archive && npm ci
npm run dev             # the original app, http://localhost:5173
npm run build:blind-a   # blind-a, into .artifacts/blind-a/
```

To bring one back into the current tree:

- **main-app:** `git mv` each path under `archive/main-app/` back to the same
  path at the root, replacing the three split test files with their archived
  versions. Add back to `package.json` the scripts `"dev": "vite"`,
  `"build": "vite build"`, `"preview": "vite preview"`,
  `"build:bundle": "vite-node scripts/build-bundle.ts"` and
  `"e2e": "playwright test"`, and the four dependencies above (`npm install`).
  Move the `test` block of `vitest.config.ts` back into `vite.config.ts` (it
  already holds it, with the jsdom environment for `test/ui`) and delete
  `vitest.config.ts`. In `tsconfig.json`, add back `vite.config.ts`,
  `scripts/vite-local-ledger.ts`, `scripts/build-bundle.ts`, `worker`, `e2e`
  and `playwright.config.ts` to `include`. The GitHub Pages workflow published
  `dist/`. Then `npm run typecheck` and `npx vitest run`: the archived UI
  tests pin Colorado counts that will have moved since.
- **blind-a:** `git mv archive/blind-a prototypes/blind-a` and add back
  `"build:blind-a": "cd prototypes/blind-a && npm run artifact"`.
