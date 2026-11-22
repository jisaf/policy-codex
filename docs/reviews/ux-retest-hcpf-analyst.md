# UX retest: HCPF eligibility policy analyst (phase 13)

Persona: Dana, the same HCPF eligibility policy analyst as in `ux-hcpf-analyst.md`. I have 12 years in Medicaid
policy and no technical background, and I sign off definitions and figures before the codex goes to the vendor.
I redid my five tasks from the first walkthrough using the new views (Approvals, Questions, Walkthrough, By role,
By outcome), then tried one new task they were meant to make possible.

Scope I kept in mind (plan Phase 13 note): the app defines policy and is not a rules engine. I did not expect
intake or live calculation. "What changes" means comparing the stored test households before and after a staged
change.

Screenshots are in `/tmp/claude-0/ux-retest/hcpf-analyst/`, outside the repo. A `.txt` file next to a screenshot
holds that page's text. I edited nothing except this file and committed nothing.

## How the app was run

- **Build and serve.** I ran `npm run build -- --outDir <scratch>/dist-retest`, then
  `npx vite preview --outDir <same> --port 4311 --strictPort`, as the README's "Running against the local tree"
  describes.
- **No interception needed.** The header read "working tree (ccr-9d19bf4c-wmnwcl @ fa11e8a)".
- **Browser.** Playwright Chromium at 1366×900, deviceScaleFactor 1.
- **Server.** Stopped when I was done.

The first visit opened on **Colorado** with a "What brings you here today?" page (`00-first-visit.png`). My
earlier F3 (a real reviewer could not see Colorado at all) is gone for this local run. I clicked **HCPF policy**.
That opened **By role → HCPF policy** (`01-hcpf-home.png`). A new row of links under the header reads
"Approvals · Questions · Walkthrough · By role · By outcome".

---

## Task 1: What "countable income" means for MAGI Medicaid, and the 2026 children's figure

**What I did**

1. **Figure.** The HCPF role page has "Figures in force", which shows **"MAGI income limit, Children category,
   percent of FPL ... 142% of FPL since June 30, 2022"** with its rule text (`01b-hcpf-home-full.png`).
2. **Item page.** I opened CO-191 (`14-item-CO-191.png`). From top to bottom it now shows:
   - the plain meaning;
   - "Draft · Needs sign-off from Medicaid policy owner, Legal, State plan coordinator, CHP+ policy owner
     (0 of 4 signed)";
   - "**142% of FPL**";
   - a table, "Monthly income at 142% of FPL, by household size, under the guideline in force on November 21,
     2026": 1 = $1,888.60, 2 = $2,560.73, **3 = $3,232.87**, and so on up to 8.

   The size-3 figure matches what I worked out by hand last time.
3. **Definition.** CO-502 ("person's MAGI-based income") now opens with its plain meaning in the page body,
   under 42 CFR 435.603(e) and § 8.100.4.C (`13-item-CO-502.png`). I no longer have to open "Approach A projection".
4. **By outcome.** By outcome → Medicaid → "Medicaid: children PH-MA-CHILD" (`16-outcome-children.png`) shows:
   - the two routes into the category (continuous eligibility, or the Children MAGI category);
   - a "Figures it depends on" table.

   That table carries **OQ-515** on the poverty-guideline row. This is the first time I saw the HCPF adoption date
   question next to the figure it affects.
5. **Search.** "countable income" + Enter still opens **Colorado Works: countable income** (CO-910)
   (`11-search-enter-countable-income.png`). "countable income medicaid" lists Pickle, DAC, student loan and
   SSI-related items first (`12-search-page-countable-income-medicaid.png`). Search is still no way to reach the MAGI
   definition.

**Finished?** Yes. **Time:** about 10 minutes (35 last time). **Confidence:** high on 142% and the dollar chart;
medium-high on the definition, because the codex still has no MAGI item called "countable income" and I know to go
to CO-502/503.

**Improved since the first report**
- F4 is fixed: plain meaning at the top of rule and figure pages.
- F10 is fixed: percent instead of 1.42, and monthly dollars by household size.
- F8 is fixed: the "Approach A projection" approvers on CO-2400 now match the page header (Medicaid, Legal, CHP+).
- F18 is partly fixed: OQ-515 appears beside the poverty-guideline figure in By outcome and By role.

**Still wrong**

