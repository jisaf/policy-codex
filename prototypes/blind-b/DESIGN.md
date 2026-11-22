# Rulebook: a blind design for the Colorado codex (blind-b)

Written before the prototype, then corrected where the build taught me something (marked "Build note").

## 1. My reading of the problem

The codex is about 1,500 small items joined into one graph: 492 facts we are told about a person, 329 published figures, 696 rules, 153 of them program outcomes. Around them sit 859 verbatim excerpts from 156 documents, 229 interpretation questions (81 still open or partly open), 31 stored households and a 13-role approval policy. Every item is a Draft today and nothing is signed.

Four people use it, none technical. None of them wants to browse a graph, and none arrives with an item number. Each arrives with a question from their own job:

- Dana: "Is this number right, is this change in, and what do I still have to sign?"
- Marcus: "How do we get from wages to a grant, and what breaks if I change a disregard?"
- Priya: "Where did we depart from Colorado's text, on what authority, and can I prove it from the words of the law?"
- Rosa: "What did this household get, why, what do they still owe us, and what changed this month?"

So I read the product as a **rulebook with a worklist**, not a database with a query builder. Three things follow.

1. **The unit of reading is a rule in a sentence, with its evidence one click away.** The evidence is of four kinds, and they are always the same four: what it reads (facts and figures), what the law says (verbatim), how it decided real households, and who has agreed to it.
2. **The unit of work is a small decision**: sign this, answer this, change this. Every one of those is the same thing underneath (a proposed change to the repository), so there is one tray that collects them and one place that shows who must approve and what it does to the stored households.
3. **The codex's machine vocabulary must not reach the reader.** `ma_magi_child_age_limit`, `person-month`, `derived`, `S1700` are replaced with the item's name, "each person, each month", "rule", and the citation. Identifiers stay available, small and in grey, because engineers and reviewers quote them.

What it is not: no intake form, no calculator for a made-up family. The only households are the 31 stored ones; the only "what if" is a stored household with one of its own stated amounts moved, or the whole set re-decided under a proposed change.

## 2. Information architecture

Seven places, named with nouns the users already say. Five are in the main bar; on a phone the last three sit under "More".

| Place | What it holds | Who lives there |
|---|---|---|
| **My desk** | For the role you pick: what waits for your signature, the questions you own, what took effect this month, unverified figures in your area | everyone, first screen |
| **Programs** | Each program, its outcomes, and for each outcome the rules behind it | Dana, Marcus |
| **Households** | The 31 stored families: results and aid codes, the determination step by step, documents owed, what-if | Rosa, Priya |
| **Questions** | Interpretation questions: open, partly settled, settled; owner; what each one holds up | Marcus, Dana, Priya |
| **Figures** | Every published number with its dated versions and its source beside it | Dana, Marcus |
| **Law** | Federal-over-state departures, unverified figures and what rests on them, the source library and full documents | Priya |
| **Changes** | What took effect in a month and whom it touched; your proposal with before and after | Rosa, Marcus, Dana |

Two things are everywhere:

- **Search** (top of every page): finds rules, figures and facts by name, words in the meaning, item number or identifier; questions; citations ("273.9", "8.100.3.G"); households.
- **The item page.** Facts, figures and rules share one page layout, reached from every list, every rule line, every determination step and every citation. It is the most important screen.

There is no login. "Viewing as" is a role chosen from the approval policy, kept in the browser. It filters the desk and labels the sign-off buttons; it restricts nothing.

```
My desk ──► sign-off queue ──► item page ◄── Programs ► outcome
   │                              ▲  ▲  ▲
   │              Figures ────────┘  │  └──────── Law (override, unverified, source ► document)
   ├──► Questions ► question ────────┤
   └──► Changes ► proposal           └── Households ► household ► determination step
```

## 3. Key screens

### A. My desk

```
┌ Viewing as [ Medicaid policy owner ▾ ]                              [ search…            ] ┐
│ Good morning. 688 items need your signature; 23 open questions are yours.                  │
│ ┌ To sign ────────────────────────────┐ ┌ Questions you own ───────────────────────────┐ │
│ │ MAGI groups            112  ▸       │ │ OQ-518 Colorado's rule still admits …  5 hh  │ │
│ │ Long-term care          96  ▸       │ │ OQ-510 Retroactive months …            2 hh  │ │
│ │   6 held: rest on unverified figure │ │ … all 23 ▸                                   │ │
│ └─────────────────────────────────────┘ └──────────────────────────────────────────────┘ │
│ ┌ Took effect this month ─────────────┐ ┌ Needs attention ─────────────────────────────┐ │
│ │ Nov 2026: 1 figure · 3 households   │ │ 2 unverified sources · 9 figures due review  │ │
│ └─────────────────────────────────────┘ └──────────────────────────────────────────────┘ │
```

