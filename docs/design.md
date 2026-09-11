# Codex App MVP — Design

Date: 2026-09-10
Status: implemented; see the README for the current layout and commands

## Goal

Turn the benefits-codex spike into a small, clean web app that a policy analyst
can use to read, search, author, and review a codex, and an engineer can use to
read and export one. The app is static, hosted on GitHub Pages, with the git
repository as its only persistent store. The one external piece is a
Cloudflare Worker that adds CORS for AI providers; it holds no secrets.

This is a clean rebuild of the application. The engine (pattern-English parser,
type checker, evaluator, dependency graph) is ported from `author/codex.js`
unchanged in behavior. Every page, panel, and explanatory paragraph in the
current site and author tooling is discarded.

## Non-goals

- Authentication and authorization. The app prepares a credentials boundary
  (section 7) but ships with pasted tokens only.
- Merge or approve inside the app. Review happens on the PR in the app; the
  merge button stays on GitHub.
- Server-side anything: no database, no indexing service, no build server.
- Approach A as an editable form. It is a read-only projection of B+.
- Multi-user conflict resolution beyond what git PRs provide.

## Users and modes

Two users, equal weight, one surface.

- Analyst: reads the ledger, searches by policy or citation, proposes changes
  (by form, by text, or with AI help), reviews others' proposals.
- Engineer: reads the ledger, follows dependencies, runs the tests, downloads
  the handoff document.

Reading is the default and needs no credentials. Editing is an overlay on the
same views: tapping Edit on an item or New item turns the card into its editor.
Changes accumulate in a change tray. The tray has one action, Propose, which
commits to a branch and opens a PR.

## Ledger layout (data)

The repo is the database. Layout:

```
codex.json                     manifest: volumes, their titles, chapter dirs
volumes/
  mwr/                         one volume: Medicaid + SNAP work requirements
    volume.yaml                volume metadata (from today's 00-volume.yaml)
    sources.md                 statute excerpts S1..S34 (unchanged format)
    open-questions.md          OQ-n sections (unchanged format)
    supplied/WR-001.yaml       one item per file
    parameters/WR-060.yaml
    medicaid/WR-003.yaml
    snap/WR-101.yaml
docs/                          methodology, comparison, README prose (not in app)
```

Item file content is exactly today's item mapping (id, name, identifier, kind,
type, scope, program, meaning, precision, derived, sources, open, effective,
implemented, tests). Chapter order is the directory order in the manifest.

Why one item per file: PR diffs stay per item, merge conflicts are per item,
on-demand loading is trivial, and an index is a directory listing plus a header
from each file.

Why volumes: the next codex (another program, a state variation) is a directory
and a manifest line, not a code change. Item ids are unique within a volume;
cross-volume references are `volume/id` and are out of scope for the MVP
engine but the id format allows them.

Migration is a one-time script: split the five chapter files, write the
manifest, assert the engine loads an identical item set before and after.

## Loading and scale

On open, the app fetches `codex.json`, then the chosen volume's files. Under a
few thousand items it loads every item file (raw.githubusercontent.com for
anonymous readers on main or a branch; the contents API when a token is
present). It builds an in-memory index (id, name, kind, program, scope,
keywords, uses, used_by) and caches it in IndexedDB keyed by commit SHA, so a
second open of the same commit skips the fetch.

When a volume outgrows this, a 20-line CI step can commit `index.json` per
volume and the app prefers it when present, fetching item files on demand.
The app code path is the same in both cases; only the source of the index
changes. Not built in the MVP.

## Views and URLs

Search sits in the header on every screen. It indexes items (name, identifier,
meaning, derivation text), sources (citation and statute text), and open
questions. Results are grouped by type; Enter opens the top result. Search is
client-side over the loaded ledger.

Four views, switchable from the header, all over the same loaded ledger:

- Table (default): sortable, filterable by kind, program, scope, open
  questions, validation state. Row tap opens the item.
- Graph: item nodes, uses/used-by edges; click focuses a node and highlights its
  upstream and downstream sets; filter by program and kind.
- Item: one card. Name, kind, type, scope, program, plain-English meaning,
  derivation rendered in pattern English, sources with statute text one tap
  away, open questions, tests with pass/fail, what this item uses, what uses
  it. Edit turns the card into its editor. An Approach A projection (data
  dictionary vs rules codex rendering) is a tab on the card.
- Sources: statute excerpts, each showing which items cite it.

Open questions are badges on items and a filter, not a page.

Hash routes, so Pages needs no rewrite rules. The URL is the complete view
state:

```
#/mwr/table?kind=derived&program=snap&sort=name
#/mwr/graph?focus=WR-041
#/mwr/item/WR-041
#/mwr/source/S12
#/mwr/search?q=abawd
```

A ref suffix selects the branch or PR: `#/mwr/item/WR-041@feature-x` or
`@pr/12`. Absent ref means main. Copying the address bar shares exactly what
you see, including a reviewer's branch.

