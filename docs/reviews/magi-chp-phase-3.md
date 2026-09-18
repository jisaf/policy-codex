# Policy review: Colorado volume, MAGI Medicaid and CHP+ chapter (CO-500..CO-560, CO-700..CO-708, CO-180..CO-213, CO-075..CO-093, CO-300)

Reviewer role: Medicaid policy owner and CHP+ policy owner. Read-only review at commit `29301a5`
(branch `claude/phase-2-startup-oj6e6g`) against `volumes/co/documents/D-23..D-42` and
`volumes/co/sources.md` (S161..S176, S201..S224, S241..S252). `npm run governance -- --volume co`
and `CHECK_BASE=origin/main npm run check -- --volume co` both pass at this commit; every finding
below is a policy finding, not a mechanical one — which is the point: the suite is green and the
chapter still gets the five-year bar, the 5% disregard, the minimum-essential-coverage condition
and continuous eligibility wrong.

Findings are grouped (1) correctness, (2) completeness, (3) cases. Each gives severity, item id(s),
the governing text with its document and line, what the item does, and the fix.

Where I quote a document I give `documents/D-nn.md:line`; where I quote an excerpt I give
`sources.md:line`.

---

## 1. Correctness

### 1.1 Blocking

**C-1 (blocking). CO-509 / CO-507: the five-year bar is dead code. Every qualified non-citizen
passes the citizenship requirement regardless of how long they have held status.**

`ma_meets_citizenship_requirement` (CO-509) is

```
[any, [in, citizenship_status, [citizen, us_national]],
      [all, ma_is_qualified_non_citizen, [any, ma_meets_five_year_bar, is_veteran_or_active_duty]],
      ma_is_lawfully_present,
      [<, age, ma_magi_child_age_limit], is_pregnant, [postpartum term]]
```

and `ma_is_lawfully_present` (CO-507) is

```
[any, [in, citizenship_status, [citizen, us_national]], ma_is_qualified_non_citizen,
      [=, lawful_presence_status, "lawfully_present"]]
```

`ma_is_qualified_non_citizen` is a bare disjunct of CO-507, and CO-507 is a bare disjunct of CO-509.
So for any LPR, refugee, asylee, entrant or COFA migrant, CO-509 is true by the third disjunct
before the second disjunct's five-year test is ever consulted. `ma_meets_five_year_bar` (CO-508) has
no effect on any outcome in this chapter. Nor does `is_veteran_or_active_duty`.

The text does not permit this. 42 CFR 435.406(a)(2)(ii) (S173, `sources.md:1163`) reads "The
eligibility of qualified noncitizens who are subject to the 5-year bar in 8 U.S.C. 1613 is limited
to the benefits described in paragraph (b) of this section" — i.e. emergency services only. 8 U.S.C.
1613(a) (S176, `sources.md:1200`) reads "an alien who is a qualified alien ... is not eligible for
any Federal means-tested public benefit for a period of 5 years". Colorado restates the bar at
8.100.3.G.1.g.iii (S174, `sources.md:1176`): "Be a non-citizen who entered the United States on or
after August 22, 1996 and is applying for Medical Assistance benefits **to begin no earlier than
five years after** the non-citizen's date of entry".

"Lawfully present" is not a Medicaid eligibility category in its own right for adults. In
8.100.3.G.1.g the iv/vi categories are alternative *listed* categories, each with its own
conditions, not a blanket override of iii. CO-507 collapses them.

Why it is not caught: CO-509 has six rule tests and not one of them is a qualified non-citizen
inside the bar. CO-01/CO-02's only qualified non-citizen is p2, an LPR since 1998-05-14, 28 years
past the bar.

Fix: drop `ma_is_lawfully_present` as a bare disjunct of CO-509 and put the lawful-presence
categories where the text puts them — inside the qualified/barred structure. Concretely:

```
[any, [in, citizenship_status, [citizen, us_national]],
      [all, ma_is_qualified_non_citizen,
            [any, ma_meets_five_year_bar, is_veteran_or_active_duty, entered_before_august_22_1996]],
      [all, [=, lawful_presence_status, "lawfully_present"],
            [not, ma_is_qualified_non_citizen],
            ma_lawfully_present_category_is_bar_exempt],
      [<, age, ma_magi_child_age_limit], is_pregnant, [postpartum term]]
```

and add rule tests: LPR with `qualified_status_date: "2023-06-15"`, age 34, not pregnant → expect
`false`; same person pregnant → `true` (Cover All Coloradans); same person a veteran → `true`. Also
add the 8.100.3.G.1.g.ii pre-August-22-1996 entrant arm, which no item models at all (see K-2).
If the reviewer's reading of "lawfully present" is contested, that is an OQ — but the current
derivation does not state a contested reading, it states one that makes CO-508 unreachable.

---

**C-2 (blocking). CO-545 / CO-546 / CO-547 / CO-548: the 5% disregard is applied to each category's
own standard instead of only to the highest standard the person could qualify under, and this
changes the reported category.**

42 CFR 435.603(d)(4) (S165, `sources.md:1025`; `documents/D-34.md:128`):

> a state must subtract an amount equivalent to 5 percentage points of the Federal poverty level for
> the applicable family size **only to determine the eligibility of an individual for medical
> assistance under the eligibility group with the highest income standard** using MAGI-based
> methodologies in the applicable Title of the Act, **but not to determine eligibility for a
> particular eligibility group.**

Each of CO-545/546/547/548 ends with the same disjunction, against its own standard:

```
[any, ["<=", ma_magi_household_income_pct_fpl, <this category's standard>],
      ["<=", ["-", ma_magi_household_income_pct_fpl, ma_magi_income_disregard_pct],
             <this category's standard>]]
```

Two halves of the rule are right and one is wrong:

- *Only where it makes a difference*: right. The `any` shape tests the plain ratio first and only
  falls back to the reduced ratio, which is what 8.100.4.D.1.b (S168, `sources.md:1091`) requires
  ("If the countable income is below the income threshold ... the individual is income eligible and
  the five percent (5%) disregard will not be applied"). CO-704's `precision` explains this well.
- *At the right standard*: wrong. The disregard is applied at the Children's 133%, the pregnant
  185%, the parent/caretaker 60% and the Adults 133% independently. 435.603(d)(4) permits it at
  exactly one: the highest MAGI standard in the applicable Title under which the person could be
  determined eligible.

The parent/caretaker case is where it bites. CO-547-T2 gives `ma_magi_household_income_pct_fpl:
0.63` and expects `true`: 0.63 − 0.05 = 0.58 ≤ 0.60. Under 435.603(d)(4) that is not available. The
person at 63% FPL who is 19–64, not pregnant and not Medicare-entitled could be determined eligible
under the Adults group at 133% FPL, which is the higher standard; the disregard belongs there (where
it is not needed) and not at the 60% parent/caretaker standard. The correct result for that person
is `ma_magi_category: adult`, not `parent_caretaker`. The chapter reports the wrong covered group —
and covered group is a declared outcome (CO-551, `role: outcome`).

Conversely the disregard *is* correctly available at 60% for a parent or caretaker relative who is
65+ or Medicare-entitled, because the Adults group is closed to them (435.119(b)(1),(3), S208,
`sources.md:1408`) and 60% is then the highest standard they could qualify under. Case (b) below
(the grandmother, p1) is built to pin exactly this.

Colorado's own 8.100.4.D.1.a (S168, `sources.md:1090`; `documents/D-40.md:195`) says the disregard
"will be applied for each qualifying MAGI program as the last step to determine eligibility," which
reads more permissively. But (i) "each qualifying MAGI program" most naturally means each of
Medicaid and CHP+ — the sentence's own subject is "the applicable MAGI program under title XIX
(Medicaid) **or** title XXI (CHP+)" — which is exactly 435.603(d)(4)'s "in the applicable Title of
the Act"; and (ii) a state rule cannot enlarge a federal "only ... but not" restriction. Applying
the disregard at the title-XIX high-water mark *and* at CHP+'s 260% ceiling (CO-704) is right;
applying it at every title-XIX group's own standard is not.

Fix: add one derived item and one edit to each category rule.

- New `CO-539 ma_magi_highest_income_standard_pct` (derived, rate, person-month, Uses:
  `age`, `is_pregnant`, `is_medicare_entitled_or_enrolled`, the `exists_related` dependent-child
  test, `ma_magi_income_standard_child|_pregnant|_parent_caretaker|_adult`): the greatest standard
  among the groups whose *non-income* criteria the person meets, via P40/P33:
  `[max, [if, [<, age, ma_magi_child_age_limit], ma_magi_income_standard_child, 0],
         [if, is_pregnant, ma_magi_income_standard_pregnant, 0],
         [if, <dependent-child test>, ma_magi_income_standard_parent_caretaker, 0],
         [if, <adult demographics>, ma_magi_income_standard_adult, 0]]`.
- In each of CO-545/546/547/548, gate the disregard disjunct on this category's standard being the
  highest: `["<=", ["-", pct_fpl, disregard], standard]` becomes
  `[all, [=, <this standard>, ma_magi_highest_income_standard_pct],
         ["<=", ["-", pct_fpl, disregard], <this standard>]]`.
- Rewrite CO-547-T2 to expect `false` and add the mirror test on CO-548 expecting `adult`; add a
  CO-547 test with `is_medicare_entitled_or_enrolled: true`, `date_of_birth: "1958-01-01"`,
  `pct_fpl: 0.63` expecting `true`.
- The former-foster-care group takes no income test at all (CO-549, 8.100.4.H.2.b) and the needy
  newborn none (8.100.4.G.7), so neither enters the max.

---

**C-3 (blocking). CO-547 / CO-548 / CO-085: the minimum-essential-coverage condition is attached to
the wrong category. It belongs to Adults, not to Parents and Caretaker Relatives.**

10 CCR 2505-10 8.100.4.G.3 (S203, `sources.md:1360`; `documents/D-40.md:279`) states the
parent/caretaker category's relationship condition and nothing more:

> Parents and Caretaker Relatives applying for Medical Assistance whose total household income does
> not exceed 60% of the federal poverty level (MAGI-equivalent) shall be determined financially
> eligible for Medical Assistance. **Parents or Caretaker Relatives eligible for this category shall
> have a dependent child in the household.**

The MEC condition is 8.100.4.G.4.a — under the *Adults* paragraph (S207, `sources.md:1400`;
`documents/D-40.md:297`):

> a. A dependent child living in the household of a parent or caretaker relative shall have minimum
> essential coverage, in order for the parent or caretaker relative to be eligible for Medical
> Assistance **under this category** [Adults].

The federal text is the same way round and is fetched but not excerpted: 42 CFR 435.119(c)(1)
(`documents/D-31.md:167`) — "A State may not provide Medicaid **under this section** [the adult
group] to a parent or other caretaker relative living with a dependent child if the child is under
the age specified in paragraph (c)(2) ... unless such child is receiving benefits under Medicaid,
[CHIP], or otherwise is enrolled in minimum essential coverage". 435.110 (parents and caretaker
relatives, S204) contains no such condition.

CO-547 requires the MEC:

```
[exists_related, [parent, caretaker],
   [all, [of, [P], ma_is_dependent_child], [of, [P], dependent_child_has_minimum_essential_coverage]]]
```

CO-548 (Adults) does not mention it. CO-085's own `meaning` admits the transposition: "as 10 CCR
2505-10 8.100.4.G.4.a requires in order for the parent or caretaker relative to qualify for the
Adults MAGI category, **and which this volume also reads for the Parents and Caretaker Relatives
category's dependent-child requirement**."

The error is symmetric and both halves deny or grant coverage wrongly:
- a parent at 50% FPL whose child has no coverage is denied the parent/caretaker group, which the
  rule does not condition on the child's coverage at all; and
- that same parent is admitted to the Adults group at 50% FPL, which 8.100.4.G.4.a and 435.119(c)(1)
  forbid.

Fix: in CO-547 drop the `dependent_child_has_minimum_essential_coverage` conjunct, leaving
`[exists_related, [parent, caretaker], [of, [P], ma_is_dependent_child]]`. In CO-548 add the
condition as a conjunct, in the negative-condition form 435.119(c)(1) uses:

```
[not, [exists_related, [parent, caretaker],
        [all, [<, [of, [P], age], ma_magi_child_age_limit],
              [not, [of, [P], dependent_child_has_minimum_essential_coverage]]]]]
```

Note the age: 435.119(c)(2) (`documents/D-31.md:169`) specifies "under age 19" for the MEC
condition, not the `ma_dependent_child_age_limit` of 18 that CO-544 uses, and Colorado's G.4.a
points to G.3.a (constructive presence), not to a second age. So the MEC condition sweeps children
under 19 while the category's own dependent-child test is 18/18-and-a-student. Add the source
excerpt for 435.119(c) (there is none) and restate CO-085's `meaning` to name the Adults category
only. Mirror the change in CO-552, which repeats CO-547's relationship test verbatim.

