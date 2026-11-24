# Stakeholder review: county eligibility case worker (phase 12)

Reviewer role: a Colorado county eligibility technician. I am not a programmer. My job is to say why each
person in a household passed or failed each program, explain it to the client and to my supervisor, and keep
track of the documents still owed. I judged the codex as the tool I would use for that.

Branch `ccr-9d19bf4c-wmnwcl` at 933ce0c. `npm run check` reports OK (2032/2032 rule tests, 2165/2165 case
expectations). I edited nothing except this file.

How I worked: I read `src/engine/explain.ts`, ran `scripts/eval-case.ts`, and built the app (`npm run build`,
`vite preview`). I drove it with Playwright, answering the GitHub raw reads from the files on disk the way
`e2e/fixtures/ledger.ts` does. No explain or story script exists under `scripts/`. The plain-English story
(`narrative`, `story`, `missingFacts`) is used only by `src/ui/Trace.tsx` and `src/ui/CasesView.tsx`. To read it
at the command line I wrote three small scratch scripts outside the repo: one prints the story, one prints the
trace tree to a set depth, and one lists every `*_verification_is_pending` outcome and every due date for a case.
**A case worker could not write these.** Without them, the app is the only way in.

---

## Screenshots

All are under `/tmp/claude-0/caseworker-shots/`. The `.txt` files beside them are the same panels as text.

| File | What it shows |
|---|---|
| `01-start.png` | Start page. "Check how a household is decided" is the door for my role. It opens Cases. |
| `02-cases-list.png` | Case list. "Results by program" shows **test pass counts** (e.g. "SNAP 161/161"), not who is eligible. |
| `03-co01-top.png` | CO-01 case page. It opens on "Supplied facts" for p1 as raw rows with identifiers. The page is 80,824 px tall and has 1,187 fact rows before the 749 expectation rows. |
| `04-co01-expectations-head.png` | Where the Expectations table starts, far down the page. |
| `05-co01-p2-snap-allotment-story.png` | p2 SNAP allotment story: "is the initial month: yes; prorated initial month allotment is 336". It gives no budget. |
| `06-co01-p2-snap-allotment-everything.png` | The same with "Show everything" open. The rule text says "0 minus (0 minus ((the greater of 0 and 0 minus (benefit reduction minus maximum allotment...". The benefit reduction shows as `471.29999999999995`. |
| `07-co01-p4-cw-income-story.png` | p4 Colorado Works, ineligible_income: "countable income 2037, need standard 245". Short and clear. |
| `08-co01-p3-cw-story.png` (+ `.txt`) | p3 Colorado Works, "ineligible_no_dependent_child", with "requests inclusion in the assistance unit is unknown". |
| `09-co01-p1-chp-story.png` | p1 (79) CHP+ story. "under the child age limit... is no / Is pregnant is no" repeats five times with no person named. |
| `10-co01-p1-patient-payment.png` (+ `.txt`) | Patient payment `179.6400000000001`. |
| `11-co01-p1-af-category.png` | p1 Adult Financial, "none": "meets resource limit is no". It shows neither the $46,000 nor the $3,000 limit. |
| `12-co02-p4-cw-citizenship-pending.png` | CO-02 p4 Colorado Works citizenship pending: "citizen yes, verified electronically no, document received no". It shows no due date. |
| `13-co02-p4-leap-benefit.png` | CO-02 LEAP benefit 540. The story repeats "application date / program year start month" three times. |
| `14-co91-expectations.png` | CO-91 p2 facts end with **"Relationships: none stated"**, although the case states the parent-child edge. Then the verification expectations start. |
| `15-co83-p1-cw-denial-trace.png`, `16-co83-p1-cw-countable-income-expanded.png` | Building the CO-83 denial. The stepfather's deemed income of 1157 is the sixteenth child row of "countable income". |
| `17-new-household-snap-form.png` | "New household" with SNAP: 144 fields for one person (p1 only). |
| `18-new-household-snap-unknown.png` (+ `18-outcomes.txt`) | Unknown results. SNAP eligibility is "unknown" with **no "Not answered" list**. ABAWD status lists 20 "not answered" facts. |
| `19-search-abawd.png` (+ `19-search.txt`) | Search for ABAWD, CSRA, patient payment, reasonable opportunity and SUA. Results are items by identifier. Nothing spells out ABAWD. |
| `20-item-csra.png` (+ `.txt`) | The CSRA item page: "the greater of the greater of the lesser of CSRA maximum standard (162660) and...". |

