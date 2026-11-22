# Three-way UI comparison: eval-2 (Marcus, Rosa)

Evaluator: `eval-2`, independent. I did not read `docs/reviews/ux-*` or `stakeholder-*`, the prototypes' DESIGN/ASSESSMENT files, or any other compare reviews before scoring.

**Setup.** The App, Blind A and Blind B were built from the checkout at `80f2e9e`. I copied each built site into my scratch folder so that a parallel rebuild could not change it while I worked. The App ran under `vite preview` on port 4341 and reads the working tree under `/__ledger/`. During the session HEAD moved to `6a15209`, but those commits changed only `docs/reviews/`, so all three UIs read the same Colorado volume. Blind A ran on 4342 through its own `serve.mjs`. Blind B ran on 4343 as a static site. I drove all three with Playwright Chromium at 1280×860, deviceScaleFactor 1. Each persona had a separate browser state for each UI. All three servers are stopped.

**Screenshots** are in `/tmp/claude-0/compare/<persona>/<ui>/`. File names in the tables are relative to that folder: `marcus/blind-a/t1-item276.png` means `/tmp/claude-0/compare/marcus/blind-a/t1-item276.png`.

**Clicks and time.** "Clicks" counts deliberate actions: a click, a dropdown choice, or submitting a typed query. Typing does not count. "Time" is my estimate of how long a first-time, non-technical user takes to reach the first useful screen, including reading. Page loads were about 0.6 s for both blinds and 1.3–2.5 s for the App.

**Scale.** All scores run from 1 (poor) to 5 (excellent). U = understood what I saw. C = confidence in the answer. N = navigation clarity. H = the capability has a natural home.

---

## 1. Marcus (CDHS cash lead): Blind A → Blind B → App

### Task 1: Find the Colorado Works grant standard, its dated versions and the legislative freeze

| UI | Found | Clicks / time | U | C | N | H | Notable friction or delight |
|---|---|---|---|---|---|---|---|
| Blind A | yes | 3 (role, search, result) / ~20 s | 4 | 5 | 4 | 5 | Delight: the "Figures over time" bar reads `v1 2025-07-01 · same figures 2026-07-01 · no figure in force 2028-07-01 · today`. Each version sits beside its excerpt with "11 of 11 numbers found in the excerpt". SB 26-181 §2 is quoted under the 2026 version ("A COST OF LIVING ADJUSTMENT IS NOT APPLIED…"). Friction: the freeze is labelled only "same figures", so you have to read the session law to learn *why* the figures stayed the same. `marcus/blind-a/t1-item276.png` |
| Blind B | yes | 2 (Figures, result) + filter text / ~20 s | 5 | 5 | 4 | 5 | Delight: a vertical timeline that starts at "From Jul 1, 2028 — No figure. Nothing has been published…; a household determined then gets 'cannot determine'", then "Jul 1, 2026 … in force today · no change from the version before", with the source quoted under each version. Friction: the breadcrumb reads "Figures › Colorado Works" but the sidebar highlights **Programs**, so I lost track of where I was. `marcus/blind-b/t1-item276.png` |
| App | yes | 3 (search pick, item, Details) / ~45 s | 3 | 4 | 3 | 3 | Pressing Enter in search opened the first suggestion, **AND-SO grant standard**, which is the wrong program (`t1-search.png`). Suggestions are labelled "parameter · global · derived". On the item page the versions table and the whole freeze story are hidden under a collapsed **Details** section, in a paragraph headed "**Precision.**" (`marcus/app/t1-details.png`). Sources appear only as "S414, S1800, S1801…". |

### Task 2: Explain the grant computation step by step for a training

