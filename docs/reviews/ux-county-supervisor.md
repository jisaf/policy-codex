# UX discovery: county eligibility supervisor (phase 13)

**Persona.** Rosa is an eligibility supervisor in a county human services office. Twelve caseworkers report to
her, across SNAP, Medicaid, Colorado Works and CCCAP. She knows the program rules well. She does not know YAML,
git or code. Her caseworkers and the families they serve keep asking her, "Why did this case come out this
way?"

**How the app was run.** I ran `npm run build` and then `npx vite preview --port 4304 --strictPort`. The app has
no local-ledger or dev mode: `src/ledger/source.ts` always reads `raw.githubusercontent.com/jisaf/policy-codex/<ref>`,
and the README says `npm run dev` "reads the ledger from GitHub main". GitHub main has no Colorado volume. So I
drove the app with Playwright (`/opt/node22/lib/node_modules/playwright`, `chromium.launch()`, deviceScaleFactor 1)
and answered every raw.githubusercontent.com request from the files on disk, the same way
`e2e/fixtures/ledger.ts` does. Requests to api.github.com got a 404. As a result, the change history on item
pages is empty in this walkthrough. Then I chose "Colorado eligibility rules..." in the volume picker.

**State tested.** Commit 6343635, branch `ccr-9d19bf4c-wmnwcl`, with the current local `co` volume (27 cases).

**Artifacts.** Screenshots and the text dumps of the same panels are in `/tmp/claude-0/ux/county-supervisor/`.
Where I checked the app's answers outside the app (marked **[checked outside the app]**), I used three scratch
engine scripts in my scratchpad. Rosa could not do this. I edited nothing in the repo except this file.

---

## 1. The tasks, step by step

### Task 1: "Aid codes" for every person in CO-01 / CO-02

**What I did.**

1. I opened the app. The default volume is the H.R.1 work-requirements volume, not Colorado (`01-first-visit.png`).
   I clicked "Check how a household is decided", which opened *Cases* for the wrong volume (`02-door-cases-mwr.png`).
2. I switched the volume picker to Colorado. The app jumped to *Programs*, not *Cases* (`03-co-cases-list.png`), so
   I clicked *Cases* again.
3. The case list's "Results by program" shows chips like "SNAP 181/181" (`04-co-cases-list.png`). I first read
   181/181 as "181 people approved". These are test counts.
4. I opened CO-01, which took about 10 seconds. The page opens on "Supplied facts" for p1, 1,200 rows of
   yes/no/0 (`05-co01-top.png`). The page is **85,800 px tall**.
5. I scrolled to "Expectations" (`06-co01-expectations-head.png`). It holds about 840 rows, sorted by person and
   then by no order I could see. Programs are mixed together.
6. To build the "aid code" list, I used Ctrl-F on "eligibility status", "category" and "this person's
   participation", one person at a time. The person-level rows ("SNAP: this person's participation") sit about
   5,000 px below the household rows they qualify (`30-co01-p3-participation-row.png` vs
   `31-co01-p3-snap-eligible-row.png`).

**What I could assemble.** All of it had to be done by hand.

| Person | Medicaid / CHP+ | SNAP | Colorado Works | CCCAP | LEAP (Nov, CO-02) | SUN Bucks |
|---|---|---|---|---|---|---|
| p1, grandmother, 79 | LTC **eligible_institutional**, patient payment 106.14 (shown `106.1400000000001`) | not_in_household | not in unit (no dependent child) | other household member | not_in_household | ineligible |
| p2, grandfather, 81 | MAGI ineligible_no_category; no SSI-related, MSP or Buy-In category. Only coverage: "family planning: **limited_family_planning**" | eligible_member, $336 household | not in unit | other household member | eligible_member, benefit **unknown** | ineligible |
| p3, mother, undocumented | MAGI emergency_only; reproductive_health_care_program | **ineligible_member_non_citizen** (her row still reads "eligibility status: eligible, allotment 336") | not_in_unit_did_not_request | other household member, but "CCCAP: eligibility status eligible_low_income, fee 30" on her row | ineligible_member_status (her row reads "LEAP: is eligible yes") | ineligible |
| p4, 17, minor parent | MAGI child, eligible; CHP+ no (Medicaid eligible) | eligible_member | "this person's participation: **eligible_member**" but "eligibility status: **ineligible_income**" | caretaker, fee 30 | eligible_member, benefit unknown | eligible_categorical, amount **unknown** |
| p5, baby | needy_newborn, eligible | eligible_member | eligible_member / ineligible_income (as for p4) | eligible_child | eligible_member, benefit unknown | ineligible |

