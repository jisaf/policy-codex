# Engineering review: ledger follow-ups

The engineering fix round for the Drools, Corticon and fact-graph reviews
(`stakeholder-drools.md`, `stakeholder-corticon.md`,
`stakeholder-factgraph.md`) changed the engine, the scripts, the suite
builder and the docs only. Two policy fix rounds were editing ledger items at
the same time, so every fix that needs an item (or a test inside an item, or
`tests/cases.yaml`) to change is listed here for a later pass. Nothing below
blocks `npm run check`: the suite builder absorbs each one (it drops what no
engine reads and lists it under the case's `ignored`), and `npm run check`
reports each as a warning until it is fixed at the source.

Item ids are as of commit `d2ec54e`; re-run `npm run check` for the current
list (its warnings name every test and case input below).

**Status (item follow-up pass, 2026-11-21).** Every section below is marked
**Done**, **Done in part** or **Not done** with what was changed. Branch
`ccr-9d19bf4c-wmnwcl`; the commits are named "engineering follow-up N".

## 1. Quote the `=` operator (mechanical)

YAML 1.1 parsers (PyYAML, SnakeYAML 1.x) read a bare `=` in a flow sequence
as the `tag:yaml.org,2002:value` tag. The app's parser reads `=` and `"="`
alike, and its emitter already writes `"="`; `scripts/codex_tool.py` now
accepts the bare form too. For portability, replace every `[=, ` with
`["=", ` in these files (occurrences in parentheses; 99 in 54 files, all in
`co`; `mwr` has none):

- `volumes/co/cash/CO-1206.yaml` (1)
- `volumes/co/cash/CO-1217.yaml` (1)
- `volumes/co/cash/CO-1219.yaml` (1)
- `volumes/co/cash/CO-1264.yaml` (4)
- `volumes/co/cash/CO-1265.yaml` (2)
- `volumes/co/cash/CO-1270.yaml` (2)
- `volumes/co/cash/CO-919.yaml` (2)
- `volumes/co/cash/CO-921.yaml` (1)
- `volumes/co/cash/CO-949.yaml` (4)
- `volumes/co/cash/CO-951.yaml` (1)
- `volumes/co/cash/CO-952.yaml` (2)
- `volumes/co/childcare/CO-1290.yaml` (3)
- `volumes/co/energy/CO-1280.yaml` (4)
- `volumes/co/medicaid/CO-1150.yaml` (1)
- `volumes/co/medicaid/CO-1152.yaml` (1)
- `volumes/co/medicaid/CO-1154.yaml` (1)
- `volumes/co/medicaid/CO-1159.yaml` (2)
- `volumes/co/medicaid/CO-1161.yaml` (1)
- `volumes/co/medicaid/CO-1162.yaml` (1)
- `volumes/co/medicaid/CO-1164.yaml` (7)
- `volumes/co/medicaid/CO-1172.yaml` (2)
- `volumes/co/medicaid/CO-1175.yaml` (1)
- `volumes/co/medicaid/CO-1176.yaml` (2)
- `volumes/co/medicaid/CO-1186.yaml` (2)
- `volumes/co/medicaid/CO-1187.yaml` (1)
- `volumes/co/medicaid/CO-1190.yaml` (2)
- `volumes/co/medicaid/CO-2240.yaml` (1)
- `volumes/co/medicaid/CO-2250.yaml` (1)
- `volumes/co/medicaid/CO-2270.yaml` (10)
- `volumes/co/medicaid/CO-507.yaml` (1)
- `volumes/co/medicaid/CO-539.yaml` (1)
- `volumes/co/medicaid/CO-544.yaml` (1)
- `volumes/co/medicaid/CO-545.yaml` (1)
- `volumes/co/medicaid/CO-546.yaml` (1)
- `volumes/co/medicaid/CO-547.yaml` (1)
- `volumes/co/medicaid/CO-548.yaml` (1)
- `volumes/co/medicaid/CO-554.yaml` (4)
- `volumes/co/medicaid/CO-562.yaml` (1)
- `volumes/co/medicaid/CO-564.yaml` (4)
- `volumes/co/medicaid/CO-608.yaml` (1)
- `volumes/co/medicaid/CO-610.yaml` (1)
- `volumes/co/medicaid/CO-613.yaml` (1)
- `volumes/co/medicaid/CO-614.yaml` (1)
- `volumes/co/medicaid/CO-615.yaml` (2)
- `volumes/co/medicaid/CO-616.yaml` (1)
- `volumes/co/medicaid/CO-644.yaml` (1)
- `volumes/co/medicaid/CO-652.yaml` (3)
- `volumes/co/medicaid/CO-653.yaml` (1)
- `volumes/co/shared/CO-1725.yaml` (1)
- `volumes/co/shared/CO-505.yaml` (1)
- `volumes/co/snap/CO-1372.yaml` (1)
- `volumes/co/snap/CO-1500.yaml` (2)
- `volumes/co/snap/CO-308.yaml` (1)
- `volumes/co/snap/CO-416.yaml` (1)

A one-line pass: `sed -i 's/\[=, /["=", /g'` over these files, then `npm run
check` (the parsed trees are identical, so nothing else changes).

**Done.** The 78 bare `=` left after the earlier rounds (44 files) are
`"="`; prose that quotes a derivation keeps its bare form.

## 2. Test inputs no engine reads

Each is dropped from the suite and listed under the case's `ignored`; fix
the source so the test says what it means.

**Parameters stated as a person's facts** (move under `parameters:` or
delete). The value equals the ledger's in every test except two:

