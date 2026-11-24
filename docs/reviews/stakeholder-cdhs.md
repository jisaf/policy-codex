# Stakeholder review: CDHS programs (SNAP, Colorado Works, Adult Financial, LEAP, SUN Bucks) and CCCAP (CDEC)

Reviewer role: program representative for the Colorado Department of Human Services programs on PEAK — SNAP
(10 CCR 2506-1, D-82), Colorado Works/TANF (9 CCR 2503-6, D-81), Adult Financial (OAP, AND-SO, AND-CS, Home
Care Allowance, burial; 9 CCR 2503-5, D-80), LEAP (9 CCR 2503-7, D-86) and SUN Bucks/Summer EBT (7 CFR 292,
D-88) — and for CCCAP, now administered by the Department of Early Childhood (8 CCR 1403-1, D-87). Question
asked: are these chapters a faithful, complete statement of how our programs decide eligibility and benefit
amounts, and could we approve them?

Reviewed at branch `ccr-9d19bf4c-wmnwcl`, HEAD `933ce0c`. Read-only; the only file written is this one.

Method:
- Read the orientation set (README, design-colorado, conventions, governance, colorado-notes, volume.yaml,
  open-questions.md, open-question-status.md) and every derived item and parameter in `snap/`, `cash/`,
  `childcare/`, `energy/`, `sunbucks/` (CDHS/CDEC programs, 376 items excluding verification items).
- Provenance check by script: each of the 428 excerpts those items cite was matched against the document it
  names (text normalized, compared in 50-character chunks). All 428 exist, none is `unverified`, and every
  excerpt is found in its document; the few chunks that do not match sit across page breaks or `...`
  elisions, not paraphrase.
- Hand recomputation of every SNAP, Colorado Works, AF, LEAP, CCCAP and SUN Bucks amount in CO-01, CO-02,
  CO-07, CO-13 and CO-83, then a check of each step with `npx vite-node scripts/eval-case.ts co <case> <ids>`.
- Probe households (a modified copy of CO-13, kept in my scratchpad, not in the repo) run through the same
  engine to confirm three of the blocking findings below.
- `npm run check`: OK (co: 2032/2032 rule tests, 2165/2165 household expectations).

Source labels used throughout: **[T]** means the gap or defect is shown by the fetched rule text or statute
(line cited). **[PK]** means it comes from my program knowledge as the CDHS/CDEC representative. A [PK]
statement must be confirmed against the governing agency letter, operations memo or State plan before the
codex cites it. Nothing marked [PK] should be quoted as if it were published text.

Severity: **blocking** = a wrong eligibility result or amount would ship for a common household, or I could
not sign. **should-fix** = wrong for a narrower group, or a provision we administer is missing.
**note** = for the record.

---

## 1. Coverage: determinations missing against the current rule texts

### 1.1 Blocking

**B-1. Colorado Works: the grant is paid whatever the eligibility result.** [T]
`cw_grant_amount` (CO-914) is `max(0, cw_grant_before_sanction − cw_sanction_reduction)`, and
`cw_grant_before_sanction` (CO-1260) is the grant standard minus *payment* countable income. Neither item
reads `cw_eligibility_status` (CO-921). In the probes, a unit that fails a check still gets a positive grant:
- An applicant (one caretaker, one child) earning $500: the eligibility test is 500 − 90 = 410 against the
  $331 need standard, so the status is `ineligible_income`. The payment test applies the 100% first-period
  disregard, so `cw_grant_amount` = **$488**.
- CO-13's unit with 72 months used and no extension: status `time_limit_reached`, `cw_grant_amount` = **$366**.
- CO-13's unit living in New Mexico: status `ineligible_residency`, `cw_grant_amount` = **$366**.

Why it matters to me: `cw_grant_amount` is a declared outcome. An engineer who implements it as written pays
ineligible households. The common case is the first one: an applicant whose earnings pass the payment test
but fail the $90 test (3.606.1.H/J against 3.606.2.A). The suite does not catch it because every case with a
Colorado Works outcome is either eligible or has a grant that comes out at zero anyway.
Fix: gate CO-914 (and CO-1260, or only CO-914) on `cw_eligibility_status = eligible`, as `af_oap_grant`,
`snap_allotment`, `leap_benefit_amount` and `cccap_parent_fee` already do. Add a rule test for each
ineligible status.

**B-2. Colorado Works: current child support is counted in the grant.** [T]
9 CCR 2503-6 3.605.5.B (D-81:2926): "Once found eligible, child support income is excluded in the basic cash
assistance grant calculation". C.R.S. 26-2-709(1)(a)(IV) (D-59:4955 ff.) requires the same. Even so,
`cw_payment_countable_income` (CO-923) sums `cw_countable_unearned_income` (CO-908), and CO-908 includes
`child_support_received`. CO-908's precision admits it "does not model the 3.605.5.B-C treatment", and no open
question tracks it. Probe: CO-13 with $200 of child support gives `cw_grant_before_sanction` $288 instead of
$488, and `cw_grant_amount` $216 instead of $366. The redetermination rule (3.605.5.C: counted only when
received in all six prior months and averaging over $500) and the exemption of arrears (3.605.5.D) are also
missing.
Why it matters: child support is one of the most common unearned income sources in our caseload, and the pass-through
was a deliberate legislative policy. Every such grant would be underpaid by the full support amount.
Fix: a CW payment-income figure that leaves out current child support. A redetermination
eligibility figure that applies the 6-of-6 consistency test and the $500 threshold, with
`cw_child_support_months_received_of_last_six` and a six-month average as new supplied facts. A rule test
for each.

