# Policy Codex

> **This is an exploration, not a product.** It was vibe coded: an AI first pass at both the policy ledger and the app, with a human steering rather than reviewing line by line. Nothing in the ledger is an approved interpretation of any statute, the code has had no security review, and it is **not intended for production use**. Read it as a working sketch of an idea: policy text as the authority, a machine-checkable codex as the interpretation, and git as the only store.

A codex is the approved, engine-agnostic statement of how benefit policy is interpreted: policy text is the authority, the codex is the interpretation, code is the implementation. This repository is one codex and the Colorado Rulebook, the page that reads, questions and reviews it.

**Rulebook:** https://jisaf.github.io/policy-codex/ (published from `main` by `.github/workflows/deploy.yml`)

The Rulebook (`prototypes/blind-b`) is static. It reads the Colorado volume as built into its data files and runs the repository's engine in the page, so the stored households are decided live. It writes nothing anywhere: signatures, answers, opinions and proposed edits collect in the browser, and "Send for review" describes the pull request that would be opened. Changes to the codex are made as pull requests to the ledger files.

The original app (the seven-place app that opened pull requests from the browser, with AI drafting) and the first Rulebook prototype (blind-a) were archived on 2026-11-24; see [archive/README.md](archive/README.md).

## Start here

The Rulebook's design is in [prototypes/blind-b/DESIGN.md](prototypes/blind-b/DESIGN.md), and what is real in it and what is not in [prototypes/blind-b/README.md](prototypes/blind-b/README.md). Choose who you are reading as under "Viewing as"; every page is an address under `#/`:

- **My desk** (`#/desk`): what waits for your sign-off (`#/desk/sign`), the questions you own, the statute-over-rule departures and what takes effect soon in your programs.
- **Programs**, **Households**, **Questions**, **Figures**: what each program decides; the stored test households with their results, aid codes, documents still needed and what-if; the decision queue; every dated figure.
- **Map**, **Screening**, **External check**: the programs and the shared items they read; the cross-program interview order; the external sample check.
- **Law**: statute over Colorado's rule, unverified figures and what rests on them, known limits, and the sources and documents.
- **Changes**: what takes effect month by month, and the proposal.

Every rule, figure and fact has its page at `#/item/CO-n`. The counts the Rulebook shows that the volume must keep (questions still to answer, statute over rule, unverified sources, figures with no value) are pinned in `test/repo/co-counts.test.ts`.

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
src/                the engine, the ledger readers, the check and the other tools, the export,
                    the external check
prototypes/blind-b/ the Colorado Rulebook, the only UI
archive/            the original app and the first Rulebook prototype (blind-a), archived;
                    not built or tested (archive/README.md)
scripts/            check runner, conformance harness, reference checker, adapters
docs/               conventions, operators, governance, conformance, the design
handoff/            the engineer handoff, one file per volume (npm run handoff)
conformance/        per-volume suite, results and JSON export in conformance/<volume>/
                    (gitignored, regenerate on demand; known-failures.json is tracked)
external-check/     the external sample check's intake template and worked example
                    (cases received from staff go under it and are gitignored)
```

Every item is one file. Add an item by adding a file and listing it in `codex.json` (`node scripts/sync-manifest.mjs <volume>`).

## Develop

```bash
npm install
npm run dev        # the Rulebook, http://localhost:5173: builds its data from the working tree, then serves it
npm run build      # the Rulebook, into .artifacts/blind-b/ (npm run preview serves the build)
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
npm run receipts:harness
npm run records:harness -- --list earnings|holdings
    # the record checks of the Colorado volume: metamorphic relations over the stored and
    # generated households, the receipts/earnings boundary lint, the joint-holding lint
```

Every script that reads the ledger runs every volume in `codex.json` unless given `--volume <id>` (or `CODEX_VOLUME=<id>`), e.g. `npm run conformance -- --volume co`. `npm run check` is the gate: run it before every merge, as CI would. An engine team implementing a volume starts from `docs/conformance.md` and `docs/operators.md`.

There is no `deploy` script; see Deploy below.

### The Rulebook's build

`npm run build` (the same as `npm run build:blind-b`) reads `volumes/co` through the engine's own parser, decides every stored household to record what each one reads, and writes the data files to `prototypes/blind-b/public/` (git-ignored; each under 16 MB), then builds the page into `.artifacts/blind-b/`: a static site, every path relative, that runs on any static host. `npm run dev` rebuilds the data each time it starts, so it shows the working tree as it is, uncommitted edits included.

The engine under `src/engine/` is pinned to `test/fixtures/` (53 derivation round trips, 138 item blocks, 133 rule tests). The fixtures are frozen; see `scripts/README.md` for how they were produced.

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`: typecheck, unit tests, `npm run build`, and publish the Rulebook (`.artifacts/blind-b/`) to GitHub Pages. Merging a pull request is the deploy. The workflow can also be run by hand from the Actions tab.

## Governance

Pull requests to `main` also run `.github/workflows/check.yml` (typecheck, unit tests, `npm run check` against the PR's base, and the Rulebook's build). See `docs/governance.md` for roles, review lanes, the ratchet rule, and what blocks a merge and why.

## How a change flows

1. **Find:** find the item or open question in the Rulebook (search, an item page, a question).
2. **Draft:** the Rulebook's proposal shows the edit, who must approve it, and the households before and after; it does not send anything.
3. **Edit the ledger:** make the change as files on a branch: the item's YAML (new items carry a rationale), `sources.md`, `open-questions.md`, `codex.json`.
4. **CI check:** the `check` workflow runs `npm run check` against the PR's base, validating constraints, governance rules, rule tests, and household cases; errors block the merge, warnings must be acknowledged.
5. **Code owners:** the relevant chapter steward and program administrator review per `CODEOWNERS`.
6. **Merge:** approve and merge; the merge itself is the decision to deploy.
7. **Deploy:** the merge triggers `.github/workflows/deploy.yml`, which builds and publishes the Rulebook to GitHub Pages.

## Status

An exploration; see the note at the top. Draft throughout. The volume was produced as an AI first pass and nothing in it is approved. See `docs/conventions.md` for the ledger grammar, `docs/volume-mwr.md` for the volume's own scope and reading order, `docs/comparison.md` and `docs/one-ledger.md` for why one ledger, and `docs/design.md` for the design.
