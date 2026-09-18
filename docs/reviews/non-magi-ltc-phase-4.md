# Policy review: Colorado volume, non-MAGI Medicaid — SSI-related, long-term care, MSP and Buy-In (CO-600..CO-622, CO-640..CO-658, CO-225..CO-255, CO-800..CO-838)

Reviewer role: Medicaid non-MAGI / long-term-care policy owner. Read-only review at commit `4a5dbb5`
(branch `claude/phase-2-startup-oj6e6g`) against `volumes/co/documents/D-41` and `D-43..D-58`, the
excerpts `sources.md` S301..S319 and S351..S378, and `volumes/co/open-questions.md` OQ-81..OQ-100.
`CHECK_BASE=origin/main npm run check -- --volume co` passes at this commit; every finding below is a
policy finding against the fetched text, not a mechanical one. The suite is green and the chapter
still computes the Community Spouse Resource Allowance by a formula Colorado's rule does not use,
never applies spousal impoverishment to an HCBS or PACE couple, and reports a monthly patient payment
for people who are not in an institution at all.

Findings are grouped (1) correctness, (2) completeness, (3) cases. Each gives severity, item id(s),
the governing text with its document and line, what the item does, and the fix. Document lines are
`documents/D-nn.md:line`; excerpts are `sources.md:line`.

---

## 1. Correctness

### 1.1 Blocking

**C-1 (blocking). CO-646: the CSRA is computed as half the couple's resources floored at a minimum
standard. Colorado's rule allocates the couple's *total* resources, capped at the maximum standard.**

`documents/D-41.md:1873-1877` (10 CCR 2505-10 § 8.100.7.M.1):

> For persons whose Medical Assistance application is for an individual who meets the definition of an
> institutionalized spouse, the CSRA is the largest of the following amounts:
> a. The total resources of the couple but no more than the current maximum allowance which, changes
> each year beginning January 1st.; or
> b. The increased CSRA calculated pursuant to section 8.100.7.S; or
> c. The amount a court has ordered the institutionalized spouse to transfer to the community spouse...

`ma_csra` (CO-646) is

```
["min", csra_maximum_standard, ["max", csra_minimum_standard, ["/", countable_resources_couple, 2]]]
```

which is the *federal* `1396r-5(f)(2)` shape (S371, `sources.md:1948`): the greatest of an indexed
minimum or the lesser of the spousal share (½ of total) and an indexed maximum. Colorado did not
adopt that shape in the fetched rule. § 8.100.7.M.1.a has no spousal share and no minimum standard —
branch (a) is `min(total resources, maximum allowance)`, and (b) and (c) can only raise it. The
minimum standard exists in Colorado's scheme only as a floor the federal statute supplies; nothing in
D-41 states it, which is why `csra_minimum_standard` (CO-827) had to be invented as a supplied fact
under OQ-91.

Consequence on the target household: CO-01's p1 has `countable_resources_couple: 46000`,
`csra_maximum_standard: 150000`. The item gives `max(30000, 23000) = 30000` capped at 150000 = 30000,
so `ma_institutionalized_spouse_countable_resources = 16000`, `ma_meets_ltc_resource_standard = false`,
`ma_ltc_eligibility_status = ineligible_resources`. Under § 8.100.7.M.1.a the CSRA is
`min(46000, 150000) = 46000`; § 8.100.7.O.1 (`documents/D-41.md:1897`) then makes p1 resource
eligible, because "the total resources owned by the couple are at or below the amount of the Community
Spouse Resource Allowance plus the ... allowance for an individual of $2,000" — 46,000 ≤ 48,000. The
chapter currently denies a nursing-facility applicant the text makes eligible.

Fix, in `volumes/co/medicaid/CO-646.yaml`:

```
derived: ["min", csra_maximum_standard, countable_resources_couple]
```

drop `csra_minimum_standard` from `uses`; keep CO-827 only if the 8.100.7.S increased-CSRA branch is
authored later, otherwise retire it. Restate `precision` to say branches (b) and (c) are not modeled
(they can only increase the CSRA, so the item is a floor, not a ceiling, on the protected amount).
Open a new question recording that § 8.100.7.M.1.a as fetched is more generous than 1396r-5(f)(2)(A)
as fetched (S371) and asking HCPF which governs — but the ledger's rule is that the item follows the
fetched Colorado text, and today it does not follow either.

---

**C-2 (blocking). CO-640 / CO-643: spousal impoverishment never reaches an HCBS or PACE couple,
because "institutionalized" is defined as being in a medical institution.**

`documents/D-41.md:1857-1865` (§ 8.100.7.K.2) defines the institutionalized spouse for spousal
protection:

> 2. For purposes of spousal protection, an institutionalized spouse is an individual who:
> a. Begins a stay in a medical institution or nursing facility on or after September 30, 1989, or
> b. Is first enrolled as a Medical Assistance client in the Program of All Inclusive Care for the
> Elderly (PACE) on or after October 10, 1997, or
> c. Receives Home and Community Based Services on or after July 1, 1999; and
> d. Is married to a spouse who is not in a medical institution or nursing facility...

and `documents/D-56.md:823` (§ 8.7100.C.3, quoted as S376 at `sources.md:1996`):

> Spousal impoverishment rules set forth at § 1924 of the Act are used to determine the eligibility of
> individuals with a community spouse for the special HCBS waiver group. In the case of a participant
> with a community spouse, the state shall use spousal post-eligibility rules as set forth at §1924...

`ma_ltc_couple` (CO-643) is `[all, ma_is_institutionalized, [exists_related, [spouse], ...]]`, and
`ma_is_institutionalized` (CO-640) is `[all, in_medical_institution, expects_institutional_stay_of_thirty_days]`.
An HCBS waiver participant or PACE enrollee living at home has `in_medical_institution = false`, so
`ma_ltc_couple` is false, so `ma_csra` is never subtracted (CO-647 falls back to
`countable_resources_individual`), no MMMNA/MIA is allowed (CO-658's community-spouse term is gated on
`ma_ltc_couple`), and `ma_home_equity_disqualifies` loses its spouse exception. That is the exact
population § 8.100.7.K.2.b-c and § 8.7100.C.3 name. The same definition appears a third time at
`documents/D-41.md:1303` (§ 8.100.7.F.2.b): "An institutionalized individual is one who is
institutionalized in a medical facility, a Long-Term Care institution, or applying for or receiving
Home and Community Based Services (HCBS) or the Program of All Inclusive Care for the Elderly (PACE)."

The item got this wrong because S354 (`sources.md:1794`) quotes only § 8.100.7.K.1 and K.3 and skips
K.2 entirely.

Fix: extend S354 to quote § 8.100.7.K.2.a-d verbatim; add a derived item (next free id, CO-644)
`ma_is_institutionalized_spouse`:

```
derived: [all, [any, in_medical_institution,
                     [not, [=, meets_hcbs_waiver_target_group, "none"]],
                     is_enrolled_in_pace],
               expects_institutional_stay_of_thirty_days]
```