**B-3. Colorado Works: a pregnant person with no other children is denied.** [T]
`cw_eligibility_status` (CO-921) returns `ineligible_no_dependent_child` when the unit has no dependent
child. The rule covers an expectant parent: 3.601 "'Parent' means an adoptive or natural/biological
parent, including an expectant parent" (D-81:499). 3.604.3 requires "Verification of pregnancy, when no
children are in the assistance unit" (D-81:1707). 3.606.1.G adds the $10 pregnancy allowance (D-81:3020). The
Standards of Assistance chart has a **0 children** column for One and Two Caretakers ($253/$374 and
$357/$527, D-81:2998 ff.). That column exists for this unit. In the probe (CO-13's mother pregnant, no child)
the codex returns status `ineligible_no_dependent_child` and, because of B-1, a grant of $384 at the same
time.
Fix: CO-921's first check becomes "no dependent child and no pregnant member". CO-926/CO-927 already price a
zero-child unit. Add a rule test and a household case.

**B-4. SNAP: a member who is ineligible under the ABAWD time limit or for an SSN failure stays in the eligible
household.** [T]
`snap_is_ineligible_member` (CO-311) lists ineligible non-citizens, students, fleeing felons, parole
violators, IPV, work-requirement noncompliance, voluntary quit and drug felony. It does not list:
- an ABAWD who has reached the time limit (10 CCR 2506-1 4.304.4.A.5, D-82:3449);
- a member who failed to provide or apply for an SSN (4.304.4.A.2);
- the post-February 7, 2014 violent-felony disqualification (4.304.4.A.6).

`snap_abawd_time_limit_status` (CO-418) is computed, but nothing downstream reads it, so `limit_reached`
changes neither `snap_eligible_household_size` nor the allotment. CO-333's own assumption admits the
ABAWD-sanction and missing-SSN pro rata grounds "are not modeled", and no open question tracks the gap.
Why it matters: H.R.1 sec. 10102 widened the ABAWD population to people aged 55–64 and to parents whose
youngest child is 14–17. Time-limited members will be common in Colorado households from 2026 on. Leaving
them in overstates the household size and the maximum allotment for every such household, which creates
overpayments and quality-control error.
Fix: add `[=, snap_abawd_time_limit_status, limit_reached]` (with care for the month-scope),
an SSN-failure fact and a 4.304.4.A.6 fact to CO-311. Route their income through the pro rata branch of
4.411.1.B.2 (CO-333/CO-371), which already exists for ineligible non-citizens. Add a household case with a
time-limited 58-year-old.

**B-5. Colorado Works: grant standards for State fiscal year 2026-27 are missing.** [T statute + PK]
C.R.S. 26-2-709(1)(b)(I) (D-59:4970-4975): "For the state fiscal year commencing July 1, 2024, and each state
fiscal year thereafter, the amount of basic cash assistance must be equal to or exceed the amount of basic
cash assistance for the previous state fiscal year plus a two percent cost of living adjustment or [the
three-year SSA COLA average], whichever is greater." The codex carries the 3.606.1.F chart "from 2025-07-01"
with no end date (CO-274, CO-276, CO-351–CO-354, CO-275, CO-277). It therefore prices every month from July
2026 on, including every CW expectation in CO-01, CO-02, CO-07, CO-13 and CO-83, at SFY 2025-26 levels.
No source states that or explains why. No excerpt cites 26-2-709(1)(b), and no open question exists.
[PK] CDHS raises basic cash assistance each July 1 under this statute. If the July 1, 2026 standards are in
an agency letter or an emergency rule not yet on the SOS "current" version, the codex must get them from
there.
Fix: fetch the SFY 2026-27 chart (rule or agency letter) and add a 2026-07-01 version. Until then, end the
2025-07-01 versions at 2026-07-01 so grants after that date report *cannot determine* instead of a stale
figure. Add 26-2-709(1)(b) as an excerpt and an open question. I rank this blocking because every Colorado
Works dollar figure in the suite falls after 2026-07-01.

### 1.2 Should-fix (coverage)

| # | Program | Gap | Source | Proposed fix |
|---|---|---|---|---|
| C-1 | SNAP | H.R.1 implementation dates. `snap_is_eligible_non_citizen` (CO-308, sec. 10108) and `snap_entitled_to_heating_cooling_allowance` (CO-1243, sec. 10103) have no `effective` range, so a determination for any date applies the 2025 law. `snap_abawd_max_age` (CO-166) and CO-412 start on the enactment date, 2025-07-04, and CO-1515 starts the ABAWD clock in 2023-07, so months before CDHS put the new ABAWD categories into effect can count. | [T] D-5; [PK] | Date each H.R.1 item from CDHS's implementation date in the Food and Energy Assistance agency letter. Apply secs. 10108 and 10103 to ongoing cases at the next recertification or acted-on change (see OQ-1, OQ-251 in §5). Make no month before implementation, and before the person was notified, a countable ABAWD month. |
| C-2 | SNAP | Boarders, roomers and live-in attendants (7 CFR 273.1(b)(7)(i)-(ii)) and strikers (273.1(g)) are not modeled. Excluded-income rules (the earnings of a student under 18, 273.9(c)(7)) enter only as a supplied amount. | [T] D-7, D-13 | Add the non-member categories to CO-304/CO-305. Add a striker test. A supplied `snap_excluded_earned_income` is acceptable for now, but the student-earnings exclusion is common enough to derive. |
| C-3 | CW | The diversion **amount** is not modeled (OQ-252(3)); only `cw_diversion_eligible` is. | [T] 3.606.8 | A supplied, county-approved diversion amount with the State-plan cap as a parameter, so the outcome has a dollar figure. |
| C-4 | CW | 3.6xx.D "Other assistance" (county option for a household with a dependent child or a pregnancy, lawfully present, income under $75,000; D-81:3970-3978) is not mentioned anywhere. | [T] | Record as out of scope (a county-funded service), or add a county-option outcome. Either way, say so in colorado-notes. |
| C-5 | AF | Home Care Allowance tier maximums (OQ-250). `af_hca_grant` (CO-1219) reads a supplied CMA-authorized amount and raises it to the $977 floor. | [T] 3.570.11/13 | [PK] The tier maximums are set administratively within appropriations (3.570.11.D) and published to the CMAs, not in rule. Get the current schedule from CDHS's Adult Financial program office and add it as a dated parameter table. |
| C-6 | LEAP | Program-year figures are case-supplied: the statewide adjustment rate (Step B), the minimum and maximum benefit (Step G) and the flat-rate EHHC by dwelling type (Step A.2). CO-01/CO-02 state 0.2, $100, $1,000 and $900 as illustrative values, so the $540 November benefit is arithmetic on invented inputs. | [T] 3.758.47-48 | Make them dated, global parameters sourced from the annual State notification and LEAP training manual (3.758.48). Mark the case values as illustrative in the case comment and in colorado-notes. |
| C-7 | CCCAP | Parent-fee exceptions are missing: the teen-parent hardship waiver (3.124.I.1), Child Welfare Child Care (I.4), Families Experiencing Homelessness during stabilization (I.5), and protective services "unless the child(ren) has countable income" (I.6). CO-1290 sets every protective-services fee to $0. | [T] S784 | Add the facts and exceptions. Charge the formula fee to a protective-services household whose child has income. |
| C-8 | CCCAP | The fee's $15-per-additional-child amount counts *eligible* children, not children for whom care is requested (OQ-254(1)), which overstates the fee. | [T] S785 | A per-child `cccap_care_requested` fact. |
| C-9 | CCCAP | County entry limits are a supplied percentage (OQ-121). | [T]; [PK] | [PK] CDEC publishes each county's entry level. Fetch the table from CDEC and make it a parameter keyed by county (the 64-county enum already exists in CO-1979). |
| C-10 | SUN Bucks | No period of eligibility. 7 CFR 292.2 and 292.12(a) (D-88:120, 254) establish eligibility from the first day of the instructional year (July 1) through the end of the summer operational period. The benefit is one three-month issuance for that summer. The codex evaluates `sebt_eligibility_status` and `sebt_benefit_amount` monthly and, in October/November 2026, pays $120 at the **2026** level for what can only be summer 2027. | [T] | Key the outcome by summer (a `sebt_summer_year` input or the determination's instructional year), read SNAP/TANF participation over that period, and use the benefit level for that summer, unknown until FNS publishes 2027. |
| C-11 | SUN Bucks | Colorado's streamlined-certification sources and summer operational period are in the Plan for Operations and Management (POM), which was not fetched (OQ-255). | [T]; [PK] | [PK] Our understanding is that Colorado streamline-certifies through SNAP, Colorado Works, FDPIR, the school-meal direct-certification categories and Medicaid-based direct certification. CDHS and CDE must confirm this from the POM before `sebt_other_categorical_basis` is replaced by named facts. |

### 1.3 Notes (coverage)

- N-1 [T] `af_category` (CO-953) still has an `ab` (Aid to the Blind) branch. 3.540 and 3.520.61.A fold blind
  clients aged 0–59 into AND-SO (OQ-112), and no current rule pays AB. Remove the branch or mark it
  statute-only and unreachable, so a county never sees "AB" as a result.
- N-2 [T] LEAP income uses the application month as a stand-in for the "Income Verification Period" (the
  ~30 days back from the date of application, D-86:155). This is acceptable as a modeling simplification;
  record it as an assumption on CO-1002.
- N-3 [T] FNS proposed rules D-131 (ABAWD) and D-132 (categorical eligibility; would end ECE) are
  correctly treated as watch items only (OQ-12, OQ-31).

---

## 2. Correctness: rules sampled against their excerpts, and hand recomputation

### 2.1 Rules sampled (62)

For each item I read the meaning and the derivation against the cited excerpt and, where needed, the
document line. ✓ = faithful; ~ = faithful to the text but rests on an open reading or has a narrower defect;
✗ = wrong.

| Item | Rule | Verdict |
|---|---|---|
| CO-305 | SNAP household (purchase-and-prepare, mandatory members, institution exclusion, E/D separate household) | ✓ |
| CO-308 | Eligible non-citizen under amended 2015(f) | ✓ statute; ~ no effective date (C-1) |
| CO-311 | Ineligible member grounds | ✗ B-4 |
| CO-333 / CO-371 | Ineligible non-citizen income and earnings pro rata (4.411.1.B.2) | ✓ for non-citizens; ✗ missing ABAWD/SSN grounds (B-4) |
| CO-338 | BCE (all members receive SSI/CW/OAP/AND) | ✓ |
| CO-340 | ECE at or below 200% FPL | ~ OQ-356, OQ-12 (I accept both, §5) |
| CO-344 | Resource limit, categorical exemption | ✓ |
| CO-347 | Gross income test (E/D households exempt) | ✓ |
| CO-348 | Expedited service (3 prongs) | ✓ |
| CO-373 | 20% earned income deduction incl. prorated share | ✓ |
| CO-376 | Excess medical / $165 SMED | ✓ (OQ-353 accepted) |
| CO-377 | Shelter costs per member + SUA | ✓ |
| CO-379 | Excess shelter, cap $769 unless E/D | ✓ |
| CO-380 | Homeless shelter deduction $205.66, none without costs | ✓ (matches S742 last sentence) |
| CO-381 | Net income rounded, floored at 0 | ✓ |
| CO-1243 | HCUA, LEAP route limited to E/D households (sec. 10103) | ✓ statute; ~ no effective date (C-1) |
| CO-1500 | Four-tier SUA $616/$390/$73/$100 | ✓ |
| CO-2307 | Full-month allotment, round down after subtraction, minimum for 1–2 persons | ✓ |
| CO-2308 | Initial-month proration, exact days (4.207.2.C) | ✓ |
| CO-385 | Allotment, no initial-month benefit below the minimum | ✓ |
| CO-386 / CO-387 | Eligibility and zero-benefit denial except BCE/ECE | ✓ |
| CO-405 | Work registration exemptions | ✓ |
| CO-411 | Ineligible student 18–49 | ✓ |
| CO-412 | ABAWD age 18–64 | ✓ (OQ-31) ~ start date (C-1) |
| CO-414 | ABAWD exceptions per amended 2015(o)(3) | ✓ |
| CO-416 / CO-418 | ABAWD countable month and status | ✓ as a computation; ✗ not consumed (B-4) |
| CO-2318 | Voluntary quit 1/3/6 months | ✓ |
| CO-900 | CW assistance unit | ✓ except the pregnant-only unit (B-3) |
| CO-901 | Dependent child (under 18, or 18 finishing secondary school) | ✓ |
| CO-907 | Eligibility earned income ($90 at application; payment disregard for recipients) | ✓ |
| CO-908 | Countable unearned income | ✗ child support (B-2) |
| CO-909 / CO-2000 | Minor-parent deeming less $90 and a need standard | ✓ (OQ-102 reading accepted) |
| CO-911 / CO-912 | Need and grant standard by caretaker row and child column | ✓ for the 2025 chart; ✗ dating (B-5) |
| CO-913 | Income strictly below need standard (3.606.1.J.4) | ✓ (OQ-153 accepted) |
| CO-914 / CO-1260 | Grant | ✗ B-1, B-2 |
| CO-921 | CW eligibility status | ✗ B-3 |
| CO-1264 / CO-1265 | Sanction $1 / 25% / 25% / closure, highest level in unit | ✓ |
| CO-2353 | Stepparent deeming (3.605.1.A.4.a) | ✓ |
| CO-2365 | Sponsor deeming 20% or $175 | ✓ |
| CO-928 | Disqualified required member | ~ OQ-490 (I overrule, §5) |
| CO-946 | AF countable income: SSI set aside, $20, SSI added back | ~ OQ-351 (I overrule, §5) |
| CO-948 | AF resource limit $2,000/$3,000 | ✓ |
| CO-950 | AND-CS: age 0–59, SSI less than full benefit | ✓ (3.546, D-80:4837) |
| CO-951 | OAP grant, $189 floor, PNA, proration | ✓ |
| CO-952 | AND grant, $13 AND-CS floor | ✓ |
| CO-953 | AF category order | ✓ except the `ab` branch (N-1) |
| CO-929 | OAP citizenship test with no five-year bar | ✗ against C.R.S. 26-2-111(2)(c) (OQ-430, §4) |
| CO-1216 / CO-1219 | HCA tier; grant raised to the $977 floor | ✓ (C-5 for the tier maximums) |
| CO-1231 / CO-1232 | Burial: $2,500 limit less exempt plot; $1,500 max | ✓ (OQ-355 accepted) |
| CO-980 | CCCAP eligible child | ✓ (citizenship ~ OQ-394) |
| CO-982 | CCCAP household | ~ teen-parent merge, OQ-163 K-9 |
| CO-985 | CCCAP household income (children's earnings excluded unless teen parent) | ✓ |
| CO-986 / CO-993 / CO-2104 | Entry limit (county) / exit 85% SMI | ✓ (C-9) |
| CO-988 | Colorado Works Child Care route | ✓ |
| CO-1289 | Parent fee 1% + 14% above FPG + $15 | ✓ (C-8) |
| CO-1290 | Parent fee reductions and exceptions | ~ C-7 |
| CO-1000 / CO-1009 | LEAP household and income household | ✓ |
| CO-1003 | LEAP income at or below 60% SMI table | ✓ |
| CO-1010 | LEAP qualified alien list | ✗ includes COFA migrants, not in 3.753.16 A–L (D-86) — see S-3 |
| CO-1279 / CO-1281 | LEAP income contribution bands; benefit | ✓ arithmetic (C-6 inputs; OQ-253 additive reading accepted) |
| CO-1297 / CO-1298 / CO-1299 | SUN Bucks income limit, eligibility, benefit | ✓ against 292.5/292.15; ~ timing (C-10) |

### 2.2 Hand recomputation of the household cases

All figures below are mine from the cited text. Every one matches the engine's value, checked with
`eval-case.ts`.

**CO-01 / CO-02 (target household; October / November 2026, FY2027 figures)**

*SNAP* — unit p2, p3, p4, p5. p3 is undocumented, an ineligible non-citizen, so 3 eligible members.
- Gross: p2 Social Security $1,180, plus p3's wages $2,380 × 3/4 pro rata (4.411.1.B.2) = $1,785. Total $2,965.
  ECE: $2,965 ≤ $4,554 (200%, size 3).
- Earned income deduction: 20% × $1,785 = $357. Standard deduction (size 3) $217.
- Adjusted income: $2,391.
- Shelter: rent $1,400 + HCUA $616 = $2,016. Excess: $2,016 − $1,195.50 = $820.50, uncapped because p2 is elderly.
- Net: $1,570.50, rounded to $1,571.
- Allotment: $808 − (0.3 × $1,571 = $471.30) = $336.70, rounded down to **$336**. ✓ Engine: 336.

*Colorado Works* — minor-parent unit p4, p5. p4 is a dependent child of a caretaker, so she "will receive
assistance as a child" (3.604.2.N.3.d, D-81:1550); No Caretaker row, 2 children: need $245, grant $362.
- Deemed from p3: $2,380 − $90 = $2,290, less a one-person need standard of $253, = **$2,037**.
- $2,037 ≥ $245, so ineligible. ✓ Engine: 2037, `ineligible_income`.

*CCCAP* — household p3, p4, p5; income $2,380; size 3; 100% FPG $2,276.67 (from 2026-10-01).
- Formula: 1% × $2,380 + 14% × $103.33 = $38.27. One eligible child (p5), so no $15.
- Top-three provider: × 0.8 = $30.61, cents dropped, = **$30**. ✓ (The household composition is subject to
  OQ-163 K-9.)

*LEAP* (November) — household p2, p4, p5 with p3's income counted (3.753.18); income $3,560.
- Income ratio: $3,560 × 12 / $27,320 = 156%, so the 20% contribution band applies.
- Benefit: $900 × (1 − 0.2 statewide − 0.2) = **$540**, within $100–$1,000. ✓ The arithmetic is right, but
  three of its inputs are case-supplied illustrative values (C-6).

*SUN Bucks* — p4 is in an NSLP school, in a SNAP household: $40 × 3 = **$120**. ✓ Arithmetic; ✗ timing (C-10).

*AF* — p1 (79, institutionalized) is `none`. She meets OAP age, but her resources exceed the limit.
✓ consistent.

**CO-07 (October 2026)**

*Colorado Works* — p1, p2, p4; two caretakers, one child: need $439, grant $649.
- Dana's $400 is a current source past the first period, so the 67% disregard applies: $132 counts.
- $649 − $132 = $517. Second-level sanction (3.608.4.C.1): 25% off gives $387.75, so **$387**. ✓
  (Subject to B-5.)

*AND-CS* — Alma (9): AND-CS covers ages 0–59 (3.546).
- SSI $700, and SSI-only income gets no $20 (3.549.A.2.c.2), so countable is $700.
- The parents are on Medicaid with income no greater than the SSI limit, so nothing is deemed (3.549.F).
- $994 − $700 = **$294**. ✓

*OAP* — Rosa (62): SSDI $900 − $20 = $880 countable. $1,032 − $880 = $152, below the $189 floor, so
**$189**. ✓

**CO-13 (November 2026)**

- *OAP*: $700 − $20 = $680. $1,032 − $680 = **$352**. ✓
- *HCA*: tier 2 (capacity 24, need 30). The CMA authorized $900; the floor raises it to **$977**. ✓
- *Burial*: $2,800 charges less the $600 exempt plot = $2,200, within $2,500. Unmet cost: $2,800 − $300
  insurance − $200 estate − $0 excess resources (the widow's $1,000 is under $2,000) = $2,300. Capped at
  **$1,500**. ✓
- *Colorado Works*: one caretaker, one child, no income: $488. Second-level sanction gives $366. ✓
  (Subject to B-5.)
- *SUN Bucks*: **$120**. ✓ (C-10.)

**CO-83 (stepfamily applying October 12, 2026)**

*SNAP* — 3 members; ECE.
- Earned $1,500, less 20% ($300) and the standard $217: adjusted income $983.
- Shelter: rent $1,200 + HCUA $616 = $1,816. Excess: $1,816 − $491.50 = $1,324.50, capped at $769.
- Net $214. $808 − $64.20 = $743.80, so a full month of **$743**.
- Proration: (31 + 1 − 12)/31 × $743 = $479.35, so **$479** for October. ✓

*Colorado Works* — stepfather's deemed income: $1,500 − $90 − $253 = **$1,157**, above the $331 need
standard (one caretaker, one child), so ineligible. ✓

**Conclusion on correctness:** the arithmetic of every computed path in these five households is right.
The defects are in paths these households never take: an ineligible unit with a grant, child support,
pregnancy without a child, and a time-limited ABAWD.

---

## 3. Figures: current, dated and sourced?

| Figure | Items | Value used | Source | Current | Dated | Sourced |
|---|---|---|---|---|---|---|
| SNAP FY2027 maximum allotments, standard deduction, shelter cap $769, homeless $205.66, minimum $25 | CO-130–CO-135 | FY27 from 2026-10-01, FY26 versions closed | FNS D-83 (retrieved 2026-11-21), cross-checked to 10 CCR 2506-1 4.207.3.D / 4.407 (D-82) | ✓ | ✓ | ✓ |
| SNAP FY2027 gross/net income limits | CO-110–CO-113 | 130% size 3 $2,960; 100% $2,277 | FNS D-84; D-82 4.401.1 | ✓ | ✓ | ✓ |
| Colorado 200% BBCE table | CO-122/123 | size 3 $4,554 | D-82 4.401.1 (FY27), D-133 (FY26) | ✓ | ✓ | ✓ |
| E/D resource limit | CO-119 | $4,750 from 2026-10-01 | FNS D-83. Colorado rule still says $4,500 (2024), see §4 | ✓ | ✓ | ✓ |
| General resource limit | CO-118 | $3,000 from 2025-10-01 | FNS FY26 table (S56) | ✓ value; note: cite the FY27 table too | ✓ | ~ |
| SUA FY2027 | CO-1235–CO-1238 | HCUA $616, BUA $390, OUA $73, phone $100 | D-82 4.407.31 "Effective October 1, 2026"; FY26 from FNS D-85 | ✓ | ✓ | ✓ |
| SMED | CO-1514 | $165 since 2016-10-01 | D-82 4.407.61 | ✓ | ✓ | ✓ |
| AF 2026 standards | CO-289–CO-291, CO-1200–CO-1202, CO-1513, CO-1509, CO-1227/1228 | OAP $1,032; AND-CS $994; AND-SO $248 (2022); floors $189 / $13 / $977; ISM $351; PNA $79; burial $1,500 / $2,500 | D-80 (SOS, eff. 2026-03-02) | ✓ | ✓ | ✓ |
| Colorado Works chart | CO-274–CO-277, CO-351–CO-355 | 2025-07-01 chart, open-ended | D-81 (eff. 2025-07-01) | ✗ for months from 2026-07-01 (B-5) | ~ | ~ |
| LEAP 2026-27 income table | CO-875 | size 4 $7,258; 1–15 persons | D-144 "CDHS LEAP web page" at **cdhs.nxt-dev.colorado.gov** | ✓ content. Cross-check: $10,283.37 (CCCAP 85% SMI, size 4) × 60/85 = $7,258.85, consistent | ✓ (2026-11-01 to 2027-05-01) | ✗ host (S-7) |
| LEAP benefit min/max, statewide adjustment, flat rates | none | case-supplied | none | ✗ (C-6) | ✗ | ✗ |
| CCCAP FPG / 85% SMI | CO-323/324, CO-1804/1805 | through 2026-09-30 and from 2026-10-01 | D-87 3.111.H.2-3 | ✓ (size 3 $2,276.67 = HHS 2026 $27,320 / 12) | ✓ | ✓ |
| CCCAP parent-fee rates (2021–2028 and post-2028 bands) | CO-1284–CO-1286, CO-2115–CO-2119 | 1% / 14% / $15; 3/5/7% from 2028-08-01 | D-87 3.124.P-Q | ✓ | ✓ | ✓ |
| SUN Bucks | CO-1244, CO-1291, CO-1519/1520 | $40/month 2026; 185% IEG 2026-27 | D-89, D-90 | ✓ for summer 2026; ✗ applied to summer 2027 (C-10) | ✓ | ✓ |
| HHS 2026 poverty guideline | CO-181/182 | $15,960 + $5,680 | D-23 | ✓ | ✓ | ✓ |

Overall: SNAP, AF and CCCAP figures are exemplary. Each is a dated version with the prior year closed,
quoted from the official text, and cross-checked between FNS and the Colorado rule. Colorado Works and the
LEAP benefit inputs are the two places I cannot sign.

---

## 4. Conflicts between federal law and Colorado rule text

The volume's stated principle is that the amended statute controls where the regulation or the Colorado
manual has not caught up. For federal SNAP law that is what CDHS would want: a Colorado rule cannot
override the Food and Nutrition Act, and FNS holds the State to the statute regardless of our
rule-making calendar. My concerns are about dating, the treatment of ongoing cases, how a county would read
the result, and one place where the volume applies the principle inconsistently.

| Conflict | Federal | 10 CCR 2506-1 (D-82, eff. 2026-10-01) | Codex | CDHS view | Explained so a county understands? |
|---|---|---|---|---|---|
| Non-citizen categories | P.L. 119-21 sec. 10108: LPR, Cuban/Haitian entrant, COFA only | 4.305: refugees/asylees eligible, COFA ineligible (S751) | Statute (CO-308) | ✓ agree. **But** the date and the treatment of ongoing cases are needed (C-1, OQ-1) | Partly: in OQ-1 and the item meaning, not in a county-facing note |
| ABAWD age band | sec. 10102: "under 18, or over 65"; FNS reads as 18–64 (D-131) | 18–54 (4.000 definition, D-82:33) | 18–64 from 2025-07-04 (CO-166, CO-412) | ✓ agree on 64. The start date should be CDHS's implementation date, not enactment (C-1) | Partly (OQ-31) |
| ABAWD exceptions | Homeless/veteran/foster-youth exceptions struck; child under 14; Indian/Urban Indian added | 4.311.1.C-E still lists them; "residing with anyone under 18" | Statute (CO-414) | ✓ agree | Precision on CO-414 is good; the county view needs one sentence |
| LEAP-based HCUA | sec. 10103: only households with an elderly or disabled member | 4.407.31.A.1.b: any household with LEAP or E-EBT receipt in 12 months | Statute (CO-1243) | ✓ agree; dating (OQ-251) | Precision explains; no `legal` tag on CO-1243 |
| E/D resource limit | $4,750 (FNS FY27) | $4,500 "Effective October 1, 2024" | FNS (CO-119) | ✓ agree; CDHS should amend 4.408.E | No note on CO-119 |
| Internet costs | sec. 10104 excludes | 4.407.3.E.5 already excludes | Consistent | — | — |

State-law conflicts in my programs, where the volume's choice differs:
- **OAP five-year bar (OQ-430).** C.R.S. 26-2-111(2)(c)(I) bars a qualified alien from OAP unless the
  alien meets 26-2-111.8(2). 9 CCR 2503-5 3.520.68.A states the bar for "AND only". Here the codex follows
  the rule over the statute (CO-929). That is the opposite of its SNAP principle, and a rule cannot narrow a
  statutory bar. CDHS position, subject to CDHS Legal: the statute governs. **Should-fix (S-4).**
- **AND-SO and SSDI (OQ-138).** The codex follows the rule's interim-assistance design. I agree. The
  statute's SSDI clause describes how disability is shown, not continued AND-SO once SSDI is paid.
- **Colorado Works COLA (B-5).** Statute 26-2-709(1)(b)(I) against a 2025 rule chart. The codex found no
  conflict because it never cites the statute.

What a county needs: the explanation exists, but it is scattered across open-question bodies and item
precision fields written for reviewers. Nothing in the item or the plain-English trace tells a county
eligibility technician "Colorado rule 4.311.1 still lists homelessness; federal law removed it on <date>;
CDHS Agency Letter <n> tells you to apply federal law". **Should-fix (S-2):**
1. Give every override item a uniform marker, for example a `federal_override` tag carrying the `legal`
   approval route; CO-1243 and CO-119 lack one today.
2. Add a one-sentence county-facing note naming the superseded Colorado paragraph, the federal provision,
   the date and the CDHS implementing communication.
3. Have `explain.ts` surface that note in the trace.

---

## 5. Open questions in my programs: answers and overrides

Answers below are CDHS/CDEC positions. Those marked [PK] must be confirmed against the named
agency communication before they are recorded as resolved. "Accept" means the codex's stated assumption is
what we would do.

**SNAP**
- **OQ-1 / OQ-251 (sec. 10108 and 10103 dates for current participants).** [PK] Apply to new applications
  from CDHS's implementation date. Apply to ongoing households at their next recertification, or earlier
  when the county acts on a reported change. Do not apply mid-certification by "determination date".
  **Override** of "as of the determination date" for ongoing cases. `snap_determination_is_recertification`
  already exists to carry this.
- **OQ-12 (ECE TANF/MOE authorization).** [PK] **Accept.** Colorado confers ECE through the non-cash
  TANF/MOE-funded information service delivered on the application, so every applicant household is
  "authorized".
- **OQ-30 (negative intermediate income).** Accept: floor at $0 before the 50% shelter test.
- **OQ-353 (SMED $165–$200).** Accept: the greater of the SMED and actual expenses less $35. No
  household is worse off than with actual costs.
- **OQ-356 ("below" or "at or below" 200%).** Accept "at or below" (4.206 governs categorical eligibility).
  CDHS should correct 4.401.A.1.
- **OQ-371 ($50 recertification boundary).** Accept "more than $50", the federal 273.2(f)(8)(i)(A); the
  Colorado sentence is internally inconsistent.
- **OQ-31 / OQ-32.** Accept, subject to the dating point in C-1.
- **OQ-323 (migrant out-of-state exception).** Note; low volume in Colorado.

**Colorado Works**
- **OQ-490 (disregards on a disqualified member's earnings).** **Override.** 3.605.1.A.6 is the specific
  rule for members disqualified for citizenship, lawful presence or SSN reasons. It deems their *net* income
  (gross less employment disregards), and it should control those members. 3.604.2.M's "without applying
  income disregards" then governs the IPV and fleeing-felon disqualifications. The codex applies no
  disregards to anyone, which over-counts income for mixed-status families, a large share of our caseload.
  [PK: confirm against CBMS budgeting for an ineligible non-citizen parent.]
- **OQ-153 (income equal to the need standard).** Accept J.4 (ineligible).
- **OQ-101 (more than two caretakers).** Accept the cap at the Two Caretakers row until the chart is
  amended.
- **OQ-102 ("needs" in deeming).** Accept the need-standard reading.
- **OQ-104 (monthly hours = weekly × 4).** [PK] Federal TANF reporting converts with 4.33 weeks a month, not 4.
  The impact is low because participation is not an eligibility condition here (sanctions run through the
  IP process). Note.
- **OQ-252 (diversion).** Accept the eligibility modeling; add the amount (C-3).
- **OQ-354 (death reimbursement order).** Accept the codex: 3.606.7.F.2.f says insurance reduces "the
  maximum".

**Adult Financial**
- **OQ-351 ($20 rollover with SSI).** **Override.** Read A.2.f over the non-SSI remainder. A.2.b sets SSI
  aside before the $20 is applied, so the unused part of the $20 is what remains after the non-SSI unearned
  income (the SSI program's own order). The codex's literal reading denies a rollover only because SSI is
  present.
- **OQ-352 (income against the $79 PNA).** Accept (3.532.C calls the PNA a grant standard).
- **OQ-355 (prepaid plot and the $2,500 limit).** Accept.
- **OQ-430 (OAP five-year bar).** **Override:** the statute governs (§4). Route through CDHS Legal.
- **OQ-138.** Accept.
- **OQ-491 (proration day count).** Accept inclusive, consistent with SNAP 4.207.2.C.
- **OQ-250 (HCA tiers).** See C-5.

**LEAP**
- **OQ-253 (Steps B, D, F).** Accept the additive reading provisionally; Step G says "subtracting the
  applicable adjustments ... in Steps B-F from ... EHHC". [PK] The CDHS LEAP office should confirm against
  the LEAP system's benefit calculation before approval.
- **OQ-163 K-7.** Shared-meter division should be modeled with C-6.
- **OQ-376 (Rule 5 edition for LEAP).** Note.

**CCCAP (CDEC)**
- **OQ-121.** See C-9.
- **OQ-163 K-9 (teen-parent household).** Not answerable from the rule text. CDEC policy must decide
  whether a teen parent under 18 who applies for her own child is her own CCCAP household (with her parent's
  income excluded) or is joined to her parent's household. CO-01's $30 fee and its counting of p3's $2,380
  depend on the answer, so **I cannot approve CO-01's CCCAP expectation until CDEC answers.**
- **OQ-394 ("legal resident" child).** [PK] **Override, pending CDEC confirmation.** CCDF-funded care
  follows PRWORA's qualified-alien test for the child (8 U.S.C. 1611, 1641), so a child with only Temporary
  Protected Status would not qualify unless the care is State-funded only. The codex's broader reading should
  be narrowed or tied to a funding-source fact.
- **OQ-254.** See C-8. For the post-2028 bands, read them as continuous: above 100% up to 130%, and so on.

**SUN Bucks**
- **OQ-255.** See C-11.
- **OQ-377 (response period).** Colorado's POM sets it; it was not fetched.

---

## 6. Other should-fix findings

- **S-1** (= C-1) H.R.1 effective dating.
- **S-2** County-facing explanation of federal overrides (§4).
- **S-3 LEAP CO-1010 includes `compact_of_free_association_migrant`** [T]. 9 CCR 2503-7 3.753.16 (D-86)
  lists A–L and does not include COFA citizens. [PK] COFA migrants are "qualified" under 8 U.S.C. 1641(b)(8)
  for Medicaid purposes only, so they are not LEAP household members. Remove the option, or tie it to CDHS
  Legal's reading.
- **S-4** OAP five-year bar (OQ-430).
- **S-5** OQ-490 and OQ-351 overrides.
- **S-6** (= C-6) LEAP program-year figures.
- **S-7 Sources on a development host** [T]. D-144 (the LEAP 2026-27 income table) and D-135 (the Adult
  Financial web page) were fetched from `cdhs.nxt-dev.colorado.gov`, which looks like a pre-production
  mirror, not `cdhs.colorado.gov`. Re-fetch from the production site, or from the LEAP State plan or agency
  letter. Until then, mark the excerpts `verification: unverified`, as the volume's own provenance rule
  requires for text not from an allowed official source.
- **S-8 Approval routing does not match how we sign** [T volume.yaml; PK].
  - LEAP is routed to "Cash programs policy owner". At CDHS, LEAP sits with food and energy assistance,
    so add an energy assistance (LEAP) owner role.
  - CCCAP's "Child care policy owner" should be named as CDEC, a separate department.
  - SUN Bucks needs CDE (school meals) as co-approver for the NSLP and school-enrollment elements.
  - Items with program `All` (residency, citizenship, the poverty table) are read by CCCAP and LEAP but
    route only to the Medicaid, SNAP and Cash owners. Add the LEAP and Child care owners for shared items
    that LEAP or CCCAP reads, through `accepts_from` or a by-reader rule.
- **S-9** (= C-10) SUN Bucks period of eligibility.
- **S-10** (= C-7, C-8) CCCAP fee exceptions and children in care.

---

## 7. Approval

**Could my team approve these items as written? No.**

The SNAP, Adult Financial and CCCAP chapters are close: their figures are current, dated and quoted, and their
arithmetic is right in every household I recomputed. Colorado Works cannot be approved. Three of its
derivations would pay wrong amounts to common households (B-1, B-2, B-3), and its standards are a year out
of date by statute (B-5). The SNAP allotment cannot be approved while time-limited ABAWDs stay in the eligible
household (B-4).

What I would need, by program:
- **SNAP (SNAP policy owner):** B-4 fixed with a household case. H.R.1 items dated from CDHS's
  implementation date, with the recertification treatment of ongoing cases (C-1). The federal-override
  marker and county note (S-2). OQ-1/OQ-251 recorded with our answer. C-2 can follow in a later round.
- **Colorado Works (Cash programs policy owner):** B-1, B-2, B-3 fixed with rule tests and one new
  household case each. The SFY 2026-27 chart supplied and dated (B-5). OQ-490 changed per §5. All CW
  household expectations re-run.
- **Adult Financial (Cash programs policy owner):** OQ-351 and OQ-430 changed per §5 (OQ-430 with CDHS
  Legal); the `ab` branch removed; the HCA tier maximums sourced (C-5). With those I could sign.
- **LEAP (energy assistance owner):** S-3 and S-7 fixed. The program-year parameters sourced (C-6) and
  CO-01/CO-02's illustrative inputs replaced or labeled. OQ-253 confirmed by the LEAP office.
- **CCCAP (CDEC):** OQ-163 K-9 answered by CDEC policy, and CO-01 re-expected. C-7/C-8 added. County
  entry limits fetched (C-9). OQ-394 decided.
- **SUN Bucks (SNAP owner + CDE):** C-10 restructured to a summer-keyed determination. The POM fetched
  for C-11.
- **All:** the approval routing in S-8, so the right people are asked to sign.

---

## Summary

Counts: **5 blocking** (B-1 to B-5), **18 should-fix** (C-1 to C-11; S-2, S-3, S-4, S-7, S-8; and the
OQ-490 and OQ-351 overrides listed under S-5; S-1, S-6, S-9 and S-10 repeat C-items), **4 notes** (N-1 to
N-3, plus OQ-104).

Open questions: 33 addressed in §5. Six are overridden: OQ-1 and OQ-251 for ongoing cases, OQ-490,
OQ-351, OQ-430 and OQ-394. OQ-163 K-9 is returned to CDEC as a blocker for CO-01's CCCAP figures. The rest
are accepted or pointed to a coverage fix.

Top five changes, in priority order:
1. **Gate the Colorado Works grant on eligibility (B-1)**, and exclude child support from the grant
   calculation (B-2). Both are wrong payments for common households.
2. **Exclude ABAWD time-limited, SSN-failure and 4.304.4.A.6 members from the SNAP eligible household
   (B-4).** This matters more each month as the H.R.1 ABAWD population comes due.
3. **Source and date the SFY 2026-27 Colorado Works standards (B-5)** and let pregnant persons without other
   children qualify (B-3).
4. **Date the H.R.1 overrides from CDHS's implementation, treat ongoing cases at recertification, and give
   counties a one-line federal-override note in the item and the trace** (C-1, S-2).
5. **Replace case-supplied and development-host figures with official dated parameters:** the LEAP
   program-year figures and the LEAP income table source (C-6, S-7). Also key SUN Bucks to the summer
   (C-10).

What works well:
- Provenance is the best I have seen for a policy specification. 428 excerpts, every one present
  verbatim in an official text the volume fetched, none unverified.
- SNAP FY2027, the SUA, the 2026 AF standards and the CCCAP FPG/SMI tables are dated versions with the prior
  year closed. They are cross-checked between FNS and the Colorado rule, and the one disagreement
  ($4,500 against $4,750) is resolved the way we would resolve it.
- The arithmetic is right in every household I recomputed by hand: SNAP proration, pro rata non-citizen
  income, minor-parent and stepparent deeming, AND-CS with an SSI add-back, payment floors, HCA, burial,
  sanctions, the LEAP bands and the CCCAP fee.
- The federal-over-State choices for H.R.1 are the right ones, and the open questions are candid about
  what the text does not settle.