| Finding | Severity |
|---|---|
| Search "countable income" + Enter still lands on Colorado Works (F5) | slows |
| The CO-191 dollar table has no column with the 5% disregard ($3,346.70 for 3), which is what the children's test actually uses at the top | annoyance |
| The dollar table dates the 2026 guideline from January 1. OQ-515 (HCPF uses its memo date) is not mentioned on CO-191 or under the table, only on the guideline row elsewhere | annoyance (figure risk) |
| CO-191's meaning still says "expressed as a decimal fraction of the federal poverty level", right above "142% of FPL" | annoyance |
| The header stutter remains: "a number set by policy parameter", "a rule derived", "per person, per month person-month" | annoyance |
| The lead line still reads "(S638, S641, S675, S676)", not "§ 8.100.4.G.2" | annoyance |
| By outcome's "Figures it depends on" for *children* includes "Colorado state code: CO", the notice receipt days, the Adults upper age and the Pregnant Women limit. It reads as every figure in the chain, not the ones that decide the category | annoyance |

---

## Task 2: Which rules decide the children's category for a 17-year-old, and which facts they need

**What I did**

1. Walkthrough → list of 29 stored households, filterable by program (`20-walkthrough-list.png`). I picked CO-05 ("...
   17-year-old sibling in a continuous eligibility period after an income change ...").
2. It opened on **Person 1, age 68, CHP+: eligibility status** (`21-walkthrough-co05.png`). Neither was what I came for.
   - I picked **Person 3, age 16**, then **Medicaid**. The title says a 17-year-old and the person chip says 16. The
     case author's notes confirm she is 16, so the title is wrong. That cost me a minute of doubt.
   - The default Medicaid outcome was the MAGI covered group, which was right (`22-walkthrough-co05-p3-medicaid-default.png`).
   - The Outcome drop-down has **44 entries**. These include 17 "verification is pending" flags.
3. For January 2027 (`23-walkthrough-co05-p3-magi-group-jan2027.png`) the result reads **"Child"**, then "This is why:
   step 4: Medicaid: child is in a continuous eligibility period is Yes". Each step gives:
   - the rule in "If ... otherwise ..." English;
   - "It used:" with each value and where it came from ("given in the case", "not given", "policy figure", "step N");
   - the rule text paragraph.

   This is the walkthrough I asked for.
4. "Show all 27 steps" (`24-walkthrough-co05-all-steps.png`) reaches step 7, "Medicaid: meets the Children MAGI
   category". It compares household income at 0% of FPL with the 142% standard, with the 5% disregard branch spelled
   out. Note: in January 2027 the children's test is evaluated for **April 2026**, the month continuous eligibility
   started. That is correct, and the step's month label shows it.
5. **Facts.** No single list says "the facts this result needed". I collected them from the "given in the case" and
   "not given" lines across 27 steps: about 15 for this person.

**Finished?** The rules, yes. The facts, mostly, by hand from the steps. **Time:** about 15 minutes (45 last time).
**Confidence:** high on the rules, medium on the fact list.

**Improved**
- I no longer need New household or the 303-field form (F7).
- The case result comes first, not raw fact rows.
- The graph is no longer the only way to see dependencies (F6, partly).

**Still wrong**

| Finding | Severity |
|---|---|
| No "facts this result rests on" summary, grouped (person, tax household, income) | slows |
| The default person and program are the first ones (a 68-year-old, CHP+), not the person the case title is about | annoyance |
| The Outcome drop-down mixes 16 real outcomes with 28 internal and verification items | annoyance |
| Formula text is still unreadable in places. Step 9 (MAGI household income): "this person's Is required to file a tax return and (that person is a child of a person in Medicaid: MAGI household members or ...". Step 10: "someone this person is the tax_filer of is such that: yes" and "this person is the spouse of this person" | slows |
| The case title says "17-year-old" but the person is 16 | annoyance |
| "Continuous eligibility period start month: Unknown, not given" appears on a decided result without saying it did not matter | annoyance |

---

## Task 3: Find every Medicaid item that needs my sign-off, and approve one

**What I did**

1. **Count.** The HCPF role page shows **1,075 items waiting on your sign-off**, broken down by my six roles. For
   example, Medicaid policy owner: 800 and CHP+ policy owner: 677.
2. **Approvals** (`30-inbox-landing.png`) opens on "Signing as Medicaid policy owner", 800 items awaiting. It explains
   why: "it is a Medicaid item (457) · Medicaid outcomes read it (289) · it is shared by all programs (236)". It has
   filters for status, program, tag, "Blocks an outcome" and "Cites unverified text".
   - Items are grouped by chapter, then by figures, rules and inputs.
   - Each row shows the meaning, "Figure today", "What changed", "Affects" (outcomes and test households), sources,
     "Why you sign" and "Also signs ... (0 of 3 signed)".
   - Each row has Approve, Mark reviewed and Request changes buttons.
3. **Finding CO-191.** There is no search box in the inbox. I had to press "Show 25 more of 94 left" in "Medicaid ·
   Parameters" to find it (`31-inbox-CO-191-row.png`).
4. **Approve without a name.** Pressing Approve without a name says "Type your name first: it goes on the signature"
   (`32-inbox-approve-no-name.png`). Good.
5. **Approve with a name.** With "Dana (HCPF)" typed in, Approve says (`33-inbox-approved-staged.png`, `34-inbox-notice.png`):

   > Approval by the Medicaid policy owner (Dana (HCPF), 2026-11-21) staged on 1 item; status would be Reviewed.
   > Staged in this browser only; nothing is signed in the ledger yet. ... Without one [a GitHub token], download the
   > staged change below and send it to your codex steward, who proposes it for you.
6. **Download.** "Download the staged change" gave me a `.md` file (`38-codex-co-signatures-2026-11-21.md`). It
   contains `status: Reviewed` and `approval: - {role: "Medicaid policy owner", by: "Dana (HCPF)", date: "2026-11-21"}`.
   So my approval is no longer silently dropped.
7. **Request changes.** On CO-192 I typed a note. It staged as a separate review file (`37-inbox-request-changes.png`).
8. **The tray** (`35-tray.png`) shows my signature as "CO-191 ... **edit** · **3 warnings**". The warnings are the
   same "dup.similar Close to ma_income_limit_pregnant_pct (0.84)" noise as before. Propose is greyed: "Add a GitHub
   token in Settings".
9. **Item page afterwards.** CO-191 still says "(0 of 4 signed)", with no sign of my staged approval
   (`36-item-CO-191-after-approve.png`).

**Finished?** Partly. I listed my queue and recorded an approval with my name and date, but it reaches the codex only
if someone with a GitHub token proposes it, and the app does not say who my "codex steward" is. **Time:** about
10 minutes (gave up at 30 last time). **Confidence:** high that the queue is right, medium that my approval will land.

**Improved**
- F1 is mostly fixed: a real queue, status, an Approve button with name and date, an honest "staged only" message and
  a download path.
- F8 is fixed: the approver lists agree.
- F12 is fixed: the Table's Program filter lists every program, though as raw ids such as "ColoradoWorks",
  "AdultFinancial" and "SunBucks".

**Still wrong**

| Finding | Severity |
|---|---|
| The approval reaches the ledger only through a GitHub token or a "codex steward" nobody is named as | slows (blocks for anyone without a steward) |
| No search or item filter inside the inbox. One role's queue is 800 rows, 25 at a time | slows |
| One queue per role: HCPF has six roles and 1,075 items, and the same item (CO-191) asks me as Medicaid owner, CHP+ owner and State plan coordinator. There is no "all my roles" list | slows |
| "Affects" looks too broad to trust. "HCBS adult waiver minimum age" affects "Medicaid: MAGI eligibility status". "PACE minimum age" affects the BCCP status. "Transfer penalty divisor" affects MAGI eligibility status. Nothing explains why | slows (approval risk) |
| I pressed **Approve** and the page says "status would be **Reviewed**". It means "Approved by you, 3 other signers to go", but it reads as if my approval was downgraded | annoyance |
| The tray calls a signature an "edit" with "3 warnings" (dup.similar) | annoyance |
| The item page does not show a staged signature, and has no Approve button of its own | annoyance |
| "Showing 800 items" after staging: the counts do not move until the change is merged, though the notice says "1 signature" | annoyance |

---

## Task 4: The open questions HCPF must answer for long-term care, and an answer to one

**What I did**

1. **Questions** → "Decision queue (80) · Departures (7)" (`40-questions-landing.png`). It has filters for program,
   owner, "Kind of question", search, "Affects an outcome", "Blocks certification" and "Only HCPF policy's (6 roles)".
   - With my roles it shows 51 questions, grouped by owner.
   - Each card shows the class ("State policy choice", "Blocked on a named document", "Needs Legal", "Ledger design"),
     "Partly resolved" as a badge, "In force meanwhile", "Waiting on", "Rule text it turns on", "Items carrying it" and
     "If answered the other way".
   - Resolved questions are now separate and folded.
2. **Owner = LTSS policy owner** gives 9 questions: OQ-99, 212, 214, 471, 516, **519**, 520, 560 and 250
   (`42-questions-owner-ltss.png`). Compared with my hand-made list last time:
   - It adds OQ-214, OQ-560 (community spouse utility allowance) and OQ-250 (Home Care Allowance).
   - It leaves out OQ-200 and OQ-472, which belong to the Medicaid owner alone. That is fair.
3. **Search.**
   - "long-term care" does **nothing**: still 51 shown (`41-questions-search-long-term-care.png`).
   - "nursing facility" gives 4. "LTC" gives 1 (`41-questions-search-LTC.png`).
   - The search applies only when I press Enter, unlike every other filter.
4. **OQ-519 has its own page now** (`43-oq-519-page.png`). It shows:
   - who answers: Medicaid policy owner and LTSS policy owner;
   - the class, "Blocked on a named document";
   - the reading in force;
   - "Waiting on: The memo is on hcpf.colorado.gov and was not fetched";
   - four rule excerpts;
   - the item it carries (patient payment, CO-658);
   - "13 results in 3 of 29 stored households" (CO-01, CO-02, CO-06);
   - an **Answer this question** form: decision, citation, decided by, role and date.
5. **Answering.** I wrote my answer (no ACF patient payment until the IM 25-030 figures are entered; do not default to
   the nursing facility figure), cited § 8.100.7.B.3 and IM 25-030, and pressed **Stage the answer**
   (`45-oq-519-answer-filled.png`, `46-oq-519-answer-staged.png`). The page says it is staged and offers follow-ups:
   "Take OQ-519 off the 1 item that carry it" and "Edit Medicaid: patient payment".
6. **The queue afterwards.** Back in the queue, OQ-519 still shows "Open" with an **Answer** button and no staged
   marker, even after a reload (`48-queue-after-answer.png`).

**Finished?** Yes, the answer is staged. It still needs a token or a steward to reach the codex, and the question page
has no download button (the inbox has one). **Time:** about 12 minutes (40 last time). **Confidence:** medium-high
that the LTC list is complete.

**Improved**
- F2 is fixed: questions have pages, owners and an answer action.
- F16 is fixed: open and resolved are separated, and "Partly resolved" is a badge.

**Still wrong**

| Finding | Severity |
|---|---|
| "The reading in force" is still authoring history: "The HCPF review's note C-13: § 8.100.7.B.3 states ... which HCPF's IM 25-030 [K] updates" | slows |
| "If answered the other way" is worked out for only **5 of 80** questions (OQ-104, 204, 410, 411, 533). The other 75 say "N stored results in N households rest on it. The question names no single other value, so the new values are not worked out." | slows |
| After an answer is staged, the queue still lists the question as Open with an Answer button. Two of us could answer it twice | annoyance |
| Search for "long-term care" does not filter, and search waits for Enter | annoyance |
| The question page has no "download the staged change" for someone without a GitHub token | slows |
| The counts disagree. By role says **"40 open questions you own" (Medicaid 37, CHP+ 4)**. Questions shows **51** for my six roles, with groups Medicaid 37 and **CHP+ 3** | annoyance |

---

## Task 5: Is the H.R.1 October 2026 immigrant restriction in the codex, and which households does it change?

**What I did**

1. **Search.** "H.R.1" now finds 44 results, including CO-2400 and CO-3034 (`50-search-HR1.png`). The first hit is the
   student-loan item. "refugee" finds 45 (`51-search-refugee.png`).
2. **By role.** My role page's "What changed recently" lists **"October 1, 2026 · Rule takes effect · Medicaid: is in a
   status category for which federal payment is available from October 2026 (CO-2400)"**, with its rule text, "Open
   questions: OQ-510, OQ-518" and "Stored households that read it: CO-01 ... and 9 more".
3. **OQ-518** (`60-OQ-518.png`) and **OQ-517** (`60-OQ-517.png`) each have their own page, with who answers (Legal and
   Medicaid owner) and the reading in force. Both say "245/247 results in 16/17 households rest on it", not worked out.
4. **By outcome → Household view.** I picked CO-74 (September 2026), then CO-75 (November 2026)
   (`53-outcomes-household-CO-74.png`, `53-outcomes-household-CO-75.png`). Persons 1, 2 and 4 go from "Medicaid:
   adults (expansion group) PH-MA-ADULT, Paid from Title XIX" to "**Emergency Medicaid: eligible, no current
   emergency** PH-MA-EMERG-NC, Paid from Title XIX emergency". Person 3 stays "Medicaid: children".

**Finished?** Yes for "is it in the codex". For "which households", yes for the two test households, by flipping
between two screens. **Time:** about 10 minutes (30 last time). **Confidence:** high on the rule, medium on the impact.

**Improved**
- Plain outcome names and funding ("Paid from Title XIX emergency") instead of `emergency_only` / `title_xix_emergency`.
- Search reaches the item from "H.R.1" (F5, partly).
- The dated change is listed on my home page.

**Still wrong**

| Finding | Severity |
|---|---|
| No before/after comparison. "Stored households that read it" (17) is not "households it changes", and the two pages must be compared by eye (F9) | slows |
| The household view calls people "Person 1 ... Person 4". It does not say who is the refugee, the asylee or the parolee | annoyance |
| Relationship sentences are broken English: "Person 1 is the files jointly with of Person 2", "Person 1 is the buys prepares with of Person 3" | annoyance |
| Most of the household grid is "Not known: a fact this needs is not stated" for programs the case never tests | annoyance |
| My role page says **"0 statute-over-rule departures"**, yet the codex follows 42 U.S.C. 1396b(v)(5) over § 8.100.3.G.1.g (OQ-518, classed "Needs Legal"). An HCPF reader would conclude Medicaid has none | slows (misleads) |

---

## New task: decide a State plan choice by its effect on households (OQ-410)

The views were meant to let me answer a question "the other way" and see what that does before I sign. I tried OQ-410,
the community engagement look-back months.

1. **The question page** (`70-oq-410.png`) states the other reading in plain words: "Require community engagement for
   three months before the month of application ... (look-back months at application 1 becomes 3)". Then: "Re-running
   the 29 stored households with that one change: **3 results in 1 household change**". The table for CO-73 Person 1
   reads:
   - Met → **Unknown**;
   - Adult → **Unknown**;
   - Eligible → **Unknown**.
2. **Staging.** I chose "Adopt the other reading", wrote the decision and citation, and staged it
   (`71-oq-410-answer-filled.png`, `72-oq-410-staged.png`). Adopting the reading **did not change the figure**. That
   took a second button, "Stage the new value: ... becomes 3". The confirmation then read "Staged: CO-1902, CO-1902,
   CO-1903, ...", with CO-1902 twice.
3. **The tray** (`73-oq-410-tray.png`) shows two red lines: "Example CO-1973-T1: expected [2027-02], got [2026-12,
   2027-01, 2027-02]" and "Example CO-1974-T1: expected met, got unknown". Its Impact is 35 code names
   (`chp_child_is_eligible, ...`).