(`is_enrolled_in_pace` is a new supplied fact; `expects_institutional_stay_of_thirty_days` already
covers HCBS/PACE per CO-822's own meaning and § 8.100.7.A.2.c), and change CO-643 to read it instead
of `ma_is_institutionalized`. Leave CO-640 as the *institutional-setting* test CO-652 uses.

---

**C-3 (blocking). CO-658: a patient payment is computed for every person in the case, including
people who are not institutionalized and people who are not eligible.**

`documents/D-41.md:1981` (§ 8.100.7.T.1): "During each month **after the institutionalized spouse
becomes Medical Assistance eligible**, deductions shall be made from the institutionalized spouse's
monthly income in the following order." And `documents/D-41.md:2101` (§ 8.100.7.V.3.b): "**Once an
applicant for Nursing Facility Medical Assistance has been determined eligible for Medical
Assistance**, the Eligibility Site shall determine the patient payment due to the Nursing Facility..."

`ma_patient_payment` (CO-658) has no gate at all:

```
["max", 0, ["-", ma_ltc_gross_income, ["+", ma_personal_needs_allowance_institutional, ...]]]
```

Run today:

```
$ npx vite-node scripts/eval-case.ts co CO-01 ma_patient_payment
p1 ma_patient_payment 2026-10 = 215
p2 ma_patient_payment 2026-10 = 1105
```

p2 is the community spouse, living at home. The chapter reports that he owes $1,105 a month to a
long-term care institution. p1's own $215 is reported in a month the same chapter calls
`ineligible_resources`. Nothing in `cases.yaml` catches this because only p1's patient payment is
asserted.

Fix, in `volumes/co/medicaid/CO-658.yaml`:

```
derived: [case, [[not, [all, ma_is_institutionalized, ma_ltc_financially_eligible]], 0],
                [else, ["max", 0, ["-", ma_ltc_gross_income, [...unchanged...]]]]]
```

and add `ma_patient_payment: {"2026-10": 0}` to p2..p5 in CO-01 and CO-02 so the gate is tested.
(Note that the outcome's type is money, so "not applicable" has to be reported as 0; say so in
`meaning`.)

---

**C-4 (blocking). CO-653: HCBS eligibility is gated on the 300% special income group and the $2,000
resource standard for everyone, but § 8.100.7.B.1 gives two other routes in.**

`documents/D-41.md:1023-1033` (§ 8.100.7.B.1):

> 1. HCBS or PACE shall be provided to persons who have been assessed ... to have met the institutional
> level of care and will remain in the community by receiving HCBS or PACE; and
> a. are SSI (including 1619b) or OAP Medicaid eligible; or
> b. are eligible under the Institutionalized 300% Special Income category described at 8.100.7.A; or
> c. are eligible under the Medicaid Buy-In Program for Working Adults with Disabilities described at
> 8.100.6.P. For this group, access to HCBS: i) Is limited to the Elderly, Blind and Disabled (EBD),
> Community Mental Health Supports (CMHS), Brain Injury (BI), Spinal Cord Injury (SCI), Supported
> Living Services (SLS), and Developmental Disabilities waivers...

confirmed at `documents/D-56.md:829` (§ 8.7100.C.4.a): "Individuals may be eligible to participate in
the adult HCBS waiver programs through the Medicaid Buy-in Program for Working Adults with
Disabilities if all listed eligibility criteria listed at 8.100.6.P are met."

`ma_hcbs_waiver_eligible` (CO-653) is
`[all, [not, [=, meets_hcbs_waiver_target_group, "none"]], meets_nursing_facility_level_of_care, ma_ltc_financially_eligible]`,
and `ma_ltc_financially_eligible` (CO-651) requires `ma_meets_special_income_group` (300% of the FBR,
$2,982/month) and `ma_meets_ltc_resource_standard` ($2,000). A WAwD participant may have income up to
450% FPL ($5,985/month for one, CO-242 × CO-181) and, per § 8.100.6.P.1.c, *no* resource test at all
("Resources are not counted", S317, `sources.md:1742`) — and § 8.7100.C.3's last sentence says
"Spousal impoverishment rules do not apply to people in the Medicaid Buy-In program." Under CO-653
that participant is denied HCBS on both income and resources.

S353 (`sources.md:1785`) quotes only § 8.100.7.B.1 and 1.b, dropping 1.a and 1.c — the same
excerpt-truncation failure as C-2.

Fix: extend S353 to quote § 8.100.7.B.1.a-c; change CO-653 to

```
derived: [all, [not, [=, meets_hcbs_waiver_target_group, "none"]],
               meets_nursing_facility_level_of_care,
               [any, ma_ltc_financially_eligible,
                     ma_is_ssi_related_eligible,
                     [all, ma_wawd_eligible,
                           [in, meets_hcbs_waiver_target_group, [ebd, cmhs, bi, sci, sls, dd]]]]]
```