| UI | Found | Clicks / time | U | C | N | H | Notable friction or delight |
|---|---|---|---|---|---|---|---|
| Blind A | yes | 3 (search, CO-914, "values from household CO-07") / ~40 s | 3 | 4 | 4 | 4 | Delight: the item's "Step by step" tree can be overlaid with one household's values (p1: $517, grant standard $649…), and there is "Print as a handout". Friction: the rule reads "the greater of 0 and -1 times (-1 times (… grant before any sanction minus … sanction reduction) rounded up to the next whole dollar)", which is the floor function written as arithmetic. On the household walk-through, "Why, in short" for the *grant amount* explains *eligibility* instead of the dollars, and its numbering jumps from "1." to "12. … and 11 more". `marcus/blind-a/t2-steps-co07.png`, `t2-walk.png` |
| Blind B | yes | 4 (Programs, Colorado Works, grant amount, Explain step by step) / ~40 s | 3 | 4 | 5 | 5 | Delight: **"Print for a training"**, plus depth chips ("the main steps / two levels / three levels / every rule (70)"). It names my task exactly. Friction: the steps are generic, with no household numbers, and it uses the same "-1 times (-1 times …)" wording. The household "Why?" record is 84,000 characters and drills down to "Dwelling — cannot determine". The outcome rule says "Where it is decided: 0 outcomes in 0 programs". `marcus/blind-b/t2-explain.png`, `t2-why.png` |
| App | yes | 4 (Walkthrough, CO-07, Person 1, Outcome = grant amount) / ~60 s | 5 | 5 | 3 | 4 | **Delight, and the best answer of any UI to any of my tasks:** "The budget" table. It runs Gross wages $400 → 67% disregard −$268 → countable $132 → grant standard $649 → before sanction $517 → sanction −$129.25 → **$387**, cites the rule text on every line, and has a "Copy the budget" button. The rule is in plain English: "…minus sanction reduction, rounded down to the whole dollar, but not less than 0." Friction: the walk-through opens on Person 5's "this person's participation", not on the grant, and the print button says "Print for an appeal file", not a training. `marcus/app/t2-budget.png` |

### Task 3: See what a change to the $90 earned-income disregard would affect

| UI | Found | Clicks / time | U | C | N | H | Notable friction or delight |
|---|---|---|---|---|---|---|---|
| Blind A | yes | 3 (search, CO-273, "Try a change…") + Preview / ~45 s | 4 | 4 | 4 | 5 | Delight: the item's "What it affects" reads "22 downstream… 9 program outcomes… 12 households". The change form previews "6 results change, for 4 people in 3 households", with now and with-change values (CO-01 deemed income $2,037→$2,007, and others). Friction: before Preview is pressed, **"Who must approve this change" shows raw HTML**: `<ul class="plain roles"><li class="me"><b>Cash programs policy owner</b>…` (`marcus/blind-a/t3-edit.png`). "Precision" is jargon, and the top nav highlights "Changes" while you are on an item's editor. |
| Blind B | yes | 5 (search, figure, Propose, Review, Compare) / ~60 s | 4 | 3 | 4 | 4 | The item's "What a change here would affect: 9 outcomes in 2 programs · 6 of 32 stored households" is clear. After Compare, the proposal says "No stored household gets a different result". It compares outcomes only, so the countable-income changes Blind A shows are invisible here. The same proposal says "The edits reach … 32 stored households", which contradicts the item's "6 of 32". Error prevention: I could queue an unchanged value; the proposal said "No difference from the current text" but kept the edit. `marcus/blind-b/t3-compare.png`, `t3-review.png` |
| App | partly | ~8 (edit mode, Edit, text editor, Save to tray, Tray, then Approvals) / ~3 min | 2 | 3 | 2 | 2 | The editor is a code-style text block with token colours and constraints like "Identifier is snake_case" (`marcus/app/t3-edit.png`). Its "Preview" tab says "Reads as (nothing to read yet)". The tray lists "22 rules and figures read the changed items…" but no households, and its "Open the change tray" button sits *inside* the change tray (`t3-tray.png`). The real household effect, "With your staged change: **6 stored results in 3 households would change** (worked out)", appears only in the **Approvals** inbox (`t5-staged.png`). |

### Task 4: Sort the open questions he owns