---

**C-4 (blocking). CO-555 / CO-556 / CO-554: continuous eligibility is computed and then ignored. No
outcome reads it, and the end month is 13 months long and anchored to the wrong date.**

Three separate defects in one mechanism.

*(a) It has no effect.* 42 CFR 435.926(d) (`documents/D-35.md:265`) is the operative sentence:
"A child's eligibility **may not be terminated** during a continuous eligibility period, regardless
of any changes in circumstances, unless: (1) the child attains age 19; ...". 10 CCR 2505-10
8.100.3.Q.1.a (S215, `sources.md:1492`; `documents/D-39.md:1063`): "The continuous eligibility
period applies **without regard to changes in income** or other factors that would otherwise cause
the child to be ineligible." `ma_magi_eligibility_status` (CO-554) does not reference
`ma_continuous_eligibility_applies` or `ma_child_continuous_eligibility_end_month`; neither does
CO-553, CO-551 or any category rule. Continuous eligibility is therefore inert: the month a child's
household income rises above 133% FPL, `ma_magi_category` flips to `none` and
`ma_magi_eligibility_status` to `ineligible_income`, which is the one result 435.926(d) forbids.
This is why the chapter cannot express case (b) below.

*(b) Thirteen months.* CO-556 is twelve nested `month_after` applications on `[det_month]`. Confirmed
live:

```
$ npx vite-node scripts/eval-case.ts co CO-01 ma_child_continuous_eligibility_end_month
p4 ma_child_continuous_eligibility_end_month = "2027-10"
```

With a determination month of 2026-10, the period 2026-10..2027-10 inclusive is thirteen months.
435.926(c)(1)-(2): "The length of the continuous eligibility period is 12 months ... begins on the
effective date of the individual's eligibility ... and ends after the period specified". Twelve
months beginning 2026-10 ends with 2027-09.

*(c) Wrong anchor.* 8.100.3.Q.2 (`documents/D-39.md:1085`): "The continuous eligibility period will
begin on **the first day of the month the application is received**, or from the date all criteria
are met." CO-556 uses `[det_month]`, and its `precision` says so deliberately — but
`application_date` (CO-088) already exists in this chapter and is stated on every person in CO-01.
There is no reason to use a different anchor than the rule names. 435.926(c)(2) additionally anchors
on the most recent redetermination or renewal, which needs its own fact.

*(d) It also fires for people it cannot apply to.* CO-556 is unconditional, so the engine returns
`2027-10` for p1, a 79-year-old, and for p3, a 41-year-old, though the item's `meaning` says "when
`ma_continuous_eligibility_applies`". Confirmed live above for all five persons.

Fix:
- New supplied `CO-094 continuous_eligibility_period_start_month` (month, per person; supplied by
  CBMS as the month of the determination/redetermination that opened the current CE period), or, if
  the fix round prefers to derive it, `[month_of, application_date]` per 8.100.3.Q.2.
- CO-556: `[month_before, [11 × month_after of the start month]]` — simplest is eleven
  `month_after` applications on the start month, and a note that the catalog still lacks the
  `[N] months after` form (P44 is declared in `docs/conventions.md` as implemented; CO-556/CO-560
  should use it rather than nesting, and CO-560's twelve nestings are separately reviewed at C-9).
  Test: start month 2026-10 → `2027-09`.
- New derived `CO-561 ma_child_is_in_continuous_eligibility_period` (yes/no, person-month):
  `[all, ma_continuous_eligibility_applies_at_period_start, [<, age, ma_magi_child_age_limit],
   ma_meets_residency, [month_in_range, <this month>, start, ma_child_continuous_eligibility_end_month]]`.
- CO-551 and CO-554: a child in the period is `child` / `eligible` regardless of the income test.
  In CO-554, insert `[ma_child_is_in_continuous_eligibility_period, "eligible"]` after the residency
  and emergency-only branches; in CO-551, insert
  `[[all, ma_child_is_in_continuous_eligibility_period, [not, ma_is_needy_newborn]], "child"]`
  before the `ma_is_child_category` branch.
- CO-555's `[=, ma_magi_category, "child"]` conjunct must be evaluated at the period's *start*, not
  each month, or the rule is self-defeating (the child is in the period precisely because they are
  no longer in the category).

---

**C-5 (blocking, provenance). CO-191 / CO-540 / CO-210: the Children's 133% standard and CHP+'s
142% floor leave a band of children eligible for nothing. One of the two numbers is wrong and the
regulation says where to look.**

8.100.4.G.2 (S201, `sources.md:1336`; `documents/D-40.md:274`): "Children applying for Medical
Assistance whose total household income does not exceed 133% of the federal poverty level
(MAGI-equivalent) shall be determined financially eligible ... **Refer to the MAGI-Medicaid income
guidelines chart available on the Department's website.**"

10 CCR 2505-3-110.1.E (S243, `sources.md:1234`; `documents/D-42.md:196`): "Have a household income
**greater than 142%** but not exceeding 260% of the Federal Poverty Level ... for children under the
age of 19".

Take a child at 140% FPL. Medicaid: 1.40 > 1.33, and with the disregard 1.35 > 1.33 → ineligible.
CHP+: 1.40 is not greater than 1.42 → ineligible. The child is eligible for nothing. CHIP is
designed as the tier immediately above Medicaid (42 CFR 457.310(b)(2)(i), S248, `sources.md:1285`,
excludes a child "found eligible or potentially eligible for Medicaid"), and the 142% floor is a
statement by the same agency that Medicaid for children reaches 142%. The chapter's 133% is
therefore either a stale figure or the pre-conversion floor, with the operative number on the chart
the rule incorporates by reference — which this volume has not fetched.

There is corroborating evidence inside the fetched text that the 133% is not the operative
Medicaid/CHP+ boundary: 10 CCR 2505-3-320.1.A-B (`documents/D-42.md:287,289`) set CHP+ copayments
for "families with income ... less than 101%" and "between 101% and 150%" of FPL — bands wholly
below the 142% floor § 110.1.E states. At least one of §§ 110.1.E and 320.1 is stale.

The chapter cannot resolve this from memory (and must not: the volume's provenance rule forbids it),
but it must not ship a silent coverage gap either.

Fix, in order of preference:
1. Fetch the HCPF "MAGI-Medicaid income guidelines chart" that 8.100.4.G.2 and 8.100.4.F.2.a both
   incorporate by reference, add it as a document with its own S-number, and version CO-191 from it.
   The chart is the operative source; the 133% in the CCR text is the floor the chart sits above.
2. Failing that, raise it as a blocking OQ (new OQ-63) on CO-191, CO-540, CO-210 and CO-545, stating
   the gap arithmetically as above, and add a rule test on CO-545 at `pct_fpl: 1.40` whose expected
   value the OQ names as undecided, so the gap is visible in the suite rather than hidden in it.
Do not "fix" it by lowering CO-210 to 1.33: § 110.1.E's text is unambiguous and recently amended
(47 CR 23, effective 12/30/2024, `documents/D-42.md:204`).

---

### 1.2 Should-fix

**C-6 (should-fix). CO-503 / CO-078: whose income counts is keyed on "claimed as a tax dependent"
instead of "in the household of their parent", and 8.100.4.C.1.f.iii is not modeled at all.**

42 CFR 435.603(d)(2)(i) (S164, `sources.md:1011`):

> The MAGI-based income of an individual who **is included in the household of his or her natural,
> adopted or step parent** and is not expected to be required to file a tax return ... is not
> included in household income whether or not the individual files a tax return.

(d)(2)(ii) separately excludes a tax dependent "described in paragraph (f)(2)(i)" — i.e. one claimed
by someone other than a spouse or parent — not required to file. Colorado's 8.100.4.C.1.f (S167,
`sources.md:1074`) matches, and adds a third clause the chapter omits entirely:

> iii) The income of a child or tax dependent who **does not live with their natural, adopted, or
> step parent will always count** towards the determination of their own eligibility, even if the
> child's or tax dependent's income is below the tax filing threshold.

CO-503 counts a member when `[any, [not, [of, [P], expects_to_be_claimed_as_dependent]],
[of, [P], is_required_to_file_tax_return]]`, and its `precision` says this "reads
`expects_to_be_claimed_as_dependent` as the proxy for 'is a child in a parent's household or a
claimed tax dependent'". The proxy is wrong in both directions:

- *Under-counts*: a child claimed by a parent but placed by the non-filer rules in a household where
  no parent appears has their income excluded, though (d)(2)(i)'s condition (included in the parent's
  household) is not met and 8.100.4.C.1.f.iii says it "will always count". In CO-01 this is exactly
  p5's household `[p4, p5]`: p4 is a claimed dependent whose parent p3 is not a member. Her income
  is excluded. It happens to be $0, so CO-01's `ma_magi_household_income: 0` for p5 survives — the
  error is latent in the target household, not absent from it. Designed case (b) below makes it
  outcome-determinative.
- *Over-counts*: a child living with a parent in a non-filer household who is not claimed by anyone
  has their income counted, though (d)(2)(i) excludes it.

Fix: replace the counting condition with the two clauses the text states:

```
[filter, ma_magi_household_members,
  [not, [any,
     [all, [not, [of, [P], is_required_to_file_tax_return]],
           [of, [P], ma_is_in_household_of_own_parent]],
     [all, [not, [of, [P], is_required_to_file_tax_return]],
           [of, [P], ma_is_dependent_claimed_by_non_parent]]]]]
```

with two new derived items: `ma_is_in_household_of_own_parent` (P22 over
`ma_magi_household_members`: there is a person in the group of whom this person is a child) and
`ma_is_dependent_claimed_by_non_parent` (the (f)(2)(i) test CO-500 already computes inline). Add a
CO-503 test with a claimed 17-year-old in a household containing no parent and $1,850 of earnings,
expecting the earnings to count.

Related: `is_required_to_file_tax_return` (CO-078) is a supplied yes/no, but 8.100.4.C.1.f.i.1 and
f.ii.1 state a rule about it — "Income from Title II Social Security benefits and Tier I Railroad
benefits are **excluded** when determining if a child is required to file taxes". A supplied
yes/no cannot carry that exclusion, and a worker applying the IRS threshold to gross income will get
it wrong for exactly the child who has survivor benefits. See K-9.

---

**C-7 (should-fix). CO-547 / CO-552: the spouse of a parent or caretaker relative is not covered.**

42 CFR 435.110(b) (S204, `sources.md:1368`; `documents/D-31.md:15`):

> The agency must provide Medicaid to parents and other caretaker relatives, as defined in § 435.4,
> **and, if living with such parent or other caretaker relative, his or her spouse**, whose
> household income is at or below the income standard.