---

## Task 1: Why each person in CO-01 and CO-02 passed or failed

**What I tried.** First `npx vite-node scripts/eval-case.ts co CO-01 <ids>` for the ten headline outcomes
(about 2 s per run). Then my story script on `explain()` + `narrative()`. Then the tree script, wherever the story
stopped before the actual reason. Then the same rows in the app's case page.

**Result.** Every value matched the case's expectations, and the two budgets I checked by hand agree:

- SNAP: 808 - 30% × 1571 = 336.70, rounded down to 336.
- Colorado Works for p4/p5: 2037 deemed against the 245 need standard.

Here is what I would tell the family. Each reason was assembled from the trace. The story alone gave it only
where marked "story enough".

| Person | Medicaid / CHP+ | SNAP | Colorado Works | Adult Financial | CCCAP | LEAP | SUN Bucks |
|---|---|---|---|---|---|---|---|
| p1, grandmother, 79, entering nursing facility | No MAGI group (Medicare, over 64). LTC eligible as **eligible_pace**. Patient payment $179.64 = 2030 − 110.36 − 1740 spouse allowance (story enough, but the value is unrounded). CHP+: not a child or pregnant. | Not a household member: she lives in an institution that provides meals. no_eligible_members. | Unit of one, no dependent child (story enough) | OAP age, but countable resources $46,000 exceed the $3,000 couple limit (I needed the tree, not the story, for the figures) | No child in her CCCAP household | Oct: outside Nov–Apr. Nov (CO-02): her own household, not vulnerable (institutional_group_care) | Not school aged / no NSLP school |
| p2, grandfather, 81, LPR since 1998, community spouse | No MAGI group. Not institutionalized. CHP+ no | **Eligible, household of 3 (p2, p4, p5), $336.** The budget needs "Show everything" and four levels of expanding (below) | Unit of one, no dependent child | Same resource failure as p1 | No child | Oct no. Nov **$540** (household p2, p4, p5) | No |
| p3, mother, 41, undocumented | Emergency Medicaid only (status). Reproductive health program. CHP+ no | **Shown as "eligible, $336"** although she is an ineligible member whose income is counted pro rata (finding B1) | "ineligible_no_dependent_child". The real reason is that she is an optional member of her daughter's unit who did not ask to join (finding S5) | Under 60, not disabled | Eligible low income, parent fee $30 | **Shown as "eligible, $540" in November** although LEAP excludes her for status (B1) | Not school aged |
| p4, 17, minor parent | Medicaid child, eligible, 12-month continuous eligibility. CHP+ no because Medicaid-eligible. The story's reason is "in a continuous eligibility period", **not the income test** (S9) | Eligible member, $336 | Ineligible income: deemed parent income 2037 > need standard 245 (story enough) | No | Eligible low income (teen parent) | Oct no, Nov $540 | Eligible categorical $120 (NSLP school + SNAP) |
| p5, baby | Medicaid child, eligible. CHP+ no | Eligible member, $336 | Ineligible income (same unit as p4) | No | Eligible low income | Oct no, Nov $540 | Not school aged |

**Where I got stuck.**

- **SNAP allotment** (`05`, `06`). The story says only "initial month: yes; prorated initial month allotment
  336". The prorated node is a memo hit, so the story stops there. The budget is only in the full tree, from
  `snap_full_month_allotment` → `snap_benefit_reduction` → `snap_household_net_income` → adjusted income,
  shelter. Laid out, it is:
  - gross income: 2965
  - earned income deduction: 357
  - standard deduction: 217
  - adjusted income: 2391
  - shelter costs: 1400 rent + 616 HCUA = 2016
  - excess shelter deduction: 820.50
  - net income: 1571
  - maximum allotment: 808
  - 30% of net income: 471.30

  Opening the "memo / see above" rows means hunting for the first time that fact was computed, somewhere else in
  the tree.