**Where I got lost.**

- **"Which Medicaid am I looking at?"** p1 has twelve Medicaid status rows: MAGI, SSI-related, MSP, Buy-In,
  LTC, emergency, BCCP, family planning, OAP health care, protected group, needy-young-person and hospital PE.
  Eleven of them say none, ineligible or not_applicable. Nothing on the page says which one is *her* coverage.
- **The aid-code-like item exists but is hidden.** The volume computes `ma_funding_source` (CO-2456:
  title_xix, title_xix_emergency, title_xxi, state_only...), which is the closest thing to what CBMS would
  assign. CO-01 does not expect it, so it never appears on the case page. **[checked outside the app]** It gives
  p1–p2 and p4–p5 title_xix and p3 title_xix_emergency.
- **An odd result I would take to policy.** p2 is an 81-year-old man with `has_reproductive_capacity: no`.
  His only Medicaid result is "Limited Family Planning" (title XIX). The rule tests reproductive capacity only
  on the status-failing path (CO-1154 precision). I don't know whether § 8.100.4.G.8 intends this, but it would
  look wrong on a notice. The app gave me no way to flag it.
- **Person and household are still easy to mix up.** The person-level "participation" items now exist (an
  improvement since the caseworker review). But p3's own "SNAP: eligibility status" row still says
  **eligible / 336**, and p4 is an "eligible_member" of a Colorado Works unit whose status is "ineligible_income".
  A worker reading row by row tells p3 she is approved.
- **"unknown" with a green "yes".** CO-02's LEAP benefit and p4's SUN Bucks amount read Expected "unknown",
  Got "unknown", OK "yes". To me, "OK yes" means approved.
- **Raw codes**: `not_applicable_status_met`, `ineligible_no_category`, `eligible_institutional`,
  `expanded_categorical`, `reproductive_health_care_program`.

**Finished?** Yes, but only by reading every row and building the grid in a notebook. **Time:** about 45–60
minutes for one household of five, plus about 20 for CO-02 to see what moved. **Confidence:** medium. I am sure
the values are what the codex says. I am not sure I picked the right row as "the" answer for Medicaid.

### Task 2: Step through p2's SNAP determination and find where +$200 income changes the outcome

**What I did.**

1. I clicked p2's "SNAP: eligibility status" row. The story (`08-p2-snap-elig-story.png`) is good. It reads:
   "number of eligible household members 3; meets gross income test yes; meets net income test yes; meets
   resource limit yes; full month allotment 336".
2. I clicked "SNAP: allotment". The story says only "is the initial month yes ... prorated initial month
   allotment 336" (`07-co01-p2-snap-allotment-click.png`). This is the step I care about, and it gives no budget.
3. I clicked "Show everything" (`09-p2-snap-allot-everything-1.png`) and opened four levels of ▸
   (`09-p2-snap-allot-everything-expanded.png`, text in `09-p2-snap-allot-tree.txt`, 470 lines). The prorated
   allotment's rule reads: "otherwise 0 minus (0 minus (((the greater of 0 and 0 minus (SNAP: benefit reduction
   minus SNAP: maximum allotment rounded up..." I could not read this aloud to a worker.
4. I hunted down these figures one at a time:
   - gross income: 2965 (ECE limit 4554)
   - categorically eligible, so the gross and net tests are waived
   - elderly member, so the shelter deduction is uncapped
   - adjusted income: 2391
   - shelter costs: 2016
   - excess shelter deduction: 820.5
   - net income: 1571
   - benefit reduction: `471.29999999999995`
   - maximum allotment: 808
5. To answer "+$200", I had to do the arithmetic myself. The app has no what-if on an existing case, and the
   one-person "New household" form cannot hold this family (task 3).

