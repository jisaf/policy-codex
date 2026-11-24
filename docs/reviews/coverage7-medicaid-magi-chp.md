# Coverage review, seventh pass: MAGI Medicaid and CHP+ (family file `coverage7-medicaid-magi-chp`)

Reviewer pass: seventh and final exhaustive verification pass before product-owner sign-off, 2026-11-24, on `dc52178` (branch `ccr-9d19bf4c-wmnwcl`, "Merge Medicaid residency and immigration status by month"). Review only: nothing in the volume was changed. Every finding below goes on the known-limits list for the program owners unless it is fixed first.

Governing texts (all on file):
- 10 CCR 2505-10 § 8.100.4.A to J (D-65, rule version 12735, effective 11/14/2026), read line by line; § 8.100.3.B (residency), E.1-E.2 (retroactive coverage), G.1.b-c and G.1.g (inmates, IMD, citizenship and immigration status), K.1 (sponsors) and Q (continuous eligibility) as the MAGI outcomes read them.
- 10 CCR 2505-3 (D-66, rule version 12687, effective 08/30/2026): § 110.1.A-G, § 120.1-120.2, § 130.1, § 150.1-150.2, § 170, § 180, § 320, § 330, § 430.1-430.5, § 440.4, read line by line.
- 42 CFR 435.603 (D-34) as § 8.100.4.C-E adopt it; 42 CFR 435.915(a) (D-35); 42 U.S.C. 1396a(a)(34) as amended by Pub. L. 119-21 sec. 71112, 1396a(e)(5) and (e)(16) (D-26); 8 U.S.C. 1613(a) (D-25, S176); 10 CCR 2506-1 4.305.B.3.a (D-82), which the volume cites for the five-year count; CMS SHO #26-001 (D-163).

Out of scope: § 8.100.5 to § 8.100.7 (non-MAGI), except where a MAGI or CHP+ outcome reads them; the SSI-method items reached only through CHP+'s Title XIX test (CO-1176).

## Method