- **Medicaid for p4**. The decisive branch is the continuous eligibility period that the application itself
  started, so the story never mentions household income (2380 for 3, about 104% FPL). I could not tell the
  client "your income is under the limit" from the story.
- **CHP+ for p1** (`09`). Ten lines of "under the child age limit is no / Is pregnant is no", one pair for
  each household member, with no names. Story lines carry a month tag but no person tag
  (`src/ui/Trace.tsx:118`).
- **"Missing" noise.** `eval-case.ts` prints a long "missing:" list on outcomes that are fully decided, for
  example `snap_voluntary_quit_date`, `snap_excluded_earned_income` and
  `snap_is_migrant_in_job_stream_with_short_break`. These are facts the rules read with a default. As a worker I
  first assumed the SNAP result was incomplete.
- **Case page.** I had to scroll past 1,187 fact rows. Then I found the row I wanted among 749 with Ctrl-F on the
  identifier. A worker does not know the identifiers.

**Time.** With my helper scripts: about 75 minutes for both cases (5 people × 8 programs), mostly spent
drilling into budgets. With the app only, I estimate 2–3 hours for one household, and the budgets still have to be
copied out by hand. **Correct answer:** yes for the values. For the "why", partly: the story gives a usable
reason for about half of the 40 person-program pairs.

---

## Task 2: Writing a denial (CO-83, Colorado Works)

Case CO-83, p1: a mother of 31 with no income and an 8-year-old daughter (p3), living with her husband (p2), who
earns $1,500 a month and did not ask for Colorado Works. `cw_eligibility_status` = `ineligible_income`.

**What I tried.** The story gives three lines: "meets income test is no; countable income 1157; need standard
331". It does not say where 1157 comes from. "Show everything" → "countable income" lists 16 child rows (`16`).
The stepfather's `cw_budgetary_member_deemed_income` (1157) is the last of them. Expanding it shows:

- his wages of 1500
- the $90 disregard
- a need-standard lookup for 0 children (253)

Its meaning text (CO-2353) and the verbatim excerpts S1307, S414, S415 and S1626 gave me the rule language.

**The explanation I would send:**

> Your Colorado Works application of October 12, 2026 is denied for October 2026 because your family's
> countable income is more than the need standard.
>
> Your husband lives with you and is your daughter's stepfather. He did not ask to be in the grant, but the
> rules still count his income for your family (9 CCR 2503-6 3.604.2.D.1.b; 3.605.1.A.4.a). We counted his
> $1,500 monthly wages, minus the $90 employment disregard ($1,410), minus $253 for his own needs. That leaves
> $1,157 counted for your family.
>
> The need standard for one caretaker and one child is $331 (3.606.1.F). Because $1,157 is more than $331, the
> family is not eligible for basic cash assistance (3.606.1.H and J.4).

**Is the codex enough?** Mostly yes: the figures, the order of the checks and verbatim rule text were all
there, which is better than most desk guides. What was missing:

- No notice-ready text.
- I had to work out that "need standard by number of children (one caretaker), for 0 children" is how the
  codex prices "the needs of the stepparent". The item's meaning says so, but the trace does not.
- The S-ids in the trace have to be mapped by hand to the paragraph numbers a notice cites.

**Time:** about 20 minutes. A worker who knew where to click would take about 15. **Correct:** yes.

(CO-13 has a sanction reduction but no denial, and CO-91 is about verification. So CO-83 was the best SNAP/CW
denial in the three cases offered.)

---

## Task 3: Outstanding documents (CO-91 and CO-92)

**What I tried.** The case page lists only the pending flags the case author chose to expect. It has no
checklist view. So I wrote a script that evaluates all 73 `*_verification_is_pending` items and the 18
due-date items for every person.

**CO-92** (as of 2026-10-15; applied 2026-10-01; mother p1 and daughter p2, both LPRs). This is the checklist I
would give the client:

| Who | Document | Programs | Due |
|---|---|---|---|
| p1 (mother) | Immigration document (green card). SAVE has not answered | SNAP (non-citizen 30 days), Medicaid, Colorado Works (status 30 days; the codex counts "lawful presence" and "immigration status" as two pending items) | SNAP 2026-10-31; CW 2026-10-31; Medicaid reasonable opportunity to 2027-01-04 |
| p1 | Proof of hours worked | CCCAP | 2026-10-16 |
| p2 (daughter) | Immigration document | SNAP, Medicaid, CHP+, Colorado Works | SNAP and CW 2026-10-31; Medicaid/CHP+ 2027-01-04 |

**CO-91** (as of 2027-02-10). p1 owes:

| Document | Program | Status / date |
|---|---|---|
| Proof of citizenship | Medicaid | reasonable opportunity ended 2027-02-05 |
| Proof of citizenship and lawful presence | Colorado Works | |
| Proof of residency | Colorado Works, due 2026-11-13; CCCAP, due 2026-11-17 | |
| Proof of child support paid | SNAP (the deduction is disallowed) and CCCAP (deduction only) | |
| Proof of dependent care cost | SNAP (the deduction is disallowed) | |
| Verification of zero income | LEAP, due 2026-11-16 | |

Everything is past due.

**Is it discoverable?** No, not without a script.

- **Due dates are not outcomes** in `volume.yaml`, and nothing links a pending element to its due date. For CO-91
  p1 the codex computes 12 due dates, including `snap_noncitizen_documentation_due_date` for a U.S. citizen. I had
  to know from the rule text that Colorado Works citizenship takes `cw_status_verification_due_date` (2026-12-02)
  while residency takes `cw_verification_due_date` (2026-11-13), and that Medicaid citizenship runs on the
  reasonable opportunity date rather than `ma_verification_due_date`.
- **Pending items appear for programs that are "not_applicable".** Examples:
  - CO-91 p2, a 6-year-old: "Adult Financial: identity verification is pending" and "residency verification is
    pending". `af_pending_verification_count` = 2 while `af_verification_status` = not_applicable.
  - CO-92 p1: Adult Financial resources and immigration status pending.
  - CO-01 p1: `cw_verification_status` not_applicable but `cw_pending_verification_count` 2.
  - CO-91 p1: `chp_verification_status` not_applicable but `chp_pending_verification_count` 1.

  A worker following the flags would ask a 6-year-old's father for Adult Financial identity papers.
- Pending items are per *element* per *program*, not per *document*. Is one passport enough for CW
  "citizenship" and CW "lawful presence"? The codex does not say.

**Time:** about 30 minutes with a script. I could not finish it in the app. **Correct:** the flags match the
case comments. The document-level list above is my own reading.

---

## Task 4: "Unknown" results

**What I tried.** I removed one fact at a time from CO-01 and re-ran p4's outcomes (scratch script), then used
the app's "New household" form with SNAP selected and only a birth date and citizenship filled in (`18`).

- **The engine does not guess.** Remove p3's wages and SNAP eligibility, the SNAP allotment, Colorado Works,
  CCCAP, MAGI Medicaid, CHP+ and SUN Bucks all go to unknown. Remove p2's rent and SNAP eligibility stays
  "eligible" but the allotment goes to unknown. That is the right behavior.
- **But which fact to go get is buried.** For SNAP with p3's wages removed, `missingFacts` lists six facts and
  `wages_gross@p3` is the last of them. The other five are read with an `otherwise` default and did not cause the
  unknown. When I kept only missing facts reached through a chain of unknown values, the list dropped to two
  (`wages_gross@p3`, `snap_excluded_earned_income@p3`).
- **Sometimes nothing is listed at all.** On the New household form, SNAP eligibility is "unknown because number
  of eligible household members is unknown" with **no** "Not answered" line, because the missing thing is the
  relationships list, which is not a supplied-fact trace event (`18`). A worker is stuck.
- **A defaulted fact still reads "unknown".** In the trace, "Colorado Works: requests inclusion in the assistance
  unit is unknown" (`08`) is really read as "no" by the rule (CO-2346 precision: "If not stated, Colorado Works
  reads this as false"). The trace shows "unknown / missing" and does not say "treated as no".