**My answer.** **[checked outside the app]** I confirmed it by running the engine with p2's Social Security
raised from 1180 to 1380.

- **No eligibility test changes.** Gross income goes to 3165, still under the $4,554 Expanded Categorical limit.
  The net income test stays waived because the household is categorically eligible.
- The change comes through **the shelter deduction and the 30% benefit reduction**:
  - adjusted income: 2391 → 2591
  - excess shelter deduction: 820.5 → 720.5 (half of the extra $200 is lost)
  - net income: 1571 → 1871
  - benefit reduction: 471.30 → 561.30
  - **allotment: 336 → 246 (−$90)**
- If instead **p3's wages** rise $200 (she is an ineligible member whose income is counted), SNAP drops to
  $282. **CCCAP's parent fee for p4 goes from $30 to $54**, a cross-program effect I would never have found
  in the app.

**Finished?** Only by doing my own arithmetic on numbers I dug out of a tree. **Time:** about 40 minutes.
**Confidence:** low inside the app, because I could not confirm the result. High after the outside check.

### Task 3: Enter a new household (single mother, 30 h/wk at $15, children 4 and 9, rent $1,200)

**What I did.**

1. I clicked Cases → "New household" (`10-new-household-empty.png`) and ticked SNAP, Medicaid, Colorado Works
   and CCCAP. The count went from 150 facts for SNAP alone to **"106 outcomes need 458 supplied facts"** and
   436 input fields on a 24,600 px page (`11-new-household-4-programs.png`).
2. "Try an example" has **no examples** for Colorado (`28-new-household-try-example-empty.png`). The ? panel still
   says it fills from "a household already in the ledger" (`27-help-panel-cases.png`). It only accepts one-person
   cases, and Colorado has none.
3. **There is no way to add the two children.** The form is for "the person" (p1) only. There is no relationships
   field and no "add person" button.
4. I entered the mother's facts:
   - date of birth
   - citizen
   - Denver
   - gross wages: $1,950/month. I had to convert 30 h × $15 × 52 / 12 myself, because the form asks for a
     monthly figure.
   - hours worked: 130/month. The label says "Hours worked" with no unit; I opened the item to learn it means
     per month.
   - shelter cost: $1,200
   - application dates: SNAP, Medicaid and Colorado Works each ask for their own. I could not find a CCCAP one.
   - pregnant: no
   - requesting health coverage: yes
5. I clicked Evaluate (`12-new-household-outcomes-top.png`, all 106 results in `12-new-household-outcomes.txt`).

**What it told her.** 90 of 106 outcomes were **unknown**.

- **SNAP eligibility: "unknown because number of eligible household members is unknown"**, with **no "Not
  answered" line** (`29-new-household-snap-unknown-no-hint.png`). This is the caseworker's S6 finding, still
  there. The real reason is that I could not state the household.
- **CCCAP: unknown.** The first missing facts listed were "Open Protective Services child care referral" and
  "Self-employment gross receipts". It also lists "CCCAP county entry income limit, percent of FPL", which is a
  county policy setting, not something the mother can tell me.
- **Colorado Works: unknown.** It asks for "requests inclusion in the assistance unit". That is reasonable, but
  there is no child to be in the unit.
- **Medicaid MAGI: unknown.** It asks for "Is incapable of indicating intent" and "State of residence", although I
  had already picked a Colorado county.
- **The parameters list is long.** It runs as of 2026-10-01 by default, although today is 2026-11-21.

**Finished?** **No. This blocks the task.** I could not enter the household, so I got no answer for the mother
or her children. **Time:** about 30 minutes before I gave up. **Confidence:** none in any result.

### Task 4: Documents still needed for CO-92, for whom, by when

**What I did.**

1. I opened CO-92: 23,000 px, 204 expectations (`13-CO-92-top.png`). Each person has about 95 "...verification is
   pending" rows, nearly all "no". I read them with Ctrl-F "yes".
2. Due-date rows now appear near the top of each person's expectations (`14-co92-due-dates.png`). This is new
   since the caseworker review.
