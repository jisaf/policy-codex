# UX retest (phase 13): county eligibility supervisor

**Persona.** Rosa supervises twelve eligibility workers in a county office, across SNAP, Medicaid, Colorado Works
and CCCAP. She knows the program rules well. She does not know YAML, git or code. Her workers keep asking her, "Why
did this case come out this way?" Her first walkthrough is `docs/reviews/ux-county-supervisor.md`. Finding numbers
U1–U16 below refer to that report.

**State tested.** Branch `ccr-9d19bf4c-wmnwcl` at fa11e8a, working tree.

**How the app was run.**

- I built with `npm run build -- --outDir <scratch>/dist` and served with
  `npx vite preview --outDir <scratch>/dist --port 4312 --strictPort`.
- The app read the local tree through `/__ledger/`. The header showed "working tree (ccr-9d19bf4c-wmnwcl @ fa11e8a)".
  I intercepted no GitHub requests.
- I drove it with Playwright (`chromium.launch()`, 1366x900, deviceScaleFactor 1), with the County worker persona
  stored, which is what the "County worker" door does.
- Screenshots and text dumps are in `/tmp/claude-0/ux-retest/county-supervisor/`. File names below are relative to
  that folder.
- I stopped the server when I was done. I edited nothing in the repo except this file.

**Scope change.** Rosa's task 3 (enter a new household) is **out of scope** by the product owner's decision of
2026-11-21. The app defines policy; it is not a rules engine, so it has no intake and no live calculation. In its
place I did: "open a stored household like hers and explain its result". The +$200 part of task 2 is a what-if, so
the app is not expected to calculate it either. I note where the walkthrough still lets her work it out by hand.

---

## 0. First impression

The bare URL opens Colorado with "What brings you here today?" I picked **County worker**: "Step through how a test
household's result is reached, rule by rule, in plain words". The door opened **Walkthrough**, a list of all 29
stored households, each described by who is in it, not by review round (`01-first-visit.png`). The wrong-volume
problem (U11) is gone.

---

## 1. The same five tasks

### Task 1: "Aid codes" for every person in CO-01 / CO-02

**What I did.** I opened **By outcome → Household view**, then picked CO-01, then CO-02 from the Household box
(`02-household-CO-01.png`, `02-household-CO-02.png`). There is one grid: persons down the side, eight programs across.
Each cell shows a placeholder aid code with the program's name for it, or a plain reason there is none. Medicaid
cells add "Paid from: Title XIX" or "Title XIX emergency". The yellow **PLACEHOLDER aid codes** banner is at the top.

What the grid shows for CO-01 (October 2026):

| Person | Medicaid | SNAP | Colorado Works | CCCAP | SUN Bucks |
|---|---|---|---|---|---|
| p1 | Long-term care: nursing facility PH-MA-LTC-NF, Title XIX | Not in household | Not in unit no dependent child | Other household member | Not eligible |
| p2 | **Limited family planning PH-MA-LFP**, Title XIX | SNAP household member PH-SNAP | Not in unit no dependent child | Other household member | Not eligible |
| p3 | Emergency Medicaid PH-MA-EMERG **and** Reproductive Health Care Program PH-RHCP, "Paid from: Title XIX emergency" | "The household has PH-SNAP; this person does not (Not eligible: member non citizen)" | Not in the unit: did not ask to join | "The household has PH-CCCAP-LI; this person does not (Other household member)" | Not eligible |
| p4 | Medicaid: children PH-MA-CHILD | PH-SNAP | **Not eligible: income** | "The household has PH-CCCAP-LI; this person does not (Caretaker)" | eligible on income PH-SEBT-INC |
| p5 | needy newborn PH-MA-NEWBORN | PH-SNAP | Not eligible: income | low income PH-CCCAP-LI | Not eligible |

CHP+ reads "Eligible for Medicaid, which carries the code" for p4 and p5. In CO-02, the LEAP column fills in for p2,
p4 and p5, and p3 moves to "Emergency Medicaid: eligible, no current emergency".