4. **The Approvals inbox** then shows the CO-1902 row with "What changed: Staged in this browser ... Figure: 1 → 3;
   Open questions removed: OQ-410" (`74-inbox-staged-change-CO-1902.png`). The row was on the second page of the
   Medicaid parameters chapter, not at the top.

**Finished?** Yes, the answer and figure are staged. **Time:** about 12 minutes. **Confidence:** medium.

| Finding | Severity |
|---|---|
| "Unknown" under the other reading means the stored household does not state the two earlier months. It does not mean the person fails. The page does not say so, and I nearly read it as "she loses coverage" | slows (misreading risk) |
| Adopting the other reading does not stage the new figure. A second button does | annoyance |
| The tray shows failing rule tests as code ("expected [2027-02], got [...]") with no plain "2 rule examples now disagree; update them?" | slows |
| The question page says "1 household changes". The inbox row for the same staged figure says "Affects 14 test households". The words are close and the measures are not | annoyance |
| The reading in force names each figure twice: "(Medicaid community engagement: look-back months at application, Medicaid community engagement: look-back months at application)" | annoyance |
| A staged change is not pulled to the top of the inbox | annoyance |

---

## Summary of the five tasks

| Task | First report | Retest | Time then → now | Confidence now |
|---|---|---|---|---|
| 1 Countable income + 2026 children's figure | Partly | **Yes** | 35 → 10 min | High (figure), medium-high (definition) |
| 2 17-year-old: rules and facts | Partly | Rules yes; facts by hand from steps | 45 → 15 min | High / medium |
| 3 My sign-off queue; approve one | No (blocked) | **Partly**: queue yes; approval staged and downloadable, not in the ledger | gave up at 30 → 10 min | High (queue), medium (landing) |
| 4 LTC questions; propose an answer | Partly; could not propose | **Yes** (staged) | 40 → 12 min | Medium-high |
| 5 H.R.1 Oct 2026 and households | Rule yes; households by eye | Same, with plain codes | 30 → 10 min | High / medium |
| New: decide OQ-410 by its effect | n/a | Yes (staged) | 12 min | Medium |