3. I clicked the pending rows to read the stories (`15-`, `16-`, `17-...png`).

**What I could assemble.** The case is "as of 2026-10-15".

| Who | Document | Programs | Due (as the page shows) |
|---|---|---|---|
| p1 mother | Immigration document (SAVE has not answered) | SNAP, Medicaid, Colorado Works (it lists both "lawful presence" and "immigration status") | SNAP non-citizen 2026-10-31; CW status 2026-10-31; Medicaid reasonable opportunity to 2027-01-04 |
| p1 | Proof of work hours | CCCAP | **not shown in the app.** **[checked outside the app]** `cccap_verification_due_date` = 2026-10-16 |
| p2 child | Immigration document | SNAP, Medicaid, CHP+, Colorado Works | SNAP and CW 2026-10-31; Medicaid/CHP+ 2027-01-04 |

**Where I got lost.**

- **The CCCAP deadline is missing from the page**, and so are the CHP+, LEAP and AF dates. The page shows the
  SNAP, CW and Medicaid dates only because the case author chose to expect them.
- **The SNAP verification due date reads 2026-10-11**, four days before the as-of date, while the status still
  reads "pending", not "past due". The story shows the date ten lines down (`17-co92-p1-snap-verif-status.txt`).
  I could not tell which date governs the immigration document: 10-11 or the non-citizen 10-31.
- **CHP+ for p1** shows verification status "not_applicable" with a pending count of **1**. The story for the count
  is a list of seven "no" lines and "Medicaid: pending status verification count is 1"
  (`16-co92-p1-chp-pending-count.png`). The caseworker's B2.2 finding is still there.
- **The counts don't add up.** CW pending count is 3, but "person's pending verification count" is 2. SNAP pending
  count is 2 per person, but the person count is 1. I could not tell which count is the household's and which is
  the person's.
- **I cannot move the case to today's date.** The case is frozen at 2026-10-15. Today (2026-11-21) every date
  except Medicaid's has passed, and the app cannot tell me "past due as of today".

**Finished?** Partly: I missed the CCCAP date without outside help. **Time:** about 25 minutes. **Confidence:**
medium on what is owed, low on the deadlines.

### Task 5: What changed in the rules this month, and which open cases it could affect

**What I did.**

1. I searched for "what changed" and got "Nothing matches". Searching "November 2026" returned one open
   question (OQ-510) (`21-search-november-2026.png`). Searching "effective" returned 200 results; "amendment"
   returned 43.
2. Browse → Documents lists 136 documents with no dates column and no "new" marker (`22-documents.png`).
3. On *Programs* → LEAP → "Parameters in force", the "As of" date defaults to **2026-10-01**
   (`19-leap-params-default.png`), and "LEAP income limit" reads **unknown**. Setting it to 2026-11-21 showed the
   limit. Nothing marks what changed between the two dates. I had to compare two screens row by row
   (`20-leap-params-oct15.png`).
4. I opened the LEAP income limit item (`23-`, `25-item-leap-income-limit-open.png`).
   - Its headline is "A number set by policy: **table**".
   - Its Versions row also says "table", so I could not see the dollar figures.
   - The precision paragraph (380 words) mentions the "rule amendment effective November 1, 2026 (D-173)".
   - The change-history section loads from GitHub, which has no Colorado volume, so it was empty.

**My answer.** **[checked outside the app]** I found it by reading the ledger files, not the app.

- **November 1, 2026 (this month):**
  - The LEAP heating season opens.
  - The new 2026-27 LEAP income table applies (CO-875).
  - The LEAP rule amendment (D-173) takes effect.
  - The **LEAP benefit cannot be computed**: the statewide adjustment rate, minimum and maximum are unpublished
    (OQ-532), so every CO-02 LEAP benefit is "unknown".
- **October 1, 2026 (last month):**
  - SNAP's fiscal year 2027 figures change (22 parameters, CO-110..CO-135, CO-323/324, CO-1235..1238,
    CO-1804/1805).
  - **The federal payment limit for non-citizens** begins (CO-2400/CO-2401, OQ-510): refugees, asylees and
    parolees lose full Medicaid.