(`sci` is not in CO-821's option list — add it, or record why the waiver is absent). The
`ma_wawd_eligible` disjunct must also bypass `ma_ltc_couple`, per § 8.7100.C.3.

### 1.2 Should-fix

**C-5 (should-fix). CO-612 reports `ssi_recipient` for a person the chapter has just found
ineligible.**

`ma_ssi_related_category` (CO-612) is

```
[case, [receives_ssi, "ssi_recipient"], [[not, ma_is_ssi_related_eligible], "none"], [ma_is_aged, "aged"], ...]
```

The `receives_ssi` branch is tested *before* the eligibility branch, while
`ma_is_ssi_related_eligible` (CO-611) makes SSI recipiency conditional on `ma_meets_residency` and
`ma_meets_citizenship_requirement`. An SSI recipient who has moved out of Colorado is reported
`ssi_related_category = ssi_recipient` and `ma_is_ssi_related_eligible = false` in the same month. The
item's own `meaning` says the category is "the single SSI-related ... category this person qualifies
under", so it must not name one when the person qualifies under none. Fix: move
`[[not, ma_is_ssi_related_eligible], "none"]` to the front of the case list. CO-612-T1 should gain a
sibling with `receives_ssi: true, ma_is_ssi_related_eligible: false, expect: none`.

**C-6 (should-fix). CO-649: the partial-month rule the item says the text does not state is stated,
at § 8.100.7.F.2.d.**

`documents/D-41.md:1317`:

> d. The period of ineligibility shall also include partial months, which shall be calculated by
> multiplying 30 days by the decimal fractional share of the partial month. The result is the number of
> days of ineligibility. For transfers occurring on or after April 1, 2006, the result shall be rounded
> up to the nearest whole number.

CO-649's `precision` says the opposite: "A rate, not a whole number, because 8.100.7.F.2.c.i's
division is not stated as rounded". It is: the whole part is months, the fractional part becomes
`ceil(30 × fraction)` days. A $56,500 transfer at a $9,000 divisor is 6 months and 9 days
(`30 × 0.2778 = 8.33 → 9`), not `6.2778` months. No excerpt covers § 8.100.7.F.2.c.ii or .d at all —
S366 stops at c.i.

Fix: add excerpt S379 quoting § 8.100.7.F.2.c.ii and § 8.100.7.F.2.d; keep CO-649 as the months
figure and add `ma_transfer_penalty_days` (whole number) =
`["ceil", ["*", 30, ["-", ma_transfer_penalty_months, ["floor", ma_transfer_penalty_months]]]]`, with
CO-649 itself reporting `["floor", ...]` whole months; correct the `precision` sentence.

**C-7 (should-fix). CO-651 / CO-652: a transfer penalty disqualifies forever.**

§ 8.100.7.F.1.e (`documents/D-41.md:1293`) defines the penalty period as "a period of time"; c.ii
(`documents/D-41.md:1309`) fixes its start as the later of the month after the transfer, the date the
person would otherwise have been eligible, and the end of any other penalty period. CO-651 uses
`["<=", ma_transfer_penalty_months, 0]` and CO-652 tests `[">", ma_transfer_penalty_months, 0]`, with
no month comparison — so a person with a 2-month penalty from 2021 is ineligible in 2026 and in every
month after. OQ-94 names the gap but the items ship a rule that is wrong in every month outside the
window, which is most of them.

Fix: add a supplied fact `transfer_penalty_period_start_date` (the Eligibility Site's determination
under § 8.100.7.F.2.c.ii) and a derived `ma_transfer_penalty_applies` (person-month) =
`[all, [">", ma_transfer_penalty_months, 0], [>=, [month, month_of, this month], [month, of, transfer_penalty_period_start_date]], [<, ...start plus penalty months...]]`,
then have CO-651 and CO-652 read `ma_transfer_penalty_applies` rather than the raw months figure.

**C-8 (should-fix). CO-652: a level-of-care failure is reported as `ineligible_income`, and
`eligible_institutional` does not require the level of care.**

`ma_ltc_eligibility_status` ends `[ma_is_institutionalized, "eligible_institutional"], [else, "ineligible_income"]`.
Two problems. (a) A person who meets an HCBS target group but fails the Level of Care Assessment
(`meets_nursing_facility_level_of_care: false`) passes the first branch, passes the penalty, home
equity, income and resource branches, fails `ma_pace_eligible` and `ma_hcbs_waiver_eligible` (both
require the level of care), is not institutionalized, and falls to `else` — reported
`ineligible_income` although income was fine. (b) `eligible_institutional` is reached on financial
tests plus `ma_is_institutionalized` alone, but § 8.100.7.A.2 and § 8.401 make the institutional level
of care a condition of nursing facility coverage; a person in a hospital for 30 days who does not need
nursing facility care would be reported eligible for institutional LTC.

Fix: add the option `ineligible_level_of_care`, insert
`[[not, meets_nursing_facility_level_of_care], "ineligible_level_of_care"]` after the home-equity
branch, and delete the misleading `[else, "ineligible_income"]` (it becomes unreachable). Add a test
with `meets_hcbs_waiver_target_group: ebd, meets_nursing_facility_level_of_care: false`.

**C-9 (should-fix). CO-605 / CO-606: the unused part of the $20 general exclusion is never carried
to earned income.**

S310 (`sources.md:1684`, 20 CFR 416.1124(c)(12), `documents/D-53.md`):

> If you have less than $20 of unearned income in a month and you have earned income in that month, we
> will use the rest of the $20 exclusion to reduce the amount of your countable earned income;

CO-230's own `precision` states the rule ("applied to unearned income first, with any unused portion
applied to earned income") and neither derivation implements it. CO-605 takes
`(earned − 65) × 0.5` with no $20 term, so CO-605-T2's expected 200 on $465 of earnings should be 190
(`465 − 20 − 65 = 380; 380 × 0.5 = 190`). This under-states eligibility for every working SSI-related,
QMB, SLMB, QI and QDWI applicant with little or no unearned income.

Fix: compute the general exclusion once in CO-606 as `[min, 20, unearned]`, expose the remainder, and
have CO-605 subtract `[max, 0, [-, ma_ssi_general_income_exclusion, unearned]]` before the $65. Update
CO-605-T2 and CO-607-T1/T2.

**C-10 (should-fix). CO-615 / CO-616: "not otherwise eligible for Medical Assistance" is read as "not
SSI-related eligible".**

S314 (`sources.md:1716`, § 8.100.6.N.4.d): "he/she cannot otherwise be eligible for Medical
Assistance." S315 (`sources.md:1724`, § 8.100.6.O): "An individual may be eligible under this section
only if he/she is not otherwise eligible under another Medical Assistance category of eligibility."
Both items use `[not, ma_is_ssi_related_eligible]`. A person eligible under a MAGI category — the
chapter next door computes `ma_magi_eligibility_status` (CO-560) — is "otherwise eligible" and is
excluded by the text but admitted by the item. Fix: replace with
`[all, [not, ma_is_ssi_related_eligible], [not, [=, ma_magi_eligibility_status, "eligible"]], [not, [=, ma_ltc_eligibility_status, ...]]]`,
or, if the cross-chapter read is unacceptable, state an open question and say in `precision` that the
test is narrowed.

**C-11 (should-fix). CO-251: the personal needs allowance is pinned at the 2015 base, but the text
says the base is reset every year.**

`documents/D-41.md:2145` (§ 8.100.7.V.3.d.i.2):

> Effective January 1, 2015 the personal needs allowance base amount is $75 per month and **will be
> adjusted annually at the same rate as the statewide average of the nursing facility per diem rate net
> of patient payment** pursuant to C.R.S. §25.5-6-202(9)(b)(I). **Each yearly adjustment will set a new
> base amount.**

CO-251 carries `versions: [{from: "2015-01-01", value: 75}]` and CO-658 uses it for a 2026
determination. The figure in effect in 2026 is in no fetched document, so under the volume's own
provenance rule ("a figure the text does not state is a supplied fact with an open question") this is a
supplied fact, exactly like `csra_minimum_standard`, `mmmna_cap` and `home_equity_limit` under OQ-91 —
not a parameter frozen eleven years out of date. Fix: convert CO-251 to a supplied fact
`personal_needs_allowance_institutional` supplied by HCPF's published annual figure, cite S361 for the
base and the adjustment mechanism, and add it to OQ-91's item list. The same argument applies to
CO-255 ($90, but that one *is* stated as a fixed figure effective 07/01/91 with no adjustment clause,
so it stays a parameter).

**C-12 (should-fix). CO-616 adds an employment condition § 8.100.6.O does not state.**

S315 lists QDWI's conditions as (a) lost SSDI entitlement due to earnings above SGA while still
disabled, (b) exhausted premium-free Part A, (c) resources at or below twice the SSI limit, (d) income
below 200% FPL, plus not otherwise eligible. `is_employed` is not among them, and CO-804's meaning
already carries (a) and (b). CO-616's `rationale` justifies it from "8.100.6.O.2.a's SGA-threshold
earned income", but that clause describes why entitlement was *lost*, in the past, not a present
employment test. A person who lost SSDI to earnings and is between jobs is QDWI-eligible on the text
and ineligible on the item. Fix: drop `is_employed` from CO-616's derivation and `uses`; if the
program's name is thought to require it, raise an open question instead.

**C-13 (should-fix). CO-801 conflates the intake resource snapshot with the resources tested each
month, so spend-down cannot be expressed.**

`documents/D-41.md:1869` (§ 8.100.7.L): "An assessment of the total value of the couple's resources
shall be completed **at the time of initial Medical Assistance application**... Once the applicant is
approved, the Community Spouses' resources are not reviewed again". `documents/D-41.md:1873`
(§ 8.100.7.M.1): "The CSRA is **established at intake only**". § 8.100.7.O.1 then tests, on an ongoing
basis, whether "the total resources owned by the couple are at or below the ... CSRA plus ... $2,000".
CO-801 (`countable_resources_couple`) is a single per-person fact feeding both CO-646 (the snapshot)
and CO-647 (the current test), so the CSRA moves whenever the couple spends down, and the two figures
can never differ. Fix: add a supplied fact `countable_resources_couple_at_snapshot` (scope person, the
§ 8.100.7.L assessment figure), have CO-646 read it, and leave CO-801 as the current-month figure
CO-647 subtracts the CSRA from.

**C-14 (should-fix). CO-641: in-kind support and maintenance is dropped from "gross income", although
§ 8.100.7.A.1 defines gross income as income before *deductions, exemptions or disregards*.**

S351 (`sources.md:1766`): "gross income means income before application of deductions, exemptions or
disregards appropriate to the SSI program." ISM is income under 42 U.S.C. 1382a(a)(2)(A) (S311,
"support and maintenance furnished in cash or kind") and under § 8.100.5.F.5.k (S306); CO-606 counts it
as unearned income for the SSI-related test, and CO-641 omits it from the LTC gross income sum, as it
omits `child_support_received`. The two income items disagree about what income is. In practice this
matters for the 300% special income group test and for patient payment. Fix: add
`in_kind_support_and_maintenance` and `child_support_received` to CO-641's sum, or state in
`precision` which fetched line excludes them (I did not find one).

### 1.3 Minor