| UI | Found | Clicks / time | U | C | N | H | Notable friction or delight |
|---|---|---|---|---|---|---|---|
| Blind A | yes | 3 (Questions, "Only mine", Sort) / ~15 s | 5 | 4 | 5 | 5 | A Sort control offers "Households touched / Items resting on it / Newest first / Number", plus "Only mine (Cash programs policy owner)". It returns a plain table of 17 rows with State, Programs, Owners, Items and Households. `marcus/blind-a/t4-mine-sorted.png` |
| Blind B | yes | 2 (desk "All 21", Sort) / ~15 s | 2 | 2 | 4 | 5 | Filtered to "Cash programs policy owner (you)", yet rows read "**owned by Legal, CHP+ policy owner**" (OQ-550) and "owned by Medicaid policy owner, Legal" (OQ-213). The selected "Open 21" tab also lists "Partly settled" items. Almost every row says "32 stored households", so "Sort: most households affected" sorts nothing. `marcus/blind-b/t4-sorted-items.png` |
| App | yes | 2 (By role, "Cash programs policy owner: 14") / ~20 s | 4 | 4 | 4 | 4 | Delight: each card shows "In force meanwhile", "Rule text it turns on", "Items carrying it" and "If answered the other way: 70 stored results in 11 households". Friction: there is **no sort control**, only filters. The heading says "14 · your role" while the page says "Showing 18 of 80". `marcus/app/t4-questions.png` |

### Task 5: Propose a change and see who must approve it

| UI | Found | Clicks / time | U | C | N | H | Notable friction or delight |
|---|---|---|---|---|---|---|---|
| Blind A | yes | 4 (Propose, Preview, Add, Changes) / ~60 s | 5 | 5 | 4 | 5 | Delight: a radio choice between "**Add a new dated version** (the law or the figure changes on a date)" and "**Correct the version from 2026-07-01** (it was transcribed wrongly)". The preview explains that "31 of the 32 stored households are determined before 2028-07-01, so a version starting then cannot change them". "My proposal" lists Cash programs policy owner and Data steward, with the reason for each, and says "you do not need a GitHub account". Friction: the field "Source excerpt for it" asks for an "S-number, e.g. S1800". `marcus/blind-a/t5-edit276.png`, `t5-proposal.png` |
| Blind B | yes | 3 (Propose in side rail, Review, Compare) / ~60 s | 4 | 3 | 5 | 5 | The proposal pill in the top bar and the sidebar badge make the state obvious. "Who must approve" names Cash programs policy owner with reasons ("owns Colorado Works; it changes what feeds Adult Financial outcomes"). There is no data steward or merge step. It offers no way to correct an existing version ("Earlier versions are never overwritten"). It accepted a "new dated figure" whose values were the same as the old ones, without a warning. `marcus/blind-b/t5-proposal.png` |
| App | partly | ~6 / ~2 min | 3 | 3 | 2 | 3 | Approvers are scattered. The item header says "Needs sign-off from Cash programs policy owner". The Approvals inbox has "Why you sign" from the current role's point of view only. "Propose" is disabled until you add a GitHub token, and the fallback is "Download this change… Send that file to the Data steward". **Error prevention: Marcus can press "Approve" on his own staged change** in the inbox. `marcus/app/t3-tray.png`, `t5-staged.png` |

---

## 2. Rosa (county supervisor): App → Blind B → Blind A

### Task 1: See each person's aid codes for a stored household