The sign-off queue groups a role's items by topic (the volume's own tag hierarchy), because nobody signs 688 things one at a time: an agency approves a chapter. Opening a group gives a reading list, each item as meaning plus rule, with a checkbox, "sign the ones I've ticked", and the reasons an item cannot be signed yet (it rests on an unverified figure; a rule test fails). An item with an open question can be signed, but says so.

### B. The item page (rule, figure or fact)

```
RULE · decides an outcome · Colorado Works                      Draft · 0 of 2 signatures
Colorado Works: grant amount                                    CO-921 cw_grant_amount
The authorized basic cash assistance grant for this person's unit for the month: zero unless …
┌ Federal law over Colorado's rule (only where it applies) ───────────────────────────────┐
┌ How it is decided ──────────────────────────────────────────────────────────────────────┐
│ if  [Colorado Works: eligibility status] is eligible                                     │
│   then the greater of 0 and ([grant before sanction] minus [sanction reduction]) …      │
│ otherwise 0                                         [ Explain step by step ▸ ] [ Print ] │
├ What it reads ─ 41 facts about the person · 12 figures · 63 other rules ────────────────┤
├ What it changes ─ 3 outcomes in 2 programs · 9 stored households ───────────────────────┤
├ The law ─ 9 CCR 2503-6 3.606.2 "…verbatim…"   [open in document]                        │
├ Examples ─ 6 of 6 behave as written ────────────────────────────────────────────────────┤
├ Sign-off ─ Cash programs policy owner (owns the program) · Legal (tagged legal)         │
└ [ Propose a change ]  [ Ask a question ]                                                │
```

- Every bracketed name is a link, coloured by what it is (rule, fact, figure), with the meaning on hover.
- **Explain step by step** turns the rule into a numbered walk for a training: step 1 is the first thing the rule needs, the last step is the result; each step is one rule with its meaning and its citation. A depth control decides how far down to go (main steps, two levels, everything). It prints.
- A **figure** shows a timeline of dated versions instead of a rule. Each version sits beside the excerpt it came from, with the numbers that appear in both highlighted, so "does the 2026 figure match the rule" is a glance. A version identical to the one before it is labelled "no change" (that is what a freeze looks like), and a date with no figure is drawn as a gap with the question that explains it.
- A **fact** shows where the value comes from and which rules read it.

### C. Household and determination

```
CO-74  Refugee and asylee family, and an adult parolee, before the federal payment limit
Determined as of [ 2026-09-15 ]   4 people · 17 of 17 stored results match
            Person 1 (38)        Person 2 (36)       Person 3 (9)      Person 4 (41)
Medicaid    PH-MA-PARENT          PH-MA-PARENT         PH-MA-CHILD        PH-MA-ADULT
            Parent/caretaker      …                    …                  …
SNAP        no code: ineligible…  …
[ Results ] [ Documents needed ] [ What if ] [ What the case states ]
```

Clicking a cell opens **the determination**: the outcome, then "because", then the step that decided it, and so on down to the facts the case states. Steps that were looked at but did not decide are folded away ("4 other things were checked"). Every step shows its value, its rule with the deciding line marked, the figure version in force on the date, and its citation. Statute-over-rule notes are repeated where they bite. The page prints as a record for an appeal.