The editor and tray are an overlay; the URL stays a reader link mid-edit.

## Editing and proposing

A change-set is a list of entries: item id, before (null for new), after (null
for delete). It persists in localStorage keyed by volume and base ref, so it
survives reload. The tray shows the count, lets you inspect and discard entries,
and shows the impact set (downstream items) of the whole change-set.

Validation runs on the full ledger with the change-set applied every time an
entry changes. Errors show on the item and in the tray; Propose is disabled
while any entry is invalid.

Propose:

1. Create a branch from the base ref (name: `codex/<volume>/<short-id>`), or
   reuse it if this change-set already has one.
2. Put each changed item file. Serialization preserves key order; a file with
   no changes is never rewritten.
3. Open a PR (or update it) with a generated body: items changed, one line each,
   plus the impact set.
4. Navigate to `@pr/N`; clear the tray.

Editor surfaces, all producing change-set entries:

- Form: typed fields for every item property; derivation built with the
  guided pattern picker from today's form.js, rebuilt cleanly.
- Text: the item in pattern-English block form with live parse and type check,
  from today's text.js.
- AI: inside the editor. "Draft from source S12", "Suggest a derivation",
  "Explain this derivation". The reply streams into the form; nothing is
  accepted without the user saving the entry.

## Reviewing

Opening `@pr/N` loads the PR head ledger. The tray position shows a diff panel:
each changed item as before/after cards, with the impact set and the test
results on the head. Links out to the PR on GitHub for comments and merge.

## AI

The Worker is a pass-through: it accepts a request naming one of the allowed
provider hosts, forwards it with the user's key from a header, and adds CORS.
No key storage, no prompt logic, no job queue. Streaming responses pass
through. The app assembles the prompt context (glossary of items, sources,
grammar summary) from the loaded ledger; the server-built system prompt in
`ai_proxy.py` is the reference for what to include.

Providers at launch: the current two (OpenCode, Cerebras). Adding one is a
host allowlist entry in the Worker and a provider entry in the app.

## Credentials boundary (auth-ready, no auth)

One module, `credentials/`, with `get(kind)`, `set(kind, value)`,
`clear(kind)` for kinds `ai` and `github`. Backed by localStorage. Entered in a
settings sheet. Every consumer (GitHub client, AI client) calls `get`; none
reads storage. OAuth later replaces the storage, not the callers. The GitHub
client behaves correctly with no token: reads from raw, Propose disabled with a
prompt to add a token.

## Architecture

```
src/
  engine/       parser, types, evaluator, graph, yaml read/write. Pure.
  ledger/       manifest, item fetch, index build, IndexedDB cache.
  github/       raw fetch, contents API, branches, commits, PRs.
  changes/      change-set, persistence, apply, impact.
  ai/           prompt assembly, Worker client, streaming into entries.
  credentials/  the boundary above.
  ui/           Preact components: router, header+search, four views, item editor, tray, settings.
worker/         the Cloudflare Worker, one file.
scripts/        migrate-ledger, handoff export (also available in-app).
```

TypeScript, Vite, Preact with signals for UI state. Preact is React-shaped (so
the UI can grow, and hiring or porting is easy) at 4 KB, keeps a single bundle
on Pages, and needs no server rendering. Runtime dependencies: Preact, a YAML
library, a small graph layout, and nothing else.

The engine has no DOM, fetch, or storage. Its inputs are item objects; outputs
are validated items, errors, and graphs.

## Testing

- Engine fixtures: the Python-generated expected outputs that
  `author/selftest.html` checks today (53 derivations, 138 item blocks, 133
  rule tests) are checked in as JSON. `npm test` asserts the ported engine
  reproduces them. This keeps the one-engine decision honest without running
  Python.
- Module unit tests with fakes: ledger (round-trip serialization is
  byte-identical when unchanged), github (recorded responses), changes (apply
  and impact), ai (proposal parsing), credentials.
- One Playwright smoke test: load, search, open an item, edit, see the tray
  count change, discard. Run locally before a release.
- Migration script asserts identical item sets before and after.

No CI in the MVP. The app validates before proposing and shows red on any
invalid ledger. A CI checker is a later bolt-on.

## What is deleted

`site/`, `site_build.py`, `site_views.py`, `author/`, `ai_proxy.py`,
`deploy/`, `work-requirements/approach-a/`, `__pycache__`. `codex_tool.py`
moves to `scripts/` as the reference checker for fixture regeneration.
`COMPARISON.md`, the methodology prose, and the top-level README explanation
move to `docs/`.

## Open decisions deferred

- Cross-volume references in derivations.
- Index generation in CI once a volume exceeds a few thousand items.
- OAuth provider and PR merge inside the app.
- Concurrent edits to the same item across proposals (git conflict for now).