- **Affected cases:**
  - LEAP: CO-01, CO-02, CO-08, CO-91, CO-92. The LEAP program page lists these. That list is the only "affected
    cases" view the app has.
  - The payment limit: CO-74/CO-75. The case titles say so; nothing links them to the rule.

**Finished?** **No, not in the app. This blocks the task.** **Time:** 30+ minutes, and I would have given up and
emailed the state. **Confidence:** low.

---

## 2. Words and screens that confused me

| Quote | Where | Why |
|---|---|---|
| "Work requirements under H.R.1, Medicaid community engagement and the SNAP ABAWD time limit" | default volume | I didn't know the Colorado rules were behind the dropdown. |
| "SNAP 181/181", "839/839 expectations met" | case list, case header | These read as approval counts. They are test counts. |
| "Expected / Got / OK yes" | every case row | "OK yes" next to "unknown" looks like approval. |
| "Supplied facts" | top of the case page | I had to scroll past 1,200 rows to reach the answers. |
| "Relationships: none stated" | under every person, CO-01, CO-92 | The family is stated. The caseworker's S7 finding is still there. |
| "eligible_member" next to "ineligible_income" | p4, Colorado Works | Is she a member of nothing? |
| "not_applicable_status_met", "ineligible_no_category", "limited_family_planning" | Medicaid rows | Raw codes with no label. |
| "SNAP: migrant household in the job stream with a break of thirty days or less is unknown" | SNAP allotment story | The first thing the allotment story tells me is an unknown about migrants. |
| "0 minus (0 minus (((the greater of 0 and 0 minus (..." | SNAP prorated allotment rule | Not readable. |
| "471.29999999999995", "106.1400000000001" | trace, patient payment | Money with floating-point noise. |
| "A number set by policy: table" | parameter item page | Where is the table? |
| "106 outcomes need 458 supplied facts. Anything left blank is unknown." | New household | This scared me off at once. |
| "Hours worked" (no unit) | New household | Per week? Per month? |
| "CCCAP county entry income limit, percent of FPL" listed as "Not answered" | New household | A county setting presented as a question for the client. |
| "Approach A projection", "Decision record", "evaluated / memo / case" badges | item page, trace | Not my language. |
| "Try an example" with an empty list | New household | The help promises it. |

## 3. What I needed and couldn't find

- A one-screen **person × program result** (status, amount, coverage type) for a case.
- **Which Medicaid coverage a person actually has**, as one value. `ma_funding_source` exists but is not shown.
- A **budget view** for SNAP (and the CW grant and patient payment), like the one on a notice.
- **What-if**: change one fact on an existing case and see what moves, across all programs.
- **A multi-person intake** with relationships, entered in the units an applicant gives (hours per week, hourly
  wage).
- A **documents-owed checklist**: per person, per document, the programs it clears, the governing due date, and
  "past due as of today".