**C-15 (minor). CO-601 and CO-602 are single-element `[all, x]` wrappers.** `ma_is_blind` is
`[all, is_blind]` and `ma_is_disabled` is `[all, is_disabled_ssa]`. These are the wrappers the review
brief's check (c) asks for: they exist only so the items are not bare aliases of a supplied fact. If
the rules genuinely add nothing to the supplied SSA determination, CO-603 should read `is_blind` and
`is_disabled_ssa` directly and CO-601/CO-602 should be withdrawn; if the categorical test is meant to
add something (42 CFR 435.530(a)/435.540(a)'s "except that—" clauses, quoted truncated in S305 at
`sources.md:1634`), fetch the rest of those paragraphs and put the exception in the derivation.

**C-16 (minor). CO-618/CO-619 omit the 7.5%-of-income premium cap; CO-621 omits household size.**
S317 (`sources.md:1742`, § 8.100.6.P.1.f.i): "The amount of premiums cannot exceed 7.5% of the
individual's income." S318 (§ 8.100.6.Q.1.g): premiums are "on a sliding scale based on **household
size** and income", and CO-621's bands use income alone. The 7.5% cap does not bind anywhere on the
stated schedule (the tightest point is the $25 band's floor, where 7.5% of 40% FPL is $39.90), but the
item should carry it as `["min", <band>, ["*", 0.075, <income>]]` so a future band change cannot
silently exceed it. Note also that S318's own text for the third and fourth CBwD bands says
"individuals" where the first two say "households" — quote it as fetched and raise an open question
rather than harmonising it silently.

**C-17 (minor). CO-657's meaning cites a federal formula it does not implement.** CO-657's `meaning`
says "per 42 U.S.C. 1396r-5(d)(1)(C) and 10 CCR 2505-10 § 8.100.7.T.1.c". The federal provision is ⅓ of
the amount *by which the MMMNA exceeds* the member's income; § 8.100.7.T.1.c.i
(`documents/D-41.md:1989`) is "one third of the amount of the MMMNA **and shall be reduced by** the
monthly income of that family member" — a different arithmetic, and the one the item implements
(correctly, since Colorado's rule governs). Fix: drop the federal citation from `meaning` or qualify it.
The item's use of `mmmna_standard` rather than `ma_mmmna` is right: § 8.100.7.Q.1.a names the standard
itself "the MMMNA" and Q.4 names the standard-plus-shelter total the "maximum MMMNA".

**C-18 (minor). OQ-100 describes an ordering CO-652 does not use.** OQ-100's title
(`open-questions.md:258`) says the outcome "picks institutional first"; CO-652's case list tests
`ma_pace_eligible`, then `ma_hcbs_waiver_eligible`, then `ma_is_institutionalized`, and its `precision`
says "PACE first, then HCBS, then institutional". Fix the open question's text.

**C-19 (minor). CO-618 and CO-620 do not test residency or citizenship.** Every other category rule in
the chapter (CO-611, and the MAGI chapter's CO-560) conjoins `ma_meets_residency` (CO-505) and
`ma_meets_citizenship_requirement` (CO-509). Both Buy-In items omit them, so a non-resident
non-citizen with the right age, disability and income is reported
`ma_buy_in_category = working_adults_with_disabilities`. § 8.100.6.P.1 does not restate the general
conditions because § 8.100.3/8.100.5.B carry them for the whole of 8.100; the items should conjoin them
as CO-611 does.

**C-20 (minor). CO-650 reads the home-equity exception through the wrong fact.** 42 U.S.C. 1396p(f)(2)
(S370, `sources.md:1940`) excuses the disqualification when the spouse, or a child under 21, or a blind
or permanently disabled child of any age, "is lawfully **residing in the individual's home**". CO-650
uses `[not, ma_ltc_couple]`, which asks whether a spouse exists and is out of an institution — not
whether anyone lives in the home. It therefore excuses a couple whose community spouse lives with
relatives, and disqualifies an unmarried applicant whose disabled adult child lives in the home. OQ-92
names the child branch; the spouse branch is wrong too. Fix: a supplied fact
`spouse_or_dependent_child_resides_in_home` per 1396p(f)(2), read in place of `ma_ltc_couple`.

**C-21 (minor). CO-604 drops a couple to household size 1 in the month of admission.** § 8.100.7.C.2.b
(`documents/D-41.md:1059`): "**Beginning the first month following the month** the couple ceases to
live together, only the income of the individual spouse is counted in determining his or her
eligibility." CO-604's spouse group excludes an institutionalized spouse immediately, so in the
admission month itself the two spouses' incomes should still be mutually available (§ 8.100.5.H.1.a)
and are not. In CO-01, p1 is admitted 2026-10-01 and the case is determined for 2026-10; p2's
`ma_ssi_countable_income` is 1,160 where § 8.100.7.C.2.b gives the couple's combined figure for that
month. Fix: make the exclusion take effect the month after `institution_entry_date` (the fact already
exists on CO-01's p1) and state the transition in `precision`.

---

## 2. Completeness

**G-1. `mmmna_standard` is supplied under OQ-91, but the text states its formula and the volume
already carries the input.** § 8.100.7.Q.1.a (`documents/D-41.md:1915`, quoted as S358): the MMMNA "is
equal to 150% of the federal poverty level for a family of two and is adjusted in July of each year",
and 1396r-5(d)(3)(A)(i)/(B)(iii) (S372) says the same as "the applicable percent ... of 1⁄12 of the
income official poverty line ... for a family unit of 2 members", applicable percent 150. CO-181 carries
the 2026 guideline for size 2 ($21,640). So `ma_mmmna_standard` is derivable —
`["*", 1.5, ["/", [lookup, ma_poverty_guideline_table, 2], 12]]` = $2,705.00 — and should be a derived
item with a new parameter `ma_mmmna_applicable_pct` (1.5), not a supplied fact. The July-adjustment
timing (the July guideline applies from July, not January) is the only piece the items would need to
state. `csra_minimum_standard`, `csra_maximum_standard`, `mmmna_cap`, `home_equity_limit`,
`transfer_penalty_divisor` and the MSP resource limits stay supplied; their bases are stated (S371,
S372(C), S369, S301) but their indexed current values are not in any fetched document, so OQ-81/OQ-91
are correct for those six and wrong only for the MMMNA standard.

**G-2. Excerpts that the items rely on but `sources.md` does not carry.** Each of these is text a
reviewer cannot check without opening D-41 directly, and two of them (K.2, B.1.a/c) caused blocking
findings above:
- § 8.100.7.K.2.a-d, institutionalized spouse for spousal protection (`D-41.md:1857`) — C-2.
- § 8.100.7.B.1.a and 1.c, the SSI/OAP and Buy-In routes into HCBS (`D-41.md:1025`, `1029`) — C-4.
- § 8.100.7.F.2.c.ii and .d, penalty start date and partial-month days (`D-41.md:1309`, `1317`) — C-6.
- § 8.100.7.M.1.b-c and § 8.100.7.S, the increased and court-ordered CSRA (`D-41.md:1877`, `1961`).
- § 8.100.7.R.1's "all income ... that could be made available must be considered to have been made
  available" (`D-41.md:1951`), which is what actually disposes of the "actually made available"
  qualifier in § 8.100.7.T.1.b that CO-656 does not model. Without this line the item looks wrong; with
  it, it is right. Add it to S358 or as its own excerpt.
- § 8.100.7.R.3 (court-ordered MIA floor) and R.4 (the $50 change threshold) (`D-41.md:1955`, `1957`).
- § 8.100.7.Q.2.a-b, the community spouse's medical expenses and insurance premiums as additional
  monthly needs (`D-41.md:1925`) — CO-835's rationale says this is "not separately modeled", so the
  omission should at least be visible in an excerpt and an open question.
- § 8.100.7.V.3.b.ii.4)-8), the remaining patient-payment deductions (`D-41.md:2113`): Home Maintenance
  Allowance, trustee/maintenance fees capped at $20/month, mandatory income tax withheld, mandatory
  garnishments, and Medicare Part B (first two months only) and Part D premiums. CO-658's `precision`
  lists them as omitted; four of the five are fixed, stated rules that could be authored now.
- § 8.100.7.V.3.c, long-term care insurance payments: not income for eligibility but payable as patient
  payment (`D-41.md:2129`). No fact for it exists in the chapter.
- § 8.100.7.B.3, Alternative Care Facility room and board capped at the OAP standard (`D-41.md:1049`).
- § 8.7100.C.2 (`D-56.md:821`), which states HCBS resources as "less than $2,000 ... or $3,000 for a
  couple" — a *strict* inequality and a couple figure, where CO-648 uses "at or below" the individual
  limit via § 8.100.7.O.1. The two rules should be reconciled explicitly.
- § 8.7100.D.4 (`D-56.md:837`): "The individual also must be at risk of placement in an Institution
  within one month, but for the availability of Waiver Services" — a target-group/LOC condition CO-653
  does not test and CO-820's meaning does not clearly cover.
- § 8.100.7.F.8's apportionment of a penalty between spouses (S367 is carried but no item reads it;
  OQ-94 should name it) and § 8.100.7.M.4's undue-hardship branch.

**G-3. Item-id gaps.** CO-644 and CO-645 are unused between CO-643 and CO-646; the batch report should
say whether items were withdrawn there or the ids were simply skipped, since the ledger's rule is that
ids are never reused. C-2's fix is a natural occupant of CO-644.

**G-4. A fetched figure not carried as a parameter.** `documents/D-58.md:71` states the 2026 SGA
amounts ("$1,690" non-blind, "$2,830" blind). QDWI's condition (a) and the WAwD program both turn on
SGA, and CO-804's meaning refers to "the Substantial Gainful Activity threshold" without a figure. The
volume has the document; it should have the parameter.

**G-5. Genuinely silent text, correctly flagged.** I confirmed that no fetched document states PACE's
minimum participant age (OQ-93 — `grep -i "55 years\|age of 55"` over D-55, D-56 and D-57 returns
nothing), the 2026 CSRA minimum/maximum, MMMNA cap, home equity limit, average private-pay rate, or the
CMS MSP resource limits (OQ-81, OQ-91). Those open questions are right and should stay open; the
settling documents would be the CMS annual "Spousal Impoverishment Standards" release, HCPF's
annually-published average private-pay nursing facility rate under § 8.100.7.E, and 10 CCR 2505-10
§ 8.497 for PACE.

**G-6. The target household's expectations (brief check d).** CO-01's p1 block asserts
`ma_csra: 30000`, `ma_institutionalized_spouse_countable_resources: 16000`,
`ma_meets_ltc_resource_standard: false`, `ma_ltc_eligibility_status: ineligible_resources`
(`cases.yaml:622-626`). Under § 8.100.7.M.1.a (C-1) the text gives `ma_csra: 46000`,
`ma_institutionalized_spouse_countable_resources: 0`, `ma_meets_ltc_resource_standard: true`,
`ma_ltc_eligibility_status: eligible_institutional`, and `ma_patient_payment: 215` becomes a real
payment rather than a figure computed for an ineligible person. The comment above the block
(`cases.yaml:600-604`) — "over the 2000 limit: ineligible on resources until spend-down. **Were she
eligible**, MMMNA = 2600 + (1100 − 30% of 2600) = 2920, the spouse allowance 2920 − 1180 = 1740, and
the patient payment 2030 − 75 − 1740 = 215" — should lose its conditional. The MMMNA, allowance and
patient-payment arithmetic themselves check out against § 8.100.7.Q, R and T. No `ma_patient_payment`
expectation exists for p2..p5, which is what hides C-3.

Also: CO-01's p2 is 81, `ma_is_aged` is true, and `ma_ssi_related_category` is `none` — right, because
his countable income of $1,160 exceeds the $994 FBR (CO-235). But the case asserts no
`ma_is_aged`/`ma_meets_ssi_income_standard`, so the *reason* is untested; add them.

**G-7. Tests that do not exercise the branch they claim (brief check b).** CO-650-T2 claims to test the
spouse exception, and does — but with `home_equity: 900000` and `ma_ltc_couple: true` supplied
directly, so it never exercises CO-643, which is where C-2's bug lives. CO-604-T4 is the only test that
puts the *subject* in an institution and is the one that pins the C-21 behaviour; it should carry a
comment saying so. CO-652-T2 and T5 supply `ma_pace_eligible`/`ma_hcbs_waiver_eligible` directly, so the
PACE-before-HCBS ordering that OQ-100 worries about is never actually reached by a test where both are
true — add one. No test anywhere supplies `has_income_trust: true` together with a gross income above
300% *and* a person in a hospital, which is the one setting § 8.100.7.A.2.e excludes ("excluding
hospital"); CO-642-T3 supplies the trust with no setting fact, so the exclusion is untested and, in
fact, unimplemented.

---

## 3. Cases

### 3.1 The case

A married couple, one spouse entering a nursing facility with a $54,000 uncompensated transfer inside
the look-back, a community spouse whose own income is below the MMMNA and who qualifies for QMB, the
couple's resources above the CSRA at the snapshot, and a working disabled adult son in the community
spouse's home on the Working Adults with Disabilities Buy-In. It exercises, in one household, the
transfer penalty ordering in CO-652, the CSRA and the spousal allowances, the interaction of C-1 and
C-3, an MSP determination for a community spouse whose household size drops to 1 because her husband is
institutionalized (CO-604), the Buy-In premium band, and the § 8.100.7.T.1.c.ii tax-dependency limit on
the family allowance — none of which CO-01 reaches, because CO-01's p1 has no transfer, its community
spouse fails the MSP resource test, and it has no Buy-In participant.

Add to `volumes/co/tests/cases.yaml`:

```yaml
- id: CO-06
  title: Nursing facility admission with a transfer penalty; community spouse on QMB below the MMMNA; working disabled adult son on the Buy-In
  # Designed by the phase-4 non-MAGI/LTC review (docs/reviews/non-magi-ltc-phase-4.md S3).
  # Expectations are what the FETCHED TEXT gives, not what the current items compute. Three
  # expectations depend on findings in that review landing first:
  #   p1 ma_csra: 157920 needs C-1 (10 CCR 2505-10 8.100.7.M.1.a: CSRA = total resources capped at
  #     the maximum standard). The current CO-646 half-of-resources formula returns 90000, and
  #     p1 ma_institutionalized_spouse_countable_resources returns 90000 rather than 22080.
  #     Either way p1 is resource ineligible and the status below is unchanged.
  #   p1/p2/p3 ma_patient_payment: 0 needs C-3 (8.100.7.T.1 and 8.100.7.V.3.b compute a patient
  #     payment only after the institutionalized spouse has been determined eligible). The current
  #     CO-658 returns 481.50 for p1, 1025 for p2 and 2325 for p3.
  # p3 is p2's dependent-aged adult son but is NOT a "dependent family member" under 8.100.7.T.1.c.ii,
  # which requires that the member "can be claimed by either the institutionalized or community spouse
  # as a dependent for federal income tax purposes": his $28,800 of annual earnings is far above the
  # qualifying-relative gross income test. family_members_with_community_spouse is therefore empty and
  # ma_family_allowance is 0 - the branch CO-657-T2 exercises the other way.
  # p3 living in p1's home is also the 1396p(f)(2)(B) disabled-child home-equity exception the chapter
  # does not model (OQ-92, C-20); it is inert here only because home_equity is under the limit.
  as_of: "2026-11-01"
  relationships:
    - [spouse, p1, p2]
    - [parent, p1, p3]
    - [parent, p2, p3]
  persons:
    p1:
      # Robert, 74, citizen, entered a nursing facility 2026-10-05, expects to remain; gave a nephew
      # $54,000 in 2025-06, inside the 60-month look-back (CO-252), no exception applies.
      facts:
        date_of_birth: "1952-04-18"
        sex: male
        citizenship_status: citizen
        lawful_presence_status: lawfully_present
        state_of_residence: CO
        is_pregnant: false
        is_veteran_or_active_duty: false
        is_blind: false
        is_disabled_ssa: false
        receives_ssi: false
        is_medicare_entitled_or_enrolled: true
        receives_medicare_part_a: true
        is_entitled_to_medicare_part_a_on_basis_of_disability: false
        is_employed: false
        is_disabled_for_buy_in: false
        in_medical_institution: true
        institution_entry_date: "2026-10-05"
        expects_institutional_stay_of_thirty_days: true
        meets_nursing_facility_level_of_care: true
        meets_hcbs_waiver_target_group: none
        has_income_trust: false
        family_members_with_community_spouse: []
        countable_resources_individual: 172500
        countable_resources_couple: 180000
        home_equity: 240000
        uncompensated_transfer_value_in_lookback: 54000
        transfer_was_exempt: false
        # Illustrative 2026 standards, not from the fetched text (OQ-91, OQ-81).
        csra_minimum_standard: 31584
        csra_maximum_standard: 157920
        mmmna_standard: 2705
        mmmna_cap: 3948
        home_equity_limit: 730000
        transfer_penalty_divisor: 9000
        msp_resource_limit_individual: 10000
        msp_resource_limit_couple: 15000
        is_tax_filer: true
        expects_to_be_claimed_as_dependent: false
        is_required_to_file_tax_return: true
        files_jointly_with_spouse: true
        expected_number_of_children: 0
        dependent_child_has_minimum_essential_coverage: false
        was_enrolled_in_medicaid_at_foster_care_exit: false
        age_at_foster_care_exit: 0
        mother_was_enrolled_in_medicaid_at_birth: false
        has_other_creditable_health_coverage: true
        application_date: "2026-11-02"
        attested_household_income_pct_fpl: 1.71
      month_defaults:
        social_security_income: 1900
        pension_income: 700
        earned_income: 0
        self_employment_net_income: 0
        unemployment_income: 0
        other_unearned_income: 0
        cash_assistance_income: 0
        child_support_received: 0
        in_kind_support_and_maintenance: 0
        other_taxable_income: 0
        tax_exempt_interest: 0
        foreign_earned_income_excluded: 0
        pretax_deductions: 0
        receives_va_aid_and_attendance: false
        va_aid_and_attendance_amount: 0
        health_insurance_premiums_paid: 0
        community_spouse_income: 1100
        shelter_costs_community_spouse: 1250
    p2:
      # Linda, 69, citizen, community spouse at home; $1,100 Social Security, Medicare Part A,
      # $7,500 in her own name (the rest of the couple's $180,000 is in Robert's name and the CSRA
      # has not yet been transferred under 8.100.7.M.3).
      facts:
        date_of_birth: "1957-01-09"
        sex: female
        citizenship_status: citizen
        lawful_presence_status: lawfully_present
        state_of_residence: CO
        is_pregnant: false
        is_veteran_or_active_duty: false
        is_blind: false
        is_disabled_ssa: false
        receives_ssi: false
        is_medicare_entitled_or_enrolled: true
        receives_medicare_part_a: true
        is_entitled_to_medicare_part_a_on_basis_of_disability: false
        is_employed: false
        is_disabled_for_buy_in: false
        in_medical_institution: false
        expects_institutional_stay_of_thirty_days: false
        meets_nursing_facility_level_of_care: false
        meets_hcbs_waiver_target_group: none
        has_income_trust: false
        family_members_with_community_spouse: []
        countable_resources_individual: 7500
        countable_resources_couple: 180000
        home_equity: 240000
        uncompensated_transfer_value_in_lookback: 0
        transfer_was_exempt: false
        csra_minimum_standard: 31584
        csra_maximum_standard: 157920
        mmmna_standard: 2705
        mmmna_cap: 3948
        home_equity_limit: 730000
        transfer_penalty_divisor: 9000
        msp_resource_limit_individual: 10000
        msp_resource_limit_couple: 15000
        is_tax_filer: true
        expects_to_be_claimed_as_dependent: false
        is_required_to_file_tax_return: true
        files_jointly_with_spouse: true
        expected_number_of_children: 0
        dependent_child_has_minimum_essential_coverage: false
        was_enrolled_in_medicaid_at_foster_care_exit: false
        age_at_foster_care_exit: 0
        mother_was_enrolled_in_medicaid_at_birth: false
        has_other_creditable_health_coverage: true
        application_date: "2026-11-02"
        attested_household_income_pct_fpl: 1.71
      month_defaults:
        social_security_income: 1100
        pension_income: 0
        earned_income: 0
        self_employment_net_income: 0
        unemployment_income: 0
        other_unearned_income: 0
        cash_assistance_income: 0
        child_support_received: 0
        in_kind_support_and_maintenance: 0
        other_taxable_income: 0
        tax_exempt_interest: 0
        foreign_earned_income_excluded: 0
        pretax_deductions: 0
        receives_va_aid_and_attendance: false
        va_aid_and_attendance_amount: 0
        health_insurance_premiums_paid: 0
        community_spouse_income: 1100
        shelter_costs_community_spouse: 1250
    p3:
      # Daniel, 34, citizen, SSA-disabled, lives with his mother, works for $2,400 a month, enrolled
      # in the Buy-In for Working Adults with Disabilities. No Medicare.
      facts:
        date_of_birth: "1992-08-23"
        sex: male
        citizenship_status: citizen
        lawful_presence_status: lawfully_present
        state_of_residence: CO
        is_pregnant: false
        is_veteran_or_active_duty: false
        is_blind: false
        is_disabled_ssa: true
        receives_ssi: false
        is_medicare_entitled_or_enrolled: false
        receives_medicare_part_a: false
        is_entitled_to_medicare_part_a_on_basis_of_disability: false
        is_employed: true
        is_disabled_for_buy_in: true
        in_medical_institution: false
        expects_institutional_stay_of_thirty_days: false
        meets_nursing_facility_level_of_care: false
        meets_hcbs_waiver_target_group: none
        has_income_trust: false
        family_members_with_community_spouse: []
        countable_resources_individual: 4200
        countable_resources_couple: 4200
        home_equity: 0
        uncompensated_transfer_value_in_lookback: 0
        transfer_was_exempt: false
        csra_minimum_standard: 31584
        csra_maximum_standard: 157920
        mmmna_standard: 2705
        mmmna_cap: 3948
        home_equity_limit: 730000
        transfer_penalty_divisor: 9000
        msp_resource_limit_individual: 10000
        msp_resource_limit_couple: 15000
        is_tax_filer: true
        expects_to_be_claimed_as_dependent: false
        is_required_to_file_tax_return: true
        files_jointly_with_spouse: false
        expected_number_of_children: 0
        dependent_child_has_minimum_essential_coverage: false
        was_enrolled_in_medicaid_at_foster_care_exit: false
        age_at_foster_care_exit: 0
        mother_was_enrolled_in_medicaid_at_birth: false
        has_other_creditable_health_coverage: false
        application_date: "2026-11-02"
        attested_household_income_pct_fpl: 1.80
      month_defaults:
        social_security_income: 0
        pension_income: 0
        earned_income: 2400
        self_employment_net_income: 0
        unemployment_income: 0
        other_unearned_income: 0
        cash_assistance_income: 0
        child_support_received: 0
        in_kind_support_and_maintenance: 0
        other_taxable_income: 0
        tax_exempt_interest: 0
        foreign_earned_income_excluded: 0
        pretax_deductions: 0
        receives_va_aid_and_attendance: false
        va_aid_and_attendance_amount: 0
        health_insurance_premiums_paid: 0
        community_spouse_income: 0
        shelter_costs_community_spouse: 0
  expect:
    p1:
      ma_is_institutionalized: true
      ma_ltc_couple: true
      ma_ltc_gross_income: {"2026-11": 2600}
      ma_meets_special_income_group: {"2026-11": true}
      ma_csra: 157920
      ma_institutionalized_spouse_countable_resources: 22080
      ma_meets_ltc_resource_standard: false
      ma_home_equity_disqualifies: false
      ma_transfer_penalty_months: 6
      ma_mmmna: {"2026-11": 3143.5}
      ma_community_spouse_income_allowance: {"2026-11": 2043.5}
      ma_family_allowance: {"2026-11": 0}
      ma_ltc_eligibility_status: {"2026-11": transfer_penalty}
      ma_patient_payment: {"2026-11": 0}
      ma_ssi_related_category: {"2026-11": none}
      ma_msp_category: {"2026-11": none}
      ma_buy_in_category: {"2026-11": none}
    p2:
      ma_is_institutionalized: false
      ma_ltc_couple: false
      ma_ssi_household_size: 1
      ma_is_aged: true
      ma_ssi_countable_income: {"2026-11": 1080}
      ma_meets_ssi_income_standard: {"2026-11": false}
      ma_ssi_countable_resources: 7500
      ma_qmb_eligible: {"2026-11": true}
      ma_ssi_related_category: {"2026-11": none}
      ma_msp_category: {"2026-11": qmb}
      ma_buy_in_category: {"2026-11": none}
      ma_ltc_eligibility_status: {"2026-11": not_institutionalized_or_waiver}
      ma_patient_payment: {"2026-11": 0}
    p3:
      ma_ssi_household_size: 1
      ma_ssi_countable_income: {"2026-11": 1167.5}
      ma_ssi_related_category: {"2026-11": none}
      ma_msp_category: {"2026-11": none}
      ma_wawd_eligible: {"2026-11": true}
      ma_wawd_premium: {"2026-11": 25}
      ma_buy_in_category: {"2026-11": working_adults_with_disabilities}
      ma_ltc_eligibility_status: {"2026-11": not_institutionalized_or_waiver}
      ma_patient_payment: {"2026-11": 0}
```

### 3.2 Derivation of each expected value from the text

**Penalty period — `ma_transfer_penalty_months = 6`.** § 8.100.7.F.2.c.i (S366, `sources.md:1905`):
"The fair market value of the transferred asset, less the actual amount received, if any, shall be
divided by the average of the regions ... monthly private pay cost for Long-Term Care institution care
in the state of Colorado at the time of application." $54,000 ÷ $9,000 = **6 months**, with no partial
month, so § 8.100.7.F.2.d's day arithmetic (C-6) is not engaged. Under § 8.100.7.F.2.c.ii the period
begins on the later of the first day of the month after the transfer (2025-07-01) and the date p1 would
otherwise have become eligible (2026-11-01), i.e. 2026-11-01 through 2027-04-30; the determination
month falls inside it. § 8.100.7.F.2.h confirms the consequence is loss of long-term care services
specifically, which is what `ma_ltc_eligibility_status = transfer_penalty` reports.

**CSRA — `ma_csra = 157,920`.** § 8.100.7.M.1.a (`documents/D-41.md:1877`): "The total resources of the
couple but no more than the current maximum allowance". Total $180,000, maximum standard $157,920 →
**$157,920**. § 8.100.7.O.1 then attributes $180,000 − $157,920 = **$22,080** to p1, above the $2,000
individual allowance, so `ma_meets_ltc_resource_standard = false`. (Under the unfixed CO-646 the figures
are $90,000 and $90,000; the eligibility conclusion is the same, which is why this case can be added
before C-1 lands and still assert the status.)

**MMMNA — `ma_mmmna = 3,143.50`.** § 8.100.7.Q.1.a: the standard, $2,705 (itself 150% of the size-2
guideline ÷ 12: 1.5 × 21,640 ÷ 12 = $2,705.00, per G-1). § 8.100.7.Q.1.b.iii: "The excess shelter
allowance is the amount, if any, that exceeds 30% of the MMMNA" → 30% × 2,705 = $811.50; shelter
$1,250 − $811.50 = **$438.50**. Total $2,705 + $438.50 = **$3,143.50**, under the § 8.100.7.Q.4 cap of
$3,948.

**Community spouse income allowance — `ma_community_spouse_income_allowance = 2,043.50`.**
§ 8.100.7.R.2: "The MIA shall be the amount by which the community spouse's minimum monthly needs,
which is the MMMNA, exceed his/her income from sources other than the institutionalized spouse." $3,143.50
− $1,100 = **$2,043.50**. § 8.100.7.R.1 (`documents/D-41.md:1951`)'s "all income of the institutionalized spouse that could be made
available ... must be considered to have been made available" disposes of § 8.100.7.T.1.b's "actually
made available" qualifier, so no further condition applies.

**Family allowance — `ma_family_allowance = 0`.** § 8.100.7.T.1.c.ii limits family members to
"dependent children (minor or adult), dependent parents or dependent siblings of either spouse that are
residing with the community spouse **and can be claimed by either the institutionalized or community
spouse as a dependent for federal income tax purposes**." p3 lives with p2 but earns $28,800 a year and
cannot be claimed, so the group is empty and the sum is **$0**.

**Patient payment — `ma_patient_payment = 0`.** § 8.100.7.T.1 makes the deductions only "During each
month **after** the institutionalized spouse becomes Medical Assistance eligible", and § 8.100.7.V.3.b
only "Once an applicant ... has been determined eligible". p1 is inside a transfer penalty in 2026-11
and is not eligible, so no patient payment is determined: **$0**. For the record, the deduction
arithmetic once p1 is eligible would be $2,600 gross (§ 8.100.7.A.1, all income before SSI deductions)
− $75 personal needs allowance (§ 8.100.7.V.3.d.i.2, subject to C-11) − $2,043.50 MIA − $0 family
allowance − $0 premiums = **$481.50**, which is what the unfixed CO-658 reports today.

**MSP category — `ma_msp_category = qmb` for p2.** § 8.100.6.L.2 (S312, `sources.md:1700`): QMB requires
Part A entitlement, resources within the § 8.100.5.M standard, and "income at or below the percentage of
the federal poverty level for the size family as mandated for QMB", which CO-238 carries as 100%. p2's
household size is 1 under CO-604 because her spouse is in an institution (and § 8.100.7.C.2.b makes only
the individual spouse's income count from the month after they cease to live together). Countable income
$1,100 − $20 general exclusion (§ 8.100.5.H.4.a, S308) = **$1,080**, against 100% of the size-1 monthly
guideline, $15,960 ÷ 12 = **$1,330** → within the limit. Resources $7,500 ≤ the supplied $10,000 MSP
limit (§ 8.100.5.M.1's indexed $8,180 base) → **QMB**. She is not SSI-related eligible: § 8.100.6.C's
standard is the FBR, $994 (CO-235 from S319), and $1,080 exceeds it, so `ma_ssi_related_category = none`
although she is aged under § 8.100.6.A. p1 is in no MSP: countable income $2,580 is above 135% of the
guideline ($1,795.50), and QDWI (§ 8.100.6.O) requires Part A entitlement on a disability basis, which
he does not have.

**Buy-In category — `ma_buy_in_category = working_adults_with_disabilities` for p3.** § 8.100.6.P.1
(S317, `sources.md:1742`): at least 16 (34 ✓), disabled by SSA listing or a state contractor's limited
disability finding ✓, employed ✓, resources not counted ✓, and "Income must be less than or equal to
450% of FPL after income allocations and disregards ... Only the applicant's income will be considered."
Applying § 8.100.5.H.4.b's $65-plus-one-half: ($2,400 − $65) × 0.5 = **$1,167.50**, against 450% of the
size-1 monthly guideline, 4.5 × $1,330 = **$5,985** → eligible. Premium, § 8.100.6.P.1.f.iii.2: income
$1,167.50 ÷ $1,330 = **87.8% FPL**, "above 40% of FPL but at or below 133% of FPL" → **$25**, which is
also under § 8.100.6.P.1.f.i's 7.5% cap on either measure of his income ($180 of gross, $87.56 of
countable), so the cap C-16 asks for would not change the answer here. Note that if p3 later sought an
EBD or SLS waiver, § 8.100.7.B.1.c and § 8.7100.C.4.a would admit him through the Buy-In without the
300% income test — the route C-4 says CO-653 blocks.

---

## Summary for the fix round

Blocking first, then should-fix, then minor; completeness items last.

1. **C-1** — `volumes/co/medicaid/CO-646.yaml`, `volumes/co/supplied/CO-827.yaml`,
   `volumes/co/tests/cases.yaml`: set `ma_csra` to `["min", csra_maximum_standard, countable_resources_couple]`
   per § 8.100.7.M.1.a, retire or re-scope `csra_minimum_standard`, and re-expect CO-01/CO-02's p1
   (`ma_csra` 46000, attributed resources 0, resource standard true, status `eligible_institutional`).
2. **C-2** — new `volumes/co/medicaid/CO-644.yaml` (`ma_is_institutionalized_spouse`), new supplied
   `is_enrolled_in_pace`, `volumes/co/medicaid/CO-643.yaml`, `volumes/co/sources.md` (extend S354 with
   § 8.100.7.K.2.a-d): make spousal impoverishment reach HCBS and PACE couples.
3. **C-3** — `volumes/co/medicaid/CO-658.yaml`, `volumes/co/tests/cases.yaml`: gate patient payment on
   `[all, ma_is_institutionalized, ma_ltc_financially_eligible]` per § 8.100.7.T.1 / V.3.b, and assert
   `ma_patient_payment: 0` for every non-institutionalized person in CO-01 and CO-02.
4. **C-4** — `volumes/co/medicaid/CO-653.yaml`, `volumes/co/supplied/CO-821.yaml`,
   `volumes/co/sources.md` (extend S353 with § 8.100.7.B.1.a and 1.c): admit the SSI/OAP and WAwD
   Buy-In routes into HCBS without the 300%/$2,000 tests.
5. **C-5** — `volumes/co/medicaid/CO-612.yaml`: test `[not, ma_is_ssi_related_eligible] → none` before
   the `receives_ssi` branch; add the ineligible-SSI-recipient test.
6. **C-6** — `volumes/co/medicaid/CO-649.yaml`, `volumes/co/sources.md` (new S379 for
   § 8.100.7.F.2.c.ii and .d): report whole penalty months plus `ceil(30 × fraction)` days, and correct
   the `precision` claim that the text states no rounding.
7. **C-7** — `volumes/co/medicaid/CO-651.yaml`, `CO-652.yaml`, new supplied
   `transfer_penalty_period_start_date`, `open-questions.md` OQ-94: make the penalty end.
8. **C-8** — `volumes/co/medicaid/CO-652.yaml`: add the `ineligible_level_of_care` option, test the
   level of care before the setting branches, drop the `[else, "ineligible_income"]` mislabel.
9. **C-9** — `volumes/co/medicaid/CO-605.yaml`, `CO-606.yaml`, `CO-607.yaml`: carry the unused part of
   the $20 exclusion to earned income per 20 CFR 416.1124(c)(12); CO-605-T2 becomes 190.
10. **C-10** — `volumes/co/medicaid/CO-615.yaml`, `CO-616.yaml`: widen "not otherwise eligible for
    Medical Assistance" beyond `ma_is_ssi_related_eligible`, or record the narrowing as an open question.
11. **C-11** — `volumes/co/parameters/CO-251.yaml` → `volumes/co/supplied/`: the personal needs
    allowance is re-based annually, so the 2026 figure is a supplied fact under OQ-91, not a 2015
    parameter.
12. **C-12** — `volumes/co/medicaid/CO-616.yaml`: drop `is_employed`, which § 8.100.6.O.2 does not list.
13. **C-13** — new supplied `countable_resources_couple_at_snapshot`, `volumes/co/medicaid/CO-646.yaml`,
    `volumes/co/supplied/CO-801.yaml`: separate the § 8.100.7.L intake snapshot from the resources
    § 8.100.7.O.1 tests each month.
14. **C-14** — `volumes/co/medicaid/CO-641.yaml`: add `in_kind_support_and_maintenance` and
    `child_support_received` to LTC gross income, or cite the line that excludes them.
15. **C-15** — `volumes/co/medicaid/CO-601.yaml`, `CO-602.yaml`, `CO-603.yaml`: withdraw the
    `[all, x]` wrappers or give them the 42 CFR 435.530(a)/435.540(a) exception they claim to carry.
16. **C-16** — `volumes/co/medicaid/CO-619.yaml`, `CO-621.yaml`: cap the premium at 7.5% of income
    (§ 8.100.6.P.1.f.i) and record that CBwD's scale is stated as keyed by household size as well as
    income.
17. **C-17** — `volumes/co/medicaid/CO-657.yaml`: drop or qualify the 1396r-5(d)(1)(C) citation, whose
    formula differs from the § 8.100.7.T.1.c.i one implemented.
18. **C-18** — `volumes/co/open-questions.md` OQ-100: the text says institutional first; CO-652 does
    PACE first.
19. **C-19** — `volumes/co/medicaid/CO-618.yaml`, `CO-620.yaml`: conjoin `ma_meets_residency` and
    `ma_meets_citizenship_requirement` as CO-611 does.
20. **C-20** — `volumes/co/medicaid/CO-650.yaml`, new supplied
    `spouse_or_dependent_child_resides_in_home`, OQ-92: read 1396p(f)(2)'s residence test rather than
    `ma_ltc_couple`.
21. **C-21** — `volumes/co/medicaid/CO-604.yaml`: apply § 8.100.7.C.2.b's "beginning the first month
    following the month the couple ceases to live together".
22. **G-1** — new derived `ma_mmmna_standard` + parameter `ma_mmmna_applicable_pct`,
    `volumes/co/supplied/CO-829.yaml`, OQ-91: the MMMNA standard is 150% of the size-2 guideline the
    volume already carries, so it should be derived, not supplied.
23. **G-2** — `volumes/co/sources.md`: add the eleven missing excerpts listed in section 2 (§ 8.100.7.K.2,
    B.1.a/c, F.2.c.ii/d, M.1.b-c, S, R.1/R.3/R.4, Q.2, V.3.b.ii.4-8, V.3.c, B.3; § 8.7100.C.2, C.4,
    D.4).
24. **G-3 / G-4 / G-6 / G-7** — `volumes/co/medicaid/` (ids CO-644/645), new SGA parameter from
    `documents/D-58.md:71`, `volumes/co/tests/cases.yaml` (p2's `ma_is_aged`/income assertions, a
    PACE-and-HCBS-both-true test for CO-652, a hospital-plus-income-trust test for CO-642).
25. **Section 3** — `volumes/co/tests/cases.yaml`: add CO-06 verbatim from section 3.1.
