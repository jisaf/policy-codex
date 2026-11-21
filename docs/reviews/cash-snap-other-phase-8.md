# Policy review: Colorado volume, phase 8 — Adult Financial (2026 standards, payment floors, Home Care Allowance, burial), SNAP FY2027 and the derived SUA, Colorado Works sanctions and diversion, the LEAP benefit, the CCCAP tables and parent fee, SUN Bucks (CO-1200..CO-1299 and the phase-8 edits to snap/, cash/, energy/, childcare/, parameters/)

Reviewer role: CDHS program representative for SNAP, Colorado Works, Adult Financial and LEAP; CDEC for
CCCAP; FNS Summer EBT. Read-only review of phase 8 (`git diff edc8d43 worktree-agent-ad584538c88a1f6d0 --
volumes/co`, merged at `9a47105`) against the current rule text phase 8 fetched: `documents/D-80` (9 CCR
2503-5, eff. 2026-03-02), `D-81` (9 CCR 2503-6, eff. 2025-07-01), `D-82` (10 CCR 2506-1, eff. 2026-10-01),
`D-83`/`D-84` (FNS FY2027 COLA), `D-85` (FNS FY2026 SUA table), `D-86` (9 CCR 2503-7, eff. 2025-11-01),
`D-87` (8 CCR 1403-1, eff. 2026-08-14), `D-88` (7 CFR 292), `D-89`/`D-90` (Federal Register notices), and
excerpts S700..S799 in `volumes/co/sources.md`. For the completeness question I diffed the current SOS text
sentence by sentence against the Cornell copies the earlier phases were built from (`D-17`/`D-18`/`D-19` for
SNAP, `D-61` for Colorado Works, `D-62` for Adult Financial, `D-63` for LEAP, `D-64` for CCCAP), then read
every changed passage by hand.

Every computed figure below was run with `npx vite-node scripts/eval-case.ts co <case> <identifiers>` at the
branch head (`0527bf5`), where the phase-8 files are byte-identical to `43a58cc` except `snap/CO-348.yaml`,
which the phase-8/9 merge already corrected (N-11). Where I say "the items give", it is an engine output;
where I say "the text gives", it is my hand computation from the cited lines.

Findings are grouped (1) correctness, (2) completeness, (3) open questions, (4) cases. Severity is
**blocking** (a stated rule computes the wrong eligibility or amount for a common household), **should-fix**
(wrong for a real but narrower set of households, or a stated provision missing), or **note**. Document
quotes are cited `documents/D-nn.md:line`; excerpt quotes `sources.md:line`.

The short version: the new phase-8 items are, with the exceptions in §1.2, faithful to their excerpts — I
recomputed every one of them and every CO-13 expectation, and they match. The risk the brief named is real,
though: two provisions the earlier phases encode from the Cornell copies are **not** the current rule, and
both change money (B-1, the Colorado Works payment disregard; B-2 reaches the same conclusion from the
other direction — the current text answers an open question the ledger still pays wrongly on). Phase 8
priced AND-CS at $994 for CO-07's SSI child knowing the SSI add-back was unmodeled; that expectation is
wrong by $700.

---

## 1. Correctness

### 1.1 Blocking

**B-1 (blocking). CO-922 / CO-923 / CO-907 / CO-1260 / CO-914, parameter CO-350, excerpt S416, OQ-105:
the Colorado Works earned income disregards are the pre-2023 rule. The current 3.606.2.A disregards 100% of
earnings for the payment in the first certification period and for any new source of earnings, and 67% only
for a current source after that.**

The Cornell copy (`documents/D-61.md:989-991`, quoted in S416 at `sources.md:2202`) says the payment is
computed with a 67% disregard at application and ongoing. That text is gone. D-81's rule history shows
3.606.2 A was amended effective 06/01/2023 (`documents/D-81.md:6369-6373`); the current paragraph
(`documents/D-81.md:3081-3096`) reads:

> 1. At application, the gross earned income minus the ninety dollar ($90.00) earned income disregard, plus
> any countable unearned income ... shall not exceed the need standard for the household size and shall be
> applied. If income does not exceed the need standard for the household size, **a one hundred percent
> (100%) disregard shall be applied to earned income for the first certification period to determine the
> payment amount. after the first certification period, a sixty seven percent (67%) disregard shall be
> applied** to determine the payment amount.
>
> 2. For an assistance unit currently receiving basic cash assistance:
> a. **A new source of earned income shall receive a one hundred percent (100%) earned income disregard
> for the first certification period that the income impacts** according to section 3.606.3.
> b. A current source of earned income shall receive the sixty seven (67%) disregard.

