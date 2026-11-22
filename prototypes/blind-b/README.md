# Rulebook (blind-b prototype)

An independent design for reading, approving, questioning and changing the Colorado codex. The design is in [DESIGN.md](DESIGN.md); screenshots are in [screenshots/](screenshots/).

Built blind: I did not open the existing app (`src/ui`, `src/ledger`, `index.html`, `e2e`, `test/ui`, the UX reviews or the design and onboarding documents), and did not run or screenshot it. I read the volume's data, `docs/conventions.md`, `docs/governance.md`, the headings of `docs/operators.md`, the JSON export, and the engine in `src/engine`.

## Build and run

From the repository root (the prototype uses the repository's own `preact`, `@preact/signals`, `yaml`, `vite` and the engine in `src/engine`; it adds no dependencies):

```
npm ci                                                            # once, for the repository
npx vite-node prototypes/blind-b/scripts/build-data.ts            # writes public/data.json, copies the documents
npx vite build -c prototypes/blind-b/vite.config.ts               # writes prototypes/blind-b/dist
npx vite preview -c prototypes/blind-b/vite.config.ts --port 4319 # http://localhost:4319
```

`npx vite -c prototypes/blind-b/vite.config.ts` serves it for development instead. `dist/` is a static site and can be served by anything.

Screenshots (with the preview running): `node prototypes/blind-b/scripts/screenshots.cjs http://localhost:4319`. If the repository's Playwright has no browser installed, point `PLAYWRIGHT_MODULE` at one that has (here: `/opt/node22/lib/node_modules/playwright`).

## What is real and what is not

- **Real:** every item, excerpt, document, question, household and aid code is read from `volumes/co`. The item files go through the engine's own parser rather than the JSON export, because the export leaves out status, approvals, the statute-override note, the rationale and the rule tests. The repository's engine runs in the page: stored households are decided live, so the as-of date, what-if, "with and without this change" and the proposal's before-and-after are computed, not mocked. Required approvers come from the engine's `approvalsFor`.
- **Not real:** nothing is written anywhere. Signatures, answers, opinions and edits collect in the browser (`localStorage`); "Send for review" describes the pull request that would be opened and empties the tray. "Viewing as" is a choice, not a login.
- Generated and not committed: `public/data.json` (5 MB), `public/documents/` (11 MB), `dist/`.

## Layout

| File | What |
|---|---|
| `scripts/build-data.ts` | reads the volume, parses `sources.md` and `open-questions.md`, records which items each stored household actually reads |
| `src/store.ts` | data, engine, graph and approval helpers, household evaluation, the proposal tray |
| `src/ui.tsx` | router, rich text (identifiers shown as names and linked), rule text, values, citations |
| `src/item.tsx` | the item page: fact, figure or rule; step-by-step; sign-off; propose a change |
| `src/households.tsx` | results and aid codes, the determination, documents, what-if |
| `src/views.tsx` | My desk, sign-off queue, Programs, Figures, Questions |
| `src/views2.tsx` | Law, Changes and the proposal, Search |

## Screenshots

Each at 1280 and 390 wide (`-1280.png`, `-390.png`), device scale 2.

| | Screen |
|---|---|
| 01 | My desk, as Medicaid policy owner |
| 02 | Sign-off queue, Medicaid chapter, MAGI topic, two ticked |
| 03 | Rule page: Medicaid MAGI covered group |
| 04 | Rule page with "Explain step by step": Colorado Works grant amount |
| 05 | Figure with dated versions: Colorado Works need standard (the freeze, and the gap from July 2028) |
| 06 | Figure that follows federal law over Colorado's rule: SNAP ABAWD maximum age |
| 07 | Household results and placeholder aid codes |
| 08 | A determination, step by step |
| 09 | Documents still needed |
| 10 | What if: tipping points for a stated wage |
| 11 | Questions owned by the cash programs policy owner |
| 12 | A question, with the legal opinion form open |
| 13 | Law: federal law over Colorado's rule |
| 14 | Law: unverified figures and what rests on them |
| 15 | Law: an excerpt highlighted in the full regulation |
| 16 | Changes: October 2026, Medicaid, households compared with and without the federal limit |
| 17 | A proposal: the edit, who must approve, before and after |
| 18 | Figures with a new version in 2026 |
| 19 | Programs |

## Self-assessment

I walked each task in the built prototype. "Works" means I did it end to end; "partly" says what is missing.

### Dana, HCPF Medicaid policy analyst

| Task | Result |
|---|---|
| Check that a 2026 figure matches the rule | **Works.** Figures, filter "with a new version in 2026", open one: each dated version sits beside the excerpt it came from, and numbers found in both are highlighted. Where no number matches exactly (a table quoted from a chart, a figure stated as a percentage in words) the page says so and leaves the reading to her; that is the honest limit of a string match. |
| Which rules decide a teenager's Medicaid category, and what facts they need | **Partly.** Programs, Medicaid, "MAGI covered group" shows the rule as if/then with every name linked, "Explain step by step" walks down level by level, and "What it reads" lists every fact and figure it can reach. There is no way to say "for a 15-year-old" and prune the branches that cannot apply; she reads all arms. The stored households do this for specific children (open a child's cell, then "Why?"), which is the closest thing. |
| Find and sign the items she must approve | **Works.** My desk shows 814 items by chapter; the queue filters by topic, shows meaning and rule, ticks singly or in bulk, and names the items that cannot be signed because they rest on an unverified figure. 814 is a lot; the queue has no "what changed since I last looked", because nothing has been signed yet to compare with. |
| Answer an open question | **Works.** Questions, owner = her role, open one, "Answer it"; the answer shows on the question as pending and in the proposal. |
| Confirm the H.R.1 immigrant restriction is in, and which households it changes | **Works.** Changes, October 2026, Medicaid: the rule and the dated yes/no figure that switches it on. "Compare with and without" re-decides the households that read it and lists nine changed results in CO-75 (the refugee, asylee and parolee adults go from full coverage to emergency only; the child does not). Law, "Federal law over Colorado's rule" gives the reasoning. One oddity: a result that becomes "cannot determine" without the switch shows as such, which is correct and looks alarming. |