**Result**

- **Finished:** yes.
- **Time:** about 3 minutes for both households, down from 45–60 plus 20.
- **Confidence:** high. It answers "which Medicaid is *hers*" (U6), and it no longer tells p3 she is approved for
  SNAP or p4 that she is an "eligible member" of a denied unit (U5).

**What improved**

- This is the screen I drew in my first report, almost line for line.
- It uses the funding source the volume already computed (`ma_funding_source`).
- It shows one Medicaid answer per person instead of twelve rows.
- It says plainly when a person is in a household that has the code but does not hold it themselves.

**Still wrong**

- **No amounts.** The SNAP $336, CCCAP fee $30, LEAP benefit "unknown" (OQ-532) and the LTC patient payment are not
  in the grid. I have to open a walkthrough for each. My wish was "the outcome in words, **the amount** and the
  coverage". (Slows.)
- **No ages or roles.** The rows say only "Person 1 p1". The walkthrough has "Person 1, age 79". The grid should too.
  (Annoyance.)
- **The family line is broken English:** "Person 1 is the **files jointly with of** Person 2", "Person 3 is the
  **tax filer of** Person 4", and in CO-83 "Person 1 is the **buys prepares with of** Person 2". (Annoyance.)
- **Clicking a code does not open the rule that gave it.** I clicked p2's "Limited family planning". It opened the
  Medicaid walkthrough on **"Medicaid: MAGI covered group — None"** (`18-co01-p2-lfp-cell.txt`), not on the family
  planning result. I had to pick the right outcome from a list of about 40. (Slows: "click a cell to see why" is the
  whole point of the cell.)
- **p3 has two codes but one funding line.** "Paid from: Title XIX emergency" sits under both Emergency Medicaid and
  the Reproductive Health Care Program, which is state-only. Which one is it? (Annoyance; would confuse a CBMS
  mapper.)
- **The 81-year-old on family planning (my U16) is still there**, with no flag in the cell. The question already
  exists: Questions → search "family planning" finds **OQ-215** ("no age or gender restriction, or childbearing age
  and reproductive capacity"), which names CO-01's 81-year-old. The grid cell doesn't point to it. The walkthrough
  shows "Open question: … OQ-215" only once I pick the "family planning and reproductive health care status" outcome
  by hand, because the cell link doesn't open that outcome (`21-co01-p2-family-planning.txt`). (Slows: I would still
  email HCPF about a question they already have open.)
- Labels are mostly plain, with some code shape left: "Not in unit no dependent child" (no colon), "member non
  citizen". (Annoyance.)

### Task 2: Step through p2's SNAP determination and find where +$200 income changes the outcome

**What I did.** From the grid I opened Walkthrough → CO-01 → Person 2 → SNAP → **SNAP: allotment**
(`04-co01-p2-snap-allotment.txt`). Under "$336.00" there is now **The budget**: 27 lines, each with its amount and
rule cite:

- Social Security $1,180; p3's wages $2,380, counted $1,785 as an ineligible member
- household gross $2,965 against the BBCE limit $4,554
- earned income deduction $357; standard deduction $217
- adjusted $2,391
- shelter $1,400 + heating/cooling SUA $616 = $2,016
- excess shelter $820.50
- net $1,571
- benefit reduction **$471.30** (the floating-point noise is gone)
- maximum $808
- prorated initial month $336; allotment $336

The prorated rule now reads "… rounded down to the whole dollar". The old "0 minus (0 minus …" text is gone. With
"Show all 160 steps", the excess shelter step states its own formula in words: "shelter costs minus (50% times
adjusted income), but not less than 0", uncapped because the household has an elderly member.

**+$200 by hand.** With the budget and that one step, Rosa can do the arithmetic on paper:

- adjusted $2,591
- excess shelter $2,016 − $1,295.50 = $720.50
- net about $1,871
- 30% = $561.30
- allotment about **$246 (−$90)**; no test changes (gross $3,165, still under $4,554)