| UI | Found | Clicks / time | U | C | N | H | Notable friction or delight |
|---|---|---|---|---|---|---|---|
| App | yes | 5 (County worker door → Walkthrough, which shows no codes; By role → County worker → "each person's aid codes" → Household view) / ~90 s | 4 | 4 | 2 | 2 | Aid codes live under **"By outcome › Household view"**. The County-worker door lands on Walkthrough, which has no codes. Cases › CO-01, the obvious place, shows raw facts with snake_case buttons and the sentence "**Person 4 is the gave birth to of Person 5**". The code grid itself is good, but it overflows 1280 px: the Child care column is cut off. `rosa/app/t1-aidcodes.png`, `t1-case01.png` |
| Blind B | yes | 2 (Households, CO-01) / ~10 s | 5 | 4 | 5 | 5 | People are columns and programs are rows. Each cell shows the code, its meaning and the allotment; results with no code are greyed. It fits the screen. Friction: people are only "Person 3 (41) undocumented", with no names or roles. `rosa/blind-b/t1-hh01.png` |
| Blind A | yes | 2 (Households, CO-01) / ~10 s | 5 | 4 | 5 | 5 | Person cards headed "**p1 Grandmother, 79**", each with a one-line description, its codes and "5 documents still needed". This was the easiest of the three to read aloud to a worker. `rosa/blind-a/t1-case01.png` |

### Task 2: Step through one determination and see what would change with more income

| UI | Found | Clicks / time | U | C | N | H | Notable friction or delight |
|---|---|---|---|---|---|---|---|
| App | partly: steps yes, more income no | 4 / ~60 s | 4 | 4 | 3 | 2 | The step-by-step walk-through is clear ("This is why step 38: countable income $410.00 … need standard $331.00"). There is **no what-if** anywhere in read mode, and edit mode on a Case adds nothing. The only possible home is "Cases › New household", whose form starts empty ("Choose a program to see the facts its outcomes need"). `rosa/app/t5-walk84-elig.png`, `t2-newcase.png` |
| Blind B | yes | 3 (household, What if, +$250) / ~20 s | 4 | 4 | 5 | 5 | Delight: an "Amount to move" picker with **+$100 / +$250 / +$500 / +$1000** chips, giving "With $650 instead of $400: grant $387 → $325" for each person, and "Where are the tipping points? Find them". Friction: for a dollar change, "which step changed?" only says "No yes/no test changed…" and shows no chain. The *lower* grant is shown in green. `rosa/blind-b/t2-whatif-250.png`, `t2-whichstep.png` |
| Blind A | yes | 3 (household, result, Find the tipping point) / ~25 s | 5 | 5 | 4 | 5 | Delight: "At **$1,331 a month ($931 more** than the $400 stated for p1), the result changes from eligible to ineligible income. The first test that flips: meets income test…", followed by a six-row table of every step that changed. Friction: the new value is green even when it is worse. `rosa/blind-a/t2-tipping.png` |

### Task 3: See which documents a stored case still needs, for whom and by when (CO-92)

| UI | Found | Clicks / time | U | C | N | H | Notable friction or delight |
|---|---|---|---|---|---|---|---|
| App | yes | 3 (Walkthrough, CO-92, expand) / ~40 s | 5 | 5 | 3 | 3 | Delight: one row per document, with each program and its own due date, flagged "(before today, November 22, 2026)". It is the **most complete** of the three and includes the CHP+ reasonable-opportunity row. Friction: the table is a *collapsed* section inside an outcome walk-through, not on the Cases page. `rosa/app/t3-docs92.png` |
| Blind B | yes | 2 (household, tab) / ~10 s | 5 | 4 | 5 | 5 | A "Documents still needed" tab, plus a "Where each program stands meanwhile" grid (Pending / Pending reasonable opportunity / Complete). Friction: nothing marks a due date as already past, and the CHP+ row the App shows is missing. `rosa/blind-b/t3-docs92.png` |
| Blind A | yes | 1 (on the household page) / ~10 s | 4 | 2 | 5 | 5 | It is on the household page itself and flags dates as "past". But **the dates differ from the other two UIs for the same household**: SNAP immigration status "2026-10-11 past" against Oct 31 in the App and Blind B, and Medicaid "no date" against Jan 4, 2027. The CHP+ row is missing. A supervisor cannot trust this table once she sees the other two. `rosa/blind-a/t3-docs92.png` |

### Task 4: See what changed this month and which stored cases it touches

