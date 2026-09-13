# Policy Codex

> **This is an exploration, not a product.** It was vibe coded: an AI first pass at both the policy ledger and the app, with a human steering rather than reviewing line by line. Nothing in the ledger is an approved interpretation of any statute, the code has had no security review, and it is **not intended for production use**. Read it as a working sketch of an idea: policy text as the authority, a machine-checkable codex as the interpretation, and git as the only store.

A codex is the approved, engine-agnostic statement of how benefit policy is interpreted: policy text is the authority, the codex is the interpretation, code is the implementation. This repository is one codex and the app that reads, searches, authors, and reviews it.

**App:** https://jisaf.github.io/policy-codex/

The app is static. The repository is its only store: reading needs nothing, proposing a change opens a pull request from your browser with your own GitHub token, and AI drafting uses your own provider key through a CORS-only relay that holds no secrets.

## Start here

The app opens with four doors. Pick the one that fits what brings you here today; you can change it any time from "change how you use this" in the header.

- **Check how a household is decided** (program administrator): Opens Cases, with an example household one click away. See the facts that led to each outcome and the plain-English story behind it.
- **Read the rules for a program** (anyone): Opens Programs, the home view. See what each program decides, the parameters currently in force, household cases that test it, and open questions still outstanding.
- **Change a rule or fact** (subject-matter expert): Turns edit mode on and opens Programs. Author and review items; stewards vocabulary, checks implementation against the codex, and answers "does the codex match the statute?"
- **Implement the rules** (engineer): Opens the Handoff view, then item decision records back to statute. The handoff view renders the engineer handoff in the app, offers downloads of the conformance suite, and lists every rule with its implementation locator.

The app opens in **reader mode**: New item, Tray, Rename, Settings, and the editor are hidden. A single control turns edit mode on; the choice persists in the browser. Every reader view and URL behaves exactly as before.

On first visit, a five-step tour walks one real example (a program, a case, an outcome, its story). See [docs/onboarding.md](docs/onboarding.md) for a guide to the app and its concepts.

## Audiences

- **Program administrator:** answers "is program X calculated properly?" by reviewing household cases with pass/fail and plain-English traces.
- **Automation SME (steward):** authors and reviews items; stewards vocabulary, checks implementation against the codex, and answers "does the codex match the statute?"
- **Division director:** audits a decision after the fact by viewing the codex's answer and trace at a pinned commit, comparing it against the production answer for the same facts.

## Layout

```
codex.json          manifest: the volumes and their chapters
volumes/mwr/        Medicaid community engagement + SNAP ABAWD work requirements
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
docs/               conventions, governance, conformance, the design
conformance/        suite export and result logs (suite.json and results.json are
                    gitignored, regenerate on demand; known-failures.json is tracked)
```

Every item is one file. Add an item by adding a file and listing it in `codex.json`; the app does the same when you propose from the browser.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173, reads the ledger from GitHub main
npm test           # engine fixtures + module tests
npm run typecheck
npm run check      # constraints, governance, rule tests, and household cases over the ledger on disk
npm run conformance
    # exports conformance/suite.json: all rule tests and household cases, normalized
npm run conform:self
    # runs the codex engine against the suite; must report 0 failed
npm run e2e        # one Playwright smoke test against a local build
```

There is no `deploy` script; see Deploy below.

If Playwright's bundled Chromium is unavailable, point `PLAYWRIGHT_CHROMIUM_PATH` at a Chrome binary.

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