CO-547 requires the applicant themselves to have a `parent` or `caretaker` edge to a dependent
child. A stepparent who has no parent edge to the child — or the spouse of a grandmother caretaker
relative, who is not a relative of the child at all — is excluded from the category, though
435.110(b) covers them expressly. (435.4's caretaker-relative definition, S205, reaches "The spouse
of such parent or relative" but only where that spouse is themselves in the enumerated relation
chain; 435.110(b)'s spouse clause is broader and independent.)

Fix: add a third arm to CO-547's relationship test with P26/P28:

```
[any, [exists_related, [parent, caretaker], [of, [P], ma_is_dependent_child]],
      [exists_related, [spouse],
         [of, [P], ma_has_dependent_child_in_household]]]
```

extracting `ma_has_dependent_child_in_household` as its own derived item (CO-547 and CO-552 both
need it, and CO-552 currently duplicates CO-547's expression verbatim). Test: p1 with a `spouse`
edge to p2, p2 with a `parent` edge to a 10-year-old, income 50% FPL → p1 expect `true`.

---

**C-8 (should-fix). CO-545 / CO-509 / CO-700: the "19th birthday in the current month" extension is
missing from all three places the texts state it.**

Three separate provisions, one rule:

- 8.100.4.G.2.a (S201, `sources.md:1338`; `documents/D-40.md:277`): "Children are eligible for
  Children's MAGI Medical Assistance **through the end of the month in which they turn 19 years
  old**."
- 8.100.3.G.1.g.viii.1 (S175, `sources.md:1185`): "Persons who are under the age of 19, **whose 19th
  birthday occurred in the current month**, who are pregnant, or who are within 12 months of the
  beginning of their postpartum period shall not be excluded ... on the basis of immigration status".
- 10 CCR 2505-3-110.1.B.5.p (S242, `sources.md:1226`; `documents/D-42.md:193`): identical wording
  for CHP+.

CO-545, CO-509 and CO-700 all use `[<, age, ma_magi_child_age_limit]` against `age` (CO-300), the
whole years completed as of the determination date. A child whose 19th birthday falls on the 3rd of
the determination month is `age: 19` from the 3rd onward and loses the category, the Cover All
Coloradans protection and CHP+ child status mid-month. Also note 8.100.4.G.1
(`documents/D-40.md:272`) — "any person who is determined to be eligible ... at any time during a
calendar month shall be eligible for benefits during the entire month" — which independently
forecloses a mid-month drop (see K-1).

Fix: new derived `ma_is_under_child_age_limit_this_month` (yes/no, person-month):
`[any, [<, age, ma_magi_child_age_limit], [=, [month_of, date_of_birth_plus_19], [det_month]]]` —
concretely `[any, [<, age, ma_magi_child_age_limit], [all, [=, age, ma_magi_child_age_limit],
[=, [month_of, [det_date]], <the month of the 19th birthday>]]]`, which needs a
`[the date [N] years after [date]]` catalog form the chapter does not have (name it P45 in the
catalog change). Read it from CO-545, CO-509 and CO-700. Test: `date_of_birth: "2007-10-20"`,
`as_of: "2026-10-01"` → expect `true`; `as_of: "2026-11-01"` → `false`.

---

**C-9 (should-fix). CO-549: Colorado extends former foster care to youth who aged out at 19, 20 or
up to 21; the item only recognises aging out at 18.**

8.100.4.H.2.a (S213, `sources.md:1466`; `documents/D-40.md:333`):

> Those individuals that were formerly in foster care under the responsibility of Colorado or Tribe
> on their **18th, 19th, 20th or up to their 21st birthday** and were receiving Medical Assistance.

CO-549 is `[all, [<, age, ma_former_foster_care_age_limit], was_foster_youth_at_eighteen,
was_enrolled_in_medicaid_at_foster_care_exit]`. `was_foster_youth_at_eighteen` is a single yes/no
about age 18. A Colorado youth who entered foster care at 19 under the state's extended foster care,
or who was in care at 20 but not at 18, fails the rule though 8.100.4.H.2.a covers them. Federal
435.150(b)(3) (S214, `sources.md:1480`) reads "upon attaining: (i) Age 18; or" — the excerpt is
truncated at "(i)", and 435.150(b)(3)(ii) (the higher-age arm) is neither excerpted nor modelled.

Fix: replace `was_foster_youth_at_eighteen` with a new supplied
`CO-095 age_at_foster_care_exit` (whole number) plus a parameter
`ma_former_foster_care_exit_age_max` (21), and test
`[all, [">=", age_at_foster_care_exit, 18], ["<=", age_at_foster_care_exit,
ma_former_foster_care_exit_age_max]]`. Keep `was_enrolled_in_medicaid_at_foster_care_exit` as is.
Fetch the rest of 435.150(b)(3) and excerpt it.

---

**C-10 (should-fix). CO-553: the citizenship disjunct is vacuous, and the consequence is that an
emergency-only person reads as "eligible for Medical Assistance" to CHP+.**

`ma_magi_is_eligible` (CO-553) is

```
[all, ma_meets_residency, [any, ma_meets_citizenship_requirement, ma_is_emergency_medicaid_only],
      [not, [=, ma_magi_category, "none"]]]
```

and `ma_is_emergency_medicaid_only` (CO-510) is `[all, ma_meets_residency,
[not, ma_meets_citizenship_requirement]]`. Given residency, the inner `[any, X, [not, X]]` is a
tautology. The whole middle conjunct reduces to `ma_meets_residency`, which the first conjunct
already states. The item is `[all, ma_meets_residency, [not, [=, ma_magi_category, "none"]]]` and
does not test citizenship at all. Confirmed live on CO-01's p3, an undocumented adult:

```
p3 ma_meets_citizenship_requirement = false
p3 ma_is_emergency_medicaid_only = true
p3 ma_magi_is_eligible = true
```

The `precision` ("True for both full and emergency-only coverage") says this is intended. It has a
substantive consequence the item does not acknowledge: 10 CCR 2505-3-120.1.B (S244,
`sources.md:1245`) excludes from CHP+ anyone who is "eligible to receive assistance under Title XIX
of the Social Security Act", and CO-705/706/707 read `ma_magi_is_eligible` for that test. A person
whose only Title XIX entitlement is emergency services under 435.406(b) is not "eligible to receive
assistance under Title XIX" in the sense 120.1.B and 457.310(b)(2)(i) mean, and treating them as
such would deny CHP+ to a pregnant or child applicant who has nothing else. It does not bite in
CO-01/CO-02 only because Cover All Coloradans gives every child and pregnant person full status.

Fix: keep CO-553 as the "has some Title XIX coverage" fact but write the derivation as what it is —
`[all, ma_meets_residency, [not, [=, ma_magi_category, "none"]]]`, with the citizenship point moved
into the `meaning` — and add a separate `ma_magi_is_fully_eligible`
(`[all, ma_meets_residency, ma_meets_citizenship_requirement, [not, [=, ma_magi_category, "none"]]]`)
for CO-705/706/707 to read against 120.1.B. Add a CO-705 test: an undocumented pregnant applicant
over the Medicaid pregnant standard but inside the CHP+ prenatal band → `eligible_prenatal`.

---

**C-11 (should-fix). CO-554: emergency-only is reported before any category or income test, so a
non-citizen over every income standard is reported as emergency-eligible.**

CO-554's case order is residency → `ma_is_emergency_medicaid_only` → income/no-category. 42 CFR
435.406(b) (S173, `sources.md:1167`) grants the 440.255(c) services to non-qualified non-citizens
and barred qualified non-citizens "who **otherwise meet the eligibility requirements of the State
plan** (except for receipt of AFDC, SSI, or State Supplementary payments)". 8.100.3.G.1.g.viii.2
(S175, `sources.md:1191`) is broader on its face ("Persons requesting limited emergency medical care
only and/or reproductive care shall not be excluded on the basis of immigration status") but it is an
exception to the *immigration* criteria of 8.100.3.G.1.g, not a waiver of category and income.

As written, an undocumented Colorado resident at 400% FPL with no category is reported
`emergency_only`. The correct code is `ineligible_income`.

CO-01's p3 is not a counterexample: she is at 104.5% FPL and does hold the Adults category
(confirmed live: `ma_is_adult_category = true`), so `emergency_only` is the right answer for her
for the right reason. The bug is invisible in the target household. Designed case (a), month
2026-11, pins it.

Fix: make emergency-only conditional on otherwise meeting the requirements — either by adding
`[not, [=, ma_magi_category, "none"]]` to CO-510's derivation, or by moving the emergency-only
branch in CO-554 below the two `ma_magi_category = "none"` branches. The first is better: CO-510's
own `precision` already promises that "a person who also fails ... another requirement batch 6
models (category, income) is not 'emergency Medicaid only' under this item alone", which the
derivation does not deliver. Tests: add CO-510 and CO-554 cases at `pct_fpl: 4.00`, undocumented,
expecting `false` / `ineligible_income`.

---

**C-12 (should-fix). CO-500: `files_jointly_with_spouse` and the CCR's "if living in the home"
qualifier are both ignored, and the (f)(2)(ii)/(iii) exceptions are unmodelled (OQ-42).**

8.100.4.E.1.a.ii (S169, `sources.md:1102`) includes "The Tax-Filer's spouse **if living in the
home**"; 8.100.4.E.1.b.ii and .iv carry the same qualifier. CO-500 crosses a stated `spouse` edge
unconditionally, which its `precision` defends by analogy to `snap_household_members`. For
435.603(f)(4) (married couple *living together*, S163, `sources.md:1000`) that analogy holds. It does
not hold for a couple who do not live together: a spouse in a nursing facility, or a separated spouse
filing separately, is in the filer's household only through the joint return. `files_jointly_with_spouse`
(CO-077) exists, is stated on every person in CO-01/CO-02, and is read by nothing.

In CO-02 the household is p1 (admitted to a nursing facility on 2026-10-01, `in_medical_institution:
true`) and p2. `[p1, p2]` is the right answer there because they file jointly — but the rule reaches
it by accident.

OQ-42 acknowledges that the (f)(2)(ii) joint-filing and (f)(2)(iii) non-custodial-parent exceptions
are not modelled. I record it here as a should-fix rather than a note because the exceptions are not
rare: (f)(2)(iii) reaches every child of separated parents whose other parent claims them, which is a
large share of Colorado children's applications, and (f)(2)(ii) reaches every child of unmarried
cohabiting parents who file separately. Both change household size and therefore the FPL denominator.

Fix: (i) in CO-500, read `files_jointly_with_spouse` for the spouse term where the spouse is not
living with the person (needs a `lives_with` fact the volume does not have — see K-8); (ii) complete
OQ-42 with two new supplied facts, `lives_with_both_parents` (yes/no) and
`claimed_by_non_custodial_parent` (yes/no, whose `Supplied by` cites 435.603(f)(2)(iii)(A)-(B)'s
court-order-then-most-nights test, `documents/D-34.md:166-170`), and add them as two further arms of
CO-500's exception condition alongside the existing (f)(2)(i) arm. Designed case (a) below is built
to exercise (f)(2)(iii) and names both identifiers.

---

**C-13 (should-fix). CO-546: pregnancy-based eligibility is not locked in, though the rule says it
is, and the coverage period end is not modelled.**

8.100.4.G.5 (S209, `sources.md:1426`):

> Medical Assistance shall be provided to a pregnant woman for a period beginning with the date of
> application for Medical Assistance through the last day of the month following 60 days from the date
> the pregnancy ends. **Once eligibility has been approved, Medical Assistance coverage will be
> provided regardless of changes in the woman's financial circumstances** once the income
> verification requirements are met.

CO-546 is a plain per-month test of `is_pregnant` and the income standard; the month her household's
income rises above 185% FPL, the category flips to `none`. The lock-in sentence is a substantive
protection with no item — the pregnant-woman analogue of the continuous-eligibility defect at C-4.
CO-560 computes a postpartum *end* month but nothing reads it as a coverage period either, and
CO-546's `precision` disclaims doing so.

Fix: a `ma_pregnancy_coverage_period_start_month` (supplied or `[month_of, application_date]`) and a
derived `ma_is_in_pregnancy_coverage_period` spanning that month through
`ma_postpartum_coverage_end_month`, read by CO-551/CO-554 the same way C-4's new item is. Carry
OQ-52's 60-day/12-month conflict on the new item.

---

**C-14 (should-fix). CO-707: the `ineligible_income` branch is a catch-all that misreports residency
and citizenship failures.**

CO-707's case order is: eligible_child → eligible_prenatal → medicaid-eligible → other coverage →
`[[any, chp_is_child, is_pregnant], "ineligible_income"]` → else `ineligible`. A child who is a
Wyoming resident, or whose immigration status fails, reaches the fifth branch and is reported
`ineligible_income`, though 110.1.D (residency, S243, `sources.md:1232`) and 110.1.B are what they
failed and their income may be squarely in the band. The `meaning` says `ineligible` covers "failing
residency/citizenship", which the order prevents.

Fix: insert two branches before the income catch-all:
`[[not, ma_meets_residency], "ineligible_residency"]` and
`[[not, ma_meets_citizenship_requirement], "ineligible_status"]`, adding both options to the
enumeration. Test: `state_of_residence: "WY"`, child, `pct_fpl: 2.00` → `ineligible_residency`.

---

**C-15 (should-fix). CO-558 / CO-559: Medicaid presumptive eligibility uses the verified computed
income while CHP+ presumptive eligibility uses the attested figure, for the same kind of
determination.**

8.100.4.F.2.b (S219, `sources.md:1552`): "a child under the age of 19 shall have a **declared**
household income that does not exceed 133% of federal poverty level (MAGI-equivalent)"; F.2.a for a
pregnant applicant is "**declare** that her household's income shall not exceed 185%". 10 CCR
2505-3-170.1.A is the same word ("declared"). `attested_household_income_pct_fpl` (CO-092) exists for
precisely this and is read by CO-708 (CHP+) — but CO-558 and CO-559 read
`ma_magi_household_income_pct_fpl` (CO-504) instead, defended in an `assumption` and OQ-54 on the
ground that this volume's income facts "are themselves applicant-stated". That reasoning would apply
equally to CO-708, which does not follow it. Two presumptive-eligibility rules from the same pair of
regulations should not read two different income facts.

Fix: point CO-558 and CO-559 at `attested_household_income_pct_fpl`, retire the OQ-54 assumption on
them, and keep the disregard off (that part of the `assumption` is right: 435.1102(a) and 435.1103(a),
S220/S221, key on "the income standard established by the State under § 435.118(c)/§ 435.116(c)",
which is the standard, not the standard plus a disregard). Update CO-01's `attested_household_income_pct_fpl`
values, which are all `0` and would then make every adult presumptively eligible if a category rule
ever read them — see 3.3.

---

### 1.3 Items I checked and believe are right, where the point is subtle

**CO-501 (MAGI family size), the pregnant count.** 42 CFR 435.603(b) (S161, `sources.md:969`) gives
the state an option for *other* household members: "In the case of determining the family size of
other individuals who have a pregnant woman in their household, the pregnant woman is counted, at
State option, as either 1 or 2 person(s) or as herself plus the number of children she is expected to
deliver." Colorado elected the third at 8.100.4.E.2 (S170, `sources.md:1127`): "When a household
includes a pregnant woman, **regardless of the Medical Assistance category**, the pregnant woman is
counted as herself plus the number of children she is expected to deliver." CO-501 applies the
addition to every pregnant member for every household member's family size, and its `precision` cites
that election. Correct, and the "regardless of the Medical Assistance category" clause is the right
authority for it — not 435.603(b) alone.

**CO-551's category order.** The ordering (needy newborn, child, pregnant, parent/caretaker, former
foster care, adult) is right, but CO-548's `precision` states the wrong reason for it. It says
"435.150(b)(2) instead makes Former Foster Care itself conditional on not being eligible under
435.110-435.145 (the mandatory groups **including Adults**)". 435.150(b)(2) (S214,
`sources.md:1478`) reads "Are not eligible and enrolled for mandatory coverage under §§ 435.110
through 435.118 or §§ 435.120 through 435.145" — the two ranges are written to *skip* § 435.119, the
adult group. So former foster care is *not* displaced by adult-group eligibility, which is why it
must be checked before Adults (as CO-551 does) and after the child, pregnant and parent/caretaker
groups (as CO-551 does). The order is correct; the stated rationale inverts the reason. Fix the
`precision` text on CO-548 and the `rationale` on CO-549. This matters for designed case (b): a
24-year-old former foster youth at 316% FPL takes the former-foster-care category with no income
test, and a former foster youth at 50% FPL still takes former foster care rather than Adults.

**CO-502's income composition.** Counting Social Security in full is right and non-obvious:
8.100.4.C.1.b.xi and c.iii (S166, `sources.md:1046,1060`) list "Social Security (SSA) income" as
unearned income *and* "Social Security Title II Benefits (Old Age, Disability and Survivor's
benefits)" as additional income included in MAGI, and 435.603(e)'s reference to 26 U.S.C.
36B(d)(2)(B) adds back the untaxed portion. CO-01's p1 at $1,420 SSA + $610 pension = $2,030 is right.
Tax-exempt interest and excluded foreign earned income as separate add-backs (CO-081, CO-082) match
8.100.4.C.1.c.i-ii exactly.