This matches what I checked outside the app last time.

**Result**

- **Finished:** yes, with my own arithmetic. That is now expected, because live what-if is out of scope.
- **Time:** about 15 minutes, down from 40 (most of which was digging through a tree).
- **Confidence:** high.

**What improved**

- A budget like a notice (wish 3).
- Readable rule text.
- Rounded money.
- "The outcome below is the household's result…", next to "Person 2's own result in SNAP: Eligible: member".

**Still wrong**

- **The budget cites last year's tables for this year's figures.** "SNAP: standard deduction $217" cites "FNS, SNAP
  **FY 2026** Maximum Allotments and Deductions, Table 2". The volume's own versions say $217 is the FY 2027 figure
  (S731), and FY 2026 was $209. The same goes for "SNAP: maximum allotment $808" ("FY 2026 … Table 1"; FY 2026 was
  $785) and, in CO-83, "excess shelter deduction cap $769" ("FY 2026 … Table 3"). The cite column shows the item's
  first source, not the source of the version in force. I would put this budget in an appeal file. (Slows; it is a
  wrong cite in front of a hearing officer.)
- **Lines that don't apply:** "SNAP medical deduction threshold $35.00 — Standard". No medical deduction is taken.
  (Annoyance; same problem as the Colorado Works pregnancy allowance in the cash lead's retest.)
- **No household size line.** The $808 maximum is for 3 people. Nothing in the budget says "household of 3: p2, p4,
  p5". (Annoyance.)
- **Cents on a deduction:** excess shelter $820.50. Correct as computed, but it reads oddly next to whole-dollar
  lines. (Annoyance.)
- The step list still opens with "SNAP: migrant household in the job stream with a break of thirty days or less —
  Unknown, not given" at step 2. (Annoyance.)
- Three **"Statute over rule"** paragraphs (about 120 words each, ending "no CDHS implementing communication was
  available to this volume (OQ-533)") sit between the answer and the budget. "Was available to this volume" is
  authoring language. (Annoyance.)
- **No "what would flip this" line** ("gross income has $1,589 of room before the $4,554 limit"; "net income would
  have to …"). That needs no live calculation, only the stored values, and it was half of my old wish for this view.
  (Slows.)

### Task 3 (substituted): open a stored household like hers and explain its result

**Out of scope:** entering a new household (single mother, 30 h/week at $15, children 4 and 9, rent $1,200), by the
product owner's decision. **Substitute:** find the stored household closest to hers and explain its result.

**What I did**

1. The Walkthrough list has only a Program filter: no search, no "single parent", no "wages". I read all 29 titles.
   No stored household is a citizen single mother of two with wages and rent:
   - CO-92 is a lawful permanent resident mother and one child.
   - CO-91 is a homeless father and daughter.
   - CO-77 is a TMA parent (Medicaid only).
   - CO-83, "A mother and her daughter apply on October 12 with the mother's husband, who pays the rent and does not
     ask for Colorado Works", is the closest. It has $1,200 rent and a working adult, but the wages are the
     husband's.
2. **By outcome → Household view → CO-83** (`06-household-CO-83.png`): SNAP household member for all three; Colorado
   Works "Not eligible: income" for mother and daughter, and "Not in the unit: did not ask to join" for the husband.
3. Walkthrough → CO-83 → SNAP allotment (`07-co83-snap-allotment.txt`):
   - $1,500 wages
   - earned income deduction $300, standard $217 → adjusted $983
   - rent $1,200 + SUA $616 = $1,816 → excess shelter capped at $769
   - net $214, × 30% = $64.20
   - maximum $808 → prorated from the 12th: **$479** for October
4. Walkthrough → Colorado Works grant (as in the cash lead's retest): the husband's $1,500 less $90 is deemed as
   **$1,157**, over the $331 need standard for one caretaker and one child, so the unit is **not eligible: income**.

**Rosa's explanation, as she'd give it to a worker:** "SNAP counts the husband's wages. After the 20% earned income
deduction, the standard deduction and the shelter deduction (capped at $769 because no one is elderly or disabled),
net income is $214. October is prorated from the 12th, so they get $479. Colorado Works deems the stepfather's
income to his wife and stepdaughter, about $1,157 after his $90 and his own needs, and that is over the $331 need
standard. So no cash."

**Result**

- **Finished:** yes, for "explain a stored household". Not for her household, by decision.
- **Time:** about 20 minutes, mostly reading titles to find a near match.
- **Confidence:** high on CO-83's result. Medium on the deeming step (below).

**Still wrong**

- **The grid makes up results for programs the household was never set up for.** CO-83 states facts for SNAP and
  Colorado Works only. Its Medicaid column still says **"No needy-young-person group applies."** for a 30-year-old
  mother, and CCCAP and SUN Bucks say "Not known: a fact this needs is not stated". A worker would read the Medicaid
  cell as a denial. Those cells should say "not tested in this household". (Slows; misleading.)
- **The Colorado Works budget skips the stepparent's needs deduction:** $1,500 − $90 → $1,157 with no −$253 line.
  This is the one step a worker would ask about.
- **No way to find "a household like mine":** no filter by household shape, size, income type or rent. (Slows.)
- Titles in the By outcome dropdown and heading still start "Phase-10 facts round:", "CDHS review B-1:", "Audit fix
  round (OQ-44):". The Walkthrough list has already moved these into a small tag. (Annoyance.)
- LEAP reads "Not eligible this month (including months outside the heating season)". It should just say "October is
  outside the LEAP heating season". (Annoyance.)

### Task 4: Documents still needed for CO-92, for whom, by when

**What I did**

1. Walkthrough → CO-92. At the bottom of the page, after the steps and after "Rule text this walkthrough cites",
   about 3,500 px down a 4,000 px page, there is a **Documents still needed** table (`13-co92-documents-needed.png`):

   | Document | For whom | Program | Due |
   |---|---|---|---|
   | Immigration status | Person 1, age 32 | Medicaid | January 4, 2027 (reasonable opportunity period end date) |
   | Immigration status | Person 1, age 32 | SNAP | October 31, 2026 (before today, November 22, 2026) (non-citizen documentation due date) |
   | Lawful presence | Person 1, age 32 | Colorado Works | October 31, 2026 (before today…) |
   | Immigration status | Person 1, age 32 | Colorado Works | October 31, 2026 (before today…) |
   | Work hours | Person 1, age 32 | CCCAP | **October 16, 2026** (before today…) |
   | Immigration status | Person 2, age 8 | Medicaid | January 4, 2027 |
   | Immigration status | Person 2, age 8 | SNAP | October 31, 2026 (before today…) |
   | Immigration status | Person 2, age 8 | Colorado Works | October 31, 2026 (before today…) |

2. CO-91 (`14-co91-documents-needed.png`) shows the same table with red **"past due on the case date"** on each row.

**Result**

- **Finished:** yes.
- **Time:** about 5 minutes once I found the table. The first time I scrolled past it.
- **Confidence:** high on what is owed and by when.

**What improved: nearly all of U8 is fixed**

- The CCCAP work-hours date (October 16) that I had to find outside the app is there.
- The table picks the **governing** SNAP date. October 31 is the non-citizen documentation date. It does not show
  October 11, the general due date that had passed while the status still read "Pending". The SNAP status step
  confirms why: past the general date, but only immigration documents are missing, so the October 31 branch applies.
- It marks dates "before today" and "past due on the case date", which answers "past due as of today" (U9).

**Still wrong**

- **It is hard to find.** It sits at the very bottom of every walkthrough, below 50 to 180 steps and the cited-text
  list, with no link at the top. It isn't on the household grid either. My worker would never scroll there. (Slows.)
- **One document, several rows.** Person 1's immigration document fills four rows (Medicaid, SNAP, and twice for
  Colorado Works as "Lawful presence" and "Immigration status"). I asked for one row per document with the programs
  it clears. (Annoyance.)
- **CHP+ for Person 2 is missing.** The walkthrough says "CHP+: verification status — Pending: reasonable
  opportunity" for the child, but the table has no CHP+ row. If the Medicaid row covers it, the table should say so.
  (Annoyance.)
- **Due dates for programs that don't apply.** In the walkthrough, Adult Financial shows "verification status: Not
  applicable" next to "verification due date: October 12, 2026", and LEAP shows "Complete" next to a due date of
  October 15. The table rightly leaves them out, but the outcome list still offers them. (Annoyance.)
- **The Medicaid and CHP+ due dates are not in the walkthrough's outcome list.** Choosing them by address fell back to
  "MAGI covered group" (`10-co92-due-matrix.txt`). The table is the only place the January 4 date appears, apart from
  its link. (Annoyance.)

### Task 5: What changed in the rules this month, and which open cases it could affect

**What I did.** **By role → County worker** (`08-roles-county.txt`) has **What changed recently**, with a Since date
and "to today, November 22, 2026". I set Since to 11/01/2026 (`15-roles-county-since-nov.png`):

- **In force since November 1, 2026 (1):** "New figure — LEAP income limit, 60 percent state median income, by
  household size — First figure: a table of 15 rows — Rule text: LEAP income limits for the 2026-2027 season … ·
  Open questions: OQ-532 — Stored households that read it: CO-01, CO-02, CO-08".
- **Coming into force in the next year (8):** 2027 SSI and SGA figures with before→after values ($994.00 →
  $1,029.00), the community engagement requirement (No → Yes, January 1, 2027), six-month renewals for expansion
  adults (12 → 6), and **"May 1, 2027 — No figure from this date — LEAP income limit … see OQ-532"**.
- With the default Since date, the October list (25 entries) has every SNAP FY 2027 figure with before→after
  ("$377.00 → $390.00") and the **federal payment limit for non-citizens** (CO-2400, "No → Yes"), each with the
  households that read it.

**Result**

- **Finished:** mostly, in the app.
- **Time:** about 10 minutes, down from 30+ and a failed attempt.
- **Confidence:** medium-high.

**What improved**

- A dated change list with before→after values, the rule text and the stored households.
- An explicit "no figure from May 1, 2027" warning.
- Today's date as the end of the range.

**Still wrong**

- **"Stored households that read it" is not "cases it could affect".** It lists every household whose determination
  *touches* the figure. It doesn't say whose result would differ with the old figure versus the new one. The role
  page already does that comparison for staged drafts ("3 stored households change: … $2,037.00 → $2,007.00"), but
  not for dated changes. (Slows.)
- **November's other changes are missing.** The LEAP heating season opening on November 1 and the LEAP rule
  amendment (D-173) taking effect don't appear, because the list only shows figures or rules with an effective date.
  The page says so honestly ("an edit that changed no date is not listed here"). The headline thing my workers
  needed, "every LEAP benefit is unknown this season (OQ-532)", is only a question link on the income-limit row.
  (Slows.)
- **"First figure: a table of 15 rows"** can't be opened here to see the dollars. I had to go to Figures in force or
  the item. (Annoyance.)
- Households are listed by ID only (CO-01, CO-02, CO-08), with no title or hover. (Annoyance.)
- "Signs as no approval role." on my role card reads like an error. (Annoyance.)

---

## 2. New task: explain a denial for an appeal file

The new views were meant to let a county explain a result rule by rule and keep a record. I took CO-84 ("an
applicant over the $90 test"), Person 1, Colorado Works eligibility status, and pressed **Print for an appeal file**
(`16-co84-p1-cw-status.png`; printed to `17-co84-appeal-file.pdf`, 23 pages; first pages in
`17-co84-appeal-page-01.png`, `-02.png`).

- The print header is what an appeal file needs:
  - "Case walkthrough for an appeal file · printed November 22, 2026"
  - the household, the person, the outcome and month, and the determination date
  - "Ledger: … working tree (ccr-9d19bf4c-wmnwcl @ fa11e8a), **commit fa11e8af…**"
- Step 1 lists every test in order, in plain words. The income step reads "meets income test is yes when countable
  income is less than need standard. It used: countable income $410.00; need standard $331.00", and it notes
  **OQ-153**, the equal-to-need-standard question.

**Result**

- **Finished:** yes.
- **Time:** about 10 minutes.
- **Confidence:** high.

**Problems**

- **The summary under the answer is weak for a denial:** "This is why step 35: Colorado Works: countable income is
  $410.00". It should say "$410 is not less than the $331 need standard". The comparison is on page 9 or so of the
  PDF, not in the one line a hearing officer reads first. (Slows.)
- **The green box contradicts the denial:** "Person 1's own result in Colorado Works: **Eligible: member**" sits
  above "Not eligible: income". The grid handles this ("Not eligible: income" in the person's cell). The walkthrough
  still leads with the person's membership in green. (Slows; it is the U5 confusion, moved.)
- 23 pages, with every unfolded step and the full cited-text list. There is no "short form: the failing test and
  its inputs". (Annoyance.)
- "Show the 7 steps behind this one", "This is why", "It used:" read fine. "(or, if that is not known, no)" and "the
  number of people in the people in …" do not. (Annoyance.)

---

## 3. Rosa's top 5 remaining problems

1. **The household grid gives codes but no amounts, and its cells don't open the rule behind the code.** I still
   open a walkthrough per program to tell a family "$336 SNAP, $30 CCCAP fee". Clicking "Limited family planning"
   opens "MAGI covered group: None". (Slows.)
2. **The grid shows invented results for programs a household was not set up for.** CO-83's Medicaid cell says "No
   needy-young-person group applies" for an adult who was never tested. (Slows; misleading on a notice.)
3. **Budget cites point at last year's tables.** $217 and $808 are FY 2027 figures cited to the FY 2026 tables, and
   lines that don't apply ($35 medical threshold) are listed. These go straight into appeal files. (Slows; accuracy.)
4. **"What changed" lists who *reads* a figure, not who *changes*,** and misses non-figure events (the LEAP season,
   rule amendments, "LEAP benefit unknown this season"). (Slows.)
5. **The documents table is excellent but buried** at the bottom of the walkthrough and not on the grid. It splits
   one document into a row per program and leaves out the child's CHP+ row. (Slows.)

## 4. Does each view earn its place? (Rosa)

| View | Verdict | Why |
|---|---|---|
| **By outcome → Household view** | **Yes, my home page.** | Task 1 went from about an hour to 3 minutes. It needs amounts, ages, working cell links, and "not tested" instead of made-up reasons. |
| **Walkthrough** | **Yes.** | Budgets, readable rules, the documents table and the appeal print cover tasks 2, 4 and the new task. Move the documents table up and fix the summary line for denials. |
| **By role** (County worker) | **Yes, for "what changed"**. | The only place in the app that answers task 5. The question and departure tiles are less useful to a county. |
| **Questions** | **Some.** | I would not answer questions, but search found OQ-215 for my family-planning oddity in seconds. It would earn more if grid and walkthrough cells linked to the open question behind a result. |
| **Approvals** | **No, for me.** | County staff sign nothing ("Signs as no approval role"). A "recently approved and in force" feed would serve task 5, but the role page already does that. |
| **By outcome → Aid codes** (code list) | **Little.** | Useful to someone mapping CBMS codes. "N persons in M stored households" means little to a county. |

## 5. Wrong or confusing in the views themselves

- **Aid-code cells:**
  - Reasons are made up for programs a stored household doesn't cover (CO-83 Medicaid, CCCAP, SUN Bucks).
  - One "Paid from" line is shared by two codes (p3: emergency and the state-only RHCP).
  - A code links to the program's default outcome, not to the rule that gave the code.
  - "The household has PH-CCCAP-LI; this person does not (Caretaker)" for the parent who pays the fee reads as
    "she's out".
- **Relationship sentence:** "is the files jointly with of", "is the buys prepares with of", "is the tax filer of".
- **Budget table:**
  - The cite column shows the item's first source (FY 2026 tables) instead of the version in force (FY 2027).
  - Figures that weren't applied are listed (SNAP medical threshold).
  - The Colorado Works stepparent-needs deduction has no line.
  - There is no household-size line.
  - A Medicaid patient-payment budget shows "SNAP heating and cooling standard utility allowance" and a SNAP
    "Statute over rule" note with no word on why a SNAP figure is in a Medicaid budget (the spousal shelter standard
    uses it).
- **"Reading in force" and questions:** results that rest on an open question (CO-01 p2 → OQ-215) don't show it on
  the grid. The walkthrough shows questions on steps, but only the ones on the outcome you happened to open.
- **Counts:** the County role page says "80 open questions across the programs". By program the lines total 87,
  because shared questions are counted in each program.
- **Labels:**
  - "Not eligible this month (including months outside the heating season)".
  - "Not in unit no dependent child".
  - "Signs as no approval role."
  - "Statute over rule … no CDHS implementing communication was available to this volume".
  - Dropdown titles still prefixed "Phase-10 facts round:" and "CDHS review B-1:".
- **Due dates:**
  - The documents table is right (governing date, "before today", "past due on the case date").
  - The walkthrough's outcome list still offers due dates for programs whose verification is "Not applicable" or
    "Complete" (Adult Financial, LEAP in CO-92).
  - The list does not offer the Medicaid or CHP+ due-date outcomes at all.
- **Walkthrough summary line** for a denial names one input, not the failed comparison. The green "Eligible: member"
  box sits above a household denial.

## 6. First-report findings: where they stand

| # | Then | Now |
|---|---|---|
| U1 | One-person New household | Out of scope by decision. Stored households cover reading, but none is close to a citizen single parent with wages. |
| U2 | No "what changed" | **Largely fixed** (role page, dated changes with before→after and households). "Reads" is not "changes"; non-dated events are missing. |
| U3 | No what-if | Out of scope by decision. The budget plus one step lets her do it by hand. A "room before the limit" line would help. |
| U4 | No person × program summary; 85,800 px page | **Fixed** (Household view). Amounts missing. |
| U5 | Household rows read as the person's | **Fixed** in the grid. In the walkthrough, a green "Eligible: member" still sits above a unit denial. |
| U6 | No single Medicaid coverage | **Fixed** (one code plus "Paid from"). |
| U7 | SNAP story stops at the memo; unreadable rule | **Fixed** (budget, plain rule text). Cites point at the wrong year. |
| U8 | Documents not a checklist; CCCAP date missing; conflicting counts | **Largely fixed** (Documents still needed). Buried; one row per program; CHP+ child row missing. |
| U9 | As-of defaults stale; can't judge "past due today" | **Fixed** in the new views ("to today", "before today"). |
| U10 | Parameter page shows "table" | Fixed on item pages and in Figures in force. Still "a table of 15 rows" in What changed. |
| U11 | Wrong default volume and door | **Fixed.** |
| U12 | "OK yes" next to unknown; test counts read as approvals | Not on the new views. The Cases page is unchanged. |
| U13 | Raw codes; float noise | Float noise **fixed** ($471.30). Some code-shaped labels remain. |
| U14 | Empty "Try an example" | Moot (intake out of scope). |
| U15 | New household asks irrelevant facts | Moot (intake out of scope). |
| U16 | 81-year-old on Limited Family Planning | **Unchanged** in the result. OQ-215 covers it. It is not linked from the grid, and it appears in the walkthrough only on the outcome the cell link fails to open. |