### Marcus, CDHS cash-programs policy lead

| Task | Result |
|---|---|
| Find a grant standard and its dated versions, including a freeze | **Works.** Search "need standard" or "grant standard"; the timeline labels the July 2026 version "no change from the version before", shows the SB 26-181 excerpt beside it, and draws "No figure" from July 2028 with the question that explains it. |
| Explain the grant computation step by step for a training | **Works, with a caveat.** Grant amount, "Explain step by step", choose one, two or three levels or all 64 rules, print. Each step has its meaning, its rule, the facts it asks for, the figures with today's values, and its citation. The rule text is the engine's pattern English, so one line reads "the greater of 0 and -1 times (-1 times (…) rounded up to the next whole dollar)", which is how the codex writes "round down". A trainer would want that said as "round down"; I did not rewrite the engine's wording. |
| See everything a change to one disregard would affect | **Works.** The disregard's page, "What a change here would affect": outcomes by program, the rules that read it, the stored households that read it. |
| Sort the open questions he owns | **Works.** Questions, owner filter, sort by households affected, items affected or number. The weight is blunt: a question on a shared item "affects" all 31 households. |
| Propose a change and see who must approve it | **Works.** "Propose a change" on the disregard: a new dated figure and a reason. The proposal shows the difference, the approvers with the reason each is needed, and before and after on the stored households (a 50% disregard from July 2026 changes three results in CO-07). Editing a rule works by editing its plain-English text, which the engine parses back; a wrong phrase gives the engine's error message, which is not friendly. |

### Priya, assistant attorney general

| Task | Result |
|---|---|
| Every place the codex follows federal statute over Colorado rule text, with the reasoning | **Works.** Law, first tab: all 14, by program, each with the override sentence, the meaning, the assumption, the questions it hangs on, the excerpts, the outcomes it decides and the households that read it. |
| Trace a rule's citation to the verbatim regulation | **Works.** Any item, "The law, word for word": the excerpt, then "Read it in the full document", which opens the kept copy with the passage highlighted. Very long documents show the part around the excerpt. Matching is by text, so an excerpt that was re-wrapped may highlight only partly. |
| Record a legal opinion on an open question | **Works.** Question page, "Record a legal opinion": conclusion, authority, effect. It goes to the proposal signed as Legal. It does not yet change the question's state or the items; that is a second step by the policy owner. |
| See which figures are unverified and what depends on them | **Works.** Law, "Unverified figures": the two sources, why they could not be fetched, the six items taken from them, the rules, outcomes and households downstream, and the statement that none can leave Draft. The same flag appears on every affected item and blocks its sign-off button. |
| Reconstruct why a stored household was denied, as of a date, for an appeal | **Mostly.** Household, a result, "Why?": the determination from the result down to the stated facts, the deciding inputs highlighted in each rule, the figure version in force, the first citation per step, and any federal-over-state note; it prints. The as-of date can be moved and the household is re-decided. Two limits: a step whose rule is an if/else marks every condition that was tested as deciding, so the highlight is busier than it should be; and the record cites the first excerpt of each rule, not all of them. |

### Rosa, county eligibility supervisor

| Task | Result |
|---|---|
| Each person's aid codes for a stored household | **Works.** The results grid: person by program, placeholder code and label, or the reason there is none; the placeholder banner is on every screen that shows a code. Programs the case gives no facts for are listed underneath rather than filling the grid with "cannot determine". On a phone it shows one person at a time. |
| Step through one determination and see what step would change with more income | **Works.** "Why?" for the steps. "What if" moves a stated amount: it lists the results that change, "which step changed?" names the yes/no tests that flipped, and "Find them" sweeps upward for tipping points (CO-08: child care eligibility ends at about $5,100 of wages). Only amounts the case already states can be moved, and only upward in the sweep. |
| Which documents a stored case still needs, for whom and by when | **Works.** "Documents still needed": person, proof, program, due date with "passed" where it has, and each program's verification status meanwhile. Which due date applies to which proof is my reading of the item names (status proofs use the status deadline, expenses the expense deadline); the codex does not state that link as data, so it should be checked. |
| What rules or figures changed this month, and which stored cases that touches | **Partly.** Changes shows what took effect in a month (figures with a new dated version, rules that came into force) and the households that read each. It does not show what was *edited* in the rulebook this month; that needs the repository's history, which I left out, and with every item written in the same few weeks it would have listed the whole codex. |

### What I would do next

1. **Prune by person.** "Show me this rule for a 15-year-old citizen" without becoming intake: let the reader fix two or three facts and grey out the arms that cannot apply.
2. **Say the arithmetic in words.** A thin layer over the engine's pattern English for the handful of idioms that read badly (round down, the nested "it is not the case that").
3. **An edit history.** Merged proposals as a feed beside "what took effect", from the repository's log, with "since you last signed".
4. **Tighter deciding marks.** Mark only the arm of an if/else that was taken, and the conditions before it as "ruled out".
5. **Close the loop on questions.** An answer or opinion should be able to carry the rule change that follows from it, and move the question to settled when it merges.
6. **Test with the four people.** The vocabulary ("figure", "fact we are told", "stored household") is mine; they may have better words.

No automated tests were written for the prototype. It type-checks (`npx tsc -p prototypes/blind-b/tsconfig.json`), and the screenshot script drives every key screen, including building a proposal through the interface, with no page errors.