## My top 5 remaining problems

1. **My signature still does not reach the codex by itself.** It needs a GitHub token or an unnamed "codex steward".
   The tray calls it an "edit" with warnings, and the item page never shows it.
2. **"What changes" is mostly "what reads it".** 75 of 80 questions are not worked out. The inbox's "Affects" and the
   role page's "Stored households that read it" count dependence, not change, and some look implausibly broad (a
   PACE age affecting BCCP). Where it is worked out, "Unknown" is not explained.
3. **The inbox is hard to move around in at HCPF's scale.** It has no search, one queue per role (six roles, 1,075
   items, the same item under three of my roles), 25 rows at a time, and staged changes buried in chapter order.
4. **Authoring history and code still sit where I read policy.** Examples: "The HCPF review's note C-13 ... [K]",
   "Person 1 is the files jointly with of Person 2", the MAGI household income formula sentence, and "a number set by
   policy parameter".
5. **Numbers disagree between views**, which makes me doubt all of them:
   - 40 vs 51 open questions, and CHP+ 4 vs 3;
   - HCPF "0 departures" while Medicaid follows H.R.1 over § 8.100.3.G.1.g;
   - "1 household changes" vs "Affects 14 households".

   Search still sends "countable income" to Colorado Works.

## Does each view earn its place?