- **The New household form is for one person.** 144 fields for SNAP, p1 only. I cannot enter a real household,
  so I cannot see what is missing for my client's actual family.

**Time:** about 20 minutes. **Obvious which fact to get?** Sometimes: when the list has one or two names. Not
when it has six or twenty, or none.

---

## Task 5: Terms

| Term | Where | Understandable without legal training? |
|---|---|---|
| Countable income | `cw_countable_income` (CO-910), `af_countable_income`, SNAP "gross income" (CO-334) | **Partly.** CO-910's meaning starts well ("total net countable income... compared against the need standard") but then carries authoring history: "Phase-10 sweep (OQ-103, OQ-140, OQ-143)". No item says plainly "the income that counts after the program's exclusions and disregards". |
| Assistance unit | CO-900 | **Hard.** One sentence of about 900 characters with seven paragraph cites. The idea ("the people the grant is for: the child and the caretaker who asks") is in there but takes three readings to find. |
| Budgetary unit | CO-2352 | **Yes.** Short and clear: everyone in the assistance unit plus a parent's spouse, whose income counts even if they are not in the grant. |
| ABAWD | `snap_abawd_time_limit_status` (CO-418) and parameters | **No.** "Able-bodied adult without dependents" appears in no item name or meaning, only in `sources.md`. Search for "ABAWD" returns 27 items, none of which spells it out (`19`). |
| Reasonable opportunity period | CO-1413 | **Yes.** "90 days after the notice is considered received, which is five days after the notice date." This is the clearest of the ten. |
| SUA | CO-1500 "SNAP: standard utility allowance" | **Yes.** It explains the four tiers and that a household gets only one. The name spells out the acronym. |
| Deeming | No general item. Per-program items: `cw_budgetary_member_deemed_income`, `cw_deemed_parent_income_of_minor_parent`, `af_deemed_relative_income`, `cw_sponsor_deemed_income`, `snap_sponsor_deeming_applies` | **Partly.** Each is precise but is a formula ("half of the relative's gross earned income over $65, plus..."). Nowhere does it say "deeming means counting someone else's income as if it were yours". |
| Five-year bar | `is_exempt_from_five_year_bar`, `has_held_qualified_status_five_years`, `ma_is_five_year_bar_exempt` ("five-year rule"), `federal_five_year_bar_exempt_category` | **Partly.** The exemptions are listed well. The bar itself ("most qualified immigrants wait five years from getting that status") is only implied, and Medicaid calls it the "five-year rule". |
| CSRA | CO-646 | **Partly.** The name spells out the acronym. The meaning is formula-like, and the rendered rule "the greater of the greater of the lesser of..." (`20`) is hard to read aloud. |
| Patient payment | CO-658 | **Yes.** "The amount of an institutionalized person's income applied monthly to the cost of care... gross income minus personal needs allowance, spouse allowance...". The value is shown unrounded (179.6400000000001). |

Overall: 4 of 10 are clear, 5 partly clear, 1 not explained. The definitions are written for a policy analyst
(exact, cite-dense, with authoring history mixed in), not for a worker or a client. Outcome values are raw codes
(`ineligible_no_category`, `expenses_disallowed`, `reasonable_opportunity_expired`). Their meanings are in the
item's prose but are not shown next to the value.

---

## Findings

### Blocking

**B1. A household result is shown as each person's result, even for members the program excludes.**

In CO-01/CO-02, p3 is undocumented. She is an ineligible SNAP member (`snap_is_ineligible_member` = true) and is
excluded from the LEAP household (`leap_household_members` = [p2, p4, p5]). Yet her own rows read:

- `snap_eligibility_status` = eligible
- `snap_allotment` = 336
- in CO-02: `leap_is_eligible` = true and `leap_benefit_amount` = 540

Items: CO-387 (`snap_eligibility_status`), CO-385 (`snap_allotment`), `leap_is_eligible` (CO-1007),
`leap_benefit_amount`.

*Why it matters to me:* I explain results person by person. Read as written, I would tell p3 she is approved for
SNAP and LEAP, and the notice would be wrong.