| UI | Found | Clicks / time | U | C | N | H | Notable friction or delight |
|---|---|---|---|---|---|---|---|
| App | yes | 2 + scroll (By role › County worker, "What changed recently") / ~30 s | 4 | 4 | 3 | 3 | Delight: it lists rule *documents* taking effect (10 CCR 2505-10 §8.100 on Nov 14) as well as figures, and separates "No stored household result would change (worked out)" from "14 stored results in 2 households rest on it (not worked out)". Friction: "Since" defaults to Oct 1, not this month, so it shows 31 items. It lives only on role landing pages. "worked out / not worked out" is insider wording. `rosa/app/t4-changed.png` |
| Blind B | yes | 1 (Changes) / ~10 s | 5 | 3 | 5 | 5 | It defaults to "**Nov 2026 (1) · this month**": the LEAP limit on Nov 1, read by CO-02 and CO-08. That is clean, but it lists figures and rules only. The Nov 14 Medicaid rule-text versions are missing, and it does not say whether any result actually changes. `rosa/blind-b/t4-changes.png` |
| Blind A | yes | 1 (Changes) / ~15 s | 3 | 3 | 5 | 4 | "Takes effect this month" (LEAP, Nov 1) is the right answer, but the headline above it reads "Compared with the codex as it stood at the start of the month (**commit edc8d43, 2026-09-18**): 1141 items added and 393 items edited". That mixes the codex's editing history with changes in the law, and a September commit labelled "start of the month" is confusing. Delight: an "Only what touches household" filter. `rosa/blind-a/t4-month.png` |

### Task 5: Explain a denial to a client in plain words (CO-84, Person 1, Colorado Works)

| UI | Found | Clicks / time | U | C | N | H | Notable friction or delight |
|---|---|---|---|---|---|---|---|
| App | yes | 3 (Walkthrough, CO-84, Outcome = eligibility) / ~40 s | 4 | 4 | 4 | 4 | A red banner says "Eligible: member (…; **the unit is Not eligible: income, so nobody is paid**)", followed by "This is why: countable income $410.00 … need standard $331.00". That is close to client wording, but there is no client-ready sentence. The print button is "Print for an appeal file". `rosa/app/t5-walk84-elig.png` |
| Blind B | partly | 3 (household, cell, Why?) / ~40 s | 3 | 4 | 4 | 3 | The determination record opens with the full IF/ELSE IF rule of the outcome. The deciding comparison is the second block, and there is no short summary. `rosa/blind-b/t5-why84.png` |
| Blind A | yes | 2 (household, "ineligible income") / ~15 s | 4 | 4 | 5 | 4 | "**Why, in short:** meets income test is no, because countable income is $410, because need standard is $331". It is the shortest correct explanation, but it does not say what "countable" means or mention the $90 disregard. `rosa/blind-a/t5-walk84.png` |

---

## 3. Per-UI summary

### App (main app)

- **IA: 2/5.** The places are:
  - top bar: Programs, Cases, Search, Browse, four unlabelled icons (table/graph/source/documents) and an edit-mode toggle
  - second row: Approvals, Questions, Walkthrough, By role, By outcome
  - a "What brings you here?" start page

  One object has several homes. A stored household is split across **Cases** (raw facts), **Walkthrough** (steps and documents) and **By outcome › Household view** (aid codes). The impact of a change is split across the Tray (rules) and the **Approvals** inbox (households). "By role" duplicates the start-page doors. The places are named after the tool's internal structure (outcome, role, walkthrough), not after Marcus's or Rosa's work.