| View | Verdict | Why |
|---|---|---|
| **Approvals** (inbox) | **Yes: the most valuable** | It turned a task I could not do into a 10-minute one. It needs search, an all-my-roles list, and a sign-off that lands without GitHub. |
| **Questions** | **Yes** | Own pages, owners, classes and an answer form fix my F2. The "other way" effect needs to be worked out for many more questions. |
| **Walkthrough** | **Yes** | It is the CBMS-ticket tool I asked for. It needs a facts summary and better defaults for person and outcome. |
| **By role** | **Yes, as the home page** | Good front door. Its counts must agree with Questions and Approvals, and its departure count must include Medicaid. |
| **By outcome** | **Yes for the household view; less so for the aid-code list** | Placeholder codes are clearly marked. The household grid answered Task 5. "Figures it depends on" is too broad to sign from. |

## What is now wrong or confusing in the views themselves

- **Owner and class on questions.**
  - Mostly sensible: OQ-519 is Medicaid + LTSS, and OQ-518 is Legal + Medicaid.
  - OQ-515's "Who answers" lists SNAP and Cash owners beside Medicaid and CHP+, though its title names Medicaid, CHP+
    and MSP.
- **"Reading in force".** It often repeats the authoring history ("HCPF review's note C-13", "[K]", "HCPF review B-1")
  instead of stating the current position in one sentence. On OQ-410 it duplicates each figure's name.
- **Counts.**
  - Role page "40 questions" vs Questions "51".
  - CHP+ 4 vs 3.
  - HCPF "0 departures".
  - Inbox count does not move after staging.
- **Labels.**
  - "status would be Reviewed" after Approve.
  - The tray's "edit · 3 warnings" for a signature.
  - Outcome value "Not eligible: OAP c" on the role page.
  - Table program ids "ColoradoWorks", "AdultFinancial" and "SunBucks".
  - Relationship sentences "is the files jointly with of".
- **Aid-code cells.** "Not known: a fact this needs is not stated" fills most of the household grid. Placeholders are
  clearly marked "PH-... placeholder", which is right.
- **Dollar table on CO-191.** It has no 5% disregard column, and it dates the guideline from January 1 without
  mentioning OQ-515.
- **Walkthrough.**
  - It defaults to the first person and program.
  - The 44-entry outcome list mixes in verification flags.
  - The case title "17-year-old" contradicts "Person 3, age 16".
- **Due dates.** CO-05's "Documents still needed" said "Nothing is pending", which is right for this case. I did not
  test a case with pending verifications.