- **"What's new"**: rules and figures whose effective date falls in a chosen month, with the cases that read them.
- **Today's date as the default** "as of" date.
- A way to **flag a result as questionable** (p2's family planning) and send it to the state.

---

## 4. My top 5 wishes

1. **"Show me each person's programs on one screen."** Person down the side, program across the top. Each cell
   gives the outcome in words, the amount and the coverage or aid code. Click a cell to see why.
2. **"Let me change one thing and see what moves."** Raise income $200, add a child, change the rent. Show what
   changed in every program, highlighted.
3. **"Give me the budget like a notice."** Gross, each deduction, net, 30%, maximum, benefit, in dollars and
   cents, with the rule citation beside each line.
4. **"Give me the to-do list for a case."** Who owes what document, for which programs, by what date, and what is
   past due today.
5. **"Tell me what changed this month and whose cases it touches."** A list of rule and figure changes by
   effective date. Each one shows before and after values and links to the open cases that read it.

**Which candidate views would help most.**

- **(a) By aid code / outcome: most helpful, for tasks 1 and 5.** If the case page opened on a person × program
  grid of aid codes (placeholders are fine if clearly marked), task 1 would take about 2 minutes instead of 45.
  If each aid code page listed "rules this depends on" and "figures this depends on, with effective dates", I
  could answer "what changed and who is affected" from it.
- **(d) Step-through case walkthrough: second, for task 2 and every "why" question.** One rule per step, in plain
  words, with the values at that step and "what would flip this", for example: "net income would have to fall
  under $X" or "gross income has $1,589 of room before the $4,554 limit". Adding what-if to the walkthrough
  would answer my task 2 directly.
- **(b) Open-question decision queue: some help.** The LEAP benefit is "unknown" because of OQ-532. A queue
  would at least tell me the state owes an answer and who owns it. I would not answer questions myself, but I
  would want to see which ones touch my cases.
- **(c) By role/agency: little help to me.** I am the county, not a state owner. It would help me know whom
  to email, for example HCPF for the family-planning oddity.
- **(e) Approvals inbox: no help to me directly.** But a "recently approved" feed, filtered to what took effect,
  is what task 5 needs.

None of the five covers **task 4, documents owed**, or **task 3, intake**. A per-case documents checklist and a
multi-person what-if form are the two gaps that are not on the candidate list.

**My ideal screen: case summary (person × program, aid-code view)**

```
+-----------------------------------------------------------------------------------+
| CO-02  Garcia household (5)        As of [2026-11-21 v]   [What if...] [Documents] |
+-----------------------------------------------------------------------------------+
|            | Medicaid/CHP+       | SNAP           | Colo Works   | CCCAP    | LEAP  |
|------------+---------------------+----------------+--------------+----------+-------|
| Rosa (p1)  | LTC nursing facility| not in SNAP hh | not in unit  | -        | -     |
| 79, wife   | XIX  [PH-LTC1]      | (institution)  |              |          |       |
|            | pays $106.14/mo     |                |              |          |       |
| Luis (p2)  | Ltd family planning | MEMBER         | not in unit  | -        | MEMBER|
| 81         | XIX  [PH-LFP]  (!)  | hh $336/mo     |              |          | $ ?   |
| Ana (p3)   | Emergency only      | NOT ELIGIBLE   | did not ask  | parent   | NOT   |
| 41         | XIX-E [PH-EMR]      | (status) income|              | fee $30  | ELIG  |
|            |                     | counted        |              |          |       |
| Mia (p4)   | Child  XIX [PH-CH]  | MEMBER         | unit DENIED  | teen     | MEMBER|
| 17         |                     |                | income       | parent   |       |
| baby (p5)  | Newborn XIX [PH-NB] | MEMBER         | unit DENIED  | child    | MEMBER|
+-----------------------------------------------------------------------------------+
| (!) flagged by me: "81-year-old on family planning?"  [send to HCPF]             |
| $ ? = LEAP benefit unknown: state has not published season figures (OQ-532)       |
| [PH-...] placeholder aid codes, to be replaced with CBMS codes                    |
+-----------------------------------------------------------------------------------+
  click any cell -> step-through:  1 Household: p2,p4,p5 (p3 excluded: status)
                                   2 Gross $2,965  <= $4,554 ECE limit   (room $1,589)
                                   3 Adjusted $2,391  Shelter $2,016  Excess $820.50
                                   4 Net $1,571  x 30% = $471.30
                                   5 $808 max - $471.30 = $336     [what if income +$200 -> $246]
```

---

## 5. Findings and severity

| # | Finding | Severity | Tasks |
|---|---|---|---|
| U1 | New household holds one person. There is no way to add children or relationships, so SNAP, CW and CCCAP all come out unknown with no hint why. | **blocks the task** | 3 |
| U2 | No "what changed" view: no effective-date filter, no diff of figures between dates, no link from a change to the cases it touches. Item history comes from GitHub only. | **blocks the task** | 5 |
| U3 | No what-if on an existing case. | **blocks the task** (without outside arithmetic) | 2, 3 |
| U4 | No person × program summary. The case page is 85,800 px and opens on 1,200 supplied-fact rows. | slows a lot | 1, 2, 4 |
| U5 | Household-level rows still read as the person's result (p3 "SNAP eligible 336", "LEAP is eligible yes"). The person-level "participation" rows exist but sit about 5,000 px away and are not labelled as the answer. p4 is "eligible_member" of an "ineligible_income" unit. | slows a lot (risk of a wrong notice) | 1 |
| U6 | No single Medicaid coverage value per person. `ma_funding_source` is computed but not shown; there are 12 Medicaid status rows per person. | slows a lot | 1 |
| U7 | The SNAP allotment story stops at "prorated initial month allotment 336". The budget is four levels into "Show everything", and the rule text ("0 minus (0 minus ...") cannot be read aloud. | slows a lot | 2 |
| U8 | Documents owed are not a checklist. Due dates show only where the case author expected them (CCCAP 2026-10-16 is missing for CO-92). Counts conflict (CHP+ not_applicable with 1 pending; CW 3 vs 2). The SNAP due date passed while the status says "pending". | slows a lot | 4 |
| U9 | The "as of" date defaults to 2026-10-01 everywhere (program parameters, new household), and an existing case cannot be re-run as of today. | slows a lot | 4, 5 |
| U10 | Parameter page and versions show "table" instead of the figures. | slows a lot | 5 |
| U11 | Default volume is the H.R.1 volume. The "household" door opens the wrong volume, and switching volume lands on Programs. | annoyance | all |
| U12 | "OK yes" beside "unknown"; test counts ("181/181") read as approval counts. | annoyance (misleading) | 1 |
| U13 | Raw outcome codes; money with floating-point noise (106.1400000000001, 471.29999999999995). | annoyance | 1, 2 |
| U14 | "Try an example" is empty for Colorado, while the help text promises it. | annoyance | 3 |
| U15 | The New household "Not answered" list leads with irrelevant or policy-side facts (protective services referral, county FPL limit, "incapable of indicating intent", "state of residence" after a county was picked). Units are missing ("Hours worked"). The form asks for monthly wages, not hours × rate. | slows a lot | 3 |
| U16 | 81-year-old p2 (no reproductive capacity) gets Limited Family Planning as his only Medicaid (CO-1154). I would ask HCPF; the app has no way to flag it. | policy question, for the HCPF owner | 1 |

---

## Against the caseworker review (docs/reviews/stakeholder-caseworker.md)

**Where I agree and the problem is still there:**

- S8 (case page not built for a worker; no determination grid) is my U4.
- S7 ("Relationships: none stated") is still on every person.
- S6 (no "Not answered" when relationships are missing) is still there; see `29-...png`.
- S1 (story stops at the memo for amounts) is still there for the SNAP allotment.
- S3 (floating-point money) is still there: 106.1400000000001.
- S4 (raw codes) is still there.
- S13 (one-person New household) is still there, and is now worse: 458 fields for four programs and no example
  to start from.
- B2.2 (pending counts where the status is not_applicable) is still there for CHP+ p1 in CO-92.

**What has improved since:**

- Person-level participation items (B1) exist.
- Due dates appear as expectations for SNAP, CW and Medicaid (part of B2).
- p1's LTC status now reads eligible_institutional (S12).
- p3's CW status is now `not_in_unit_did_not_request` (S5).

The B1 fix is half-done from my seat: the household rows still say "eligible" on p3's line, and nothing puts the
person row first.

**What this review adds:**

- What-if (U3).
- A "what changed / who is affected" view (U2).
- A single coverage or aid-code value per person (U6, and `ma_funding_source` already exists).
- Stale default as-of dates (U9).
- Parameter tables hidden behind the word "table" (U10).
- Wrong default volume and door (U11).
- The empty "Try an example" (U14).
- The missing CCCAP due date for CO-92 and the SNAP date that passed while "pending" (U8).
- The cross-program effect of one income change (CCCAP fee $30 → $54).
- The family-planning question for p2 (U16).

---

### Engineering aside (not Rosa's)

While writing my outside check, I first set a fact to `NaN` by mistake. SNAP then reported
`over_net_income_limit`, and MAGI and CCCAP reported `ineligible_income`, rather than unknown, with gross income
`null`. No UI path I used produces NaN, because the form uses number inputs. But a comparison against a
non-number currently decides "no" rather than "unknown". It may be worth a guard in the engine or in the case
loader.