*Fix:* add a person-level outcome to each program's outcomes, for example `snap_person_status` with values
eligible_member / ineligible_member_income_counted / not_in_household. Rename the household-level items
"SNAP household: ..." in their names. Show the person-level status first in the case view.

**B2. The outstanding-documents checklist cannot be built from the app, and the data contradicts itself.**

1. Due dates (`snap_verification_due_date`, `cw_status_verification_due_date`,
   `ma_reasonable_opportunity_period_end_date`, and the rest) are not program outcomes, and no item links a pending
   element to the date that governs it. Due dates are computed for every person and program whether or not they
   apply, for example `snap_noncitizen_documentation_due_date` for a citizen (CO-91 p1).
2. Pending flags and counts are non-zero where the program status is `not_applicable`:
   - CO-91 p2: `af_identity_verification_is_pending`, `af_residency_verification_is_pending`, `af_pending_verification_count` 2
   - CO-91 p1: `chp_pending_verification_count` 1
   - CO-01 p1: `cw_pending_verification_count` 2
   - CO-92 p1: `af_resources_verification_is_pending`
3. The case page shows only the pending items the case author chose to expect.

*Why it matters:* the checklist is half my job. Without a script I could not produce it, and following the flags
literally would send requests for programs the person cannot get.

*Fix:*
- A per-person "documents outstanding" view: element, programs, due date and the rule cite, gated on the program
  status not being `not_applicable`.
- Gate the `*_is_pending` items and counts on applicability, or document that they are raw.
- Add a `*_due_date_for_<element>` item (or an element-to-date table), and list the due dates as outcomes.

### Should-fix

**S1. The story cannot explain money amounts.** The SNAP allotment story stops at a memo hit: "prorated initial
month allotment is 336" (`05`). The budget is four levels down in "Show everything". The same holds for the
CW grant, patient payment, LEAP benefit and CCCAP fee.

*Fix:* when a story line is a memo, follow it to the evaluated copy. Add a "budget" rendering for money outcomes
(one line per deduction, as on a notice).

**S2. Story lines do not name the person.** The CHP+ story for p1 is ten unlabeled lines about five people
(`09`). The LEAP story repeats the same two lines three times (`13`).

*Fix:* add `l.node.person` next to `l.node.month` in `src/ui/Trace.tsx:118` and in `narrative()`. Dedupe identical
lines.

**S3. Money shows floating-point noise.** `ma_patient_payment` 179.6400000000001 appears in the Got column and
in the story (`10`). `snap_benefit_reduction` shows 471.29999999999995 (`06`).

*Fix:* format money to cents in `engine.fmt`. Decide whether CO-658 rounds to cents, and say so in the rule.

**S4. Outcome codes are raw.** `ineligible_no_category`, `expenses_disallowed`,
`pending_reasonable_opportunity` and the like.

*Fix:* give each option of a "one of" item a one-line label and description, and show them beside the value.

**S5. p3's Colorado Works reason is misleading.** `cw_eligibility_status` = `ineligible_no_dependent_child` for
the mother of a 17-year-old. The real reason is that she is an optional member of her minor daughter's unit
(3.604.2.C.2.g) and did not ask to join. The trace also shows the request as "unknown", although CO-2346 reads an
unstated request as "no".

*Fix:*
- A distinct status, for example `not_in_unit_did_not_request`.
- In the trace, mark facts read through an `otherwise` default as "not stated, read as no" instead of
  "unknown / missing".

**S6. The "Not answered" hint (`missingFacts`) lists every missing leaf, including defaulted ones, and never lists
unstated relationships.**

*Fix:*
- Walk only through nodes whose value is unknown. In my test this dropped the list from 6 to 2.
- Report "household relationships not stated" when a `reachable` group is unknown.
- Use the same filter in `eval-case.ts`.

**S7. The case page wrongly says "Relationships: none stated" for every person.** In CO-01 the case states 14
relationships (`14`, and `co01-text.txt` has five "none stated" lines). `src/ui/CasesView.tsx:248-250` reads only
`person.relationships`, not the case-level `relationships`.

*Fix:* show the case-level edges, once, as a family list ("p1 spouse of p2; p3 parent of p4...").

