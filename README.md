# Policy Codex

> **This is an exploration, not a product.** It was vibe coded: an AI first pass at both the policy ledger and the app, with a human steering rather than reviewing line by line. Nothing in the ledger is an approved interpretation of any statute, the code has had no security review, and it is **not intended for production use**. Read it as a working sketch of an idea: policy text as the authority, a machine-checkable codex as the interpretation, and git as the only store.

A codex is the approved, engine-agnostic statement of how benefit policy is interpreted: policy text is the authority, the codex is the interpretation, code is the implementation. This repository is one codex and the app that reads, searches, authors, and reviews it.

**App:** https://jisaf.github.io/policy-codex/

The app is static. The repository is its only store: reading needs nothing, proposing a change opens a pull request from your browser with your own GitHub token, and AI drafting uses your own provider key through a CORS-only relay that holds no secrets.

## Start here

The app is organised as seven places in a left sidebar (docs/design-unified-ui.md). Every task starts from one of them, every object has one page, and the breadcrumb under the top bar always names the place the sidebar highlights.

- **Desk:** your role's work. Choose your role once, under "Working as" in the sidebar (HCPF policy, CDHS policy, CDEC, Legal, County worker, Engineer); the Desk then shows what waits for your signature, the questions you own, the statute-over-rule departures and what takes effect soon in your programs. Its sign-off list is `#/<volume>/desk/sign`.
- **Programs:** what each program decides and the rules behind each outcome, with each program's aid codes (`?tab=aid-codes`).
- **Figures:** every dated figure as it stands on a date you choose, with a word-match filter and flags (new version soon, source not verified, no value on this date).
- **Households:** the stored test households, one page each (`#/<volume>/households/CO-n`) with tabs: Results and aid codes, Documents still needed (with each program's due date), What if, What the case states. A person's result opens step by step at `households/CO-n/<person>/<outcome>`.
- **Questions:** the decision queue, filtered to the questions you own (a role owns a question when its Owner line names the role).
- **Law:** statute over Colorado rule, figures whose source is unverified or missing and what depends on them, and the sources and documents (`law/doc/D-n?at=S-n` opens a document at a passage).
- **Changes:** what takes effect month by month (figures, rules and rule documents), and **My proposal**, the change tray as a page. The proposal pill in the top bar shows how many changes you have staged.

Every rule, figure and fact has its page at `#/<volume>/item/CO-n`. Search is a results page grouped by type (rules, figures, facts, questions, households, documents): pressing Enter opens it, and every word you type must match, in any order. The implementer tools (the table of every item, the projection and handoff, the conformance suite, the whole-ledger graph) are under "For implementers" in the sidebar. Older addresses (`cases`, `walkthrough`, `outcomes`, `roles`, `inbox`, `start`, `program`, `source`, `document`) still work: they redirect to their new home. The sidebar's foot chooses the volume and which copy of the rules to read (the working tree, `main`, another branch, or a preview snapshot).

The app opens in **reader mode**: New item, Rename, Settings, and the editor are hidden. A single control in the top bar turns edit mode on; the choice persists in the browser.

On first visit, a short tour walks one real example (a program, a household, an outcome, its story). See [docs/onboarding.md](docs/onboarding.md) for a guide to the app and its concepts. Every count the app shows comes from one module, `src/ui/counts.ts`, which states each definition; `test/ui/counts.test.ts` pins them against the Colorado volume.

## Audiences

- **Program administrator:** answers "is program X calculated properly?" by reviewing household cases with pass/fail and plain-English traces.
- **Automation SME (steward):** authors and reviews items; stewards vocabulary, checks implementation against the codex, and answers "does the codex match the statute?"
- **Division director:** audits a decision after the fact by viewing the codex's answer and trace at a pinned commit, comparing it against the production answer for the same facts.

## Layout

```
codex.json          manifest: the volumes and their chapters
volumes/mwr/        Medicaid community engagement + SNAP ABAWD work requirements
volumes/co/         Colorado eligibility rules (Medicaid, CHP+, SNAP, cash, child care, LEAP, SUN Bucks),
                    laid out the same way
  volume.yaml       metadata, approval policy, types, scopes
  sources.md        statute and regulation excerpts, S1..S34
  open-questions.md interpretation gaps and the assumptions taken, OQ-1..
  documents.yaml    source documents; full text in documents/
  supplied/         one YAML file per supplied fact
  parameters/       one per parameter
  medicaid/         one per Medicaid derived fact
  snap/             one per SNAP derived fact
  tests/            rule tests and household-level cases; conformance suite built from them
src/                the app (engine, ledger, github, changes, ai, credentials, ui)
worker/             the Cloudflare Worker that adds CORS for AI providers
scripts/            check runner, conformance harness, reference checker, adapters
docs/               conventions, operators, governance, conformance, the design
handoff/            the engineer handoff, one file per volume (npm run handoff)
conformance/        per-volume suite, results and JSON export in conformance/<volume>/
                    (gitignored, regenerate on demand; known-failures.json is tracked)
external-check/     the external sample check's intake template and worked example
                    (cases received from staff go under it and are gitignored)
```

Every item is one file. Add an item by adding a file and listing it in `codex.json`; the app does the same when you propose from the browser.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173, reads the working tree (see below)
npm test           # engine fixtures + module tests
npm run typecheck
npm run check      # constraints, governance, rule tests, and household cases over the ledger on disk,
                   # then the conformance self-check, for every volume
npm run conformance
    # exports conformance/<volume>/suite.json for every volume: rule tests, household
    # cases and cannot-determine cases, normalized
npm run conform:self
    # builds each volume's suite and runs the codex engine against it out of process;
    # must report 0 failed and 0 unimplemented
npm run handoff    # writes handoff/<volume>.md
npm run export     # writes conformance/<volume>/ledger.json, the items as JSON
npm run governance # governance findings, item by item
npm run fingerprint -- --item CO-n
    # the approval fingerprint a signature records; --signed checks every signed item
npm run external:check -- <folder>
    # runs county or State sample cases (a filled external-check/template) through the
    # engine and writes a comparison report; see docs/external-check.md
npm run e2e        # Playwright tests against a local build (vite preview)
```

Every script that reads the ledger runs every volume in `codex.json` unless given `--volume <id>` (or `CODEX_VOLUME=<id>`), e.g. `npm run conformance -- --volume co`. `npm run check` is the gate: run it before every merge, as CI would. An engine team implementing a volume starts from `docs/conformance.md` and `docs/operators.md`.

There is no `deploy` script; see Deploy below.

### Running against the local tree

`npm run dev` and `npm run build && npx vite preview` serve this checkout's `codex.json`, `volumes/`, `docs/` and `conformance/` under `/__ledger/` (`scripts/vite-local-ledger.ts`), and the app reads them before anything on GitHub: a volume that is not on `main` yet, and uncommitted edits, show without intercepting `raw.githubusercontent.com`. The sidebar's ref menu reads "working tree (<branch> @ <sha>)"; it also offers `main` and any other branch. Other ways to choose:

- `?ref=<branch>` before the hash (`http://localhost:5173/?ref=main#/co/program`) makes that branch the default; `?ref=local` forces the working tree.
- `#/<volume>/<view>@<branch>` reads one branch for that address only.
- `CODEX_LOCAL_LEDGER=0 npm run dev` turns the endpoint off, so the app reads GitHub as a deployed build does.

The bare app URL opens the volume used last in this browser, else `co`. A change set staged on the working tree proposes against `main`.

If Playwright's bundled Chromium is unavailable, point `PLAYWRIGHT_CHROMIUM_PATH` at a Chrome binary.

### Static preview builds

`npm run build:bundle` writes `.artifacts/app/`: the app built with `VITE_LEDGER_SOURCE=bundled`, every path relative, and a snapshot of `codex.json`, `volumes/`, `docs/` and any conformance results as a few JSON files under `ledger/` (each under 8 MB; `src/ledger/bundled.ts`). It runs on any static host, from any sub-path, with no GitHub: the sidebar reads "preview snapshot (<branch> @ <sha>)" (`--branch <name>` sets the branch shown), there is no file history, and the tray's Propose is replaced by "Preview build: download the change to send it". `npm run build:blind-a` and `npm run build:blind-b` do the same for the two prototypes, into `.artifacts/blind-a/` and `.artifacts/blind-b/`.

The engine under `src/engine/` is pinned to `test/fixtures/` (53 derivation round trips, 138 item blocks, 133 rule tests). The fixtures are frozen; see `scripts/README.md` for how they were produced.

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`: typecheck, unit tests, build, and publish `dist/` to GitHub Pages. Merging a pull request is the deploy. The workflow can also be run by hand from the Actions tab.

The Worker deploys separately: `cd worker && npx wrangler deploy`, then paste its URL into the app's settings sheet.

## Governance

Pull requests to `main` also run `.github/workflows/check.yml` (`npm run check` against the PR's base). See `docs/governance.md` for roles, review lanes, the ratchet rule, and what blocks a merge and why.

## How a change flows

1. **Search:** find an existing item or open question in the app.
2. **Create with rationale:** author a new item or edit an existing one; new items require a rationale explaining why existing items don't serve.
3. **Tray:** changes accumulate in the app's change tray; add documents or AI-drafted items the same way.
4. **Propose:** open a pull request from the browser; the PR body includes items changed, rationale, nearest candidates, and outcomes affected.
5. **CI check:** the `check` workflow runs `npm run check` against the PR's base, validating constraints, governance rules, rule tests, and household cases; errors block the merge, warnings must be acknowledged.
6. **Code owners:** the relevant chapter steward and program administrator review per `CODEOWNERS`.
7. **Merge:** approve and merge; the merge itself is the decision to deploy.
8. **Deploy:** the merge triggers `.github/workflows/deploy.yml`, which builds and publishes `dist/` to GitHub Pages.

## Status

An exploration; see the note at the top. Draft throughout. The volume was produced as an AI first pass and nothing in it is approved; the app shows the seven items with known constraint failures in red on purpose. See `docs/conventions.md` for the ledger grammar, `docs/volume-mwr.md` for the volume's own scope and reading order, `docs/comparison.md` and `docs/one-ledger.md` for why one ledger, and `docs/design.md` for the design.