- **Consistency: 3/5.** Rule English is consistently plain and good. People are named differently by place: "Person 1 — spouse of Person 2…" in Walkthrough, "Person 1 p1" in Cases. Counts disagree on adjacent screens (14 against 18).
- **Learnability in the first 10 minutes: 3/5.** The start doors and the tour help. Both personas were sent somewhere that did not hold their answer, and the editor needs code literacy.
- **Heuristics**

  | Heuristic | Score | Why |
  |---|---|---|
  | Visibility of status | 4 | The draft banner ("1 draft change staged in this browser"), tray count and as-of dates are clear. The branch label "working tree (ccr-… @ 6a15209)" is noise to a non-engineer. |
  | Match with real-world words | 2 | parameter, global, derived, snake_case, "Approach A projection", ledger, "Precision" as a heading for legislative history. |
  | Recognition over recall | 3 | Rich cards, but key content sits in collapsed Details/Dependencies sections, and sources show as bare S-numbers. |
  | Consistency | 3 | Same rule wording everywhere, but the same household appears in three shapes. |
  | Error prevention | 2 | Enter in search jumps to the first (wrong) hit. You can approve your own staged change. "Propose" is disabled until a GitHub token is added. |
- **Best idea to adopt: "The budget".** A line-by-line dollar table from wages to grant, with every amount a rule takes off and the rule text cited, plus a copy button. Close behind it are the per-document "Documents still needed" table with overdue flags, and the question cards with "In force meanwhile / If answered the other way".
- **Worst problem to avoid:** splitting one object across several top-level places, and putting a change's household effect in the approver's inbox instead of beside the change.
- **Functional completeness (not scored):** clearly the most complete. It is the only one that has the budget table, rule-document effective dates, the CHP+ document row and a real pull-request path. It is the only one that lacks a what-if.

### Blind A (Rulebook, top nav)

- **IA: 4/5.** Desk, Households, Questions, Changes, plus global search and an "I am working as" role picker. Each object has one canonical page: item `#/item/CO-n`, household `#/case/CO-n` (aid codes, documents, results), walk-through `#/walk/…` beneath it, question `#/q/OQ-n`, editor `#/edit/CO-n`, and the proposal under Changes. The gap is that there is **no place to browse programs or figures**. Marcus reaches everything through search or the desk tiles.
- **Consistency: 4/5.** Badges (FIGURE/RULE/FACT, Draft, open Q) and person labels ("p1 Grandmother, 79") are the same everywhere. Against that: the raw-HTML approvers box, and due dates that differ from the other two UIs.
- **Learnability: 5/5.** Four places, desk tiles that say what each list is for, and the walk-through is one click from any result.
- **Heuristics**

  | Heuristic | Score | Why |
  |---|---|---|
  | Visibility of status | 4 | Changes badge, "Working as…", "stored case expects" next to the result. |
  | Match with real-world words | 4 | Mostly plain, but "-1 times (-1 times …)", "S-number", "commit edc8d43", "Precision". |
  | Recognition over recall | 4 | Desk tiles and sorts, but no figures or program index. |
  | Consistency | 4 | See above. |
  | Error prevention | 4 | "New dated version" against "Correct the version" choice, and it explains why a future version cannot change stored households. |
- **Best idea to adopt:** the change editor that shows, on one screen, the kind of change (new dated version or correction), the effect on stored households before and after, and who must approve. A close second is "More income? Find the tipping point", with the first test that flips.
- **Worst problem to avoid:** "This month" mixes the codex's editing churn ("1141 items added", a commit hash) with changes that take effect in law. Also, no browse path for figures or programs.

### Blind B (Rulebook, left sidebar)

- **IA: 4/5.** My desk, Programs, Households, Questions, Figures, Law, Changes. These match how policy staff talk ("the program", "the figures", "the law"). The household page is the model: **Results and aid codes · Documents still needed · What if · What the case states**, all as tabs of one page. There is some overlap: a figure is reached from both Programs and Figures, and the sidebar highlight does not follow the breadcrumb. There are two role pickers (sidebar and desk sentence).
- **Consistency: 3/5.** The visual language is steady. The question ownership display contradicts its own filter, nearly every household count reads "32", and a proposal's reach (32) disagrees with the item's (6).
- **Learnability: 5/5.** Desk headline "597 items wait for your signature, and 21 open questions are yours", sidebar labels in plain words, and a breadcrumb on every page.
- **Heuristics**

  | Heuristic | Score | Why |
  |---|---|---|
  | Visibility of status | 4 | Proposal pill, "in force today", "Draft · 0 of 1 signed". |
  | Match with real-world words | 5 | "Facts we are told", "Published figures", "Taken from", "Print for a training". |
  | Recognition over recall | 5 | Figures list with "Values in force on [date]", programs listing what each decides. |
  | Consistency | 3 | See above. |
  | Error prevention | 3 | It queues no-op edits and same-value dated versions without a warning. |