- CO-951-T8, CO-951-T9 state `af_oap_payment_floor: 0`; the ledger value on
  2026-10-15 is 189 and the engine ignores the stated 0. Evaluated with
  `parameters: {af_oap_payment_floor: 0}` instead, both expectations are
  unchanged (604.6451612903226 and 852: the floor is not reached), so either
  move the value under `parameters:` or delete it; decide which the tests
  meant.
- Same value as the ledger, so delete (or move) with no change to the
  expectation: CO-642-T1..T4 (`ssi_federal_benefit_rate_individual`,
  `ma_special_income_group_pct`), CO-1640-T3, CO-2384-T3, CO-2386-T1/T2
  (`ssi_federal_benefit_rate_individual`), CO-648-T1/T2
  (`ssi_resource_limit_individual`), CO-655-T1..T3
  (`ma_mmmna_shelter_threshold_pct`), CO-662-T1/T2 (`ma_mmmna_applicable_pct`),
  CO-1641-T1/T2 (`chp_income_limit_pct_upper`), CO-1260-T1..T5 and
  CO-914-T1..T5 (`cw_pregnancy_allowance`), CO-2384-T1/T2
  (`af_oap_grant_standard`), CO-984-T13/T14
  (`cccap_sud_treatment_activity_start_date`). These pass today only because
  the stated value happens to equal the ledger's.

**Done.** All 37 tests state these values under `parameters:` (CO-951-T8/T9
keep the floor at 0: they test the proration, which stays above any floor).

**Identifiers no item has** in `volumes/co/tests/cases.yaml` (stale names;
rename to the current identifier or delete):

- `has_domestic_violence_waiver`: CO-01 p1-p5, CO-02 p1-p5
- `lpr_entry_date`: CO-01 p2, CO-02 p2, CO-04 p1, p2
- `transfers_within_lookback`: CO-01 p1
- `utility_allowance_amount`: CO-92 p1, p2

**Done.** `has_domestic_violence_waiver` is renamed to
`has_domestic_violence_extension_approved` (CO-846); `lpr_entry_date`,
`transfers_within_lookback` and `utility_allowance_amount` are deleted (each
restated a fact the case already states, or one an item derives).

**Household cases that state derived values** (Corticon B-3). A stated
value replaces the item's rule, so these cases do not test that rule; the
suite lists them under `overrides`. Replace each with the supplied facts the
rule reads, or say in the case title why the value is stated:

- CO-01, CO-02: `ma_mmmna_standard` (p1, p2)
- CO-08: `cw_eligibility_status`, `cw_grant_amount` (p1-p4, p6)
- CO-83: `meets_public_assistance_citizenship_requirement` (p1-p3)

**Done.** CO-01/CO-02 no longer stated `ma_mmmna_standard` (HCPF round). CO-08
states what Colorado Works reads and derives the same values (p6 now
`ineligible_no_dependent_child`, which no expectation reads); CO-83's
citizens derive `true`. `conformance/known-failures.json` is empty.

**Wrong place:** CO-72 states `has_income_trust` (a person fact) under
`months`; move it to the person's `facts`.

**Done** (it was under `month_defaults`).

**Persons named only in a relationship triple** (declare them, with the facts
the test means them to have, or drop the triples):

- CO-305-T1: p2 (spouse of p1) appears only in triples; also, `others`
  restates p1, which replaces everything `given` states for p1. Today the
  engine records no relationships on p2 and the expectation is
  `[p1, p3, p4, p5]`. Declaring p2 makes p2 a household member candidate:
  recompute the expectation and review it by hand (with p2 declared and
  nothing stated for p2, the result is unknown because p2's
  `snap_is_household_member` is).
- CO-1002-T1, CO-1002-T4: p2 appears only in a triple.