What the items do: `cw_payment_countable_earned_income` (CO-922) is always `earned × (1 − 0.67)`, and
`cw_countable_earned_income` (CO-907) always deducts $90 for the eligibility test, including for a unit
already receiving assistance — which under A.2 and 3.606.1.J.1 ("Apply the appropriate earned income
disregards ... as described in Section 3.606.2", `D-81.md:3048`) takes the 100%/67% disregard, not $90.

What it costs: every newly approved unit with earnings is underpaid by 67% of its earnings for six months.
For CO-07's unit (two caretakers, one child, $400 earned) the items give $517 = 649 − 132; if those
earnings are in the unit's first certification period or are a new source, the text gives **$649**. Phase
8 rebuilt the payment chain (CO-1260 took CO-914's derivation "unchanged") without re-reading 3.606.2.

Fix:
- new supplied facts `cw_in_first_certification_period` (person-month, unit-level) and
  `is_new_earned_income_source` (person-month), both read with no default — a case must state them;
- new parameter `cw_new_earnings_disregard_rate` = 1.00 (S7xx, D-81.md:3081-3094), versioned from
  2023-06-01; CO-350 (0.67) keeps its figure with a corrected citation;
- CO-922 = `[max, 0, ["-", earned_income, ["*", earned_income, [case, [[any, cw_in_first_certification_period,
  is_new_earned_income_source], cw_new_earnings_disregard_rate], [else, cw_earned_income_disregard_rate]]]]]`;
- CO-907 keeps $90 only "at application"; a unit currently receiving tests income with the CO-922 figure
  (add `cw_is_currently_receiving`, or read `months_of_assistance_received > 0` with a stated precision);
- replace S416 by a D-81 excerpt; rewrite OQ-105, which now describes a rule that no longer exists;
- CO-07 must state which of the three cases its $400 falls in.

Rule tests: earned 400, first period → payment income 0, grant 649 (Two Caretakers, 1 child); earned 400,
current source after the first period → 132, grant 517; earned 400, new source in an ongoing case → 0.

---

**B-2 (blocking). CO-946 (read by CO-951, CO-952, CO-953): Adult Financial countable income never counts
SSI. For AND-CS — a program only SSI recipients can be in — and for any OAP client on SSI, the grant is the
whole standard less non-SSI income. CO-07 expects $994 for an AND-CS child whose grant under the text is
$294.**

D-80 states the OAP and AND-CS unearned income steps in identical words (`documents/D-80.md:4063-4083`,
3.533.A.2; `:4968-4988`, 3.549.A.2):

> a. Determine the client's gross unearned income from all sources.
> b. Subtract any amount received from SSI.
> c. Deduct $20.00 from the remainder. ... 2) A client who receives SSI only, and does not receive any other
> unearned income, does not receive an unearned income disregard.
> d. **Add the full SSI income back to the remainder.**
> e. The remainder is countable unearned income.

and 3.520.781.A (`D-80.md:3367`): "If a client's total countable income equals or exceeds the Adult
Financial program grant standard, the client shall not be eligible for that specific Adult Financial
program."

`af_countable_income` (CO-946) sums `social_security_income, pension_income, unemployment_income,
cash_assistance_income, child_support_received, other_unearned_income` and subtracts $20 — `ssi_income`
(CO-849, added by the phase-5 K-6 fix) is not read. Its precision defers to OQ-115, which says "no supplied
fact states a person's dollar amount of SSI income". That stopped being true in the phase-5 fix round, and
the current text answers OQ-115 exactly.

Evidence: CO-07 p3 (age 9, SSI $700, no other income). Phase 8 changed her expectation to
`af_and_grant: {"2026-10": 994}` with a comment acknowledging the add-back is unmodeled. The text: unearned
700 − 700 (SSI) = 0, no $20 disregard (SSI only), add back 700 → countable **700**; 700 < 994 so she is
AND-CS; grant 994 − 700 = **$294**. The chapter overpays by $700 a month. For a partial-SSI recipient whose
SSI is reduced only by countable income (SSDI $500 + SSI $514), the text gives countable 480 + 514 = 994,
which "equals ... the grant standard" (3.520.781.A) — not eligible; the items give countable 480 and an
AND-CS grant of $514.

Fix: CO-946's unearned term becomes
`["+", [max, 0, ["-", <non-SSI unearned sum>, [case, [[">", <non-SSI unearned sum>, 0], ma_ssi_general_income_exclusion], [else, 0]]]], ssi_income]`
(read `[otherwise, ssi_income, 0]` only if OQ-115's case-coverage argument is accepted; otherwise no
default), add the A.2.f rollover of an unused $20 to earned income, cite S457/S465 plus a new D-80 excerpt,
mark OQ-115 and OQ-116 resolved (§3.2), and change CO-07 p3 to 294. Rule tests: SSI 700 only → 700;
SSDI 500 + SSI 514 → 994 → `af_category` none; SSI 700 + pension 10 → 10 − 10 (disregard capped at the
non-SSI amount) + 700 = 700 with $10 rolled to earned.

### 1.2 Should-fix

**S-1 (should-fix). CO-1270 `cw_diversion_eligible`: the county's higher income limit replaces only the
income test, but the item lets it replace every basic-cash-assistance requirement.**

3.606.8.A.6 (`sources.md` S762; `D-81.md` 3.606.8): "A diversion payment is a needs-based ... payment made
to a client who is eligible for basic cash assistance, **or, at county option ... a higher income limit**".
The derivation's first conjunct is `[any, [=, cw_eligibility_status, eligible], meets_county_diversion_income_limit]`,
so a unit that is `ineligible_no_dependent_child`, `ineligible_residency`, `ineligible_status` or
`time_limit_reached` becomes diversion-eligible whenever the county limit fact is true. Fix: `[any, [=,
cw_eligibility_status, eligible], [all, [=, cw_eligibility_status, ineligible_income],
meets_county_diversion_income_limit]]`. Add a test with `ineligible_no_dependent_child` and the county limit
true → false. Amend OQ-252(2).

**S-2 (should-fix). CO-928 `cw_is_disqualified_member` still disqualifies a drug felon. The current
9 CCR 2503-6 dropped the drug-felony bar from both 3.604.2.L and 3.604.2.M.**

The Cornell copy listed "Persons convicted of a drug-related felony ... on or after July 1, 1997" at
3.604.2.L.2 (`D-61.md:237`) and again at M.4 (`D-61.md:251`). The current L (`D-81.md:1432-1447`) is
fugitives/fleeing felons, strikers, and the five-year bar; the current M (`D-81.md:1449-1481`) is the
two-state IPV, IPV/fraud, fleeing felons, and failure to apply for an SSN "unless a federally allowable
reason, as listed in 20 CFR § 422.107 (2023), exists". CO-928 reads `is_disqualified_drug_felony`, so a unit
with a drug-felon member is barred from a time-limit extension (CO-925) on a ground the rule no longer has.
Fix: drop `is_disqualified_drug_felony` from CO-928 (it stays a SNAP fact, where 10 CCR 2506-1 4.206.C.1.c.2
still uses it for BCE/ECE), re-cite S523 to D-81, and update OQ-143's list.

**S-3 (should-fix). CO-036 / CO-377: the standard utility allowance is now derived per person and summed
over the household, so a household in which two members answer the utility questions gets two SUAs.**

4.407.31 (S743, `sources.md:4249`): "Households ... are only entitled to one (1) of the four (4) utility
allowances." CO-036's precision relies on the facts being stated only on the head; CO-377 sums
`snap_utility_allowance_amount` over every member for whom it is known (OQ-29's device). With a supplied
figure that device was tolerable; with a derived one, any case (or application front end) that records
`incurs_heating_cooling_cost` on a second adult doubles the $616. Fix: derive the SUA once per household —
CO-377 reads it from the household's head (`[sum, [filter, snap_household_members, [of, [P],
is_head_of_household]], [of, [P], snap_utility_allowance_amount]]`) or CO-036 aggregates the household's
utility facts (`any member incurs ...`, `max` of the counts). Rule test: two members both stating heat →
shelter costs = rent + 616, not rent + 1,232. Update OQ-29.

**S-4 (should-fix). CO-1297 `sebt_income_eligibility_limit` uses the poverty guideline in force on the
determination date; the school meal guidelines change on July 1, so every January–June determination uses
the wrong year.**

292.5(b) (S791): "The Income Eligibility Guidelines are published annually and change on July 1. The
guidelines in effect on the date of application must be used." The notice (S798) builds the July 2026–June
2027 guidelines from the 2026 poverty guidelines. OQ-255(4) records the defect; it should be fixed, not
recorded — it is wrong half of every year. Fix: read the guideline as of the most recent July 1 (a derived
`sebt_guideline_year_start`), or carry `sebt_reduced_price_monthly_limit` as a table versioned from
2026-07-01 computed from S798/S799. Test: a determination dated 2027-03-01 uses the 2026 guidelines.

**S-5 (should-fix). CO-1217 `af_hca_eligibility_status`: "home" excludes a homeless shelter, and the volume
already has the fact.**

3.570.12 (S718, `D-80.md:5785`): "'Home' means a non-facility residence. A home cannot include a homeless
shelter or other temporary setting." The item tests only `in_medical_institution`; OQ-250 records the gap
as if no fact existed, but `is_homeless` (CO-037) does. Fix: the `ineligible_setting` branch becomes `[any,
in_medical_institution, is_homeless]`; keep OQ-250 for "other temporary setting" only.

**S-6 (should-fix). CO-036 is reused for a different fact.** The supplied `utility_allowance_amount`
(`supplied/CO-036.yaml`) was deleted and `snap/CO-036.yaml` now carries a derived
`snap_utility_allowance_amount`. docs/conventions.md: an ID is "stable, never reused" and an identifier is
"derived once from the Fact name, never changed". Give the derived item a new ID in CO-1200..1299, retire
CO-036, and record the rename in the phase note; the identifier rename itself is justified (governance
`name.prefix`) but belongs to a new item.

**S-7 (should-fix). OQ-15 is marked Resolved, but CO-122/CO-123 still apply the FY2025 200% table through
2026-09-30.** The 2024-10-01 version now carries `to: "2026-10-01"`, so every FY2026 determination (e.g.
CO-339-T1/T2, retitled "FY2026 figures") is tested against $2,510 for one person instead of the FY2026 200%
level. The body says so; the title should not. Either fetch the SOS rule version effective 12/30/2025
(S752's history names it) and add the FY2026 version, or retitle OQ-15 "Resolved from 2026-10-01; FY2026
200% table still missing" and leave it open.

### 1.3 Notes, and items I checked and believe are right

- **N-1 (note). CO-1231 reads 3.570.43.F.1 through A.4's plot exception.** A.4 (`D-80.md:6739-6747`)
  excludes a prepaid or donated plot from the $2,500 limit; F.1 (`:6891`) says "If the combined charges from
  the provider(s) exceed two thousand five hundred dollars ($2,500), no burial grant payment shall be paid",
  with no exception. The item's reading (subtract the plot for both) is the sensible one — a prepaid plot is
  not a provider charge at death — but CO-13 p2 sits exactly on the ambiguity ($2,800 charged, $600 plot).
  Record it in an OQ; and decide whether the prepaid plot belongs in `burial_services_total_cost` at all
  (CO-1230 nets the "full burial costs", which then include a plot already paid for).
- **N-2 (note). CO-1290 drops the cents after the 20% and 55% reductions.** 3.124.A (S782): "Parent fees
  must be calculated in whole dollars by dropping the cents", then H and U reduce "the regularly
  calculated" / "above-calculated" fee. Dropping cents on the formula amount first can differ by $1 (192.50 →
  192 × 0.44 = 84.48 vs 192.50 × 0.44 = 84.70; both 84 here). State the order in the precision.
- **N-3 (note). CO-1219 / CO-951: one floor per program, or one floor on the client's benefit?** 3.570.11.E.2
  (`D-80.md:5744-5751`) says the State Supplementary Payment "brings the client's monthly benefit amount
  equal to the payment floor standard defined for the program(s) in which the client is enrolled". The items
  floor OAP and HCA separately; for CO-13 p1 that is 352 + 977. If the floor is on the client's combined
  Adult Financial benefit, her $352 + $900 already exceeds $977 and no SSP is due. Add to OQ-250.
- **N-4 (note). CO-1298 reads the child's own `snap_is_eligible`.** 7 CFR 292.2 (S792) makes a child
  categorical when "one or more children in that household are receiving assistance under SNAP, TANF ...".
  An ineligible-member child (e.g. undocumented) in a SNAP household with a receiving sibling is
  categorical under the text and not under the item. Read it over the school meal household's children.
- **N-5 (note). CO-875 (LEAP 60% SMI, OQ-122) still backs out of the October 2024 CCCAP 85% SMI column (S485)
  though phase 8 added two later SMI columns (S780, S781).** D-86 now incorporates LIHEAP IM 2025-02
  (S773), the FFY2026 estimates. If the illustrative back-out is kept, back it out of S780, which is the
  FFY2026 column, and version it.
- **N-6 (note). CO-385-T1 is `as_of: 2026-09-30, month: 2026-10` and expects the FY2026 figures.** An
  October 2026 allotment uses the FY2027 maximum (S730, "effective October 1, 2026"), whatever the
  determination date. Make the month 2026-09 (the same pattern recurs in the retitled CO-339/345/370/383
  tests, which carry no month and are fine).
- **N-7 (note). CO-1281 `leap_benefit_amount` is a heating-season figure reported on every month of the
  season** (CO-02 expects 450 for 2026-11). Say so in the meaning, or a reader will multiply it by six.
- **N-8 (note). 3.606.6.C now conditions an extension on the household demonstrating "good cause as defined
  in section 3.601 and outlined in 3.608.3"** (`D-81.md:3501-3508`) and D.4.e adds "other hardship reasons
  listed on the state prescribed extension determination form". The extension remains a supplied approval,
  so no derivation changes; update the meanings of CO-925, `has_hardship_extension_approved` and
  `has_domestic_violence_extension_approved`.
- **N-9 (note). 10 CCR 2506-1 says ECE gross income must be "below" 200% at 4.401.A.1 (`D-82.md:5704`) and
  "at or below" at 4.206.C.2.a.1 (`D-82.md:2385`).** CO-339 uses `<=`. Record the tension in an OQ.
- **N-10 (note). CO-1264 defaults an unstated `work_sanction_level_served` to `none`**, and CO-1004 an
  unstated `leap_living_arrangement` to `traditional_dwelling`. Both are P4 `otherwise` defaults with an OQ
  (OQ-252, OQ-158), which conventions permit; they are the same case-coverage device as OQ-134..136 and
  should be retired with them.
- **N-11 (note). CO-348 as merged by phase 8** compared the evaluated person's own `shelter_cost_monthly +
  snap_utility_allowance_amount`; the phase-8/9 merge already replaced that with `snap_shelter_costs`. Its
  `assumption` field still names the old pair; delete it.
- **N-12 (note). Wording changes that need no item change:** 3.606.1.G drops "Upon verification of
  pregnancy" and the "Parent" definition drops "upon verification of that pregnancy" (`D-81.md:499,
  3020-3024`); CO-1260 reads `is_pregnant`, which is right either way.

Checked and right (each recomputed against its excerpt): CO-1200/1201/1202 floors ($189, $13, $977, all
"Effective January 1, 2026", S700/S707/S713); CO-289 and CO-291 versions ($1,005→$1,032, $967→$994,
S700/S706) and CO-290 ($248 from 2022-04-01, S705); CO-951/CO-952 floor placement (OAP and AND-CS floor,
AND-SO none — 3.510's definition names only OAP, AND-CS, HCA, S704); the removal of `oap_a`/`oap_b`
(3.530.1 defines only OAP and OAP-C, `D-80.md:3926-3932`); CO-1203 (the former and_so branch, unchanged);
CO-1206/1215/1216/1217 (3.570.11.A, 3.570.13.B-C tier table, 3.570.14.B/D); CO-1229/1230/1232 (3.570.43.B,
D.1-3 in order, widow(er) individual limit); CO-1260/1264/1265/CO-914/CO-921 against 3.608.4.C-F (S760) —
$1, 25%, 25%, closure, highest level wins, cents dropped after the reduction; every SNAP FY2027 table
(CO-110..114, 119, 122, 123, 130..135) against D-83/D-84 and D-82's restatements; the four SUA amounts
and tiers (CO-1235..1238, CO-036's ordering, the telephone-only and OUA-not-telephone rules, S743..S746);
CO-384/385 rounding (4.207.3.A, option (2)); CO-386/387 zero-benefit rule (4.207.3.B); CO-1243's use of
Pub. L. 119-21 sec. 10103 over 4.407.31.A.1.b (recorded in OQ-251); CO-323/324/340/341 against S780/S781
cell by cell; CO-1289 (1% + 14% above the FPG + $15 per additional child, effective range ending
2028-08-01); CO-1278..1282 against 3.758.47 Steps A-G; CO-1291/1297 arithmetic (2026 guideline × 1.85,
rounded up, ÷ 12, rounded up: $5,088 for four, $2,461 for one); CO-1298/1299 against 292.6, 292.15(e) and
the 2026 notice ($40 × 3).

---

## 2. Completeness

### 2.1 What changed between the Cornell copies and the current SOS text, item by item

I ran a sentence-level comparison of each old document against its current replacement and read every
passage that did not match. Formatting noise (pdftotext line breaks, Cornell's "Notes") aside, these are
all the substantive changes.

| Document | Provision | Old (Cornell) | Current (SOS) | Items | Disposition |
|---|---|---|---|---|---|
| D-81 | 3.606.2.A earned income disregards | 67% for payment at application and ongoing (`D-61.md:989-991`) | 100% for the first certification period and for a new source; 67% for a current source after it (`D-81.md:3081-3096`) | CO-907, CO-922, CO-923, CO-1260, CO-350, S416, OQ-105 | **B-1** |
| D-81 | 3.604.2.L.2, M.4 drug felony | ineligible / disqualified (`D-61.md:237, 251`) | removed (`D-81.md:1432-1481`) | CO-928 | **S-2** |
| D-81 | 3.604.2.M.4 (was M.5) SSN | "unless good cause exists" | "unless a federally allowable reason, as listed in 20 CFR § 422.107 (2023)" | none (OQ-143) | note |
| D-81 | 3.606.6.C extensions | "unless granted an extension ... due to hardship or domestic violence" | "unless the household demonstrates good cause as defined in section 3.601 and outlined in 3.608.3"; D.4.e added | CO-925, extension facts | N-8 |
| D-81 | 3.606.1.G, 3.601 "Parent" | "Upon verification of pregnancy" | dropped | CO-1260 | N-12 |
| D-80 | 3.530.A, 3.546.A grant standards | $1,005, $967 (eff. 2025-01-01) | $1,032, $994 (eff. 2026-01-01) | CO-289, CO-291 | done in phase 8 |
| D-80 | 3.530.B, 3.546.D ISM maximum | $342 (2025) | $351 (2026) | none | **K-4** |
| D-80 | 3.510, 3.530.C, 3.546.E, 3.570.11.B payment floors | absent | $189 / $13 / $977 | CO-1200..1202 | done in phase 8 |
| D-80 | 3.531.D MOE wording | 45 CFR 1321.49 MOE | 20 CFR 416.2095-2099 pass-along, SSP to the floor | CO-951 | done in phase 8 |
| D-82 | 4.207.3.D, 4.401.1-2, 4.407.1, 4.407.3.B-C, 4.407.31 | FY2025 tables | FY2027 tables | CO-110..135, CO-1235..1238 | done in phase 8 (FY2026 200% gap, S-7) |
| D-82 | 4.408.E resource limits | $4,500 / $3,000 "Effective October 1, 2024" | unchanged | CO-119 takes FNS $4,750 (OQ-251) | accepted |
| D-82 | 4.311 ABAWD | pre-H.R.1 | unchanged (S749, S750, S752) | OQ-31, OQ-32 notes | accepted |
| D-86 | 3.752.22.D SMI incorporation | 45 CFR 96.85 (2023), LIHEAP IM 2024 | 96.85 (2025), IM 2025-02; still "for federal fiscal year 2023" | CO-875 | N-5 |
| D-87 | 3.111.H.2-3 tables | FY2025 | FY2026 "Through September 30, 2026", FY2027 "Effective October 1, 2026" | CO-323/324/340/341 | done in phase 8 |
| D-87 | 3.111.G.4.a.3 | absent | "Effective July 1, 2026, an adult caretaker enrolled in a licensed ... substance use disorder treatment program ... intensive outpatient ... or higher is eligible for CCCAP for up to one (1) year per instance" (`D-87.md:1632-1638`) | CO-984 | **K-7** |
| D-87 | 3.103.EEEEE "Teen parent" | parent under 21 with physical custody, activities include vocational training | adds "financially contributing", stepparent/guardian/loco parentis, "custody"; post-secondary or workforce training makes the person an adult caretaker (`D-87.md:832-839`) | CO-981 | **K-7** |
| D-87 | 3.111.G.3-4 time limits | 104 "and up to 208" weeks | "at least 104 weeks"; up to 208 by approved county plan; job search 13 weeks, more by county plan | none (OQ-162) | note |
| D-87 | "Basic education", eligible child custody, 3.119 protective-services income waiver | high school; "physical custody"; worker waiver | adds middle school; "custody" (incl. legal); waiver only under an approved county plan | CO-980, CO-984 | note |

D-17/D-18/D-19 (SNAP) and D-63 (LEAP) otherwise match the current text word for word; the Cornell D-61 is
labelled with the 07/01/2025 history but carries pre-06/01/2023 text in 3.604.2 and 3.606.2 — which is how
B-1 and S-2 got in. Every Cornell-sourced excerpt in S401..S533 should be re-pointed at D-80/D-81/D-86/D-87
before phase 12.

### 2.2 Eligibility or amount provisions in the current documents that no item represents

Should-fix:

- **K-1 (should-fix). Colorado Works death reimbursement, 9 CCR 2503-6 3.606.7 (`D-81.md:3611-3780`).** A
  separate burial benefit "for a deceased client who received Colorado Works while alive": at most $1,500,
  total combined charges at most $2,500 **including** the gravesite (C.8 lists "Purchase of gravesite"; no
  plot exception, unlike AF's 3.570.43.A.4), estate insufficient. Phase 8 built AF burial (CO-1229..1232)
  and left this one out; `died_while_receiving_af_or_medicaid` (CO-1220) does not cover a Colorado Works
  decedent who was not on Medicaid. Add `cw_death_reimbursement_eligible` / `_amount` reusing CO-1221/1224.
- **K-2 (should-fix). The Adult Financial personal needs allowance and the inmate bar.** 3.532.D-F
  (`D-80.md:4017-4038`) and 3.543.D-F (`:4579-4600`): an OAP or AND-SO client resident 30 or more consecutive
  days in a hospital, nursing home, ALR, group home or similar "shall be eligible only for a monthly PNA",
  at most $79 for a full calendar month; inmates and residents of unlicensed facilities get neither
  (3.532.E, 3.543.E; also 3.520.61.B, `D-80.md:1746-1748`). CO-951/CO-952 pay a nursing-home resident the
  full grant. CO-01's p1 is exactly this person (she is `none` today only because her $2,010 of countable income and the couple's $46,000 are over the limits; a nursing-home OAP client under them would be paid $1,032 less income instead of at most $79).
  Add `af_resident_of_facility_30_days` (or reuse `in_medical_institution` with `institution_entry_date`), a
  `af_pna_maximum` parameter ($79, eff. 2016-10-01), and a PNA branch in both grant items.
- **K-3 (should-fix). 3.520.61.F and 3.520.71.F: no Adult Financial program for a client "currently
  receiving or eligible for financial assistance from Colorado Works", and ineligibility while a Colorado
  Works case is closed "Due to a sanction, demonstrable evidence, or disqualification"** (`D-80.md:1757-1759,
  2304-2336`). Phase 8's CO-1264/CO-921 (`sanction_closure`) make the second half modelable now; nothing
  reads them from the AF side. This also answers OQ-117 (§3.2).
- **K-4 (should-fix). In-kind support and maintenance, 3.520.79 (`D-80.md:3828-3911`)**, with its maximum
  raised from $342 to $351 on 2026-01-01 (3.530.B, 3.546.D, S700, S707). An ISM deduction reduces the OAP
  and AND grants; it is also what makes AND-CS pay anything once B-2 is fixed (SSI reduced by ISM is the
  population whose countable income falls below $994). Add the parameter (versioned) and a supplied ISM
  amount, capped.
- **K-5 (should-fix). SNAP Standard Medical Expense Deduction, 4.407.61.A (`D-82.md:7879-7889`, also
  `D-19.md:715`):** "Beginning October 1, 2016, the SMED is one hundred sixty-five dollars ($165). The SMED
  is used if the total verified medical expenses are greater than thirty-five dollars ($35) and less than or
  equal to the SMED." CO-376 `snap_excess_medical_deduction` deducts actual expenses over $35. An elderly
  member with $100 of expenses gets $65 under the items and $165 under Colorado's rule. Add parameter
  `snap_standard_medical_deduction` ($165) and the SMED branch; note the household may claim actual expenses
  above $35 that exceed $165.
- **K-6 (should-fix). SNAP ABAWD clock, 4.311.3.C.2 (`D-82.md:5571-5573`, also in D-18):** the clock
  "Resets accrued countable months and ABAWD disqualifications, regardless of start date, for all ABAWDs
  every thirty-six (36) calendar months starting July 1, 2023." Colorado chose the fixed clock; CO-417
  counts a rolling 36 months ("a rolling clock, per 7 CFR 273.24(b)(3)"). Count from the latest of
  2023-07-01, 2026-07-01, ... Also 4.311.3.A.2 (`:5543-5547`): no countable month accrues in the month a
  person turns 18.
- **K-7 (should-fix). CCCAP: the substance-use-disorder treatment activity (eff. 2026-07-01) and the new
  teen-parent definition** (table above). CO-984 needs an `is_in_sud_treatment_iop_or_higher` route; CO-981
  needs the "financially contributing" conjunct (OQ-135's fact, CO-897, exists) and must not treat a person
  under 21 in post-secondary or workforce training as a teen parent.

Notes (stated in the current text, unrepresented, small or process-adjacent): SNAP BCE through Family
Preservation Program services (4.206.C.1.a.2, `D-82.md:2337`); SNAP substantial lottery or gambling winnings
(4.206.E, 4.000.1, `D-82.md:2500, 788`); SNAP initial-month proration and the initial-month threshold, which
in Colorado is the $25 minimum allotment, not the federal $10 (4.207.2.C, 4.207.3.B, `D-82.md:2577-2589`;
OQ-38); SNAP destitute households (4.406, `D-82.md:7256`; OQ-14); Colorado Works strikers (3.604.2.L.2,
`D-81.md:1443`); the OAP client's duty to apply for SSI at 65 when income is below the SSI standard plus $20
(3.520.71.B.4, D, `D-80.md:2254-2290`); the AND SSN requirement (3.520.61.D); AF disaster supportive payments
up to $2,000 (3.570.5, `D-80.md:6935`); LEAP denial for refusing weatherization, for benefits from another
county, for a duplicate household, for a fraud conviction (3.752.26, 3.754.1.D, F, L, U,
`D-86.md:1545, 1832-1880`; OQ-163); CCCAP's no-increase-during-the-eligibility-period, 30-day income
averaging and FPG-at-redetermination rules for the fee (3.124.C, D, R; OQ-254).

---

## 3. Open questions

### 3.1 The twelve "Resolved"

| OQ | Verdict | Why |
|---|---|---|
| OQ-15 | **overclaimed** (S-7) | Answered from 2026-10-01 (S739); FY2026 determinations still use the FY2025 200% table. |
| OQ-21 | answered | S730/S738, identical figures. |
| OQ-23 | answered | 4.207.3.A (S737) is option (2). (The same text was in D-17; nothing turns on it.) |
| OQ-24 | answered | 4.407.3.C (S742): the estimate "unless higher shelter costs are verified, at which point the household **may** use actual shelter costs" — the greater-of reading is the household's best election and the text permits it. |
| OQ-25 | answered | S741 = S731. |
| OQ-26 | answered | 4.207.3.B (S737): denial except BCE/ECE. The initial-month and proration carve-outs in the same paragraph stay with OQ-38. |
| OQ-36 | answered, with S-3 | 4.407.31 (S743..S746). The per-member summation is the residual defect. |
| OQ-111 | answered | 3.530.1 (S701): OAP and OAP-C only. CO-07's title still says "OAP-B" (C-3). |
| OQ-118 | answered | Each adjustment appears as a dated figure (S700, S705, S706). |
| OQ-123 | answered | 3.758.47 Steps A-G (S770..S772); the annual State figures are rightly supplied; ordering is OQ-253. |
| OQ-141 | answered | 3.608.4.C-F (S760). |
| OQ-158 | answered | 3.752.25.B unchanged (S774); new fact CO-1283 with a P4 default (N-10). |

### 3.2 Still-open questions the fetched current text answers

Answered — the text settles the interpretation; resolve and fix the item:

- **OQ-105** — answered differently from what it says: D-81 3.606.2.A (`D-81.md:3081-3096`). Rewrite with B-1.
- **OQ-115** — D-80 3.533.A.2.b-f and 3.549.A.2.b-f (`D-80.md:4063-4087, 4968-4992`); `ssi_income` exists.
  Resolve with B-2.
- **OQ-116** — already implemented by CO-950 (`ssi_income < ma_ssi_federal_benefit_rate_individual`, the
  phase-5 K-6 fix); D-80 3.546 (S706) restates "not receiving the full SSI benefit standard". Mark resolved.
- **OQ-112 and OQ-139** — D-80 3.500 (`D-80.md:30-33`) lists the Adult Financial programs as "the Old Age
  Pension (OAP) program, Aid to the Needy Disabled (AND) program consisting of AND-State Only (AND-SO) and
  AND-Colorado Supplement (AND-CS), Home Care Allowance (HCA), and Burial Assistance" — there is no Aid to
  the Blind program in the current rule, and 3.520.61.A/3.540 (S705, S711) put the blind 0-59 inside AND-SO.
  Resolve: the `ab` branch of CO-953 rests on C.R.S. 26-2-111(5) alone; either remove it (blind clients are
  AND-SO) or keep it labelled statute-only. OQ-139's AB good-cause exception goes with it.
- **OQ-117** — superseded by the general bar of 3.520.61.F and 3.520.71.F (`D-80.md:1757, 2304-2336`),
  which applies to every AF program. Resolve with K-3.
- **OQ-33** — 10 CCR 2506-1 4.311.1.A (S750, `D-82.md:5490-5494`): the first Colorado ABAWD exemption is
  "Exempt from the general work requirements", i.e. 4.310.3 — exactly what CO-414 reads through CO-405.
  The Colorado text answers the "(d)(2) coextensive" question directly. Resolve.
- **OQ-14** — 4.406.A-C (`D-82.md:7256-7326`) defines a destitute migrant or seasonal farmworker household
  (only income from a terminated source before application, and/or more than $25 from a new source not
  received by the tenth day). The supplied fact can become a derived item over three new income-source
  facts, or stay supplied with this citation; either way the question of "what destitute means" is answered.

The text states the rule; the question stays open only because it is not modeled (update each body with the
current citation):

- **OQ-38** — 4.207.2.A-C proration formula (`D-82.md:2553-2589`), 4.207.3.B initial-month threshold,
  4.311.3.D regaining eligibility and the single additional three months (`D-82.md:5576-5596`), 4.308/4.310.5
  voluntary quit.
- **OQ-120** — 3.532.B.1-3 (`D-80.md:3988-4003`) and 3.543 state the proration and the birthday-month
  transition.
- **OQ-114** — 3.534, 3.544.D-E, 3.549.C-D state spousal and sponsor deeming (`D-80.md:4093-4193,
  4632-4717, 4996-5084`).
- **OQ-151** — 3.520.71.B (S710) restates the AND-SO SSI/SSDI application duty.
- **OQ-103, OQ-140** — D-81 3.605.1.A.5-6 (sponsor: 20% or $175 of earnings, the 125% FPL exemption and six
  other exemptions, `D-81.md:2351-2400`) and 3.604.2.D.1 (`D-81.md:1299-1315`) are unchanged and complete.
- **OQ-162** — D-87 3.111.G.3-4 now states the 13-week job search, the 104-week (208 by county plan)
  training limit and the 52-week basic education limit (`D-87.md:1590-1650`); figures available, unmodeled.
- **OQ-143** — D-81 3.604.2.M (`D-81.md:1449-1481`); its list must drop the drug felony (S-2).

Unchanged by the current text; stay open: OQ-1, OQ-2, OQ-3, OQ-12, OQ-22, OQ-27..OQ-31, OQ-32, OQ-34,
OQ-35 (D-82 still says only "federal minimum wage"), OQ-37, OQ-101, OQ-102 (3.605.1.A.4.a still names no
"needs" figure), OQ-104, OQ-113, OQ-119 (3.520.67.E unchanged; the reg's "For AND only" at 3.520.61.C
sharpens rather than settles the statute tension), OQ-121, OQ-122 (the IM was not fetched), OQ-124 (extend
for the SUD activity, K-7), OQ-125, OQ-132..OQ-137, OQ-142, OQ-152, OQ-153 (3.606.1.H and J.4 unchanged),
OQ-157, OQ-159..OQ-161, OQ-163.

### 3.3 The new questions

OQ-250..OQ-255 are well-founded and cite the text. Amend: OQ-250 — add N-3 (floor per program or per client)
and drop the homeless half (S-5); OQ-252(2) — the county option relaxes the income test only (S-1); OQ-253 —
add Step E's interaction with two LEAP households in one dwelling (C-2); OQ-254 — add N-2's cents ordering;
OQ-255(4) — fix rather than record (S-4). Add one OQ each for N-1 (burial F.1 vs A.4) and N-9 (ECE "below"
vs "at or below").

---

## 4. Cases

### 4.1 CO-13, recomputed by hand

All eighteen expectations match the engine and my hand computation from the text. Derivations:

- *p1 `af_category` oap, `af_oap_grant` 352.* Born 1960-03-02, 66 on 2026-11-01; citizen, resident, unmarried
  (no spouse edge), resources $1,000 ≤ $2,000 (3.520.72.A.1). Unearned $700 − $20 (3.533.A.2.c) = 680 <
  1,032. Grant 1,032 − 680 = 352 ≥ the $189 floor (S700, S703).
- *p1 `af_hca_tier` tier_2.* Capacity 24 ≥ 21, need 30 in 24-37 (S714).
- *p1 `af_hca_eligibility_status` eligible, `af_hca_grant` 977.* Age ≥ 5, resident, not in a facility, not
  on HCBS and not NF-LOC (so not functionally HCBS-eligible), tier 2; financially eligible only through
  3.570.13.B.3; authorized $900 raised to the $977 floor (S713) — under the per-program reading (N-3).
- *p1/p2 burial.* Charges 2,800 − prepaid plot 600 = 2,200 ≤ 2,500 (A.4); unmet 2,800 − 300 − 200 − 0 =
  2,300 (Ruth's $1,000 is under the $2,000 individual limit, D.3.b.1); benefit min(2,300, 1,500) = 1,500.
  p1 is not a decedent: false/0.
- *p3/p4 Colorado Works.* One caretaker, one child: need $331, grant $488 (`D-81.md:3002-3010`); no income;
  14 months; second-level sanction: 25% × 488 = 122; 488 − 122 = 366; status eligible (closure is fourth
  level only); diversion false (needs ongoing assistance).
- *p4 SUN Bucks.* School aged and a TANF recipient → `eligible_categorical` (292.6(a)); $40 × 3 = 120 (S796).

**C-1 (should-fix). CO-13 p1 cannot have been on OAP on December 31, 2013.** 3.570.13.B.3 (`D-80.md:5842`)
requires that she "Have been receiving both Old Age Pension (OAP) grant payments and HCA as of December 31,
2013". Born 1960-03-02, she was 53 then; OAP starts at 60 (3.530, S700). The case's only route to HCA
financial eligibility is impossible on its own facts. Fix the case: date of birth on or before 1953-12-31
(e.g. 1950-03-02, age 76; every CO-13 figure is unchanged), or move her to the SSI route. Fix the item too:
CO-1215's third disjunct should also require `date_of_birth ≤ 1953-12-31` (age 60 on that date), so a
supplied grandfather flag cannot contradict the person's age.

**C-4 (note). Two more things CO-13 p1 exposes.** (a) At 66 with $700 of income (< $994 + $20) and $1,000 of
resources she must apply for SSI (3.520.71.B.4, D); an SSI award of $314 would, after B-2, make her OAP
countable income $994 and her grant 1,032 − 994 = 38, raised to $189 — and would give her HCA through B.1
instead of B.3. State that her SSI application is pending or denied. (b) p2's $2,800 is the N-1 boundary.

### 4.2 The target household's SNAP allotment, 125 → 336

Recomputed by hand for CO-01 (October 2026; CO-02 is the same in November). Household p2, p3, p4, p5; p1 is
an institution resident; p3 is an ineligible non-citizen, so the eligible size is 3 and her $2,380 counts at
3/4 = $1,785.

| step | text | figure |
|---|---|---|
| gross | 1,180 (p2 SS) + 1,785 | 2,965 — ECE (≤ $4,554, S739) |
| earned income deduction | 20% × 1,785 | 357 |
| standard deduction, size 3 | S731/S741 | 217 |
| adjusted income | 2,965 − 357 − 217 | 2,391 |
| SUA | p2: heat separate from rent → HCUA (S743) | 616 |
| shelter costs | 1,400 + 616 | 2,016 |
| excess shelter, uncapped (p2 is 81) | 2,016 − 1,195.50 | 820.50 |
| net income | 2,391 − 820.50 = 1,570.50, rounded | 1,571 |
| allotment | 808 − 0.30 × 1,571 = 336.70, rounded down (4.207.3.A) | **336** |

336 is right. Without the rounding of net income (Colorado's text does not round it) the result is 808 −
471.15 = 336.85 → 336, the same. The change decomposes as **+26** from FY2027 figures and the new rounding
(with no SUA the household would get 808 − 0.30 × 2,187 = 151.90 → 151) and **+185** from a fact change:
phase 8 replaced `utility_allowance_amount: 0` on every person with p2 paying heat plus three utilities.
That change is defensible — every CO-01 person has stated `is_responsible_for_heating_costs: true` since
phase 6, so the old SUA of zero contradicted the LEAP facts — but it is a change to the target household's
facts, not a rule effect, and the phase note should say so. The figure also depends on only p2 stating the
utility facts (S-3).

The CCCAP fee for p3's household (size 3, $2,380, one child, quality-rated provider): 1% × 2,380 + 14% ×
(2,380 − 2,276.67) = 38.27 × 0.8 = 30.61 → **30**. Right. SUN Bucks for p4: categorical through SNAP, 120.
Right. HCA, burial and diversion expectations: right.

### 4.3 Other case findings

**C-2 (should-fix). CO-01/CO-02 LEAP: two LEAP households in one dwelling each take the full $900 heating
cost.** The engine forms two LEAP households in the same home, [p1, p2] and [p4, p5] (p3 excluded for status,
her income counted), while every person states `leap_households_sharing_living_arrangement: 1` and nobody
states `shares_heating_fuel_with` (the engine lists it as missing for p3 and resolves through the
`otherwise false` default). Step E (`D-86.md:2499-2505`): "the estimated home heating cost shall be divided
by the number of separate households sharing the living arrangements". Either the family is one LEAP
household (state `shares_heating_fuel_with: true` on p3 and recompute: one household, size 4 with p3's
income counted, 3,210 + 2,380 = 5,590 a month against the four-person guideline — over 175% FPL, 30%,
900 × 0.5 = 450, and check the 60% SMI test) or it is two (state 2: CO-02 then gives 450 × (1 − 0.2 − 0.3) =
225 for p2's household and 450 × (1 − 0.2 − 0.2) = 270 for p4's). The CO-02 expectations of 450 and 540 are
right for neither. In CO-02 also decide whether p1, now a nursing-facility resident, is still in her
husband's LEAP household and income (3.751.1 "living together").

**C-3 (should-fix). CO-07 was not brought up to phase 8.** Its title and p2's comment still say Marco is
sanctioned "(no Colorado Works sanction item exists - K-2/OQ-141)"; the phase-5 review's §3.3 asked that the
case state a Colorado Works sanction once one exists. State `work_sanction_level_served` for p2 (at the
second level the unit grant becomes 517 × 0.75 = 387.75 → **387**; at the first, 516), restate p1's
earnings under B-1, change p3's `af_and_grant` from 994 to **294** under B-2, and retitle (the grandparent is
on OAP, not "OAP-B").

**C-5 (note). Stale labels after the SUA rename.** CO-03's title still says "no SUA rule yet" and it states
`snap_utility_allowance_amount: 0` directly, overriding the new rule — restate it through the four utility
facts or say why. CO-91 (merged from phase 9) still states the deleted supplied fact
`utility_allowance_amount` (`tests/cases.yaml`, p1 and p2), which no item reads.

---

## Summary for the fix round

Blocking first, then should-fix, then notes.

| id | severity | file(s) | change |
|---|---|---|---|
| **B-1** | blocking | `cash/CO-907`, `CO-922`, `CO-923`, `CO-1260`, `parameters/CO-350`, new parameter and facts, `sources.md` (S416 → D-81), `open-questions.md` (OQ-105) | 100% disregard in the first certification period and for a new source, 67% for a current source after it (3.606.2.A, `D-81.md:3081-3096`); ongoing eligibility test with the same disregards. |
| **B-2** | blocking | `cash/CO-946`; tests `CO-951`, `CO-952`, `CO-953`; `tests/cases.yaml` CO-07 p3; OQ-115, OQ-116 | Subtract SSI, apply the $20 to the rest, add SSI back; $20 rollover (3.533.A.2, 3.549.A.2, `D-80.md:4063-4087, 4968-4992`). |
| **S-1** | should-fix | `cash/CO-1270`, OQ-252 | County diversion income limit relaxes the income test only (3.606.8.A.6). |
| **S-2** | should-fix | `cash/CO-928`, S523, OQ-143 | Drop the drug-felony disqualification (gone from 3.604.2.L-M, `D-81.md:1432-1481`). |
| **S-3** | should-fix | `snap/CO-036`, `snap/CO-377`, OQ-29 | One SUA per household (4.407.31), not a per-member sum. |
| **S-4** | should-fix | `sunbucks/CO-1297`, OQ-255 | Guideline year changes July 1 (292.5(b)). |
| **S-5** | should-fix | `cash/CO-1217`, OQ-250 | "Home" excludes a homeless shelter: read `is_homeless` (3.570.12). |
| **S-6** | should-fix | `snap/CO-036`, `supplied/CO-036` | New ID for the derived SUA; do not reuse CO-036. |
| **S-7** | should-fix | `parameters/CO-122`, `CO-123`, OQ-15 | Add the FY2026 200% version or reopen OQ-15 for that window. |
| **K-1** | should-fix | new `cash/` items | Colorado Works death reimbursement (3.606.7). |
| **K-2** | should-fix | `cash/CO-951`, `CO-952`, new parameter | AF personal needs allowance ($79) for 30-day facility residents; inmate bar (3.532.D-F, 3.543.D-F). |
| **K-3** | should-fix | `cash/CO-953`, `CO-1203` | AF bar on CW recipients/eligibles and on CW sanction closures (3.520.61.F, 3.520.71.F); resolves OQ-117. |
| **K-4** | should-fix | new parameter and fact; `cash/CO-946` | ISM deduction, maximum $342 → $351 on 2026-01-01 (3.520.79). |
| **K-5** | should-fix | `snap/CO-376`, new parameter | SNAP SMED $165 (4.407.61.A). |
| **K-6** | should-fix | `snap/CO-417` | Fixed 36-month ABAWD clock from 2023-07-01; no countable month in the month of the 18th birthday (4.311.3.A.2, C.2). |
| **K-7** | should-fix | `childcare/CO-984`, `CO-981`, OQ-124 | SUD treatment activity (eff. 2026-07-01); current teen-parent definition. |
| **C-1** | should-fix | `tests/cases.yaml` CO-13; `cash/CO-1215` | p1 cannot have been on OAP on 2013-12-31; fix her date of birth; guard the grandfathered route by age. |
| **C-2** | should-fix | `tests/cases.yaml` CO-01, CO-02 | LEAP: state `shares_heating_fuel_with` and a consistent Step E count; recompute 450/540. |
| **C-3** | should-fix | `tests/cases.yaml` CO-07 | State the CW sanction level; restate under B-1/B-2; retitle. |
| N-1..N-12 | note | as listed in §1.3 | Burial F.1 vs A.4; fee cents order; floor per program; SUN Bucks household categorical; LEAP SMI back-out; CO-385-T1 month; seasonal LEAP figure; extension good-cause wording; ECE below/at-or-below; P4 defaults; CO-348 leftover field; pregnancy wording. |
| C-4, C-5 | note | `tests/cases.yaml` CO-13, CO-03, CO-91 | CO-13 p1's SSI duty and the burial boundary; stale SUA labels and the deleted fact name. |
| §2.2 notes | note | — | Family Preservation BCE, lottery winnings, initial month, destitute, strikers, AND SSN, disaster payments, LEAP denial factors, CCCAP fee rules. |
| §3 | — | `open-questions.md` | Resolve OQ-14, 33, 112, 115, 116, 117, 139; rewrite OQ-105; reopen or retitle OQ-15; re-cite OQ-38, 103, 114, 120, 140, 143, 151, 162. |

Counts: **2 blocking, 17 should-fix** (7 correctness, 7 completeness, 3 cases), **15 notes** (12 in §1.3, 2
case notes, and the grouped §2.2 note). Of the twelve questions phase 8 marked Resolved, eleven are answered
by the text and one (OQ-15) is overclaimed; eight further open questions are answered by the current text
(OQ-14, 33, 105, 112, 115, 116, 117, 139) and eight more are open only for modeling (OQ-38, 103, 114, 120, 140,
143, 151, 162).