**CO-704's disregard shape.** Applying the 5% disregard at CHP+'s 260% ceiling is correct and is the
one place in this chapter where 435.603(d)(4)'s "highest income standard ... in the applicable Title"
is honoured: for a child, CHP+ (title XXI) is the highest standard, and 10 CCR 2505-3-150.2 (S245,
`sources.md:1256`) adopts 8.100.4.D wholesale for CHP+. CO-704-T5 (2.63 → `true`) is right. The
second disjunct's *lower*-bound comparison is inert (subtracting a disregard can never help satisfy a
floor) but harmless; the `precision` explains why it is written as an alternative rather than an
unconditional subtraction, and that explanation is correct.

**CO-707's Medicaid-eligible branch before the income branch.** Right: 120.1.B (S244,
`sources.md:1245`) is a flat exclusion, and 457.310(b)(2)(i) (S248) excludes a child "found eligible
or potentially eligible for Medicaid", so a Medicaid-eligible child is reported
`ineligible_medicaid_eligible` whatever their income. CO-01's p4 and p5 are right for the right
reason.

**CO-704's band selection for a pregnant child.** 10 CCR 2505-3-50.18 (`documents/D-42.md:53`)
defines "Woman" as "a female who is **19 years in age or older**", so 110.1.F's pregnant-woman band
(>195%) does not reach a pregnant 17-year-old, who takes the child band (>142%) instead. CO-704's
`case` tests `chp_is_child` first and so lands on the child band for her — the right answer, though
by ordering rather than by modelling 50.18. CO-706 has no age floor and would be reached for a
pregnant child only if the child branch failed, which cannot happen (identical ceiling, lower floor).
Correct as it stands; state 50.18 in CO-704's and CO-706's `precision` so the next editor does not
"fix" the order.

**CO-560's postpartum end month.** 42 U.S.C. 1396a(e)(16) (S224, `sources.md:1596`): coverage runs
"ending on the last day of the month in which the 12-month period (beginning on the last day of her
pregnancy) ends". Pregnancy ending 2026-03-15 → the 12-month period ends 2027-03-14 → last day of
2027-03. CO-560-T1's `2027-03` is right. This is *not* the same arithmetic as C-4(b): the postpartum
period is measured from a date and rounded out to the end of its month (so twelve `month_after`
steps on the month of that date is correct), whereas the continuous eligibility period is measured in
whole months from a month (so twelve steps overshoots by one). Both being written as "twelve
`month_after`s" is a coincidence that hides a real difference; say so on both items.

**CO-510 / CO-554 on CO-01's p3.** `emergency_only` is the right outcome and `adult` is the right
category for an undocumented 41-year-old at 104.5% FPL with a dependent child who has MEC: she is
over the 60% parent/caretaker standard, inside the 133% Adults standard, and 8.100.3.G.1.g.viii.2
gives her emergency and reproductive care. Verified live.

### 1.4 Notes (correctness)

- **CO-541** derives `[max, ma_income_limit_parent_caretaker_pct, ma_income_limit_parent_caretaker_pct]`
  to dodge governance's `derived.alias` check. The `assumption` is honest about it, and OQ-49 records
  that 435.110(c)'s federal floor is a 1988 AFDC conversion no fetched document states. Still: a
  derivation that is a tautology to satisfy a lint is worse than an alias, because a reader cannot
  tell it from a real comparison. Prefer allowing the alias with a governance exemption keyed to
  OQ-49.
- **CO-509's postpartum term** promises in its `precision` that a person with no `pregnancy_end_date`
  is "treated as not postpartum (known false), not unknown". The value is indeed false, but the
  engine still lists the fact as missing: `p3 ma_meets_citizenship_requirement = false   missing:
  pregnancy_end_date`. Per `docs/conventions.md`'s Completeness section, a missing-fact list is what
  the approver sees; this one is noise on every non-postpartum person in every case. Guard the term
  with P4/P5 so the fact is not reported.
- **CO-556 / CO-557 / CO-560** nest `month_after`/`month_before` twelve and three deep because,
  per their rationales, "the pattern catalog has no 'N months after' operator". `docs/conventions.md`
  P44 declares exactly that form as "(P11 as stated in the catalog, now implemented)". Rewrite all
  three with P44.
- **CO-505** reads residency as `[=, state_of_residence, colorado_state_code]` and disclaims
  435.403(e)-(j). 8.100.3.B.2 (S172, `sources.md:1152`) is "a person that is living within the state
  of Colorado **and considers Colorado to be their place of residence** at the time of application",
  a two-part test (physical presence plus intent). A single `state_of_residence` enum cannot express a
  person physically in Colorado who intends to reside elsewhere. Low frequency; note only.
- **CO-544** reads `is_enrolled_in_school`, but 42 CFR 435.4 (S206, `sources.md:1388`) is "age 18 and
  a **full-time student in secondary school** (or equivalent vocational or technical training), **if
  before attaining age 19 the child may reasonably be expected to complete** such school or
  training", and CHP+ 50.6 (S241, `sources.md:1210`) is "age 18 and a full-time student, and expected
  to graduate by age 19". Neither the full-time/secondary qualifier nor the expected-to-complete
  condition is modelled; `is_enrolled_in_school` carries all three. See K-10.
- **CO-548** omits 435.119(b)(4)'s exclusion for the needy newborn and former foster care groups,
  both of which are subpart B mandatory coverage. Harmless today (a newborn is under 1 and former
  foster care is checked first in CO-551), but the item claims to state 435.119(b) and does not.

---

## 2. Completeness

### 2.1 Provisions that determine eligibility, category or amount and are represented by no item

Ranked by how often they matter for a Colorado household.

**K-1 (very frequent). 8.100.4.G.1 — whole-month eligibility.** `documents/D-40.md:272`: "For MAGI
Medical Assistance, any person who is determined to be eligible for Medical Assistance based on MAGI
at any time during a calendar month shall be eligible for benefits during the entire month." Every
outcome in this chapter is `person-month` and computed from the determination date's facts, so a
person who becomes eligible on the 20th is reported ineligible for the whole month and a person who
loses eligibility on the 3rd is reported ineligible for a month they are covered in. This governs
every mid-month change — a birthday (C-8), a pregnancy ending, a job starting. Fix: a derived
`ma_magi_eligible_any_day_in_month` or, more cheaply, a stated `Precision` convention on CO-551 and
CO-554 that the month's value is the most favourable value taken on any day in the month, plus the
rule test that pins it.

**K-2 (frequent). 8.100.3.G.1.g.ii — non-citizens who entered before August 22, 1996.** S174,
`sources.md:1175`: "Be a lawfully admitted non-citizen who **entered the United States prior to
August 22, 1996**". This is an eligibility category in its own right, independent of the five-year
bar, and no item or fact expresses it. `lpr_entry_date` exists in CO-01 (p2: `1998-05-14`) but no
Medicaid rule reads it; CO-508 reads `qualified_status_date` instead. Fix: add the arm to CO-509
(see C-1's replacement derivation) with a parameter `ma_prwora_enactment_date` (1996-08-22) and read
`lpr_entry_date` or a new `date_of_entry`.

**K-3 (frequent). 435.119(d) — the community engagement requirement on the Adults group.**
`documents/D-31.md:171`: "As of the implementation date in accordance with § 435.559, the 50 States
and the District of Columbia **must provide that eligibility under this section is subject to the
community engagement requirement** described at §§ 435.550 through 435.563" (added 91 FR 33469, June
3, 2026 — i.e. in the version of the CFR this volume fetched). The Adults group is the largest MAGI
group; a condition on it is not optional detail. Nothing in this chapter references it, no source
excerpt covers 435.119(d) or 435.550-563, and `docs/conventions.md`'s own worked example uses
`medicaid_meets_community_engagement` as its illustrative identifier. Fix: fetch 435.550-435.563 and
435.559 (the implementation date), add excerpts, and add `ma_meets_community_engagement` plus the
exemption rules as a conjunct of CO-548 with an `Effective` range starting at the § 435.559
implementation date. This may be large enough to be its own batch; if so, it needs an OQ now so the
chapter does not read as complete for the Adults group.

**K-4 (frequent). 8.100.4.G.3.a — constructive "living in the home".** `documents/D-40.md:281-293`:
a dependent child "is considered to be living in the home of the parent or caretaker relative as long
as the parent or specified relative exercises responsibility for the care and control of the child
even if ... (iii) The child is in regular attendance at a school away from home; (iv) Either the
child or the relative is away from the home to receive medical treatment; (v) Either the child or the
relative is temporarily absent from the home; (vi) The child is in voluntary foster care placement
for a period not expected to exceed three months ...". CO-547's `precision` reads "living with them"
off the bare existence of a relationship edge; OQ-51 covers only the *list of relations*, not this.
The provision decides the parent/caretaker category for every household with a child at boarding
school, in hospital, or in short voluntary placement. Fix: a supplied
`exercises_care_and_control_of_child` (yes/no, per person per child, or a `persons_cared_for`-style
group) read by CO-547's relationship test, with 8.100.4.G.3.a as the `Source`.

**K-5 (frequent). CHP+ cost sharing: 10 CCR 2505-3-320 and 330.1/330.3/330.4.** `documents/D-42.md:285-380`
states a full copayment schedule by FPL band (four bands, a dozen service types each) and
`documents/D-42.md:389,393,405`: "American Indians and Alaskan Natives shall be **exempt** from cost
sharing requirements"; "No copayments shall apply to **preventive services**"; "**Prenatal Care
Program clients** shall be exempt from cost sharing requirements". The chapter carries only CO-213,
the 5% aggregate cap parameter. `docs/design-colorado.md`'s Scope puts amounts in scope
("premiums, cash grant"). OQ-60 acknowledges the copayment schedule is not modelled "as enforcement
rules", but the *exemptions* are pure eligibility-for-zero-cost-sharing rules and are not mentioned
anywhere. `is_indian_or_urban_indian` already exists on every person in CO-01. Fix: a
`chp_is_exempt_from_cost_sharing` derived item (330.1 + 330.4) and a
`chp_copayment_schedule` parameter table keyed by FPL band, both cited to the fetched § 320/§ 330
text. Rank this above the enrollment fee (K-6) because the text is fully fetched.

**K-6 (frequent, but unfetchable today). The CHP+ enrollment fee, 10 CCR 2505-3-300 — OQ-57.**
*Asked directly: does the current rule still have an enrollment fee, and what should the item be?*