**Done.** CO-305-T1 declares the spouse p2 and drops `others.p1`; the
expectation is now `[p1, p2, p3, p4, p5]` (the spouse edge always crosses,
7 CFR 273.1(b)(1)(i)). CO-1002-T1/T4 name p1 as p4's parent; p4 and p5 have no
income, so the expectations are unchanged.

## 3. Time logic inside derivations

A rule that changes on a date belongs in item `effective` ranges or
parameter `versions`, which an engine's own versioning can see (Corticon
S-9). Note the semantic difference before moving any of these: versions and
effective ranges are chosen by the **determination date**, while a
comparison with `[month]` follows the **month evaluated**. Moving one
changes which formula a past or future month gets; confirm the reading with
the policy owner.

- CO-1289 `cccap_parent_fee_formula_amount`: switches formulas at the literal
  month `2028-08` (`[<, [month], "2028-08"]`). Candidate: two parameter
  versions for the rates and band limits (CO-2115..CO-2119 already start
  then), or two items with effective ranges.
- CO-1190 `ma_countable_discharged_student_loan_income`: tests the month
  against `2018-01` and `2025-12` (tax years 2018-2025). Candidate: a
  parameter with the period's first and last month.
- CO-1215 `af_hca_financially_eligible`: the grandfathering date
  `2013-12-31` as a literal. Candidate: a parameter.
- CO-306 `snap_is_exempt_from_immigrant_waiting_period` (`1931-08-22`,
  `1996-08-22`) and CO-1672 `af_sponsor_verification_is_pending`
  (`1996-08-22`): statutory dates as literals. Candidate: parameters (they
  never change, so this is for readability, not versioning).
- CO-1006 `leap_program_year_start_month` and CO-1292 `is_school_aged`:
  month-of-year logic through fixed anchors (`2000-11`, `2000-08`), because
  no operator reads the month of the year. Candidate: a `month_of_year`
  operator (an engine change, not made in this round: it should land with
  the items that use it), then rewrite both items.

**Done.** CO-1289: one marginal formula; the switch from 3.124.P to Q is in
the versions of the band rates (15% from July 2021, then 3/5/7%) and the
per-child amount ($15, then 0); CO-1285 removed (no reader); it now follows
the determination date (new test CO-1289-T8). CO-1190 already read
parameters (HCPF round) and compares them with the month of discharge, which
is the event date the exclusion is about, so it stays per month. CO-1215,
CO-306 and CO-1672 read date parameters (CO-2600, CO-2601, CO-279). New
operator `month_of_year` (P49); CO-1006 and CO-1292 use it (CO-2605 for
August).

## 4. Money and rounding

Money is not rounded unless a rule rounds (docs/operators.md, Numbers;
conventions.md now says so). Values like these are therefore expected to
many decimals. For each, check whether the governing text rounds (to cents,
or to whole dollars) and, if it does, add the rounding to the derivation:

- CO-1289 `cccap_parent_fee_formula_amount` (e.g. 45.27317999999999)
- CO-951 `af_oap_grant`, CO-952 `af_and_grant` (day prorations, e.g.
  604.6451612903226)
- CO-658 `ma_patient_payment` (e.g. 179.6400000000001)
- CO-1750 `ma_ssi_poverty_guideline_monthly` (annual / 12, e.g. 1803.33...)
- CO-402 `snap_weekly_hours_worked` (hours, e.g. 31.846153846153847)

