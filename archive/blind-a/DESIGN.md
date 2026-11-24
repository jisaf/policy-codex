# Rulebook: design (blind prototype A)

Written before the prototype was built. The prototype (this folder) follows it;
where the build changed course, the self-assessment (ASSESSMENT.md) says so.

## 1. My reading of the problem

The codex is a law library turned into about 1,500 small, linked statements.
The people who own it are not engineers, and they never ask "show me item
CO-914". They ask questions shaped like their jobs:

- *Is this number right?* (a figure against the regulation it came from)
- *Why did this family get this?* (a stored household's result, step by step)
- *What do I have to do?* (sign-offs, questions I own, documents a case needs)
- *What happens if we change it?* (impact on rules, outcomes and households, and who must approve)
- *What changed?* (this month, and which households that touches)
- *Can I defend it?* (verbatim citation, statute-over-rule reasoning, unverified figures)

So the unit of reading is the **item**, the unit of proof is the **household**,
the unit of dispute is the **open question**, and the unit of governance is the
**proposal** (a pull request the user never has to see as one). Everything else
(the expression tree, identifiers, YAML, git) is machinery that should be one
click away for the engineer and invisible to everyone else.

Three things in the data shaped the design more than anything else:

1. **Every item is already written in plain English** (meaning, precision, and
   the rule as pattern English). The interface's job is to *link* that English,
   not to replace it with diagrams. A node-link graph of 1,500 items helps
   nobody in the four personas; outlines and lists do.
2. **The stored households can be run through the real engine.** That turns
   every abstract rule into "here is what it did to the grandmother in household CO-01",
   and turns every proposed change into "these 4 people in 2 households would
   get a different answer". That is the most persuasive thing the interface can
   show, so it appears everywhere: on an item, on a change, on a question.
3. **Trust signals are first-class data**: unverified excerpts, statute
   overrides, open questions, Draft status, figures with no version in force.
   They must look the same on every screen so a reader learns them once.

Out of scope, per the product owner: entering new households and calculating
eligibility for arbitrary input. The prototype re-runs *stored* households only:
as of another date (for an appeal), with a proposed change applied (before and
after), and with one stated income nudged upward to find the step that would
flip (Rosa's "what would change with more income"). None of these accept a new
household.

## 2. Information architecture

```
Rulebook
├── Desk (home)               role picker ("I am working as …"), search, my worklists
│   ├── Search                items, figures, questions, sources, households in one box
│   └── Worklists             Sign-offs for my role · Questions I own · Statute over rule ·
│                             Unverified and missing figures · Takes effect soon
├── Item  /item/CO-nnn        one rule, figure or fact (the core reading page)
│   ├── Meaning + trust badges (Draft, Unverified, Statute over rule, Open question)
│   ├── How it is decided      linked pattern English; expandable outline of what it reads
│   ├── Figures over time      (parameters) dated versions, each beside its source excerpt,
│   │                          with the number found or not found in the excerpt
│   ├── Sources                verbatim excerpts → full document with the excerpt highlighted
│   ├── In stored households   which households read it and the value it took
│   ├── Affects                downstream rules and program outcomes; households touched
│   ├── Questions              open questions it rests on
│   └── Sign-off               roles required, status, blockers; Sign off · Propose change · Ask
├── Households /case/CO-nn    a stored household
│   ├── People                 who they are (from the case notes) and per-person aid codes
│   ├── Documents still needed for whom, for which program, due by when
│   └── All outcomes           per program, each opening the walk-through
├── Walk-through /walk/…      one determination for one person
│   ├── Story                  the decisive chain in plain lines + statute notes
│   ├── Every step             expandable reasoning tree, decisive path open, sources per step
│   ├── As of                  re-run the stored household on another date (appeals)
│   └── More income?           the smallest raise in a stated income that changes the answer,
│                              and the first step that flips
├── Questions /questions      the register: filter by state, program, owner; sort
│   └── Question /q/OQ-n       body, current assumption, items and households it touches,
│                              Record an answer · Record a legal opinion
├── Changes /changes
│   ├── This month             what was edited in the codex and what takes effect, with the
│   │                          stored households each change touches
│   └── My proposal            the tray: sign-offs, answers, edits; combined before/after on
│                              every stored household; who must approve; send (no GitHub needed)
└── Document /doc/D-n         the fetched source document, excerpt highlighted
```

Navigation is a top bar with four places (Desk, Households, Questions,
Changes) plus the always-present search box and the role picker. Items,
walk-throughs, questions and documents are reached by links, never by a menu:
every name on every screen is a link to its item, every citation chip opens its
excerpt, every household outcome opens its walk-through.

## 3. Key screens

### A. Desk (home)
```
┌ Rulebook ─ [Desk] Households Questions Changes ─── [search…] ── I am: [Medicaid policy owner ▾] ┐
│ Good to know: 1,517 items · nothing approved yet · 2 unverified excerpts · 31 stored households  │
│ ┌ Your sign-offs ──────┐ ┌ Questions you own ──┐ ┌ Statute over rule ┐ ┌ Unverified figures ┐ │
│ │ 814 items need your  │ │ 37 open             │ │ 10 items          │ │ 6 items, 120 down- │ │
│ │ role · 0 signed      │ │                     │ │                   │ │ stream             │ │
│ └──────────────────────┘ └─────────────────────┘ └───────────────────┘ └────────────────────┘ │
│ Search results / the chosen worklist as a filterable table (program, kind, flags)               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```
The role picker replaces a login: it only decides which worklists are "yours".

### B. Item page
Header: name, plain kind ("a rule", "a figure set by policy", "a fact we are
told"), program, per-person/per-household, ID and identifier in small type.
Trust badges in one row. Then the sections listed in the IA, in the order a
reader asks: what does it mean → how is it decided → where does it come from →
what does it do to households → what depends on it → who signs. A right-hand
action column (stacks below on a phone): **Sign off as …**, **Propose a
change**, **Ask a question**.

For a figure, "Figures over time" is a timeline band (versions, gaps shown as
"no figure in force") and a table: each version's dates and values beside its
own source excerpt, with the version's numbers highlighted where they appear in
the excerpt. A version identical to the one before is labelled "same figures as
the version before" (this is how a legislative freeze reads).

### C. Household
```
CO-01 Three generations in one home …                         as of 2026-10-01
┌ p1 Grandmother, 79 … ┐ ┌ p4 Granddaughter, 17 … ┐   aid codes per person (placeholder banner)
│ PH-MA-… LTC          │ │ PH-MA-CHILD  …         │
└──────────────────────┘ └────────────────────────┘
Documents still needed:  who · program · what · due by
All outcomes:            program ▸ outcome ▸ per person (value, expected ✓)  → walk-through
```

### D. Walk-through
The outcome and its value, then a numbered "because" story (the decisive
chain), then the full reasoning tree with the decisive path open and every step
showing its value, its rule in English, its sources and any statute-over-rule
note. Two controls above: **As of** (date, month) and **More income?** (pick a
stated income; the prototype searches for the smallest monthly raise that
changes the answer and highlights the first step that flips). A "Print record"
button gives the appeal-ready version with the codex commit stamped on it.

### E. Questions
A register table (state, program, owner roles, items, households touched,
title) with filters and sorts; a question page with the full body, the
assumption the draft uses, the items and households that rest on it, and a
form to record an answer or a legal opinion (goes into the proposal).

### F. Changes
"This month": codex edits since the month began, grouped by change set (commit),
plus figures that take effect this month; each with the households it touches.
"My proposal": everything the user has queued (sign-offs, answers, edits), the
combined before/after on all 31 stored households (run through the engine with
the proposal applied), the roles that must approve, and a send form that asks
for a name and email, not a GitHub account; the generated pull request text is
shown so the steward sees exactly what will be opened.

The **change editor** (reached from an item's "Propose a change") is part of F:
a figure gets "add a dated version" or "correct a version"; a rule gets its
pattern English in a text box, parsed by the engine as you type; any item gets
its meaning and precision. "Preview effect" shows before/after on the stored
households before anything is queued.

## 4. Persona tasks → screens

| Persona | Task | Where |
|---|---|---|
| Dana | 2026 figure matches the rule | B (Figures over time: version beside excerpt, number highlighted) |
| Dana | rules deciding a teenager's Medicaid category, facts needed | C → D for CO-01 p4 (`ma_magi_category`); B outline + "facts it needs" |
| Dana | find and sign off her items | A (Your sign-offs, filter, bulk select) → F (proposal) |
| Dana | answer an open question | E (question page → Record an answer) |
| Dana | H.R.1 immigrant restriction is in, which households it changes | search "1396b(v)(5)" or A (Statute over rule) → B (effective range, dated parameter) → "Compare with the previous version" before/after |
| Marcus | grant standard and its versions incl. freeze | search "grant standard" → B (timeline, "same figures", gap after 2028-07-01) |
| Marcus | Colorado Works grant step by step | B for `cw_grant_amount` (outline, expandable) and D on a stored Colorado Works household; Print |
| Marcus | everything a disregard change affects | B Affects (rules, outcomes, households) → Propose change → before/after |
| Marcus | sort the questions he owns | E (owner = Cash programs policy owner, sort by households touched) |
| Marcus | propose a change, see approvers | B → editor → F (approvers listed) |
| Priya | every statute-over-rule place, with reasoning | A (Statute over rule list with the sentence, open question and statute excerpt) |
| Priya | citation to verbatim regulation | B Sources → excerpt → Document view |
| Priya | record a legal opinion | E (Record a legal opinion) |
| Priya | unverified figures and dependants | A (Unverified and missing figures: excerpt, items, downstream count) |
| Priya | why a stored household was denied, as of a date | D (As of; story; print with commit) |
| Rosa | aid codes per person | C (people cards) |
| Rosa | step through; what changes with more income | D (tree; More income?) |
| Rosa | documents still needed, for whom, by when | C (Documents still needed) |
| Rosa | what changed this month and which cases it touches | F (This month) |

## 5. Principles and trade-offs

Principles:
1. **Plain words first, machinery on demand.** Names and meanings lead;
   identifiers, IDs and trees are small, secondary text.
2. **Every claim one click from its verbatim source.** Citation chips open the
   excerpt in place; the excerpt opens the fetched document.
3. **Households make rules concrete.** Every item says which stored households
   read it; every outcome opens its reasoning; every change shows its
   before/after.
4. **Work comes to the person.** A role, not a search, is the starting point
   for sign-offs and questions.
5. **A change is a draft with consequences.** Nothing is sent before the user
   has seen what it changes and who must approve it.
6. **One badge vocabulary for trust**, the same on every screen.

Trade-offs I chose:
- **Lists and outlines, no dependency graph.** Faster to read and work on a
  phone; loses the "shape" of the whole codex, which none of the tasks need.
- **A role picker, not sign-in.** Good enough to drive worklists in a
  prototype; real sign-off needs identity, which the proposal flow collects as
  name and email.
- **Sign-off goes through a proposal**, matching the repository's model (status
  and approval rows change by pull request). It is slower than a one-click
  approve, but it is what the governance actually is, and it lets a chapter be
  signed in one batch.
- **Precomputed indexes** (who reads what in each household, approval roles,
  this month's diff) are built from the engine and git at build time; the
  engine itself runs in the browser for walk-throughs and before/after. The
  month view is only as fresh as the last build.
- **"More income?" is a search over the stored case**, not a calculator. It
  answers Rosa's question without becoming an intake screen.
