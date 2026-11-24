# Self-assessment

I walked each persona's tasks in the running prototype (Chromium, 1280px and
390px). "Works" means the task can be done end to end in the prototype with the
real data; the caveats say where it is thinner than it looks.

## Dana, HCPF Medicaid policy analyst

| Task | Result | How, and the caveats |
|---|---|---|
| Check that a 2026 figure matches the rule | Works | Search the figure (e.g. "personal needs allowance", CO-887). *Figures over time* shows a timeline and each dated version beside its own source excerpt, the version's numbers highlighted in the excerpt and counted ("1 of 1 number found"). CO-887's 2026 version is flagged **unverified** in the same row. Caveat: the number match is textual; a figure the excerpt states in other words (e.g. "sixty-seven percent") counts as not found. |
| Which rules decide a teenager's Medicaid category, and what facts they need | Works | Household CO-01 → p4 (17) → *Medicaid: MAGI covered group* opens the walk-through: the short "why" story (continuous eligibility, age limit, residency…), then every step with its rule and sources. The item page's *Step by step* outline and *Facts it ultimately needs* (every supplied fact upstream) answer the general question. Caveat: the full tree is long; the decisive path is opened three levels deep and marked. |
| Find and sign off the items she must approve | Works, simulated | Desk, role "Medicaid policy owner": 814 items, grouped by chapter, with blockers ("rests on unverified" items cannot be selected) and open-question warnings; filter, "outcomes only", select all, *Sign off selected* → proposal → send. Caveat: nothing is approved in the codex yet, and a sent proposal is not merged, so status never turns Approved inside the prototype; the role picker is not identity. |
| Answer an open question | Works, simulated | Questions → owner filter → question page → *Record a response* (answer or legal opinion, "this settles it") → proposal; approvers are the question's owners. |
| Confirm the H.R.1 immigrant restriction (Oct 2026) is in, and which households it changes | Works | Search "H.R.1 immigrant" (H.R.1 is mapped to Pub. L. 119-21) → CO-2400, CO-509, CO-3034. CO-2400 shows the statute-over-rule note, its effective range from 2026-10-01, and "switched on together with" CO-3034. On CO-3034, *Compare the stored households with the previous version* re-runs all 31 households: 10 results change, 3 people in CO-75 go from *eligible* to *emergency only*. Caveat: the before/after compare exists for dated figures; for a rule with an effective range it goes through that figure. |

## Marcus, CDHS cash-programs policy lead