- **Best idea to adopt:** the household page as a single object with four tabs. The persons-as-columns aid-code grid and the "+$100 / +$250" what-if chips come with it.
- **Worst problem to avoid:** ownership shown in a way that contradicts the "mine" filter. If "owned by" omits me on a list filtered to me, the whole question queue loses credibility.

---

## 4. Rankings, separate from completeness

### Information architecture

1. **Blind B.** It has the most natural top-level places for both personas: Programs and Figures for Marcus, Households for Rosa, Law for provenance, Changes for this month and proposals. Each household is one page with tabs. Its small problems (sidebar highlight, two role pickers) are easy to fix.
2. **Blind A.** It is the leanest and has one page per object with no duplicates. It drops below B only because there is no browse home for programs or figures, so the IA leans on search.
3. **App.** Overlapping places (Cases / Walkthrough / By outcome; Tray / Approvals; Start / By role) and names taken from the tool's internals. Its content is the richest, but you have to know where it is hidden.

### Usability for these two personas' ten tasks

1. **Blind A.** It had the fewest clicks, or tied for fewest, on 7 of the 10 tasks. Its answers came with the reason attached ("Why, in short", the tipping point, effect and approvers on the edit screen). The defects are one rendering bug and one data-trust issue (document due dates).
2. **Blind B.** It was best for Rosa's household tasks and Marcus's figure lookup. It falls behind on the question queue (contradictory owners) and on change impact (outcomes only, contradictory reach).
3. **App.** It had the single best screen ("The budget"), but Marcus's change flow and Rosa's aid codes took the longest to find. What-if is missing, and approvers are not shown with the change.

### Completeness (for the record, not used above)

App > Blind A > Blind B. The App is the only one with a budget table, rule-document dates and a working pull-request path. Blind A has the most complete prototype flows, with proposal, sent list and walk-through. Blind B's change flow is the thinnest.

---

## 5. Cross-UI data disagreements a user would notice

These came up during the persona tasks. They are not IA findings, but they cut confidence wherever a user sees two UIs, or two screens of one UI.

| What | App | Blind A | Blind B |
|---|---|---|---|
| Open questions owned by Cash programs policy owner | 14 ("your role"), "Showing 18" | 17 (open or partly) | 21 "Open" + 6 partly settled |
| Stored households reading the CW grant standard (CO-276) | not shown | "6 of 32" read it; 11 through anything downstream | "4 of 32" |
| CO-92 SNAP immigration-status due date | Oct 31, 2026 | 2026-10-11 ("past") | Oct 31, 2026 |
| CO-92 Medicaid immigration-status due date | Jan 4, 2027 | "no date" | Jan 4, 2027 |
| CO-92 CHP+ reasonable-opportunity row for Person 2 | present | absent | absent (but "Pending reasonable opportunity" in its status grid) |
| Changes taking effect in Nov 2026 | LEAP figure + 3 Medicaid rule documents (Nov 14) + LEAP rule document | LEAP figure | LEAP figure |

---

## 6. Unified UI recommendation

### Top-level places

Seven places, in a left sidebar as in Blind B. The role picker appears once, in the sidebar.