- **As-of date.** The date can be moved; the household is re-decided with the figures and rules in force on that date, and the page says plainly that the stored expectations belong to the original date.
- **Documents needed.** One row per person per outstanding verification: what, for which program, due when, and what the program does meanwhile.
- **What if.** Pick an amount the case already states (a person's wages, say), move it, and see which results change and at what amount, and which step flipped. This is sensitivity of a stored case, not intake.

### D. Questions

A sortable list: state (open, partly settled, settled), owner (the roles that must approve the items it touches), program, and weight (how many outcomes and stored households sit downstream). The question page shows the question, its history as dated entries, the assumption the draft is using meanwhile, the items carrying it, and two forms: **Answer it** (policy owner) and **Record a legal opinion** (Legal). Both go to the proposal tray.

### E. Law

Three tabs.

- **Federal law over Colorado's rule**: the 14 items that follow a statute over Colorado text, each as a card: the Colorado paragraph superseded, the statute, the date, the reasoning, the open question it hangs on, the excerpts on both sides, and the households it decides.
- **Unverified figures**: each excerpt that could not be fetched, why, the figures taken from it, and everything downstream (rules, outcomes, households). Says that none of it can move past Draft.
- **Sources**: the excerpt library by document; each excerpt lists the items citing it; "open in document" shows the full text with the excerpt highlighted.

### F. Changes and the proposal

- **What took effect** in a chosen month: figures with a new version (old value, new value), rules that came into force, figures past their review date; for each, the stored households that read it. For a dated figure, "compare with and without" re-decides every stored household both ways and lists the results that differ.
- **Your proposal**: everything in the tray (edits, new figure versions, signatures, answers, opinions). Shows the difference in words, **who must approve and why**, and **before and after on the 31 households**. "Send for review" explains what happens next: a pull request is opened on your behalf by the codex's service account, the named roles are asked to review, and you get a link you can follow without a GitHub account.

## 4. Tasks to screens

| Persona | Task | Where |
|---|---|---|
| Dana | 2026 figure matches the rule | Figures ► figure: version beside its excerpt, matching numbers highlighted |
| | rules that decide a teenager's Medicaid category, and the facts needed | Programs ► Medicaid ► MAGI category ► step by step; "What it reads" |
| | find and sign her items | My desk ► To sign ► group ► tick and sign |
| | answer an open question | Questions (mine) ► question ► Answer it |
| | H.R.1 immigrant restriction is in; which households | Changes ► October 2026 ► the figure ► compare with and without; Law ► Federal over state |
| Marcus | grant standard and its versions, incl. freeze | Figures ► need standard ► timeline ("no change" version; gap from July 2028) |
| | explain the grant computation for a training | Programs ► Colorado Works ► grant amount ► Explain step by step ► Print |
| | everything a disregard change affects | the disregard's page ► What it changes; Propose a change ► before and after |
| | sort the questions he owns | Questions, owner = Cash programs policy owner, sort by weight |
| | propose a change, see approvers | item ► Propose a change ► Changes ► Your proposal |
| Priya | every federal-over-state departure with reasoning | Law ► Federal law over Colorado's rule |
| | citation to verbatim regulation | item ► The law ► excerpt ► open in document |
| | record a legal opinion | question ► Record a legal opinion |
| | unverified figures and dependants | Law ► Unverified figures |
| | why a household was denied, as of a date | Households ► household ► cell ► determination; as-of date; print |
| Rosa | each person's aid codes | Households ► household ► results grid |
| | step through; what changes with more income | determination; What if |
| | documents needed, for whom, by when | household ► Documents needed |
| | what changed this month, which cases | Changes ► month; My desk card |

## 5. Principles and trade-offs

1. **Sentence first, evidence second.** Every page opens with what the thing means in plain words. Trade-off: the pages are long. I chose sections that fold over tabs that hide, so a printed page is the whole truth.
2. **One page shape for every item.** Facts, figures and rules differ only in the middle section. Trade-off: a figure's page carries sections (examples, rule) that are empty and so are left out; lists look uniform rather than tailored.
3. **Names, not identifiers; words, not operators.** Identifiers inside meanings are swapped for the item's name and linked. Trade-off: some sentences read a little stiffly ("is under Medicaid: MAGI child age limit"); I accept that over a wall of snake_case, and keep the identifier on hover and in the header.
4. **The stored households are the proof.** Wherever a rule or a change is discussed, the households it actually decides are named. Trade-off: 31 households are not the caseload; the screen says "stored households" every time, never "cases affected".
5. **Everything you do is a proposal.** Signing, answering, editing and opining all land in one tray and leave as one reviewed change. Nothing in the prototype writes to the repository. Trade-off: a signature is not instant; that is the governance model, and the tray makes the wait visible.
6. **Never a silent default.** "Cannot determine" is shown as such with the missing facts named; an unverified figure is marked wherever its value appears; placeholder aid codes carry their banner on every screen that shows one.
7. **The engine runs in the page, only on stored households.** It makes as-of dates, what-if and before/after honest (they are computed, not mocked). Trade-off: a 5 MB data file and the engine in the bundle; fine for a rulebook used at a desk, and it works offline.

Things I chose not to build: a graph picture of the dependencies (pretty, and nobody's task), an editor for the rule grammar beyond editing the plain-English text the engine can parse back, user accounts, notifications.

## 6. Build notes (what changed while building)

- The JSON export leaves out status, approvals, the statute-override note, the rationale and the rule tests, so the prototype reads the item files through the engine's own parser instead. It uses the same engine for everything else.
- "Open a name in place" was dropped; "Explain step by step" does that job better, and a second way to expand made the rule harder to read.
- The sign-off queue groups by chapter and filters by topic, not the other way round: chapters are what an agency approves, and they do not overlap.
- The results grid lists programs the case gives no facts for underneath, instead of rows of "cannot determine".
- "What took effect" covers dated figures and rules coming into force. Edits to the rulebook's own text (the repository's history) are not shown; see the self-assessment.
- The wireframe counts above were guesses; the real ones are in the screenshots (814 items for the Medicaid policy owner, 40 open questions).

The self-assessment, task by task, is in README.md.
