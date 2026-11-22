# Rulebook (blind prototype A)

An interface for reading, questioning, signing and changing the Colorado codex,
built without looking at the repository's existing app. Design: `DESIGN.md`.
Walk-through of the persona tasks: `ASSESSMENT.md`. Screenshots: `screenshots/`.

## Build and run

From the repository root, with its `npm install` done (the prototype uses the
repository's `node_modules`: esbuild, vite-node, yaml, and imports
`src/engine` directly; it has no dependencies of its own):

```sh
cd prototypes/blind-a
npm run build     # npm run export -- --volume co, then scripts/build-data.ts, then the esbuild bundle
npm run serve     # http://localhost:4317/
```

`npm run build` does three things:

1. `npm run export -- --volume co` at the root (writes `conformance/co/ledger.json`).
2. `scripts/build-data.ts` reads `volumes/co/**`, the JSON export and `git log`
   of the volume, runs the engine over every stored household, and writes
   `public/data/codex.json` (items, English, sources, documents, questions, aid
   codes, cases with their comments, approval roles per item, the items each
   household's determinations read, and this month's diff against the codex at
   the start of the month) plus a copy of each source document.
3. `scripts/build.mjs` bundles `src/main.ts` and the engine into `dist/app.js`.

`dist/` and `public/data/` are generated and not committed. Any static server
works in place of `npm run serve`; the page must be served (it fetches its data).

Other scripts:

- `npm run smoke`: loads the bundle into the engine, runs every stored
  household, and reports how many rules' English parses back to the same rule.
- `npm run check-routes`: opens every key route in Chromium and prints console errors.
- `npm run screenshots`: the 1280px and 390px screenshots (deviceScaleFactor 2).
  Playwright comes from `PLAYWRIGHT_PATH`, the repository, or the global install,
  whichever has a browser. The committed PNGs were then reduced to 256 colours
  with Pillow to keep them small.

## What is where

```
DESIGN.md, ASSESSMENT.md   design document and self-assessment
index.html, src/style.css  the page and its styles
src/main.ts                layout, router, source drawer
src/data.ts                bundle loading, the engine, indexes, household helpers, search
src/proposal.ts            the proposal tray (localStorage), before/after, approvers, PR text
src/ui.ts                  escaped HTML templates, badges, links
src/views/desk.ts          A. Desk: worklists and search
src/views/item.ts          B. Item: meaning, rule, figures over time, sources, households, impact
src/views/household.ts     C. Households and one household
src/views/walk.ts          D. Walk-through: story, as-of, more income, every step
src/views/questions.ts     E. Questions register and one question
src/views/changes.ts       F. This month, my proposal, the change editor
src/views/doc.ts           the source document with an excerpt highlighted
scripts/                   data build, bundle, server, smoke test, route check, screenshots
```

Routes: `#/` (desk; `?list=signoffs|questions|statute|unverified|soon`, `?q=`),
`#/item/CO-n`, `#/cases`, `#/case/CO-nn`, `#/walk/<case>/<person>/<identifier>?d=&m=`,
`#/questions`, `#/q/OQ-n`, `#/changes?tab=month|proposal|sent`, `#/edit/CO-n`, `#/doc/D-n?s=S-n`.

The role picker in the header ("I am working as") stands in for sign-in. A
proposal is kept in this browser's localStorage; "Send" records it locally and
shows the pull request text the stewards' bot would open.