What the fetched document shows: `documents/D-42.md:271-279` is the § 300 heading, its Cornell URL,
and then only the "Notes" amendment-history block — no operative text. The same fetch renders
§§ 50, 110, 120, 150, 170, 320, 330, 420 and 430 in full, and § 310 was not fetched at all (the
headings jump 300 → 320). § 300's amendment history ends at "46 CR 19, October 10, 2023, effective
10/30/2023", the same last entry as §§ 320 and 330, so the section still exists in the CCR and was
amended in 2023; this is an empty-body render, not a repealed section.

So: **the chapter cannot say whether an enrollment fee is currently charged, and must not imply
either answer.** Two pieces of fetched evidence point away from a fee being operative — § 330's
enumeration of cost-sharing rules (330.1-330.4) never mentions an enrollment fee, and § 320's
copayment bands are stated for income bands (<101%, 101-150%) that lie entirely below § 110.1.E's
142% CHP+ floor, i.e. § 320 and § 300 are of the same vintage as text § 110.1.E has since outrun.
But that is inference, not text, and 42 CFR 457.560(a) (S250, `sources.md:1306`) and 42 U.S.C.
1397cc(e)(3)(B) (S252) both still contemplate enrollment fees as a permitted CHIP charge, so the
federal text does not settle it either.

What CO-093 does: carries `chp_annual_enrollment_fee` as a supplied `money` fact whose `meaning`
asserts "The annual enrollment fee CBMS assesses for the enrollee's family under 10 CCR 2505-3-300's
fee schedule, **which varies by** the family's income ... and by the number of children enrolled."
That `meaning` states the structure of a schedule no fetched document contains, and its type asserts
that a fee exists. It is also consumed by nothing — no CHP+ item reads it — so it adds an unverified
assertion to the codex and buys nothing.

What the item should be:
1. **Remove `chp_annual_enrollment_fee` from the chapter** and rewrite OQ-57 from a rendering note
   into a blocking provenance gap: § 300's operative text must be re-fetched from the Colorado
   Secretary of State's CCR (the Cornell mirror renders the section empty) together with the HCPF
   CHP+ cost-sharing page § 300 and § 320 both implement, before any fee item is authored.
2. If the fix round wants a placeholder rather than a hole, keep the identifier but (a) restate the
   `meaning` as "the annual enrollment fee, if any, that 10 CCR 2505-3-300 imposes — the section's
   operative text has not been fetched and this volume does not assert that a fee is currently
   charged"; (b) strike the "varies by income band and number of children" sentence, which is not
   sourced; (c) mark it `verification: unverified` so governance warns on it until replaced, as
   `docs/design-colorado.md`'s Sources and provenance section provides; and (d) give it an
   `Effective` range that starts blank rather than `present`.