**S8. The case page is not built for a worker.** CO-01 is 80,824 px tall, with 1,187 fact rows ahead of 749
expectation rows. The "Results by program" chips on the list are test pass counts.

*Fix:* put a person × program determination grid at the top (status, amount, documents owed), fold the facts, and
group expectations by person and program.

**S9. The story picks an uninformative decisive branch for Medicaid.** For p4 (and p5), MAGI "eligible" is
explained by "child is in a continuous eligibility period", which her own application started. The income test
that actually qualified her never appears.

*Fix:* for a first application month, explain through the category test (income against the child standard)
rather than continuous eligibility, or show both.

**S10. Acronyms and program names are not spelled out in items.** ABAWD is never spelled out. PACE, MMMNA,
AND-CS, AND-SO, HCA and OAP appear in names and stories ("Adult Financial: AND-CS eligible is no") without
expansion.

*Fix:* spell out each on first use in name or meaning, and add a glossary page in the app built from those items.

**S11. Meanings carry authoring history.** "Phase-10 sweep (OQ-103, OQ-140, OQ-143): ..." appears in CO-910's
`meaning` (also CO-900 and others).

*Fix:* keep `meaning` to what the fact is, and move the history to `rationale`.

**S12. p1's long-term care status reads `eligible_pace`, though she applied for nursing facility care.** The case
comment acknowledges this as OQ-100/C-18. Until it is settled, a worker would name the wrong program to the
client.

*Fix:* resolve OQ-100, or report the institutional status alongside PACE.

**S13. The New household form handles one person (p1) and shows 144 fields for SNAP** (`17`). I cannot try a real
household or a "what if".

*Fix:* a multi-person form with a relationships editor. Group fields by topic, with the required ones first.

### Notes

- **N1.** CO-02's case comment still gives the old SNAP arithmetic ("... = 125") before the phase-8 paragraph that
  gives 336. A worker reading the comments sees two answers. Strike the superseded figure.
- **N2.** `cw_eligibility_status` lists the option `ineligible_resources`, but the rule never produces it, and
  C.R.S. 26-2-706(2)(a) (S403) forbids an asset test. Drop it or explain it.
- **N3.** The p4/p5 Colorado Works unit uses the "No Caretaker, 2 children" row (need standard 245): the
  17-year-old minor parent counts as a dependent child, not a caretaker. I would ask my supervisor whether a minor
  parent heading her own unit is a caretaker on the 3.606.1.F chart. It does not change this outcome (2037
  exceeds either row). I found no open question on it.
- **N4.** For CO-91 p1, CW citizenship and CW lawful presence are two pending items for a U.S. citizen. A
  per-document view would say whether one passport clears both.
- **N5.** The October LEAP denial reads "program year start month is 2025-11" rather than "October is outside the
  November–April season". The reason is right but indirect.
- **N6.** The app reads the ledger from GitHub raw, and the CO-01 page took about 7.7 s to render. Workers
  would need the deployed `main` to carry the `co` volume.

---

## Summary

**Counts:** 2 blocking, 13 should-fix, 6 notes.

**Top five changes, in priority order:**

1. **B1.** A person-level status per program, so an excluded member (p3 for SNAP and LEAP) never reads as
   "eligible".
2. **B2.** A per-person outstanding-documents view with the governing due date and cite, gated on program
   applicability, with the not_applicable/pending contradictions fixed.
3. **S1 + S2 + S3.** Stories that explain amounts as a budget, name the person on each line, and print money in
   cents.
4. **S6 + S5.** "Not answered" lists only the facts that actually left the result unknown (relationships
   included), and defaulted facts read "not stated, treated as no".
5. **S8 + S7.** A determination summary at the top of the case page, and a correct family list.

**What works well:**

- The engine is right: all 2,165 case expectations pass, and the arithmetic I checked by hand agreed.
- An unknown fact really does leave the result unknown instead of guessing.
- Every derived value links to verbatim rule text (S-ids), so a denial can cite the regulation.
- The Colorado Works denial for CO-83 could be written in about 20 minutes with correct figures and cites.
- Reasonable opportunity, SUA, budgetary unit and patient payment are defined clearly.
- The case comments are an unusually good worked explanation of a hard household.