| Task | Result | How, and the caveats |
|---|---|---|
| Find a grant standard and its dated versions, incl. the freeze | Works | Search "grant standard" → CO-276. The timeline reads v1 (2025-07-01), "same figures" (2026-07-01, SB 26-181), then "no figure in force" after 2028-07-01; the table compares versions row by row; the frozen version says "the excerpt states no figures: it carries the previous ones forward". |
| Explain the Colorado Works grant step by step for a county training | Works | CO-914 (*basic cash assistance grant amount*): linked rule text, an expandable outline of everything it reads with the values from a chosen household (CO-07), and *Print as a handout*. The walk-through of a CO-07 parent gives the same with one family's numbers. Caveat: the rule English is the engine's pattern English, which is exact but occasionally clumsy ("-1 times (… ) rounded up" for rounding down). |
| See everything a change to one disregard would affect | Works | CO-350: *What it affects* (items that read it, program outcomes, households touched); *Propose a change* → set 0.75 → *Preview the effect*: 9 results change, 3 people in CO-07. A new dated version that starts after every household's date changes nothing, and the preview says so and why. |
| Sort the open questions he owns | Works | Questions → owner "Cash programs policy owner" (or *Only mine*) → sort by households touched, items, newest. Caveat: the codex records no owner on a question; ownership is derived from the programs and tags of the items that carry it. |
| Propose a change and see who must approve it | Works, simulated | The editor shows the approvers (from the engine's approval policy, upstream of outcomes included); the proposal tab lists every role with why, runs the combined before/after, and shows the pull request text. Send needs a name and an email, not a GitHub account. Caveat: 163 of 696 rules' English does not parse back exactly, so their rule text is editable only as a described request (the editor warns); figures and meanings always edit. |

## Priya, assistant attorney general

| Task | Result | How, and the caveats |
|---|---|---|
| Every place the codex follows federal statute over Colorado rule text, with reasoning | Works | Desk → *Statute over rule* (14 items): each with its sentence, the open question, the statute excerpts as chips, and the item's recorded reasoning. |
| Trace a rule's citation to the verbatim regulation | Works | Any citation chip opens the excerpt in a drawer → *Open the full document* shows the fetched document with the excerpt's passages highlighted and scrolled to. Caveat: location is a fuzzy text match; an excerpt reflowed differently from its document may not be found (the page says so). |
| Record a legal opinion on an open question | Works, simulated | Question page → *Legal opinion* (preselected for the Legal role) → proposal; Legal is added to the approvers. |
| Which figures are unverified and what depends on them | Works | Desk → *Unverified or missing figures*: the 2 unverified excerpts with their note, the items citing them, everything downstream (rules, outcomes) and the households that read them; plus figures with no version loaded. Every page badges "Unverified source" / "Rests on unverified". |
| Reconstruct why a stored household was denied, as of a date, for an appeal | Partly | Walk-through → *As of* a date (and month) re-runs the stored household on that date; the story, the full steps with sources, statute notes, and *Print the record* stamped with the codex commit. Caveat: it re-runs the codex **as it is now** on that date (dated figures and effective ranges apply), not the codex as it stood on that date; an appeal record would need the historical codex (`git show <commit>`), which the prototype does not load. |

## Rosa, county eligibility supervisor

| Task | Result | How, and the caveats |
|---|---|---|
| Each person's aid codes for a stored household | Works | Household page → people cards with the placeholder codes (the banner says they are not CBMS codes), each linking to its walk-through, plus each person's program results on the determination month. |
| Step through one determination; what would change with more income | Works | Walk-through: decisive path marked, every step expandable. *More income?* picks a stated income the result actually reads, searches for the smallest monthly raise that changes the answer (CO-01 p4: $967 more for p3 turns *child* into *none*), names the first test that flips and lists every step that changes. It re-runs the stored household only; nothing is saved. |
| Which documents a stored case still needs, for whom and by when | Works | Household page → *Documents still needed* (e.g. CO-91: nine items for p1, due 2026-11-12 to 2026-11-17, flagged past), each opening its walk-through. Caveat: the due date is the program's verification due date for that person, not one per document. |
| What rules or figures changed this month and which stored cases that touches | Works, but noisy | Changes → *This month*: compared with the codex at the start of the month, figures whose values changed, rules whose logic changed, and every change set, each with the households whose determinations read it; a filter keeps only what touches one household. Caveat: most of this volume was written in November 2026 (1,051 items added), so "this month" is large; the month is the build's month, with no picker. |

## What I would do next

1. **Load the codex at a commit** for the appeal task, so "as of" can mean "the rules as they stood", and the walk-through can show both.
2. **Make sign-off real**: identity, a reviewer's view of an incoming proposal, and status/approval rows written back so a chapter visibly moves Draft → Reviewed → Approved.
3. **Rule editing for every rule**: fix the 163 rules whose English does not parse back (an engine/parser task), then a structured editor for the common patterns (thresholds, lists of options) so analysts rarely type pattern English.
4. **Show item text diffs**, not just changed field names, in "This month" and in proposals; add a month picker and "since my last visit".
5. **Record owners on questions** in the data instead of deriving them, and let a question be assigned.
6. **Usability tests with the four personas**, especially on the sign-off list (814 rows is a lot even grouped) and on the walk-through tree's depth; an accessibility audit (keyboard paths through the trees and the drawer, contrast of badges).
7. **Size**: the 5.6 MB data bundle loads in well under a second locally but should be split (items vs. sources vs. cases) and cached for county connections.

## Note on the blind rule

I did not open `src/ui/`, `src/ledger/`, `index.html` at the root, `e2e/`,
`test/ui/`, any built `dist/`, the listed `docs/` files or the README's app
sections, and did not run the existing app. Two things reached me only as
names: the `git merge` summary at the start listed changed file paths (I did
not read the output beyond its first lines), and commit subjects in
`git log` for the volume (e.g. "phase 13 views") appear in the *This month* data.
`scripts/export.ts` imports `src/tools/volumes.ts`, which imports `src/ledger/`;
I read only the import lines of `volumes.ts`, saw that, and wrote this
prototype's own parsers for sources, questions, documents and case comments
instead of using it.