- Scratch copy: `git worktree add --detach <scratch>/cov7magi dc52178`, node_modules linked. The paragraph matrix (section 5) was built from the fetched text before the earlier passes' and sweeps' lists were read against it.
- Gate at `dc52178`: `scripts/audit/quick-tests.ts --all-tests --all-cases`: 11,069 rule tests and stored household expectations checked, 0 failed. `CHECK_BASE=origin/main npm run check`: see section 7.
- Reach: a walk of the derived expressions from the MAGI and CHP+ outcomes (the pattern sweep's roots and cut) reaches 611 items naming 57 open questions; the derivation of every item named below was read.
- Probes: a scratch runner (`scratch7/lib.ts`, not committed) builds households from CO-226's adult or patches stored cases and evaluates each identifier per month with the engine; a second script (`scratch7/delscan.ts`) deletes each stated person fact of 29 MAGI and CHP+ stored households in turn and reports every outcome that moves from one definite value to another (a reader default). Determination date 2026-11-10 unless stated. Guidelines as the volume holds them (2026: $15,960 for one, $1,330.00 a month; $1,803.33 for two; $2,276.67 for three); the premium tax credit test reads the 2025 table ($15,650 for one).
- Each P1 has a household, the engine's answer at `dc52178` and the answer computed by hand from the text, and is labeled **common** (a household shape a county worker sees routinely) or **rare**, with one line of reasoning. Findings that rest on decision 4 of 2026-11-23 (missing information is cannot determine unless the rule says otherwise) say so.

## 1. Verdict

**6 P1 (1 common, 5 rare), 4 P2, 1 P3. The family does not meet the stopping rule.**

- **C7-01 (common).** With a retroactive request, a month before the retroactive window is reported covered whenever the eligibility start date (a supplied date no application asks for) is not stated, or the window's length is not known: April to July 2026 are `eligible` for an application of 2026-11-02, and from 2027 the months the shortened window (one month for an adult, two for others) excludes are `eligible` too.
- **C7-02 (rare).** A member pregnant again after her first pregnancy's postpartum year has ended is read as still inside the first period: Medicaid `eligible` as a pregnant woman at 241.6% and 285.5% of the guideline, where by hand she is CHP+ prenatal or ineligible.
- **C7-03 (rare).** The part of a scholarship or grant used for living expenses is excluded from MAGI income, though § 8.100.4.C.1.d.ii excludes only what is "used for educational purposes and not for living expenses".
- **C7-04 (rare).** The five years of 8 U.S.C. 1613(a) are counted from the date of the qualified status held now, so a parolee or battered non-citizen who later became a lawful permanent resident restarts the five years at the adjustment; OQ-213's "settled" half rests on it.
- **C7-05 (rare, decision 4).** An unstated application date closes the Pregnant Women coverage period, the CHP+ prenatal enrollment span and the CHP+ continuous eligibility period (read as "no period"), where it should be cannot determine.
- **C7-06 (rare).** A person who died is reported `eligible` in every month after the month of death (an application filed after a death for the decedent's last months). The pattern sweep listed it as P2 pending a product-owner decision on the outcome set; by this pass's bar it is a wrong eligibility answer.

The recent rounds hold for the households they were written for (section 4). C7-01 and C7-05 are the siblings of C6-05(c) that the pattern sweep judged "right" (the `otherwise` on an unstated eligibility start date in CO-4101 and the application-date guards in CO-566 and CO-2407); the repros below show they change answers.

## 2. Findings

P1: a wrong eligibility or benefit answer, a missing pathway, or an undefined element. P2: a gap that does not change an answer today. P3: wording.

| ID | Sev | Common / rare | Paragraph | Items | Quoted text | Repro (engine at dc52178; hand answer) | Proposed fix |
|---|---|---|---|---|---|---|---|
| C7-01 | **P1** | **common**: every application with a retroactive request whose "date the person became eligible" is not separately recorded (it is an outcome, not an application answer; CO-73 and other stored households do not state it), and from January 2027 every adult application whose application-month category is not yet known | 8.100.3.E.1-2; 42 U.S.C. 1396a(a)(34) as amended by Pub. L. 119-21 sec. 71112; 42 CFR 435.915(a) | CO-4101 ma_month_is_before_coverage_period (`otherwise (all (< month app) (any (not retro) (< month CO-557))) false`); CO-557 ma_retroactive_coverage_start_month; CO-2206 ma_eligibility_start_date; CO-2472 ma_retroactive_coverage_months_for_application | E.1: "shall be provided such assistance any time during the three months preceding the date of application, or as of the date the person became eligible for Medical Assistance, whichever is later"; 1396a(a)(34)(A)-(B) as amended: "in or after the 1st month before the month in which such individual made application" (expansion adult), "the 2nd month" (others), for applications on or after January 1, 2027 | **RETRO-NOSTART:** single citizen adult, 36, resident since 2020, wages $1,000 a month, application 2026-11-02 with a retroactive request, ma_eligibility_start_date not stated. Engine: April to November 2026 all `eligible` (CO-4101 false in every month; CO-557 unknown). By hand: the window is August to October (E.1); April to July `ineligible_before_coverage_period` (whatever the start date, "whichever is later" can only shorten the window); August to November `eligible` (1,000 / 1,330 = 75.2%). **CO-73 with a retroactive request** (application 2027-03-02; no start date stated, as stored): p1 (adult) `eligible` October 2026 to February 2027, p4 (child, 5) `eligible` from June 2026; by hand p1's window is February 2027 only (1396a(a)(34)(A)), p4's January and February 2027 (B): p1 October 2026 to January 2027 and p4 June to December 2026 `ineligible_before_coverage_period`. **RETRO-2027-UNKNOWN:** the RETRO-NOSTART adult with the start date stated (2026-01-01), application 2027-01-15 with a request, community engagement facts not stated: January 2027 cannot be determined (right), and September to December 2026 `eligible` (CO-2472 unknown, so CO-557 unknown, so not before coverage); by hand September and October 2026 are before any window (at most two months from 2027) and November is cannot determine. | In CO-4101, a month before (application month minus the largest window the date allows: three months before 2027, two from 2027) is before coverage whatever CO-557 is; inside that, an unknown CO-557 (or CO-2472) leaves the month unknown, not covered. Better: drop the supplied ma_eligibility_start_date from the window and let each retroactive month stand on its own facts (E.1's "met all applicable eligibility requirements"), which is what "the date the person became eligible" means (see C7-08). |
| C7-02 | **P1** | **rare**: a member whose application is the one she was first enrolled on (CO-920's shape), pregnant again after the postpartum year of an earlier pregnancy ended, with income over 200% (under it she is eligible either way) | 8.100.4.G.5; 1396a(e)(5), (e)(16)(A); 10 CCR 2505-3 § 110.1.F, § 430.3 | CO-566 ma_is_in_pregnancy_coverage_period; CO-565; CO-7401 (the history arm opens a month whether or not she was pregnant in it) | G.5: "for a period beginning with the date of application for Medical Assistance through the last day of the 12th month following the date the pregnancy ends"; (e)(16)(A): "the last day of the month in which the 12-month period (beginning on the last day of her pregnancy) ends" | **PG-SECOND:** p1, 34, application 2025-03-01 (enrolled since); history Pregnant Women March 2025 to September 2026; p2 born 2025-09-10 (gave_birth_to); pregnant again from 2026-10-05 (pregnancy_start_date, is_pregnant true, one expected); wages $5,500. Engine: period start 2025-03, in the period October and November 2026: `eligible` (pregnant), CHP+ `ineligible_medicaid_eligible`. By hand: the first period ended with September 2026 (birth 2025-09-10 + 12 months); October: size 3 (herself + 1 expected + p2), 5,500 / 2,276.67 = 241.6% less 5 = 236.6% > 195%: `ineligible_income`; CHP+ 241.6% <= 260%: `eligible_prenatal` (the § 430.3 span from October). At $6,500 (285.5%): engine the same; by hand Medicaid `ineligible_income` and CHP+ `ineligible` (285.5% - 5 > 260%). | A period runs from its start month through the postpartum end of the pregnancy current in the start month (the history arm opens a month only for a pregnancy she had in it, as the other-Medical-Assistance arm already requires); a later pregnancy opens its own period only through CO-7401 in a month of that pregnancy. Add PG-SECOND and its CHP+ variant as stored households. |
| C7-03 | **P1** | **rare**: a student whose scholarship or grant pays room and board or other living costs in a month near a standard (the monthly figure moves; C.5's annual test can rescue some) | 8.100.4.C.1 (26 U.S.C. 61), C.1.d.ii; 26 U.S.C. 117(b) | CO-5500 ma_magi_receipt_treatment_table, row educational_assistance `excluded`; CO-5000 receipts kind educational_assistance, field taxable_amount | C.1.d.ii excludes "Scholarships, awards, or fellowship grants used for educational purposes and not for living expenses" | **SCHOLAR-LIVING:** p1, 20, single filer, not claimed, wages $1,200 a month, expected 2026 income $16,900; a $4,000 grant received in November 2026 (kind educational_assistance, once), $2,500 of it for housing (taxable_amount 2,500). Engine: November income 1,200, 90.2%: `eligible` (Adults). By hand: the $2,500 used for living expenses is not excluded by d.ii and is gross income (26 U.S.C. 117(b) excludes only tuition, fees, books and supplies), counted in the month received (d.i): 3,700 / 1,330 = 278.2% less 5 = 273.2% > 133%; C.5: 16,900 / 15,650 = 108.0%, not below 100%: `ineligible_income` (limited Family Planning, 3,700 / 1,803.33 = 205.2%). | Make the row count the stated taxable part (`counted_stated_taxable_amount_only` or `counted_taxable_amount`, the part used for living expenses being the taxable part), with the C.1.d.ii citation; required where the receipt is a scholarship or grant that may pay living costs. |
| C7-04 | **P1** | **rare**: a lawful permanent resident whose earlier status was itself qualified and not exempt (a parolee of a year or more, a battered non-citizen, a conditional entrant) and who held qualified status more than five years ago but has been an LPR for less than five | 8.100.3.G.1.g.iii; 8 U.S.C. 1613(a); 10 CCR 2506-1 4.305.B.3.a (cited by CO-003) | CO-003 qualified_status_date ("the date of the status held now, per 10 CCR 2506-1 4.305.B.3.a"); CO-7550; CO-508; CO-7551; OQ-213 | 1613(a): "for a period of 5 years beginning on the date of the alien's entry into the United States with a status within the meaning of the term 'qualified alien'"; 4.305.B.3.a: "has lived in the U.S. in a qualified non-citizen status for five (5) years. The five (5) year waiting period begins on the date the non-citizen obtains status as a qualified non-citizen" | **LPR-EX-PAROLEE:** p1, 36, paroled into the United States 2019-05-01 for two years (a qualified alien from that day, 1641(b)(4)), adjusted to LPR 2023-03-01 (qualified_status_date, status_before_lpr_adjustment other), wages $1,000. Engine November 2026: five years not held, `emergency_only`. By hand: the five years ran from 2019-05-01 and ended 2024-04-30; an LPR is in 1396b(v)(5)(B): Adults, 75.2%: `eligible`. The case has no fact for the first qualified status, so the answer cannot be stated correctly. | Define the five-year start as the date the person first obtained a qualified non-citizen status (a later adjustment does not restart it) in a new neutral date, keeping qualified_status_date for MS-2's "status held now" test; restate CO-003's precision (4.305.B.3.a says the opposite of what it is cited for) and OQ-213's settled half. Shared with SNAP and the cash programs (their owners' readers). |
| C7-05 | **P1** | **rare**, decision 4: needs the application date unstated; in a renewal the "application date" is the original application's (CO-088), easy to leave out | 8.100.4.G.5; § 430.2, § 430.3; plan decision 4 | CO-566 (`not (unknown ma_application_date)` as a conjunct); CO-2407 (`[(unknown ma_application_date), false]`); CO-2404 (`not (all (unknown start) (unknown app))`) | CO-566's own precision: "false, not unknown, before the person has an ma_application_date (the period cannot have started)" | delscan: **CO-920 without ma_application_date**: engine November 2026 `ineligible_income` (period false), by hand cannot determine (stored: `eligible`, in the period through October 2027); **CO-922** (2027-10): engine `ineligible_income`, CHP+ `ineligible`; stored `eligible`; **CO-923** (2027-10): CHP+ `ineligible`, stored `eligible_prenatal`; **CO-137** (September and October) and **CO-110** (September, and the baby's needy-newborn month with it) move from `eligible` (pregnant) to `ineligible_income`. Each by hand: cannot determine (whether a period opened depends on the application's months). | Make each guard unknown, not false, where neither a recorded period nor an application date is stated (as C6-05(c) did for CO-4101); keep "before the application" false only where the date is stated. |
| C7-06 | **P1** | **rare**: an application filed after the applicant's death for the last months of life (§ 8.100.2's application "in case of death of the applicant ... signed ... by someone acting responsibly"), or a renewal evaluated past a death | 8.100.4.G.6.a.i; 8.100.3.Q.1.b; 10 CCR 2505-3 § 430.2.B.i; 42 CFR 435.916 | CO-554 ma_magi_eligibility_status and CO-707 chp_eligibility_status (no row for a month after death); CO-2200 is_deceased (read only by the continuous eligibility and Legal Immigrant Prenatal exceptions) | G.6.a.i and § 430.2.B.i end the guaranteed periods when "The member is deceased"; no category covers a person after death | **DIED-RETRO:** p1, 36, wages $1,000, died 2026-08-20; application 2026-09-15 with a retroactive request; resident since 2010. Engine: June to December 2026 `eligible`, Family Planning `full_coverage`. By hand: June to August `eligible` (75.2%); September onward not eligible (deceased). The pattern sweep (MAGI) left it as P2 because the outcome set has no option for it; it is a wrong answer on a household the rule anticipates. | Product owner: add a reason (for example `ineligible_deceased`) to ma_magi_eligibility_status, ma_family_planning_status and chp_eligibility_status, tested first for a month after the month of death, or state the limit in each outcome's meaning so engines do not grant those months. |
| C7-07 | P2 | rare | 8.100.4.C.4 | CO-4567 ma_budget_period_household_income_pct_fpl; CO-6452 | C.4: "determined based on current or previous monthly household income and family size" | The volume reads the current month only; "or previous" (B.1.c: the previous month's pay is acceptable "if the application month verification is not yet available") is read as verification, which supports it, but no open question records the reading. An applicant ineligible on the current month and eligible on the previous one (a raise in the application month) is ineligible. | Record the reading as a state policy choice (with B.1.c checked) or read the previous month where the current month's income is not verified. |
| C7-08 | P2 | n/a | 8.100.3.E.1; product-owner rule "Facts that another record or edge can supply are read from it, not entered twice" | CO-2206 ma_eligibility_start_date (supplied); CO-557; CO-7401 | E.1: "as of the date the person became eligible for Medical Assistance" | The date is an outcome the months' own facts decide (the first month the person met every requirement), stated a second time as a supplied fact. Stated later than the facts show, it closes retroactive months the facts make eligible (delscan: CO-137 May 2026 moves `ineligible_before_coverage_period` to `eligible` when it is removed); unstated, C7-01. | Derive it from the months (the first retroactive month in which every requirement is met) and retire the supplied fact; or keep it only as a cap no later than the window's start. |
| C7-09 | P2 | rare | 8.100.3.G.1.g.iv.9-10; plan decision 4 | CO-2700 status_before_lpr_adjustment ("If not stated, programs read this as none"); CO-1172 | | Medicaid reads an unstated earlier status as "admitted directly", so a refugee or asylee who adjusted is barred five years (delscan: CO-1063 November `eligible` to `emergency_only`); Colorado Works and Adult Financial require the same fact (coverage pass 6 CA6-7). The pattern sweep judged the Medicaid default right ("the bar applies unless an exemption is shown"), which is a reading no text on file states; SAVE reports the class of admission, so the fact is always available. Changes no stored answer. | Require it where read for an LPR inside the five years, as the cash programs do. |
| C7-10 | P2 | rare | plan decision 4 | CO-4101 (`otherwise (< month (month_of date_of_birth)) false`) | | An unstated date of birth reads as "not before birth", so a month before an undated newborn's birth is `ineligible_residency` (delscan: CO-110 p3, June 2026), not cannot determine; no eligible answer moves (every category reads the age). | Leave the month unknown where the date of birth is not stated. |
| C7-11 | P3 | n/a | 8 U.S.C. 1613(a) | CO-003 precision; OQ-213 body ("counting from qualified_status_date matches it") | | The precision cites 4.305.B.3.a for the opposite of what it says; OQ-213's settled half repeats it (C7-04). | Restate both with C7-04's fix. |

Checked and not a finding (each by hand):
- Income at each standard, size 3 (single filer, two claimed children): 65.9% parent (68%), 70.3% adult (the disregard only at the highest standard, the recorded statute_override to 435.603(d)(4)), 140.6% children `child`, 147.07% children CHP+ `eligible_child`, 206.4% CHP+; the exact-cent scan of pass 6 was not repeated.
- Tax and non-filer households: unmarried cohabiting parents, the father filing and claiming the child (father {p1, p3} 166.4% `ineligible_income`; mother non-filer {p2, p3} 0% `parent_caretaker`; child E.1.c.ii {p1, p2, p3} 131.8% `child`); a non-filer mother with a 19-year-old and a 14-year-old (mother and child {p1, p3}; the 19-year-old alone, his $900 counted, 67.7% `adult`); a married couple filing jointly, wife expecting twins (each household 4, E.2 in every household that includes her, 109.1%).
- Pregnancy, birth and Cover All Coloradans across months: an undocumented and a citizen woman applying pregnant 2026-09-01, delivering 2026-10-15 at $3,000 (`pregnant` September 2026 to October 2027, `ineligible_income` November 2027; the baby `needy_newborn` through October 2027, CHP+ from November 2027); an undocumented pregnant mother at 163.6% with an undocumented child of 8 (`pregnant` eligible; the child CHP+ `eligible_child`); a pregnant non-filer mother and child (both size 3).
- Self-employment loss offsets wages (2,000 - 1,000 = 1,000, 75.2%).
- The recent rounds' required facts: CO-1060 without the residence start date (retroactive months cannot be determined, application month eligible); CO-1063 without qualified_status_date (retroactive months cannot be determined).
- Community engagement from 2027: a single adult with the exemption facts unstated is cannot determine (required where read).
- The reader-default scan (29 households, 4,200 deletions) found, besides C7-01, C7-05, C7-08 to C7-10: ma_retroactive_coverage_requested (declared, "If not stated, no request was made", E.2), date_of_death (declared, "Not stated for a living person"), both rule-given.

## 3. Common or rare, one line each

- C7-01 common: retroactive requests are routine and the eligibility start date is not an application answer; from 2027 the wrong months fall inside the old three-month window.
- C7-02 rare: a second pregnancy in the same case after the first postpartum year, with income over 200%.
- C7-03 rare: a scholarship's living-expense part received in a month whose income is near a standard.
- C7-04 rare: an LPR whose earlier non-exempt qualified status began more than five years ago and whose LPR date is within five.
- C7-05 rare: needs the application date unstated.
- C7-06 rare: a determination that reaches months after the applicant's death.

## 4. Status of recent fixes

| Fix | Status at dc52178 | Evidence |
|---|---|---|
| MS-1 residence by month (CO-7650, CO-7651) | Holds. Required where read: CO-1060 without the date, July to September cannot be determined, October and November `eligible` | CO-1060, CO-1061 pass; scratch variant |
| MS-2 status before the qualified status (CO-7652, CO-7551) | Holds for the households written. Gap beside it: C7-04 (the five-year start is the status held now) | CO-1062, CO-1063 pass; CO-1063 without qualified_status_date cannot be determined |
| MS-3 Cover All Coloradans by month for non-MAGI readers | Holds (no MAGI answer moved) | rule tests pass |
| PS-01 status per month; PS-02 Cover All Coloradans per month | Hold | CO-1000 to CO-1002 pass; undocumented pregnant and child probes |
| PS-03 claimer's spouse; PS-04 death in the household (CO-7554) | Hold for the household. Gap: the decedent's own months (C7-06, which PS-04 listed as P2) | CO-1003 passes |
| PS-05 inmate by month (CO-7555) | Holds | CO-1004 passes |
| PS-06 defaults required where read | Hold; the sweep's "right" verdicts on CO-4101's eligibility-start-date arm and the application-date guards of CO-566 and CO-2407 do not (C7-01, C7-05) | delscan |
| C6-01, C6-02 pregnancy period opens in any month of the application | Hold (CO-920 to CO-923 pass). Gaps: C7-02 (a second pregnancy inside a closed period), C7-05 (application date unstated) | PG-SECOND; delscan |
| C6-03 birth ends the pregnancy (CO-7400); C6-06 stated start | Hold | CO-924 to CO-926, CO-932 pass |
| C6-04 outside claim required | Holds | CO-927 |
| C6-05(a), (b), (d) | Hold. C6-05(c) holds for the application-date arm of CO-4101; its eligibility-start-date and window-length arms are C7-01 | RETRO-NOSTART |
| C6-07 annualize only self-employment, seasonal, commission | Holds | CO-933 |
| C6-08 children's continuous eligibility start; C6-09 previous-year C.5; C6-10 living together required; C6-11 | Hold | stored households pass |
| Field sweep (records' time, Social Security) | Holds. Gap in the receipt table: C7-03 (educational assistance) | SCHOLAR-LIVING |

## 5. Coverage matrix (built from the fetched text)

Key: **C** carried (derivation read; correct unless a finding is named). **NA** not applicable, with the reason. **OQ** open question.

### 5.1 § 8.100.4

| Para | Disposition |
|---|---|
| A.1-A.3 | NA: procedure |
| B.1.a-e, B.2-B.6 | C: CO-1395, CO-1401 to CO-1408, ma_verification_status, CO-1317, CO-1412 |
| C.1 preamble, C.1.a.i-vi | C: CO-502, CO-5106 rows, CO-5160, CO-5161 (a business loss offsets wages), CO-6450 |
| C.1.b.i-xv | C: CO-5500 rows, CO-5501, CO-5502, CO-1185, CO-1187, CO-503. OQ-592, OQ-970 |
| C.1.c.i-iii | C: CO-5500 (tax_exempt_interest, social_security) |
| C.1.d.i-ix | C: CO-5500 excluded rows; P57. **C7-03** (d.ii) |
| C.1.e.i-xv | C: CO-080 |
| C.1.f.i, f.i.1, f.ii, f.ii.1, second f.ii | C: CO-4558, CO-4568, CO-563 |
| C.2, C.2.a.i-iii, C.2.b | C: CO-1402, CO-1344, CO-1641, CO-1642. OQ-302 |
| C.3 | C: CO-1403 |
| C.4 | C: CO-503, CO-6452, CO-4567. **C7-07** |
| C.4.a | C: CO-4559, CO-4975, CO-7404. OQ-810 |
| C.5 | C: CO-4560, CO-4561, CO-504, CO-7408. OQ-811 |
| D.1, D.1.a-b | C: CO-539 and CO-545 to CO-548 (statute_override to 435.603(d)(4)), CO-704 |
| E.1.a-d, E.2-E.6 | C: CO-500, CO-076, CO-1976, CO-501, CO-7050, CO-4976, CO-7554 |
| F.1-F.9 | C: CO-558, CO-559, CO-3155; F.3-F.7 NA (procedure). OQ-590 |
| G.1 | C: CO-4978, CO-5402, CO-4790 |
| G.2, G.2.a | C: CO-545, CO-564 |
| G.3, G.3.a.i-vi | C: CO-547, CO-2606, CO-4791 |
| G.4, G.4.a | C: CO-548, CO-539. G.4.b NA (expired) |
| G.5, G.5.a.i | C: CO-546, CO-565, CO-566, CO-7401, CO-560. **C7-02, C7-05** |
| G.6, G.6.a.i-viii | C: CO-5219, CO-566, CO-554. **C7-06** (i for other categories) |
| G.7, G.7.a | C: CO-550, CO-087, CO-3322 |
| G.8 | C: CO-1154, CO-1155, CO-4976. OQ-204 |
| H.1.a-g | C: CO-2419. OQ-512 |
| H.2.a-c | C: CO-549, CO-095 |
| I.1-I.5 | C: CO-4205, CO-2430, CO-2425, CO-4204, CO-2431. OQ-1180 |
| J.1-J.2 | C: CO-2440 to CO-2445, CO-3156, CO-4793 |

### 5.2 § 8.100.3 paragraphs the MAGI outcomes read

| Para | Disposition |
|---|---|
| B.1-B.2 | C: CO-2250, CO-7650, CO-7651, CO-505. OQ-472, OQ-1445 |
| E.1-E.2 | C: CO-4100, CO-4101, CO-557, CO-2472. **C7-01, C7-08** |
| G.1.b-c | C: CO-1105, CO-7555, CO-1179, CO-554. OQ-1325 |
| G.1.g.i-ix | C: CO-509, CO-7551, CO-7652, CO-1172, CO-2400, CO-7552, CO-7553. **C7-04**. OQ-213, OQ-214, OQ-510, OQ-517, OQ-518, OQ-550, OQ-1425, OQ-1446 |
| K.1 | C: CO-4551, CO-4552. OQ-812 |
| Q.1-Q.3 | C: CO-561, CO-7405, CO-556, CO-2205 |

### 5.3 10 CCR 2505-3

| Para | Disposition |
|---|---|
| 110.1.A.1-2 | C: CO-705, CO-706, CO-7051. OQ-1232 |
| 110.1.B.1-5, B.5.o | C: CO-2706, CO-2707, CO-7552. OQ-550 |
| 110.1.C, D | C: CO-7402. NA: VLP procedure |
| 110.1.E, F | C: CO-704 |
| 110.1.G; 130.1 | C: CO-1416 to CO-1418, CO-1641, CO-1642 |
| 120.1.A-C, 120.2 | C: CO-1176, CO-1105, the IMD arm, chp_has_other_health_coverage (at application or redetermination; § 440.4.B) |
| 150.1-150.2 | C: CO-704 by the adopted-method link |
| 170.1-170.6 | C: CO-708; 170.2-170.4 NA |
| 180 | C: CO-4792, CO-4793 |
| 320, 330 | C: CO-2228, CO-2229, CO-1989, CO-1990. OQ-470 |
| 430.1 | C: CO-4565 |
| 430.2, 430.2.A, B.i-viii | C: CO-2404, CO-7406, CO-2205. **C7-05**, **C7-06** (B.i in the status) |
| 430.3, 430.3.A.i | C: CO-2406, CO-2407. **C7-05**. OQ-813 |
| 430.4, 400-420, 440.1-440.5 | NA: plan enrollment (440.4.B read with 120.1.A) |
| 430.5 | C: CO-2410. OQ-1231 |

Every numbered paragraph of the in-scope text has a row or sits in a grouped row. No row is a GAP: each P1 sits in a carried row whose derivation was read and found wrong for the household named.

## 6. Open-question classification check

The stopping rule accepts an open question classed as a state policy choice (the text checked recorded) or blocked on a named document no allowed host serves. The MAGI and CHP+ items name these (the reach of section "Method"; the SSI-method and long-term care questions the boundary items name, OQ-201 to OQ-203, OQ-473, OQ-822, OQ-823, OQ-950, OQ-971, OQ-972, OQ-974, OQ-995, OQ-1060, OQ-1061, OQ-1120, OQ-1122, OQ-1280 to OQ-1282, OQ-1385, OQ-1415, are the non-MAGI reviewer's; OQ-533 and OQ-1262 are SNAP's, reached through community engagement).

| OQ | Class | Check |
|---|---|---|
| OQ-200, OQ-204, OQ-214, OQ-302, OQ-410, OQ-411, OQ-412, OQ-470, OQ-472, OQ-510, OQ-512, OQ-518, OQ-590, OQ-592, OQ-593, OQ-810, OQ-811, OQ-812, OQ-813, OQ-970, OQ-1020, OQ-1180, OQ-1231, OQ-1232, OQ-1425, OQ-1445, OQ-1446 | state policy choice | Confirmed: each records the text checked and no text on file decides it |
| OQ-515, OQ-517, OQ-550, OQ-1325 | blocked on a named document | Confirmed (HCPF's poverty-guideline memo; HCPF's transition guidance on hcpf.colorado.gov; the SAVE status list; CMS's SUD demonstration approval of October 14, 2025) |
| OQ-213 | state policy choice (open half) | **Fails in part (C7-04).** The open half (adult parolees, conditional entrants, battered non-citizens before October 2026) is a State option and stays. The "settled" half ("counting from qualified_status_date matches" 1613(a)) is wrong for a person whose earlier status was qualified: 1613(a) and the 4.305.B.3.a the volume cites start the five years at the first qualified status |
| OQ-62, OQ-393, OQ-1181 | resolved | No class needed |

Unrecorded choice found: C7-07 (C.4's "or previous" month). No new question is needed for C7-01 to C7-06: E.1, 1396a(a)(34), G.5, (e)(16), C.1.d.ii, 26 U.S.C. 117(b), 1613(a), § 430.2.B.i and decision 4 decide them.

## 7. Gate

`scripts/audit/quick-tests.ts -- --all-tests --all-cases` at `dc52178`: 11,069 checked, 0 failed. `CHECK_BASE=origin/main npm run check` (with the uncommitted review file and scratch scripts only): OK; co 6,343 rule tests and 4,726 household expectations pass, change impact 21 flags all dispositioned; conformance self-check OK (6,997 cases, 11,229 checks). Typecheck and the unit tests were not run (no code changed).

## 8. Probe households (scratch only, not committed)

| Probe | Shape | Engine | Rule |
|---|---|---|---|
| RETRO-NOSTART | adult $1,000, application 2026-11-02, retroactive request, no eligibility start date | April to July `eligible` | April to July before coverage (C7-01) |
| CO-73 with a request | application 2027-03-02 | adult October 2026 to February 2027 eligible; child from June 2026 | adult February 2027 only; child January and February 2027 (C7-01) |
| RETRO-2027-UNKNOWN | adult, application 2027-01-15, request, engagement facts unstated | September to December 2026 `eligible` | September and October before coverage; November cannot determine (C7-01) |
| PG-SECOND | member since 2025-03, first birth 2025-09-10, pregnant again from 2026-10-05, $5,500 / $6,500 | `pregnant` eligible; CHP+ `ineligible_medicaid_eligible` | `ineligible_income`; CHP+ `eligible_prenatal` / `ineligible` (C7-02) |
| SCHOLAR-LIVING | 20, $1,200 wages, $4,000 grant in November, $2,500 for housing | `eligible` (90.2%) | `ineligible_income` (278.2%; C.5 108.0%) (C7-03) |
| LPR-EX-PAROLEE | paroled 2019-05-01, LPR 2023-03-01, $1,000 | `emergency_only` | `eligible` (C7-04) |
| CO-920, CO-922, CO-923, CO-110, CO-137 without the application date | | period closed: `ineligible_income`, CHP+ `ineligible` | cannot determine (C7-05) |
| DIED-RETRO | died 2026-08-20, application 2026-09-15 with a request, $1,000 | June to December `eligible` | September on not eligible (C7-06) |
| Pathway and household probes of section 2 | | as by hand | as by hand |