3. Either way, the derived rule the phase-3 brief describes (a `case` over
   `ma_magi_household_income_pct_fpl` bands with parameterised dollar amounts) must not be authored
   from memory. When § 300 is fetched, that rule plus a `chp_is_exempt_from_cost_sharing` gate
   (K-5: 330.1 and 330.4 exempt AI/AN and Prenatal Care Program clients from *all* cost sharing,
   which on § 50.4's definition includes the enrollment fee) and the CO-213 5% aggregate cap are one
   coherent sub-chapter.

**K-7 (moderate). Presumptive eligibility periods and their limits.** 42 CFR 435.1103(a) (S221,
`sources.md:1568`): "the number of presumptive eligibility periods that may be authorized for
pregnant women is **one per pregnancy**"; 10 CCR 2505-3-170.3 (`documents/D-42.md:257`): "The
presumptive eligibility period **begins on the date the applicant(s) is determined eligible and ends
with the day an eligibility determination for Medical Assistance is made**"; 170.4: a determination
within 45 days. CO-558, CO-559 and CO-708 are bare yes/no tests with no period and no once-per-
pregnancy limit, so a person can be presumptively eligible indefinitely and repeatedly. Fix:
`ma_presumptive_eligibility_period_end` / `chp_presumptive_eligibility_period_end` and a
`presumptive_eligibility_periods_used_this_pregnancy` supplied fact. 435.1101's own definitions and
435.1110 should also be excerpted; only 435.1102(a) and 435.1103(a) are (S220, S221).

**K-8 (moderate). No `lives_with` fact anywhere, though eight fetched provisions turn on it.**
435.603(f)(3) ("and, if living with the individual"), (f)(4) ("a married couple **living together**"),
8.100.4.E.1.a.ii/b.ii/b.iv ("if living in the home"), 8.100.4.E.1.d.ii-iv ("who live in the
household"), 8.100.4.E.4 (the parent living outside the household), 435.4's caretaker-relative "with
whom the child is living", 435.110(b)'s "if living with such parent", 8.100.4.G.3.a. The chapter's
answer is a convention — CO-500's `precision`: "a spouse, parent/child, or tax_filer/tax_dependent
edge being stated at all is read as living together". That convention is doing real policy work in
eight places and is wrong in at least three of them (a non-custodial parent's claim, a separated
spouse, a child in foster placement). Fix: a case-level `lives_with` relationship role, or a
per-person `household_address_id`, and read it in CO-500, CO-547 and CO-552. This is the single
change that unblocks C-7, C-12, K-4 and designed case (a).

**K-9 (moderate). 8.100.4.E.4 — a child claimed jointly by married parents one of whom lives
outside the household.** S170, `sources.md:1130`: "If a child is claimed as a tax dependent by both
parents who are married and who will file taxes jointly but one parent lives outside of the household
due to separation or pending divorce, the child's household composition is determined by non-filer
rules. **The parent living outside of the household will not be counted** as part of the household."
A fourth route into the non-filer rules, alongside the three in 8.100.4.E.1.c, and not modelled.
Needs the same `lives_with` fact as K-8.

**K-10 (moderate). 8.100.4.C.1.d's income exclusions are carried by supplied-fact convention only.**
S166, `sources.md:1064-1067`: the exclusions are lump sums outside the month received, "Scholarships,
awards, or fellowship grants used for educational purposes and not for living expenses", "Child
support received", "**Worker's Compensation**", "Supplemental Security Income (SSI)", "**Veteran's
Benefits**". CO-502 sums nine income facts and subtracts `pretax_deductions`; none of Worker's
Compensation, Veteran's Benefits or scholarships has its own fact, so each must be kept out of
`other_unearned_income` by convention. CO-01 states `receives_va_disability_benefits: false` on every
person — the fact exists, as a yes/no, and no MAGI rule reads it. A household where the grandfather
has VA benefits and the amount lands in `other_unearned_income` is over-counted with nothing to
catch it. Fix: either name the exclusions as their own supplied facts and subtract them in CO-502, or
state the exclusion list in CO-502's `Precision` *and* add a rule test per excluded type that pins
the convention. Also model 8.100.4.C.1.b.v's alimony rule, which turns on whether the divorce was
executed or modified on or after 2019-01-01 — a genuine date-conditioned countability rule with no
item and no fact.

**K-11 (low, but decides cases). 435.603(f)(5) — dependency that cannot be reasonably established.**
`documents/D-34.md:188`: "if ... a taxpayer cannot reasonably establish that another individual is a
tax dependent of the taxpayer for the tax year in which Medicaid is sought, the inclusion of such
individual in the household of the taxpayer is determined in accordance with paragraph (f)(3)" —
a fifth route to the non-filer rules, and the one that (f)(1) is expressly "subject to". No item, no
fact.

**K-12 (low). 435.603(h)(2)-(3) — the budget period and reasonably predictable changes.**
`documents/D-34.md:198-200`. CO-502/CO-503 are current-monthly, which matches (h)(1) for applicants.
The (h)(2) projected-annual election for current beneficiaries and the (h)(3) predictable-change
method are state elections that change the income figure and are not stated (not even as "Colorado
has not elected them", which is what the codex should say).

**K-13 (low). 435.603(i) — the 26 CFR 1.36B-1(e) fallback.** `documents/D-34.md:204`: where MAGI
household income makes a person financially ineligible but their 1.36B-1(e) household income is
below 100% FPL, eligibility is determined on the latter. A real second computation with no item.

**K-14 (low). 435.603(j) — groups MAGI methods do not apply to.** `documents/D-34.md:206-214`:
individuals 65 or older where age is a condition, blind/disabled, LTC applicants, MSP applicants.
CO-01's p1 and p2 (79 and 81, entering nursing care) are run through the MAGI income rules and
reported `ineligible_no_category`, which is a correct *MAGI* answer, but the chapter should state
that MAGI methods do not reach their actual eligibility basis, so the phase-4 handoff is unambiguous.

**K-15 (low). 8.100.4.G.4.b — the COVID-19 testing-only limited benefit.** `documents/D-40.md:299`:
an applicant not otherwise eligible but exposed to COVID-19 "may be eligible to receive services for
COVID-19 testing only ... must satisfy residency and immigration or citizenship status and not be
enrolled in other health insurance". A coverage category with three stated conditions and no item.
Probably spent, but the codex should say so with an `Effective` range rather than be silent.

**K-16 (low). 8.100.3.Q.2.a-d — the programs continuous eligibility attaches to, and the
recategorisation rule.** `documents/D-39.md:1087-1099`: CE applies to MAGI-Medical Assistance
(8.100.4.G.2), SSI Mandatory, Long-Term Care and the Medicaid Buy-In, and "When a child is no longer
eligible for SSI Mandatory they will be **categorized as eligible within the MAGI-Child category for
the remainder of the eligibility period**". CO-555's restriction to `ma_magi_category = "child"`
tracks Q.2.a, which is *narrower* than 435.926(b)(2)'s "eligible and enrolled for mandatory or
optional coverage under ... subpart B or C" — so a pregnant 17-year-old or a needy newborn gets
federal CE that Colorado's list omits. Flag as an OQ on CO-555 (Colorado's enumerated-programs list
versus the federal any-group rule), and note the Q.2.b-d recategorisation rules for phase 4.

**K-17 (low). 10 CCR 2505-3-420.1-2 and 120.2.** `documents/D-42.md:415,417,223`: "If one eligible
child from a family is enrolled ... all eligible children in that family must be enrolled"; "All
eligible children in a family must be enrolled in the same MCO"; "The Department shall not require
that applicants be uninsured for any period of time". The first is arguably an eligibility rule
(family-level enrolment), the third is a negative rule worth stating so a future editor does not add
a waiting period. Both unrepresented.

### 2.2 Supplied facts whose meaning is doing policy work that should be a rule

**S-1. `is_required_to_file_tax_return` (CO-078).** The fact answers a legal question (26 U.S.C.
6012(a)(1)) *as modified by the Colorado rule*: 8.100.4.C.1.f.i.1 and f.ii.1 (S167,
`sources.md:1077,1080`) — "Income from Title II Social Security benefits and Tier I Railroad benefits
are excluded when determining if a child is required to file taxes." A worker applying the IRS
threshold to a child's gross income including survivor benefits will answer this fact wrongly, and
the codex has nowhere to catch it. Fix: keep the fact for the genuinely external part (the filing
threshold) but add a parameter `ma_tax_filing_threshold_earned` /
`ma_tax_filing_threshold_unearned` (versioned yearly) and derive
`ma_child_is_required_to_file` from the person's MAGI income *less* `social_security_income` and Tier I
railroad benefits, so the Colorado exclusion is a rule. CO-503 should read the derived fact.

**S-2. `dependent_child_has_minimum_essential_coverage` (CO-085).** The `meaning` carries the
category-attachment error (C-3) and the fact carries the whole of 42 CFR 435.4's minimum-essential-
coverage definition (26 U.S.C. 5000A(f)). 435.119(c)(1) names the common cases in the text —
"receiving benefits under Medicaid, [CHIP], or otherwise is enrolled in minimum essential coverage" —
and the first two are facts this chapter already derives (`ma_magi_is_eligible`, `chp_child_is_eligible`).
The `rationale` declines to derive it to avoid circularity through the shared household. That
concern is real but narrower than stated: the child's *own* category does not depend on the parent's,
so `[any, [of, [P], ma_magi_is_eligible], [of, [P], chp_child_is_eligible],
[of, [P], has_other_creditable_health_coverage]]` is acyclic for the MEC test as 435.119(c)(1) words
it. Fix: derive it that way, keeping a supplied `has_other_minimum_essential_coverage` for
employer/marketplace coverage only.

**S-3. `is_enrolled_in_school` (CO-544's input).** Carries three conditions (full-time, secondary or
equivalent vocational/technical, reasonably expected to complete before 19) that 435.4 (S206) and
CHP+ 50.6 (S241) state as separate tests. Fix: `is_full_time_secondary_student` plus
`expected_to_complete_school_before_age_19`, both read by CO-544.

**S-4. `lawful_presence_status` (CO-084).** A three-option enum standing in for the whole of
8.100.3.G.1.g.iv/.vi — which `documents/D-42.md:120-190` shows for CHP+ is roughly thirty
enumerated statuses, several with their own conditions (paroled "for at least one year"; a TPS
applicant "granted employment authorization"; an asylum applicant "under the age of 14 and has had
an application pending for at least 180 days"). OQ-44 records the modelling choice but not its cost:
because CO-509 reads the enum as a bare disjunct, the enum's meaning *is* the five-year-bar rule
(C-1). Fix: whatever is done about C-1, the bar-exempt subset must be a rule over a status
enumeration, not a single `lawfully_present` value.

**S-5. `attested_household_income_pct_fpl` (CO-092).** A pre-computed ratio, so the household size,
the FPL table and the division are all inside a supplied fact. For a *declared* figure that is
defensible, but the declared figure an applicant actually gives at a PE site is a dollar amount and a
household count. Fix: `attested_household_income` (money) and `attested_household_size` (whole
number), with the ratio derived from `ma_poverty_guideline_table` — which also makes the PE rules
version with the FPL table.

**S-6. `mother_was_enrolled_in_medicaid_at_birth` (CO-087).** Carries 435.117(b)(1)(i)'s
"regardless of whether payment for services for the mother is limited to services necessary to treat
an emergency medical condition" (S212, `sources.md:1458`) — i.e. an emergency-only mother's newborn
*is* a deemed newborn. That is a substantive rule hidden in a yes/no, and it is the rule that decides
the CO-01 newborn (see 3.3). Fix: state it in the `precision` at minimum; better, derive the fact
from the mother's `ma_magi_eligibility_status` in the birth month where the mother is in the case.

**S-7. `was_foster_youth_at_eighteen`.** See C-9: the identifier's *name* is the policy error.

---

## 3. Cases

### 3.1 CO-01 and CO-02, recomputed by hand

2026 FPL (CO-181): 1 → $15,960; 2 → $21,640; 3 → $27,320; 4 → $33,000; 5 → $38,680. Monthly:
1 → $1,330.00; 2 → $1,803.33; 3 → $2,276.67; 4 → $2,750.00; 5 → $3,223.33.

**p1 (grandmother, 79, citizen, Medicare).** `is_tax_filer: true`,
`expects_to_be_claimed_as_dependent: false` → 435.603(f)(1)/8.100.4.E.1.a: the filer, the spouse, and
everyone she claims. She claims nobody. Household `[p1, p2]`, size 2 (no pregnant member). Income:
p1 $1,420 SSA + $610 pension = $2,030 (8.100.4.C.1.b.xi and c.iii both count Title II); p2 $1,180
SSA. Neither is a claimed dependent, so both count: **$3,210**. Ratio 3,210 / 1,803.33 = **1.7800**.
Category: not under 19; not pregnant; parent/caretaker — her only parent edge is to p3, aged 41, not a
dependent child → no; former foster care → no; Adults — 79 ≥ 65 → no. **`none`**. Status: resident;
citizenship met; `ma_meets_some_category_demographics` — every prong fails (over 19, not pregnant, no
dependent child, 65+ and Medicare-entitled, no foster history, not an infant) → **`ineligible_no_category`**.
CE: not under 19 → **false**. CHP+: not a child, not pregnant → **`ineligible`**.
Every expectation matches, and matches the law. (Her real eligibility basis is 8.100.5/8.100.7
long-term care — phase 4 — and 435.603(j)(2),(4) says MAGI methods do not reach it: K-14.)

**p2 (grandfather, 81, LPR since 1998, Medicare).** Same household, size, income, ratio. Category
`none`, status `ineligible_no_category`, CE false, CHP+ `ineligible`. Matches.
Citizenship is `true` and should be: an LPR whose qualified status dates from 1998-05-14 is 28 years
past 8 U.S.C. 1613(a)'s five years. But the case cannot distinguish the right reason from the wrong
one — C-1's bug gives `true` for any LPR — so **CO-01 does not test the five-year bar at all.**

**p3 (mother, 41, undocumented, earns $2,380).** Filer, not claimed → household `[p3, p4, p5]`
(claims both), size 3, no pregnancy. Income: p3 $2,380 counts; p4 and p5 are claimed dependents not
required to file → excluded under 435.603(d)(2)(i). **$2,380**. Ratio 2,380 / 2,276.67 = **1.04539**.
Category: not a child; not pregnant; parent/caretaker — p4 is her child, aged 17, so a dependent
child under 435.4, and `dependent_child_has_minimum_essential_coverage: true`; income 104.5% > 60%,
and the disregard cannot rescue her (99.5% > 60%) and, under C-2, is not available at that standard
anyway → **no**; former foster care no; Adults — 41 is 19–64, not pregnant, no Medicare, no earlier
category, 104.5% ≤ 133% → **yes**. Category **`adult`**. Citizenship: undocumented, not under 19, not
pregnant, no postpartum → **false**; resident → `ma_is_emergency_medicaid_only` **true** → status
**`emergency_only`**. CE false. CHP+ `ineligible` (not a child, not pregnant).
Every expectation matches, and — for this household's numbers — matches the law: 435.406(b)'s
"otherwise meet the eligibility requirements" is satisfied because she does hold the Adults category.
The case does *not* test what happens when she does not (C-11).

**p4 (granddaughter, 17, citizen, in school, mother of p5).** Claimed by p3, who is her parent, so no
435.603(f)(2) exception applies → her household *is* p3's: `[p3, p4, p5]`, size 3, income $2,380,
ratio 1.04539. Category: under 19 and 104.5% ≤ 133% → **`child`** (needy newborn checked first: she is
17). Status **`eligible`**. CE: under 19, category child, resident → **true**. CHP+: Medicaid-eligible
→ **`ineligible_medicaid_eligible`**. All match the law.
Two things the case does not exercise: her 12-month CE period has no effect on any outcome (C-4a),
and `ma_child_continuous_eligibility_end_month` returns 2027-10 — thirteen months (C-4b).

**p5 (great-grandson, 8 months, citizen).** Claimed by p3, his **grandparent** — "other than a spouse
or child" in 435.603(f)(2)(i) / "someone other than a spouse, biological, adoptive or step parent" in
8.100.4.E.1.c.i → non-filer rules. Non-filer household: himself; spouse (none); his own children under
19 (none); and, being under 19, his parents and siblings under 19 living with him → p4. **`[p4, p5]`**,
size 2. Income: under the item as written, p4 is a claimed dependent not required to file → excluded,
p5 likewise → **$0**, ratio 0. *Under the text*, p4's income is not excludable here: 435.603(d)(2)(i)
excludes a person "included in the household of his or her natural, adopted or step parent", and p4's
parent p3 is not a member of this household; (d)(2)(ii) reaches only dependents described in
(f)(2)(i), which p4 is not; and 8.100.4.C.1.f.iii says a child not living with their parent's income
"will always count". p4 earns $0, so the expected `0` is right by luck (C-6). Category: needy newborn
— under 1, but `mother_was_enrolled_in_medicaid_at_birth: false` → no; child — under 19, 0 ≤ 133% →
**`child`**. Status **`eligible`**, CE **true**, CHP+ **`ineligible_medicaid_eligible`**. Expectations
match the items; see 3.3 on whether the newborn fact is plausible.

**CO-02 (as_of 2026-11-01).** Every Medicaid and CHP+ figure is identical and I recompute it
identically: p1's admission does not change the MAGI households (the couple files jointly, and
435.603(f)(1)/(f)(4) put each spouse in the other's household), and no income changed. All twenty
Medicaid/CHP+ expectations match.
One data inconsistency: CO-02's `relationships` drops `[parent, p1, p3]` and all four `grandparent`
edges that CO-01 states for the same five people. It changes no expectation here (p3 is 41, so p1's
parenthood of her never mattered, and p5's non-filer household is reached through
`expects_to_be_claimed_as_dependent` plus the `tax_filer` edge, not the grandparent edge). But the
two cases are the same household a month apart and should not disagree about who is whose parent —
and if C-7's spouse-of-caretaker arm is added, or K-8's `lives_with`, the divergence starts to matter.
Fix: restore the five edges in CO-02.

### 3.2 Summary: does the law give the expected value?

| person | outcome | expected | law gives | note |
|---|---|---|---|---|
| p1 | category / status | `none` / `ineligible_no_category` | same | right |
| p2 | category / status | `none` / `ineligible_no_category` | same | right, but bar untested (C-1) |
| p3 | category / status | `adult` / `emergency_only` | same | right; C-11 latent |
| p4 | category / status / CE | `child` / `eligible` / true | same | right; C-4 latent |
| p5 | household / income | `[p4, p5]` / 0 | `[p4, p5]` / 0 | right; C-6 latent (p4 earns 0) |
| p5 | category | `child` | `needy_newborn` if the mother was enrolled | see 3.3 |
| p4, p5 | CHP+ | `ineligible_medicaid_eligible` | same | right |
| p1, p2, p3 | CHP+ | `ineligible` | same | right |

Not one Medicaid or CHP+ expectation in CO-01 or CO-02 is wrong. What is wrong is how little they
cover: the target household exercises none of C-1, C-2, C-3, C-4, C-5, C-6, C-7, C-11 or C-14, every
one of which is a defect in a rule the case does run.

### 3.3 Facts set only to make the rules resolve

- **`mother_was_enrolled_in_medicaid_at_birth: false` on p5 contradicts the rest of the case.** p5
  was born 2026-02-03 to p4, a 17-year-old U.S. citizen in a household at 104.5% FPL who is Medicaid-
  eligible as a child in October 2026 on facts that did not change. 435.117(b)(1)(i) (S212) deems a
  newborn whose mother "was eligible for and received covered services" at the birth — "including
  during a period of retroactive eligibility under § 435.915" and "regardless of whether payment for
  services for the mother is limited to ... an emergency medical condition" — and 8.100.4.G.7 (S211)
  adds that retroactive coverage of the birth counts. On this case's own facts p5 is almost certainly
  an Eligible Needy Newborn, in which case `ma_magi_category` is **`needy_newborn`**, not `child`, and
  he is continuously eligible for one year without an income test. Fix: set the fact `true` and change
  p5's expected category to `needy_newborn` (which also makes CO-550 and CO-551's first branch live in
  the target household, where today they are exercised only by rule tests), or add a comment stating
  why the mother was not enrolled in February 2026.
- **`attested_household_income_pct_fpl: 0` on all five persons.** Set to a value no one attested; it
  is read only by CO-708, and only for children and pregnant applicants, so today it is inert. Once
  C-15 points CO-558/CO-559 at it, `0` will make p1, p2 and p3 look presumptively eligible. Fix: set
  it to each person's own household ratio (p1/p2 1.78, p3/p4 1.05, p5 0.00), or leave it unstated so
  the engine reports it missing.
- **`dependent_child_has_minimum_essential_coverage`** is `false` on p1, p2 and p5 and `true` on p3
  and p4. Per CO-085 the fact belongs on the *child's* record, so p5's `false` is the operative value
  for p4-as-parent and p4's `true` for p3-as-parent — but p3's own `true` and p1/p2's `false` are
  values about persons who are not dependent children at all. Harmless today; it will not be once C-3
  moves the condition to CO-548 and CO-548 starts reading it through `exists_related`. Fix: state the
  fact only on dependent children, and set p5's to `true` (he is Medicaid-eligible), which is what
  makes p4 a valid parent under the corrected CO-547/CO-548.
- **`expected_number_of_children: 0` with `is_pregnant: false`** on all five: consistent, and CO-501's
  pregnant term is therefore never exercised by a case, only by CO-501-T2. Designed case (a) fixes this.
- **No 2027 FPL version.** CO-181 has a single version `from: 2026-01-01`. Any case whose determination
  date falls in 2027 — including designed case (b) — silently reuses the 2026 guideline.
  `docs/design-colorado.md`'s Versioning section promises "The federal poverty guidelines are one
  parameter table with yearly versions". Fix: add the 2027 version when ASPE publishes it, and until
  then say so on CO-181 so a 2027 case is not mistaken for a priced one.

### 3.4 Two further cases the fix round should add

Both are worked from the 2026 FPL table above. Where an identifier does not exist I name it; every
such gap is one of C-12, K-8, C-4 or C-9.

---

#### CO-06 — pregnant lawfully present non-citizen inside the five-year bar; a stepparent filing jointly; one child claimed by a non-custodial parent; one child aged 18 in school

Design intent: exercise 435.603(f)(2)(iii) and the non-filer rules for one child while the other stays
under the (f)(2) basic rule; exercise the pregnant count in three different household sizes; exercise
the parent/caretaker test through a stepparent (C-7); exercise the five-year bar where Cover All
Coloradans does *not* rescue the person (p2) beside a person where it does (p1); and, in a second
month, exercise CHP+ prenatal and child eligibility and C-11's emergency-only ordering.

Both adults adjusted status together on 2023-06-15, so both are three years into the bar.

```yaml
- id: CO-06
  title: Pregnant LPR inside the five-year bar; stepparent filing jointly; a child claimed by a non-custodial parent; an 18-year-old in school
  as_of: "2026-10-01"
  relationships:
    - [spouse, p1, p2]
    - [parent, p1, p3]
    - [parent, p1, p4]
    - [parent, p2, p3]        # step-parent; 8.100.4.E.1.d.iv counts step parents
    - [parent, p2, p4]        # step-parent
    - [parent, p5, p4]        # non-custodial father, does NOT live in the household
    - [tax_filer, p1, p3]
    - [tax_filer, p5, p4]
  persons:
    p1:                        # Maria, 29, LPR since 2023-06-15, pregnant with one, earns 1600
      facts:
        date_of_birth: "1997-02-11"
        sex: female
        citizenship_status: lawful_permanent_resident
        qualified_status_date: "2023-06-15"
        lpr_entry_date: "2023-06-15"
        lawful_presence_status: lawfully_present
        state_of_residence: CO
        is_tax_filer: true
        expects_to_be_claimed_as_dependent: false
        is_required_to_file_tax_return: true
        files_jointly_with_spouse: true
        is_pregnant: true
        expected_number_of_children: 1
        is_medicare_entitled_or_enrolled: false
        is_veteran_or_active_duty: false
        was_foster_youth_at_eighteen: false
        was_enrolled_in_medicaid_at_foster_care_exit: false
        mother_was_enrolled_in_medicaid_at_birth: false
        has_other_creditable_health_coverage: false
        application_date: "2026-10-09"
        attested_household_income_pct_fpl: 0.80
      month_defaults: {earned_income: 1600, social_security_income: 0, pension_income: 0,
        unemployment_income: 0, self_employment_net_income: 0, other_taxable_income: 0,
        other_unearned_income: 0, tax_exempt_interest: 0, foreign_earned_income_excluded: 0,
        pretax_deductions: 0}
      months:
        "2026-11": {earned_income: 5000}
    p2:                        # Daniel, 34, LPR since 2023-06-15, stepfather, earns 600
      facts:
        date_of_birth: "1992-08-03"
        citizenship_status: lawful_permanent_resident
        qualified_status_date: "2023-06-15"
        lpr_entry_date: "2023-06-15"
        lawful_presence_status: lawfully_present
        state_of_residence: CO
        is_tax_filer: true
        expects_to_be_claimed_as_dependent: false
        is_required_to_file_tax_return: true
        files_jointly_with_spouse: true
        is_pregnant: false
        expected_number_of_children: 0
        is_medicare_entitled_or_enrolled: false
        is_veteran_or_active_duty: false
        application_date: "2026-10-09"
      month_defaults: {earned_income: 600, ...as p1 with zeros...}
    p3:                        # Ana, 18, citizen, full-time high school, graduating before 19, claimed by p1
      facts:
        date_of_birth: "2008-05-14"
        citizenship_status: citizen
        state_of_residence: CO
        is_tax_filer: false
        expects_to_be_claimed_as_dependent: true
        is_required_to_file_tax_return: false
        is_enrolled_in_school: true          # see S-3: needs is_full_time_secondary_student
        is_pregnant: false
        expected_number_of_children: 0
        dependent_child_has_minimum_essential_coverage: true
        application_date: "2026-10-09"
      month_defaults: {earned_income: 0, ...zeros...}
    p4:                        # Luis, 10, citizen, claimed by his non-custodial father p5
      facts:
        date_of_birth: "2016-01-22"
        citizenship_status: citizen
        state_of_residence: CO
        is_tax_filer: false
        expects_to_be_claimed_as_dependent: true
        is_required_to_file_tax_return: false
        claimed_by_non_custodial_parent: true     # IDENTIFIER DOES NOT EXIST (C-12)
        lives_with_both_parents: false            # IDENTIFIER DOES NOT EXIST (C-12)
        is_pregnant: false
        expected_number_of_children: 0
        dependent_child_has_minimum_essential_coverage: true
        application_date: "2026-10-09"
      month_defaults: {earned_income: 0, ...zeros...}
    p5:                        # Ramon, 36, citizen, non-custodial father, lives elsewhere, earns 5000
      facts:
        date_of_birth: "1990-06-30"
        citizenship_status: citizen
        state_of_residence: CO
        lives_with: []                            # IDENTIFIER DOES NOT EXIST (K-8)
        is_tax_filer: true
        expects_to_be_claimed_as_dependent: false
        is_required_to_file_tax_return: true
        files_jointly_with_spouse: false
        is_pregnant: false
        expected_number_of_children: 0
        is_medicare_entitled_or_enrolled: false
        application_date: "2026-10-09"
      month_defaults: {earned_income: 5000, ...zeros...}
```

**Month 2026-10 (household income $2,200 = p1 $1,600 + p2 $600), worked by hand.**

*p1.* 435.603(f)(1): filer + spouse + claimed dependents = `[p1, p2, p3]`. p4 is claimed by p5, so p4
is not in p1's household. Size: 3 members, p1 counted as herself plus one expected child → **4**.
Income: p1 and p2 count; p3 is a claimed dependent, not required to file, and *is* in her parent's
household, so (d)(2)(i) excludes her → **$2,200**. Ratio 2,200 / 2,750.00 = **0.8000**.
Category: needy newborn no; child no (29); pregnant — yes, 0.80 ≤ 1.85 → **`pregnant`**.
Citizenship: qualified non-citizen, `ma_meets_five_year_bar` **false** (2023-06-15 to 2026-10-01 is 3
years); but 8.100.3.G.1.g.viii.1 (S175) lists "MAGI Pregnant" among the categories from which a
pregnant person "shall not be excluded ... on the basis of immigration status" →
`ma_meets_citizenship_requirement` **true**, `ma_is_emergency_medicaid_only` **false**, status
**`eligible`**. `ma_retroactive_coverage_start_month` **2026-07**.
CHP+: Medicaid-eligible → **`ineligible_medicaid_eligible`**.

*p2.* Household `[p1, p2, p3]` (joint filer, claims nobody himself but is p1's spouse), size **4**
(p1's pregnancy counts for every member's family size, 8.100.4.E.2). Income **$2,200**, ratio
**0.8000**. Category: not a child; not pregnant; parent/caretaker — he is the stepfather of p3 (18 and
a full-time secondary student → a dependent child under 435.4) and of p4 (10); 0.80 > 0.60, and the
disregard is **not** available at the 60% standard because the Adults group at 133% is the highest
standard he could qualify under (C-2) → **no**; former foster care no; Adults — 34, not pregnant, no
Medicare, no earlier category, 0.80 ≤ 1.33, and the dependent children in the household do have MEC
(435.119(c)(1), C-3) → **yes**. Category **`adult`**.
Citizenship: qualified non-citizen, bar **not** met, not a veteran, not under 19, not pregnant, not
postpartum → `ma_meets_citizenship_requirement` **false**; resident and holding a category →
`ma_is_emergency_medicaid_only` **true** → status **`emergency_only`**.
*The current rules give `eligible` here* (C-1). CHP+: not a child, not pregnant → **`ineligible`**.

*p3.* Claimed by p1, her parent → 435.603(f)(2) basic rule, household = p1's = `[p1, p2, p3]`, size
**4**, income **$2,200**, ratio **0.8000**. Category: under 19 and 0.80 ≤ 1.33 → **`child`**; status
**`eligible`**; CE applies **true**, and with C-4 fixed the end month is **2027-09**. CHP+
**`ineligible_medicaid_eligible`**.

*p4.* Claimed as a tax dependent by a non-custodial parent → 435.603(f)(2)(iii) /
8.100.4.E.1.c.iii → non-filer rules: himself; spouse (none); his own children under 19 (none); and,
being under 19, his parents and siblings under 19 *living with him* → p1 (mother), p2 (step-parent,
8.100.4.E.1.d.iv), p3 (sibling under 19). p5 does not live with him → excluded.
Household **`[p1, p2, p3, p4]`**, size: 4 members plus p1's expected child → **5**.
Income: p1 and p2 count; p3 excluded under (d)(2)(i); p4's own income $0 → **$2,200**. Ratio
2,200 / 3,223.33 = **0.6826**.
Category **`child`** (10; 0.6826 ≤ 1.33), status **`eligible`**, CE **true**, CHP+
**`ineligible_medicaid_eligible`**.
*The current rules put p4 in p5's household* (`[p4, p5]`, size 2, income $5,000, ratio 2.7727 →
category `none`, status `ineligible_income`, CHP+ `eligible_child`) because CO-500 models only the
(f)(2)(i) exception. This person is the case's whole point.

*p5.* 435.603(f)(1): `[p4, p5]`, size **2**. Income: p5 $5,000; p4 is his claimed dependent, not
required to file, and is in the household of his natural parent p5 for *this* household's purposes →
excluded → **$5,000**. Ratio 5,000 / 1,803.33 = **2.7727**. Category: parent/caretaker requires the
child to be *living with* him (435.4, 435.110(b)) and p4 is not → no; Adults — 2.7727 > 1.33, and
with the disregard 2.7227 > 1.33 → no. Category **`none`**, status **`ineligible_income`**, CHP+
**`ineligible`**.
Note the current rules reach the same values, but by a route the text does not license: CO-547 would
find him a parent of a dependent child (the edge is read as living together, K-8) and is saved only
by the income test.

**Month 2026-11 (p1's earnings rise to $5,000; household income $5,600).**

*p1.* Household `[p1, p2, p3]`, size 4, income **$5,600**, ratio 5,600 / 2,750.00 = **2.0364**.
Pregnant standard 1.85; 2.0364 > 1.85; disregard at the highest title-XIX standard available to her
(1.85, pregnant) → 1.9864 > 1.85 → no Medicaid category → **`none`**. Citizenship still **true**
(pregnant, Cover All Coloradans) so *not* emergency-only → status **`ineligible_income`**.
CHP+: pregnant, over 195% and at or below 260% (2.0364) → not Medicaid-eligible, no other coverage →
**`eligible_prenatal`**. (10 CCR 2505-3-50.18: she is 29, so a "Woman" and in the 110.1.F band.)

*p2.* Ratio **2.0364**; Adults 1.33, disregard → 1.9864 > 1.33 → category **`none`**. He is a
qualified non-citizen inside the bar, so the *current* CO-554 would report **`emergency_only`** — but
435.406(b) grants those services only to a person "who otherwise meet[s] the eligibility requirements
of the State plan", and he does not. Expected **`ineligible_income`** (C-11). CHP+ **`ineligible`**.

*p3.* Ratio **2.0364**. Child standard 1.33, disregard → 1.9864 > 1.33 → no Medicaid.
**But** she was found eligible in 2026-10 and is under 19, so 42 CFR 435.926(d) and 8.100.3.Q.1.a
forbid terminating her: category **`child`**, status **`eligible`** through 2027-09 (C-4). Expected
CHP+ **`ineligible_medicaid_eligible`** (she remains Medicaid-eligible; 120.1.B).
The current rules give `none` / `ineligible_income` / `eligible_child`.

*p4.* Household `[p1, p2, p3, p4]`, size 5, income $5,600, ratio 5,600 / 3,223.33 = **1.7373**. Same
CE protection as p3 (found eligible in 2026-10): category **`child`**, status **`eligible`**, CHP+
**`ineligible_medicaid_eligible`**. Absent CE he would be at 173.7% → Medicaid `none`, CHP+
`eligible_child`.

*p5.* Unchanged: `none` / `ineligible_income` / `ineligible`.

Identifiers this case needs and the chapter lacks: `claimed_by_non_custodial_parent`,
`lives_with_both_parents` (C-12); `lives_with` or an equivalent (K-8); `is_full_time_secondary_student`
and `expected_to_complete_school_before_age_19` (S-3); `ma_child_is_in_continuous_eligibility_period`
(C-4); `ma_magi_highest_income_standard_pct` (C-2). Until C-1, C-2, C-3, C-4, C-11 and C-12 are
fixed, eight of this case's thirty expectations fail.

---

#### CO-07 / CO-08 — former foster care youth aged 24 over every MAGI standard; 17-year-old sibling in a 12-month continuous eligibility period after an income change; grandmother caretaker relative on Social Security; a retroactive month

Design intent: prove that the former-foster-care category takes no income test and is not displaced by
the Adults group (435.150(b)(2) skips § 435.119); exercise the disregard at the parent/caretaker 60%
standard in the one configuration where 435.603(d)(4) permits it (a Medicare-entitled grandmother,
for whom the Adults group is closed, so 60% *is* her highest standard); exercise 8.100.4.C.1.f.iii (a
child's own income in a household with no parent); exercise continuous eligibility across a real
income change; and exercise retroactive coverage.

Because the chapter anchors the continuous eligibility period on `[det_month]` (C-4c), one case cannot
express a period opened in April 2026 and tested in January 2027. Split it in two, sharing persons; if
the fix round adds `continuous_eligibility_period_start_month`, merge them into one case with three
stated months.

```yaml
- id: CO-07
  title: Former foster care youth at 24 over every MAGI standard; 17-year-old sibling; grandmother caretaker on Social Security; retroactive month
  as_of: "2026-04-10"
  relationships:
    - [grandparent, p1, p2]
    - [grandparent, p1, p3]
    - [caretaker, p1, p3]
    - [tax_filer, p1, p3]
  persons:
    p1:                        # Rose, 68, citizen, Medicare, SSA 1850, claims p3
      facts:
        date_of_birth: "1957-11-08"
        sex: female
        citizenship_status: citizen
        state_of_residence: CO
        is_tax_filer: true
        expects_to_be_claimed_as_dependent: false
        is_required_to_file_tax_return: true
        files_jointly_with_spouse: false
        is_pregnant: false
        expected_number_of_children: 0
        is_medicare_entitled_or_enrolled: true
        is_veteran_or_active_duty: false
        was_foster_youth_at_eighteen: false
        mother_was_enrolled_in_medicaid_at_birth: false
        has_other_creditable_health_coverage: false
        application_date: "2026-04-10"
      month_defaults: {social_security_income: 1850, earned_income: 0, pension_income: 0, ...zeros...}
    p2:                        # Marcus, 23 (24 in CO-08), citizen, former foster youth, earns 4200
      facts:
        date_of_birth: "2002-05-20"
        citizenship_status: citizen
        state_of_residence: CO
        is_tax_filer: true
        expects_to_be_claimed_as_dependent: false
        is_required_to_file_tax_return: true
        files_jointly_with_spouse: false
        is_pregnant: false
        expected_number_of_children: 0
        is_medicare_entitled_or_enrolled: false
        age_at_foster_care_exit: 20               # IDENTIFIER DOES NOT EXIST (C-9)
        was_foster_youth_at_eighteen: true        # the existing, narrower fact
        was_enrolled_in_medicaid_at_foster_care_exit: true
        has_other_creditable_health_coverage: false
        application_date: "2026-04-10"
      month_defaults: {earned_income: 4200, ...zeros...}
    p3:                        # Tasha, 16, citizen, in school, claimed by her grandmother
      facts:
        date_of_birth: "2010-03-02"
        citizenship_status: citizen
        state_of_residence: CO
        is_tax_filer: false
        expects_to_be_claimed_as_dependent: true
        is_required_to_file_tax_return: false
        is_enrolled_in_school: true
        is_pregnant: false
        expected_number_of_children: 0
        dependent_child_has_minimum_essential_coverage: true
        has_other_creditable_health_coverage: false
        application_date: "2026-04-10"
        received_covered_services_in_month:        # IDENTIFIER DOES NOT EXIST
          "2026-01": true
      month_defaults: {earned_income: 0, ...zeros...}
```

**CO-07, month 2026-04 (the determination that opens p3's continuous eligibility period).**

*p1.* 435.603(f)(1): `[p1, p3]` (she claims p3; no spouse). Size **2**. Income: her SSA $1,850 counts
in full (8.100.4.C.1.b.xi, c.iii); p3 is a claimed dependent described in 435.603(f)(2)(i) (claimed by
a grandmother, not a spouse or parent) and not required to file, so (d)(2)(ii) excludes her →
**$1,850**. Ratio 1,850 / 1,803.33 = **1.0259**.
Category: not a child; not pregnant; parent/caretaker — she is p3's caretaker relative ("grandmother"
is in 435.4's list, S205) and p3 is a dependent child (16); 1.0259 > 0.60; **the disregard is
available here** because she is 68 and Medicare-entitled, so 435.119(b)(1),(3) close the Adults group
and 0.60 is the highest standard she could qualify under (C-2) — but 1.0259 − 0.05 = 0.9759 > 0.60 →
**no**; former foster care no; Adults — 68 ≥ 65 → no. Category **`none`**.
`ma_meets_some_category_demographics` **true** (the parent/caretaker prong) → status
**`ineligible_income`**. CE **false**. CHP+ **`ineligible`** (not a child, not pregnant).
Her real basis is SSI-related/MSP — phase 4, 435.603(j)(2). Note that with C-3 fixed, the MEC
condition no longer bears on her at all.

*p2.* `[p2]` alone. Size **1**. Income **$4,200**. Ratio 4,200 / 1,330.00 = **3.1579**.
Category: child no (23); pregnant no; parent/caretaker — no dependent-child edge → no; former foster
care — under 26, in Colorado's care through his 20th birthday and receiving Medical Assistance
(8.100.4.H.2.a), enrolled at exit → **yes**, and 435.150(b) sets no income or resource test and
435.150(b)(2) excludes only §§ 435.110-435.118 / 435.120-435.145 eligibility, which 3.16× FPL
forecloses anyway. Category **`former_foster_care`**, status **`eligible`** at 316% of FPL.
CE **false** (23). CHP+ **`ineligible`**.
This is the case that proves CO-551's order is not income-ranked and that CO-549 takes no income
test. It also shows why C-9 matters: with only `was_foster_youth_at_eighteen` the chapter cannot state
a youth who aged out at 20, which is the common Colorado pattern.

*p3.* Claimed by her grandmother → 435.603(f)(2)(i) / 8.100.4.E.1.c.i → non-filer rules: herself;
spouse (none); her own children (none); and, being under 19, her parents and siblings under 19 living
with her — no parent is in the case, and p2 is 23, so neither term adds anyone. Household **`[p3]`**,
size **1**. Income: her own $0 → **$0**. Ratio **0.0000**.
Category **`child`**, status **`eligible`**. CE applies **true**;
`ma_child_continuous_eligibility_end_month` = twelve months beginning 2026-04 → **2027-03** (the
current rules give 2027-04, C-4b). CHP+ **`ineligible_medicaid_eligible`**.
`ma_retroactive_coverage_start_month` = **2026-01** (three months preceding 2026-04-10, 8.100.3.E.1 /
435.915(a)), and because she received covered services in 2026-01 and met every requirement that
month (income $0, citizen, resident, under 19), coverage is effective from **2026-01**. The chapter
cannot express that second half: it has no fact for "received covered services in the retroactive
period" and no per-month `ma_retroactive_coverage_eligible` outcome — OQ-55 covers only the
"whichever is later" clause.
Note also that a sibling relationship cannot be stated in this case at all: P43 derives siblings from
a shared `parent` edge and no parent is a person here. The chapter has no `sibling` role. Add one, or
state that a sibling with no parent in the case is unexpressible.

**CO-08, as_of 2027-01-15 — same three persons, p3's earnings rise to $1,850/month.**

*p3.* Household `[p3]`, size **1**, income **$1,850**, ratio 1,850 / 1,330.00 = **1.3910** (using the
2026 FPL table, the only version CO-181 carries — see 3.3).
Absent continuous eligibility: 1.3910 > 1.33; disregard at her highest title-XIX standard (1.33,
children) → 1.3410 > 1.33 → Medicaid `none`; CHP+ requires income *greater than* 1.42 and 1.3910 is
not → CHP+ ineligible too. She would be eligible for **nothing** — which is C-5's coverage gap,
demonstrated on a real household.
With continuous eligibility, 435.926(d) and 8.100.3.Q.1.a settle it: her period runs 2026-04 through
2027-03 and "applies without regard to changes in income", so the expected values for 2027-01 are
category **`child`**, status **`eligible`**, CHP+ **`ineligible_medicaid_eligible`** —
notwithstanding that her own income now exceeds the standard. The current rules give
`none` / `ineligible_income` / `ineligible_income` (the CHP+ code being wrong for a second reason,
C-14: she is in fact below the band's floor, which the code happens to name correctly here).
Add a third month 2027-04 (after the period ends) whose expected value the fix round must set from
C-5's resolution: on the 142% chart figure, `child` / `eligible`; on the 133% CCR figure,
`none` / `ineligible_income` and CHP+ `ineligible_income`. Stating both readings in the case comment
is the honest way to keep C-5 visible.
Note this month is also where C-6 bites: her $1,850 counts in her own household of one only because
8.100.4.C.1.f.iii says a child not living with a parent has their income counted "even if ... below
the tax filing threshold". CO-503 as written excludes it (she is a claimed dependent not required to
file) and reports **$0**, ratio 0, `child`, `eligible` — the right outcome for the wrong reason, which
is why the 2027-04 month matters: there the two readings diverge.

*p2.* Now 24. Unchanged: `[p2]`, size 1, $4,200, 3.1579, **`former_foster_care`**, **`eligible`**.
*p1.* Unchanged: `[p1, p3]`, size 2, $1,850, 1.0259, **`none`**, **`ineligible_income`** — except that
p3's MEC (`dependent_child_has_minimum_essential_coverage`) is now held by continuous eligibility
rather than by a current income test, which is worth a comment.

Identifiers this pair needs and the chapter lacks: `age_at_foster_care_exit` (C-9);
`continuous_eligibility_period_start_month` and `ma_child_is_in_continuous_eligibility_period` (C-4);
`received_covered_services_in_month` and `ma_retroactive_coverage_eligible` (K-7 / 3.4);
`ma_magi_highest_income_standard_pct` (C-2); a `sibling` relationship role; a 2027 version of
CO-181.

---

## Ranked list of fixes, first things first

1. **C-1** — CO-509/CO-507: restore the five-year bar. `ma_is_lawfully_present` as a bare disjunct
   makes CO-508 unreachable and gives full Medicaid to every qualified non-citizen inside the bar.
   Add the barred-LPR rule tests that would have caught it.
2. **C-4** — CO-555/CO-556/CO-554: make continuous eligibility do something. No outcome reads it, the
   period is thirteen months, and it is anchored to the determination month rather than the
   application month 8.100.3.Q.2 names.
3. **C-3** — CO-547/CO-548/CO-085/CO-552: move the minimum-essential-coverage condition from the
   Parents/Caretaker category to the Adults category, where 8.100.4.G.4.a and 435.119(c)(1) put it,
   with the under-19 age 435.119(c)(2) specifies.
4. **C-2** — CO-545/546/547/548 plus a new `ma_magi_highest_income_standard_pct`: apply the 5%
   disregard only at the highest standard the person could qualify under, per 435.603(d)(4). Fixes the
   wrong covered group for every parent between 60% and 65% of FPL.
5. **C-5** — CO-191/CO-540/CO-210: fetch the HCPF MAGI-Medicaid income guidelines chart that
   8.100.4.G.2 incorporates by reference, or raise the 133%/142% coverage gap as a blocking OQ. Do not
   ship a chapter in which a child at 140% FPL is eligible for nothing.
6. **C-11 and C-10** — CO-510/CO-554/CO-553: make emergency-only conditional on otherwise meeting the
   category and income requirements, and stop `ma_magi_is_eligible` from reading an emergency-only
   person as "eligible under Title XIX" for CHP+'s 120.1.B exclusion.
7. **Cases** — add CO-06 and CO-07/CO-08 as specified in 3.4, and fix CO-01/CO-02's
   `mother_was_enrolled_in_medicaid_at_birth`, `attested_household_income_pct_fpl` and CO-02's five
   dropped relationship edges (3.3). Without CO-06 the chapter has no case that touches any of fixes
   1-6.
8. **C-6 and S-1** — CO-503/CO-078: key the income exclusion on "in the household of their parent"
   rather than "claimed as a dependent", and model 8.100.4.C.1.f.iii and the Title II/Tier I
   exclusion from the filing-threshold test.
9. **C-7, C-12, K-8** — add a `lives_with` fact and use it: the spouse-of-a-caretaker arm of
   435.110(b), the (f)(2)(ii)/(iii) exceptions (OQ-42), 8.100.4.E.4, and 8.100.4.G.3.a all wait on it.
10. **K-6 / OQ-57** — remove or de-assert `chp_annual_enrollment_fee`; re-fetch 10 CCR 2505-3-300 from
    the Colorado SOS CCR before any fee rule is authored. Pair it with **K-5**, the § 320/§ 330
    cost-sharing exemptions, whose text *is* fetched and which no item states.
11. **C-8, C-9, C-13, C-14, C-15** — the 19th-birthday-month extension; Colorado's 18-through-21
    foster-care exit window; the pregnant-woman lock-in; CO-707's `ineligible_income` catch-all;
    presumptive eligibility's attested-income fact.
12. **K-3** — open an OQ (or a batch) for 435.119(d)'s community engagement requirement on the Adults
    group. The chapter currently reads as complete for the largest MAGI group while omitting a
    condition the fetched CFR imposes on it.