1. **Desk.** My work for the chosen role: items to sign, questions I own, my proposal, and what took effect this month in my programs. This replaces the App's "By role" pages and start doors, and keeps Blind A's tiles: sign-offs, questions, statute over rule, unverified figures, takes effect soon.
2. **Programs.** What each program decides, and from there its rules (Blind B's Programs page).
3. **Figures.** Every dated figure, with a "values in force on [date]" picker and filters such as "new version soon", "source not verified" and "no value on this date" (Blind B).
4. **Households.** Stored households (the App's Cases, Walkthrough and By-outcome Household view merged into one).
5. **Questions.** The decision queue (one place, sortable).
6. **Law.** Documents and excerpts, statute-over-rule departures, unverified sources (Blind B's Law, absorbing the App's Browse icons for source and documents).
7. **Changes.** "In force this month", "My proposal" and "Sent".

### Canonical page per object

- **Item (rule, figure or fact): `/item/CO-n`.** One page, in this order:
  - meaning;
  - how it is decided, in the **App's plain-English rule renderer** ("rounded down to the whole dollar, but not less than 0"), never "-1 times (-1 times …)";
  - for figures, **figures over time**: Blind A's dated bar with "today" plus Blind B's "From Jul 1, 2028 — no figure; a household then gets 'cannot determine'", with each version beside its excerpt and "11 of 11 numbers found" highlighting (A);
  - what it affects: static reach plus "Compare stored households" (A);
  - questions it rests on;
  - sign-off;
  - "Propose a change" and "Ask a question", in a right rail as in Blind B.

  Legislative history must not hide under "Precision".
- **Household: `/households/CO-n`, with tabs (Blind B).**
  - **Results and aid codes:** Blind B's persons-as-columns grid, with Blind A's names ("p1 Grandmother, 79") and one-line person descriptions.
  - **Documents still needed:** the App's per-document rows with each program's due date and "before today" flag, as a tab rather than a collapsed section.
  - **What if:** Blind B's amount picker with +$ chips, plus Blind A's "Find the tipping point" and its step-change table.
  - **What the case states.**
- **Determination (household × person × outcome): `/households/CO-n/p/outcome`.**
  - Blind A's "Why, in short" at the top;
  - the **App's "The budget"** for any money result;
  - the App's step-by-step with "This is why";
  - two print buttons: "Print for a training" (Blind B, with depth) and "Print for an appeal file" (App);
  - a client-language sentence above it all ("Your household's countable income, $410, is above the $331 limit for a family of two"). None of the three has this yet.
- **Question: `/questions/OQ-n`.** The App's card fields: in force meanwhile, rule text it turns on, items carrying it, if answered the other way. Add Blind A's sort control and "Only mine". Owners must never contradict the filter.
- **Proposal: one tray under Changes.**
  - Blind A's editor: "Add a new dated version" or "Correct the version from …", a structured form instead of the App's text block, and an "S-number" picker that shows the excerpt title rather than asking for the code.
  - Live effect on stored households: both intermediate and outcome changes, as in A, with one consistent "reach" number.
  - Approvers on the same screen: A's list, including the data steward.
  - Blind B's top-bar proposal pill.
  - Refuse no-op edits.
  - Never offer "Approve" on your own staged change.
- **This month: `/changes`.** It defaults to the current month (Blind B). It lists figure versions, rules **and rule documents** taking effect (App), each with the stored households that read it, and "would change" only where that has been computed (App). Blind A's household filter goes here. Codex editing history (commits, items added) belongs in a separate "Edits to the codex" view, not in this list.

### Feature and pattern sources

| Take | From |
|---|---|
| Sidebar IA, plain vocabulary, breadcrumbs, household tabs, aid-code grid, "+$" what-if, Figures list with as-of date, "Print for a training" with depth | Blind B |
| One page per object, desk tiles, "Why, in short", tipping point, change editor with new-version/correction and effect + approvers together, named people, question sort | Blind A |
| Plain-English rule rendering, "The budget" table, documents table with overdue flags, question cards ("In force meanwhile / If answered the other way"), rule-document effective dates, worked-out vs. not-worked-out change effect, start doors (folded into Desk) | App |
| Avoid: one object in three places (App); change impact in the approver's inbox (App); raw HTML in panels (A); owner labels that contradict filters (B); green for a worse result (A, B); legislative history under "Precision" (App) | |