**Done.** CO-1289: no rounding in the formula; 3.124.A drops the cents in
`cccap_parent_fee` (CO-1290), which already floors. CO-951/CO-952: 9 CCR
2503-5 3.581.D-E (S1825) states a partial-month table and drops the cents
from every payment except where SSI income reduces the grant; new CO-2602,
CO-2603, CO-2604; CO-951-T8 changes from 604.6451612903226 to 616
(852 x .72329 = 616.24308, cents dropped); OQ-491 resolved. CO-658, CO-1750
and CO-402: no governing text rounds (§ 8.100.7.T, the HHS guidelines over
twelve, 7 CFR 273.24's hours), so they stay unrounded.

## 5. Division by an empty household

A division by zero is now unknown (and a warning) instead of NaN. These
items divide by a household count that can be 0; decide what the rule says
for an empty unit and guard it explicitly (a `case` arm), so the result is
not a silent unknown: CO-333 `snap_counted_income_of_ineligible_member`,
CO-371 `snap_counted_earned_income_of_ineligible_member`, CO-2300
`snap_counted_shelter_cost_of_member`, CO-2301
`snap_counted_dependent_care_expense_of_member`. No current test or case
reaches the zero.

**Done.** Each gives 0 for a prorated member with no household, with a test.

## 6. Parameters with no version on the volume's default date

`npm run check` warns: CO-875 `leap_income_limit_monthly` (first version
2026-11-01) and CO-2115..CO-2119 (the CCCAP fee bands from 2028-08) have no
version on `default_as_of` 2026-10-01. The CCCAP bands are read only from
2028-08, so that is expected; for CO-875, either add the previous season's
limit or confirm that LEAP is never determined before 2026-11-01.

**Done in part.** The CCCAP bands have versions from July 2021 (section 3).
CO-875 keeps its warning by design: LEAP is determined only within the
season (leap_month_in_eligibility_period), and the 2025-2026 table is
published only on cdhs.colorado.gov, which is refused (OQ-532).

## 7. Item metadata

- `implemented: engine` on parameters (Drools N-7), which is a derived-item
  field: CO-1200, CO-1201, CO-1202, CO-1209, CO-1210, CO-1211, CO-1212,
  CO-1213, CO-1214, CO-1227, CO-1228, CO-1235, CO-1236, CO-1237, CO-1238,
  CO-1244, CO-1262, CO-1263, CO-1282, CO-1284, CO-1285, CO-1286, CO-1291,
  CO-1503, CO-1505, CO-1506, CO-1509, CO-1513, CO-1514, CO-1515, CO-1517,
  CO-1519, CO-1520. Remove the field (or define what it means on a
  parameter).
- CO-333 carries `open: [OQ-1]`, but OQ-1's Items list names only CO-308
  (Corticon N-6). Remove OQ-1 from CO-333, or add CO-333 back to OQ-1.
- No item carries a consumer and is not an outcome (fact-graph N3): CO-176
  `snap_abawd_hr1_effective_date`, CO-1802 `ma_sga_non_blind`, CO-1803
  `ma_sga_blind`, CO-252 `ma_transfer_lookback_months`, CO-827
  `ma_csra_minimum`, CO-406 `snap_is_work_registrant`, CO-557
  `ma_retroactive_coverage_start_month`, CO-558
  `ma_is_presumptively_eligible_pregnant`, CO-559
  `ma_is_presumptively_eligible_child`, CO-619 `ma_wawd_premium`, CO-621
  `ma_cbwd_premium`, CO-659 `ma_transfer_penalty_days`, CO-2231
  `chp_copayment`, CO-708 `chp_presumptive_eligibility`, CO-903
  `cw_unit_size`, CO-920 `cw_meets_work_participation`. Make each an outcome
  (so household cases test it) or say in its meaning that it is
  informational.

**Done.** `implemented: engine` removed from the 35 parameters (CO-1285
deleted, CO-1286 in section 3). CO-333 no longer lists OQ-1. The 16 items say
in their meaning that they are informational, and why.

## 8. Tests to write

- **Unit-isolated rule tests** (Drools N-4, fact-graph S6): the suite now
  marks each rule test `isolation: unit` (it states every derived item the
  tested item reads directly) or `integration`. 821 of 2,032 co rule tests
  are unit; an item with no unit test can be brought up in an engine only
  with its whole closure. Add one unit test per derived item that has none
  (`jq` over `conformance/co/suite.json` lists them).
- **A month-window test** (Corticon S-4): the Corticon review found the suite
  passes with a 12-month window, so an engine that materialises too
  short a window still passes. Add a household case whose outcome needs the
  full 36-month ABAWD period (CO-417).
- **Cannot-determine household cases written by hand**: the suite now
  generates one per outcome by removing a supplied fact; a hand-written case
  per program, with the expected list of missing facts reviewed by the
  program owner, would pin the explanation as well as the value.

**Done in part.** The month-window case is CO-93 (the ABAWD months of July to
September 2026 counted in June 2028). Not done: unit-isolated rule tests for
the derived items that have none (287 at the start of this pass), and the
hand-written cannot-determine cases, whose missing-fact lists need the
program owners' review.

## 9. Modelling questions for the policy owners

- **Case-wide facts held per person** (Drools N-3, Corticon N-4, fact-graph
  S3): `snap_application_date`, `verification_request_date`,
  `cccap_application_county` and similar are `person`-scope and repeated on
  every person, and household-level results (`snap_allotment`) are repeated
  on every member. Nothing says what happens when persons disagree. Options:
  move them to `case` scope (the engine reads only `determination_date` from
  case scope today, so this needs an engine change too), or add a check that
  all persons agree; and give assistance units an identity (a unit-scope
  item) so a consumer cannot add up one allotment per member.
- **MAGI depends on Colorado Works** (fact-graph N2):
  `ma_magi_eligibility_status` reaches `cw_eligibility_status` through CO-510
  -> CO-1150 -> CO-953 -> CO-1511. Confirm that is intended.

**Recorded** as OQ-541 and OQ-542 for the policy owners.
