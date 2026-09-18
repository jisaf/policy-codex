# Policy review: Colorado volume, CCCAP and LEAP chapter (CO-980..CO-991, CO-1000..CO-1007, CO-320..CO-327, CO-870..CO-877)

Reviewer role: Child care policy owner (CCCAP) and Cash programs policy owner (LEAP). Read-only review at
commit `4a5dbb5` (branch `claude/phase-2-startup-oj6e6g`) against `volumes/co/documents/D-63.md`
(9 CCR 2503-7, LEAP) and `volumes/co/documents/D-64.md` (8 CCR 1403-1, CCCAP), with excerpts
S481–S497 in `volumes/co/sources.md`. `CHECK_BASE=origin/main npm run check -- --volume co` passes at
this commit and `scripts/eval-case.ts` reproduces every CO-01 expectation in the chapter; every finding
below is a policy finding, not a mechanical one.

Outcomes in scope: `cccap_eligibility_status` (CO-989) and `leap_is_eligible` (CO-1007).

Findings are grouped (1) correctness, (2) completeness, (3) cases. Each gives severity, item id(s), the
governing text with its document and line (`documents/D-nn.md:line`, `sources.md:Snnn`), what the item
does, and the fix as a concrete derivation or text change.

Headline: the chapter's two household closures are both built from the wrong sentence of their own
regulation. LEAP's is built from the list of people who *cannot be split off* rather than from the
definition of "household"; CCCAP's income rule is built from the *eligible child* definition rather
than from the *child in the household* the exclusion actually names. On top of that, LEAP has no
November-to-April eligibility period, so the chapter currently finds a household eligible for a heating
benefit in October, and the target household's expectations record that as correct.

---

## 1. Correctness

### 1.1 Blocking

**C-1 (blocking). CO-1000: the LEAP household is built from 3.751.2.D, which is a floor on splitting,
not the definition of a household. Every adult in the home who is not a spouse silently becomes a
separate household even when one furnace and one gas bill serve them all.**

The definition is in 3.751.1 (`documents/D-63.md:33`, S489):

> "Household": The term "household" shall mean any individual or group of individuals who are living
> together as one economic unit for whom primary heating fuel is customarily purchased in common or who
> make undesignated payments for heat in the form of rent.

3.751.2 then constrains how that unit may be drawn (`documents/D-63.md:53-66`, S490):

> B. Each person living at a dwelling must be counted as either a member of the applicant's household or
> a member of a separate household.
> D. The following cannot be classified as separate households: 1. Husband and wife living together;
> 2. Children under eighteen (18) years of age and living in the same dwelling as the parent or guardian,
> unless emancipated; 3. Individuals that enter into civil unions.

D is a list of people the county may **not** separate. It is not the test for membership. CO-1000
derives

```
[reachable, [spouse, parent, child],
  [any, [rel, [spouse], [P]],
        [all, [rel, [parent], [P]], ["<", [of, [P], age], leap_household_child_age_limit]],
        [all, [rel, [child], [P]], ["<", age, leap_household_child_age_limit]]]]
```

which is D.1 and D.2 and nothing else, and its `meaning` states the 3.751.1 economic-unit sentence as
if the derivation implemented it. The consequence: an 18-year-old still in the home, an adult child, a
parent-in-law, a sibling, a roommate, an unmarried partner and an undocumented relative are each their
own LEAP household of one, with no fact in the case ever asserting that heating fuel is purchased
separately. In CO-01 the five people in one dwelling become households `[p1,p2]` and `[p3,p4,p5]`, and
the split is what decides both income tests. Nothing in the fetched text supports the split; nothing in
the case asserts it.

Fix. Add a supplied fact for the economic unit — `shares_heating_fuel_with` (or reuse the existing
`buys_prepares_with` co-residence edge if the data steward prefers one co-residence edge per case, with
a note that SNAP's purchase-and-prepare unit and LEAP's heat-in-common unit are different questions) —
and derive

```
[reachable, [shares_heating_fuel_with, spouse, parent, child],
  [any, [rel, [shares_heating_fuel_with], [P]],
        [rel, [spouse], [P]],
        [all, [rel, [parent], [P]], ["<", [of, [P], age], leap_household_child_age_limit],
              [not, [of, [P], is_emancipated_minor]]],
        [all, [rel, [child], [P]], ["<", age, leap_household_child_age_limit],
              [not, is_emancipated_minor]]]]
```

so that 3.751.2.D's three joins are unconditional edges no election can break, and everyone else in the
dwelling joins when the case says they share the heat. Where the case is silent on `shares_heating_fuel_with`
the value is unknown, which is the honest answer and is what the ledger's unknown propagation is for.
Note the `unless emancipated` clause of D.2, which CO-1000 drops although `is_emancipated_minor` is
already a supplied fact carried on every person in CO-01 (`tests/cases.yaml:38`); that is folded into the
derivation above. Raise an OQ for 3.751.2.E (the divorced/legally-separated parent's separate-household
election), which CO-1000's `precision` names but no item implements.

**C-2 (blocking). CO-1000 / CO-1002 / CO-1005: the LEAP citizenship rule is stated in three items'
`meaning` and implemented in none. A non-lawfully-present member is counted as a household member (so
he inflates household size) and his income is counted only by accident.**

3.753.17 Citizenship Requirements (`documents/D-63.md:627`, S494):

> An applicant who does not meet lawful permanent residency or citizenship requirements shall not be
> included as a household member; however, all countable income of this individual shall be counted as
> part of the household's total income.

Two operations: **remove from the household**, **keep the income**. CO-1000 does neither — it has no
citizenship condition on the closure at all. CO-1002 sums over `leap_household_members`, so it happens
to count the person's income, but only because the exclusion was never implemented; the moment C-1 or
C-2's first half is fixed by filtering `leap_household_members`, the income silently disappears with
him. CO-1005's own `meaning` asserts the rule ("an applicant who does not meet lawful permanent
residency or citizenship requirements is excluded as a household member (their income is still
counted)") while CO-1005 only checks that *someone* in the household is qualified. The item that states
the rule is not the item that would have to carry it.

The bite is in household **size**. `leap_household_size` (CO-1001) is the key by which the supplied 60%
SMI ceiling is chosen (CO-875, CO-1003). Counting an excluded person as a member buys the household a
larger household's ceiling while also counting his income — the most favourable possible reading, and
the opposite of what 3.753.17 does. CO-1005-T1 encodes the bug: `p1` is `undocumented`, `p2` is an LPR,
and the test asserts a two-person household in which `p1` is a member.

Fix. Split the group in two, as the SNAP chapter already does for an ineligible non-citizen:

- `leap_household_members` (CO-1000) — the economic unit of C-1, **filtered** to members who meet
  3.753.16/3.753.17, i.e. `[filter, <closure>, [of, [P], leap_meets_citizenship_requirement]]`. This is
  the group `leap_household_size` counts and `leap_has_lawfully_present_member` tests (which then
  reduces to "the household is non-empty" — keep CO-1005 as the explicit 3.754.1.C denial factor,
  `documents/D-63.md:675`, but re-derive it as `[>, leap_household_size, 0]` or retire it into CO-1007).
- `leap_household_members_for_income` — the unfiltered economic unit, which CO-1002 sums over. Its
  `meaning` cites 3.753.17's second clause.
- A new derived `leap_meets_citizenship_requirement` carrying 3.753.16's list (see K-2 below on its
  twelve categories).

**C-3 (blocking). CO-1007: LEAP has no eligibility period. The chapter finds households eligible for a
heating-season benefit in October, and CO-01 records that as the expected answer.**

3.751.1 (`documents/D-63.md:33`, not excerpted):

> "Eligibility Period": There shall be one eligibility period for the Basic Low-Income Energy Assistance
> Programs from November 1st through April 30th.
> "Program Year": means from November 1st through April 30th for the Heating Fuel Assistance Program.

3.752.1 (`documents/D-63.md:285`, not excerpted):

> Such applications received prior to November 1st shall be accepted and may be processed; however,
> eligibility shall not be effective until November 1st. Application forms received or postmarked after
> the closing date shall be denied. ... Although applications may be accepted and processed earlier, the
> effective date of application shall not be before November 1st.

and 3.754.1.J makes it a stated denial factor (`documents/D-63.md:685`): "The household filed an
application outside of the application period; 3.752.1 (14)."

`leap_is_eligible` is scope `person-month` and its derivation is
`[all, ma_meets_residency, leap_has_lawfully_present_member, leap_income_within_limit,
leap_is_vulnerable_to_heating_cost, has_primary_heating_source]` — no month condition. All four of
CO-1007's rule tests assert `2026-10` and three of them expect `true`; CO-01 (as_of `2026-10-01`)
expects `leap_is_eligible: {"2026-10": true}` for p3, p4 and p5. Under the fetched text there is no
LEAP eligibility in October at all.

Fix. Add two parameters from 3.751.1 — `leap_eligibility_period_start_month` (11) and
`leap_eligibility_period_end_month` (4) — and a derived `leap_month_in_eligibility_period`
(person-month, `[any, [">=", [month_of, month], leap_eligibility_period_start_month],
["<=", [month_of, month], leap_eligibility_period_end_month]]`, i.e. November through April inclusive
across the year boundary), and make it a conjunct of CO-1007. Re-point CO-1007's tests at `2026-12`,
add one October test expecting `false`, and change CO-01's three `leap_is_eligible` expectations to
`false` with a comment naming 3.752.1; CO-02 is already `2026-11` and carries the eligible branch, so
the chapter keeps a positive LEAP case. The April 30 weekend/holiday extension is a `precision` note,
not a rule.

While there: 3.751.1's "Point in Time" definition — "eligibility is determined by accounting for the
circumstances of the household on the date of the application, regardless of any changes thereafter" —
means LEAP is decided once per program year, not re-derived monthly. Modeling `leap_is_eligible` as
person-month and re-evaluating it each month is the opposite convention. Record it as an OQ against
CO-1007 rather than restructuring the scope now; the month condition of this finding is what actually
matters for correctness.

**C-4 (blocking). CO-985: the child-earnings exclusion is keyed on the wrong class of child and applied
to the wrong kind of income. A working 15-year-old's wages are counted; a 10-year-old's survivor
benefits are dropped.**

3.111.J.1 (`documents/D-64.md:683`, S486):

> J. Income Exclusions ... 1. Earnings of a child in the household when not a teen parent

Two words do the work. *Earnings* — not all income. *Child in the household* — the 3.103.GGG term
(`documents/D-64.md:163`, S496: under eighteen, or under nineteen and still in high school), which the
chapter already has an item for in `cccap_is_household_child` (CO-990). CO-985 instead filters on
`cccap_is_eligible_child` (CO-980), the 3.111.F term (under thirteen, or under nineteen with verified
additional care needs, `documents/D-64.md:429`), and excludes the person's **entire** income:

```
[sum, [filter, cccap_household_members,
        [any, [not, [of, [P], cccap_is_eligible_child]], [of, [P], cccap_is_teen_parent]]],
      [+, earned_income, self_employment_net_income, social_security_income, pension_income,
          unemployment_income, child_support_received, other_unearned_income]]
```

Both halves are wrong, in opposite directions:

- A 14-to-17-year-old without additional care needs is a *child in the household* but not an *eligible
  child*, so the filter keeps him and his wages are counted. Under J.1 they are excluded. This is not
  hypothetical: it is exactly the 18-year-old high-school student in the case at §3 below, and it moves
  that household's income by $400.
- An eligible child aged under thirteen is dropped entirely, so his survivor's Social Security (3.111.I.25,
  `documents/D-64.md:668`) or child support paid in his name (3.111.I.29) falls out of household income
  although both are listed inclusions and neither is an "earning".

Fix. The filter and the summand are separate questions:

```
[sum, cccap_household_members,
  [+, [case, [[all, [of, [P], cccap_is_household_child],
                    [not, [of, [P], cccap_is_teen_parent]]], 0],
             [else, [+, [of, [P], earned_income], [of, [P], self_employment_net_income]]]],
      [of, [P], social_security_income], [of, [P], pension_income],
      [of, [P], unemployment_income], [of, [P], child_support_received],
      [of, [P], other_unearned_income]]]
```

— zero the *earned* components for a household child who is not a teen parent, and count every member's
unearned income. This is also the shape LEAP already uses in CO-1002, so the two programs' income rules
become readable against each other.

One reading cuts the other way and should be recorded in the item's `precision` rather than silently
chosen: 3.111.H.1 opens "Adult caretaker(s) or teen parent(s) gross income must not exceed ..."
(`documents/D-64.md:489`, S485), which can be read as counting only caretakers' and teen parents' income
of any kind. Under that reading the filter is the caretaker predicate — which is precisely the predicate
CO-991 already writes, `[any, [not, [of,[P],cccap_is_household_child]], [of,[P],cccap_is_teen_parent]]`.
Either reading makes CO-985 and CO-991 use the **same** class of person. Today they use different ones,
which is the surest sign one of them is wrong.

### 1.2 Should-fix

**C-5 (should-fix). CO-986 / CO-989: the 85% SMI ceiling is the operative income limit of 3.111.H.1 and
no item states it; the 85% SMI column of the table the chapter does read is dropped on the floor.**

3.111.H.1 (`documents/D-64.md:487-493`, S485):

> 1. Adult caretaker(s) or teen parent(s) gross income must not exceed eighty-five percent (85%) of the
> state median income.
> a. Entry eligibility shall be set by the Department at a level based on the self-sufficiency standard,
> not to be set below one hundred eighty-five percent (185%) of the federal poverty level.
> b. Exit income eligibility must be eighty-five percent (85%) of the state median income.

and H.2 gives both columns, the second headed "85% State Median Income (SMI) (State and Federal Maximum
Income Limit)".

So the text states three things: a **cap** (H.1, 85% SMI, and the table calls it the maximum income
limit), an **entry** limit (H.1.a, Department-set, floor of 185% FPL), and an **exit** limit (H.1.b,
85% SMI). CO-986 implements only the entry limit, as `supplied county percentage × the 100% FPG table`.
That treatment of the entry percentage is right and OQ-121 documents it honestly — H.1.a states a floor,
not a figure, so a supplied fact with an open question is the correct ledger move. Two things are
missing around it:

1. **The 85% SMI figures are stated in the fetched text and are not in the ledger.** CO-323 captures the
   100% FPG column and CO-324 its `$448.33` each-additional; the 85% SMI column and its `$276.47`
   each-additional are simply not represented. That is a provenance gap of the kind this ledger exists
   to prevent: a number the document states, dropped. Add `cccap_smi_income_limit_table` (CO-328) and
   `cccap_smi_income_limit_each_additional` (CO-329) with the same `from: "2024-10-01"` version and
   source S485.
2. **Neither the cap nor the exit limit is applied.** `cccap_entry_income_limit_pct_fpl` is supplied and
   unbounded above, so a county percentage above the cap is honoured; and a continuing household whose
   income has risen past the county entry limit but is still under 85% SMI is reported
   `ineligible_income` by CO-989 although H.1.b keeps it eligible until 85% SMI. Fix: make CO-986
   `["<=", cccap_household_income, [min, <entry limit as today>, <85% SMI lookup>]]`, and add
   `cccap_income_within_exit_limit` (CO-330) reading the 85% SMI table, with CO-989 reading the exit
   limit for a household already receiving assistance and the entry limit at application. That needs a
   supplied `is_cccap_redetermination` (or the existing application/redetermination distinction) — raise
   it as an OQ if the chapter does not want the entry/exit distinction this batch, but do not leave
   H.1.b unrepresented and unremarked.

For calibration at the chapter's own figures: at 185% the entry limit never binds against the cap at
sizes 1–8 (size 4: 1.85 × $2,600.00 = $4,810.00 against $9,215.70), so today's illustrative 1.85 is
safe; the cap binds only once a county sets a higher percentage, which H.1.a expressly permits.

**C-6 (should-fix). CO-988: any Colorado Works household with a grant is routed to Colorado Works Child
Care, though 3.115.A and 3.111.D.6 both turn on a work-eligibility determination the item never reads.**

3.115.A (`documents/D-64.md:913`, S487) conditions Colorado Works Child Care on caretakers "who are
approved for Colorado Works **and are determined work eligible** per Colorado Works rule", and 3.116.A
adds a current individualized plan, participation in allowable work activities, and a referral by the
county Colorado Works worker. 3.111.D.6 (`documents/D-64.md:417`) states the negative case explicitly:

> Adult caretakers or teen parents that are not determined work eligible per Colorado Works Program rule
> ... who are caring for children receiving Basic Cash Assistance through the Colorado Works Program are
> not eligible for Colorado Works Child Care but may be eligible for Low-Income Child Care if the adult
> caretaker or teen parent meets all other Low-Income program criteria.

CO-988 derives `[any, ["=", cw_eligibility_status, eligible], [">", cw_grant_amount, 0]]`. The second
disjunct alone sends a household with a grant to `eligible_colorado_works` with no work-eligibility test,
and since CO-989 checks that branch before the eligible-child, activity and income tests, the household
is approved without any of them. This is the branch 3.111.D.6 says must fall through to the Low-Income
determination. The volume already has `cw_is_work_eligible_individual` (CO-919) — the item this
derivation should be reading.

Fix. `[all, [any, ["=", cw_eligibility_status, eligible], [">", cw_grant_amount, 0]],
cw_is_work_eligible_individual]`, plus a supplied `is_referred_for_colorado_works_child_care` for
3.116.A's county referral (with an OQ if the data steward cannot source it). Add a test with
`cw_grant_amount: 488` and `cw_is_work_eligible_individual: false` expecting `false` — today no test
exercises the `cw_grant_amount > 0` disjunct on its own (CO-988-T1 sets both), so the branch that
contradicts 3.111.D.6 is untested as well as wrong.

**C-7 (should-fix). CO-991: "caretaker" means "any household member who is not a child", so an adult in
the home who is not a caretaker of the child sinks the whole household; and the incapacitated and absent
second-caretaker shapes 3.111.D.1 expressly allows are all denials.**

CO-991 lifts the per-person activity test to the household correctly in shape — that fix was right, and
it is what keeps an infant's own hours out of the determination — but its caretaker set is
`[any, [not, [of,[P],cccap_is_household_child]], [of,[P],cccap_is_teen_parent]]`, i.e. *everybody over
eighteen in the closure*. 3.103.C defines the term much more narrowly (`documents/D-64.md:~C`, S481):

> "Adult caretaker" means a person in the home who is financially contributing to the welfare of the
> child and is the parent, adoptive parent, step-parent, legal guardian, or person who is acting in
> "loco parentis" and has physical custody of the child during the period of time child care is being
> requested.

and 3.111.D.2 (`documents/D-64.md:409`) says a household has *two* caretakers "when two adults or teen
parents contribute financially to the welfare of the child and/or assume parent rights, duties, and
obligations similar to those of a biological parent". An adult sibling, an adult child, or a
grandparent who is in the closure by a spouse edge is not an adult caretaker under either sentence, but
CO-991 requires their activity and fails the household without it.

Worse, 3.111.D.1 lists three two-caretaker shapes that qualify **without** both being active
(`documents/D-64.md:399-407`, S497): one caretaker involuntarily out of the home (b — "shall be
considered a household with one adult caretaker"), one voluntarily absent (c.2), and one incapacitated
with medical verification (c.3). CO-991's `precision` and OQ-125 acknowledge this, but the acknowledgment
does not change that a working parent with a disabled spouse at home is denied today, and 3.111.E only
excludes an incapacitated **single** caretaker not in an activity (`documents/D-64.md:427`) — the exact
distinction the chapter collapses. `has_medical_statement_of_unfitness` is already a supplied fact on
every person in CO-01, so the incapacity arm costs nothing.

Fix. Define `cccap_is_adult_caretaker` (CO-992) from 3.103.C: a household member who is a parent or
caretaker of an eligible child in the household and is not a household child (a supplied
`is_financially_contributing_to_child` would carry the rest of 3.103.C; raise it as an OQ if the data
steward cannot source it). Then in CO-991 quantify over `[any, cccap_is_adult_caretaker,
cccap_is_teen_parent]` rather than "not a child", and exempt from the activity requirement a caretaker
for whom `has_medical_statement_of_unfitness` (3.111.D.1.c.3) or a new supplied `is_absent_from_home`
(3.111.D.1.b, c.2) holds — while keeping 3.111.E's rule that a *single* incapacitated caretaker not in
an activity is ineligible. Update OQ-125 to record what remains (unrelated-caretaker verification,
3.111.D.5).

**C-8 (should-fix). CO-981: "teen parent" drops the eligible-activity prong of the definition, and two
items then use the truncated term as a live classifier.**

3.103.ZZZZ (`documents/D-64.md:281`, S481):

> "Teen parent" means a parent under twenty-one (21) years of age who has physical custody of his/her
> child(ren) for the period that care is requested **and is in an eligible activity** such as attending
> junior high/middle school, high school, GED program, vocational/technical training activity,
> employment, self-employment, or job search.

CO-981 implements only age plus custody, and its `precision` defers the activity prong to CO-984. That
would be harmless if "teen parent" were only decorative, but it is not: CO-985 uses it to decide whose
income counts (a teen parent's earnings are counted, 3.111.J.1) and CO-991 uses it to decide who must be
in an activity. A nineteen-year-old parent who is in no activity is not a teen parent under ZZZZ — but
CO-991 calls her a caretaker and fails the entire household on her inactivity, and CO-985 counts her
wages. The truncation makes the household's answer worse than the text does.

Fix. Add `cccap_caretaker_in_eligible_activity` as a conjunct of CO-981, moving its scope from `person`
to `person-month` (nothing reads it at `person` scope: CO-982's closure does not use it). There is no
cycle — CO-984 is a per-person activity test that reads no household fact.

Secondary, minor: CO-981 also requires the custodial child to be a `cccap_is_eligible_child`, which
ZZZZ does not say ("his/her child(ren)"). It costs nothing in practice (a teen parent with no eligible
child has no eligible child in the household either) but the item should say in `precision` that it
narrows the term, or drop the condition.

**C-9 (should-fix). CO-989: the Protective Services branch short-circuits the income test, which 3.119.A
does not waive — it only redefines.**

3.119 (`documents/D-64.md:1049-1055`, S488):

> A. Protective services households are considered a household of one for purposes of determining income
> eligibility. The only countable income for a protective services household is the income that is
> received by the child(ren) that have been placed in kinship or foster care. Child support income shall
> not be included as income.
> D. Protective services households are not subject to low-income eligible activity requirements.
> E. Protective services households are not subject to residency verification requirements.

D waives the **activity** test. E waives the **residency** test. Nothing waives the income test — A
prescribes how to run it (household of one; count only the placed child's income; drop child support).
CO-989 returns `eligible_protective_services` on the supplied flag alone, and CO-989's `precision` states
the waiver too broadly ("Protective services and Colorado Works Child Care households are not subject to
the low-income eligible-activity or entry-income tests (3.111.D.6, 3.119.D)" — 3.119.D says activity
only, and 3.111.D.6 is about Colorado Works work-eligibility, not about income).

Fix. Give the branch its own income test: `cccap_protective_services_income` (the placed child's
`earned_income` + unearned income less `child_support_received`) against the size-1 entry limit, and
make the branch `[all, is_protective_services_child_care_case,
cccap_protective_services_income_within_limit]` with a fall-through to the ordinary rows. Correct the
`precision` sentence to cite 3.119.D for activity and 3.119.E for residency.

**C-10 (should-fix). CO-987 is dead code. No item and no outcome reads
`cccap_low_income_child_care_eligible`.**

CO-989 re-derives the three Low-Income conditions inline rather than reading CO-987
(`grep -rn cccap_low_income_child_care_eligible volumes/co` returns only CO-987 itself and four
`rationale` sentences that claim it is used). This is the shape the phase-3 review flagged for
`ma_magi_continuous_eligibility`: a rule that is computed and then ignored will drift from the rule that
is used, and one of the two will be wrong without any check noticing.

Fix. Either make CO-989's `eligible_low_income` branch read CO-987 (preferred — it is the item whose
`meaning` names 3.111's criteria and whose sources are S483/S484), or delete CO-987 and move its sources
onto CO-989. Do not leave both. Whichever survives must also carry C-5's exit limit and C-11's residency
condition, which is an argument for keeping CO-987 as the single place 3.111's criteria are assembled.

**C-11 (should-fix). CCCAP has no residency rule at all, though 3.111.A states one and LEAP's parallel
rule is modeled.**

3.111.A (`documents/D-64.md:339`, S484):

> A. The adult caretaker(s) and teen parent(s) shall be verified residents of the county from which
> assistance is sought and received at the time of application and re-determination.

CO-987's `sources` include S484 and its `meaning` recites 3.111's criteria, but neither CO-987 nor
CO-989 has a residency conjunct, and the chapter has no `cccap_meets_residency`. LEAP's CO-1007 does
read `ma_meets_residency` for 3.753.21. The asymmetry is not a reading of the text; it is an omission.
CCCAP's test is a *county* residency test, which this volume has no fact for — that is the honest
difficulty and the reason to raise it rather than skip it.

Fix. Add a supplied `county_of_residence` and a derived `cccap_meets_county_residency`
(`["=", county_of_residence, cccap_county_of_application]`), or, if the data steward cannot source a
county, add `cccap_meets_residency` reading `state_of_residence` with a `precision` that says plainly it
implements the state prong only and an OQ for the county prong. Either way 3.119.E's protective-services
exemption is a `[not, is_protective_services_child_care_case]` guard on it. Do not ship the chapter with
3.111.A represented by nothing.

**C-12 (should-fix). CO-985: `other_unearned_income` is summed wholesale against a twenty-nine-item
exclusion list that names several things which land in exactly that fact.**

3.111.J (`documents/D-64.md:681-748`, S486 quotes only J.1) excludes, among others: SSI (J.2); SNAP,
WIC and school-meal benefits (J.4); **payments received from the county or state for providing foster
care, kinship care, or an adoption subsidy** (J.10); **LEAP benefits** (J.12); the Earned Income Credit
(J.14); undergraduate grants and loans (J.16, J.19); **public cash assistance grants including OAP, AND
and TANF/Colorado Works** (J.26); and irregular income under $90 a quarter (J.28).

CO-985 gets J.26 right by construction (it does not read `cash_assistance_income`). It gets J.10, J.12,
J.14 and J.16 wrong for any case that puts those amounts in `other_unearned_income` — and the volume
has `receives_title_iv_foster_adoption_kinship_payment` as a supplied flag on every person in CO-01,
i.e. the chapter knows such payments exist and has no way to keep them out of income. The SNAP chapter
resolved this by declaring the supplied income facts to be post-exclusion amounts (see
`docs/colorado-notes.md`, phase 2, "Income exclusions"); CCCAP has made no such declaration.

Fix. State the convention in CO-985's `precision` — the supplied income facts are the countable,
post-exclusion amounts under 3.111.J — and add an OQ listing the 3.111.J items that the convention
pushes onto the fact assembly layer, naming J.10, J.12, J.14, J.16, J.26 and J.28 explicitly. Cheap, and
it converts a silent error into a recorded assumption. If instead the chapter wants the exclusions as
rules, J.10 and J.26 at minimum have facts available today.

Related and separate: 3.111.K (`documents/D-64.md:749`) deducts verified court-ordered child support
paid for children not in the household **before** the income is compared to the guidelines. CO-985's
`precision` says this is "out of scope this batch" but no OQ records it, and
`child_support_paid_legally_obligated` is already a supplied fact on every person in CO-01 — the SNAP
chapter uses it. Either implement it (`[-, <sum>, child_support_paid_legally_obligated]`, floored at
zero) or open the OQ.

**C-13 (should-fix). CO-875 / CO-1003: the LEAP income ceiling is supplied per person and is not keyed
to the household size the chapter derives; the illustrative $3,000 in CO-01 is what decides the target
household's LEAP answer.**

3.752.22.D (`documents/D-63.md:369`, S491) sets the test at "up to and including 60 percent (60%) of the
state median income level released by the U.S Department of Health and Human Services for federal fiscal
year 2023", with the figures in 45 C.F.R. § 96.85 and the LIHEAP Information Memorandum — neither
fetched. Supplying the dollar ceiling is the right treatment and OQ-122 records it. Two problems remain:

1. CO-875 is `scope: person` and is a *function of household size*, but nothing ties it to
   `leap_household_size` (CO-1001). Two members of the same household can be given different ceilings
   and the chapter will not notice; and when C-1/C-2 change the derived size, every case's supplied
   ceiling becomes silently wrong for the new size. The type should be
   `table keyed by household size` (like CO-323), read with `[lookup, leap_smi_income_limit_table,
   leap_household_size]`, even while the values are supplied per case.
2. CO-01 supplies `leap_income_limit_monthly: 3000` and that number — flagged in the case as
   "illustrative figures, not from the fetched text" — is the sole reason p1 and p2
   (`leap_household_income` $3,210) are expected ineligible. An expectation in the target household is
   carried by a figure from nobody's text.

Fix. A defensible illustrative figure is available *inside the fetched text*: 3.111.H.2's 85% SMI column
(S485) implies 100% SMI, and 60% of it is a stated-text-derived ceiling —
size 1 $4,792.16/0.85×0.60 = **$3,382.70**, size 2 $6,266.68/0.85×0.60 = **$4,423.07**,
size 3 $7,741.19/0.85×0.60 = **$5,464.37**, size 4 $9,215.70/0.85×0.60 = **$6,505.20**. These are the
CCCAP rule's Colorado SMI figures, not LEAP's federal FY2023 table, so they are still not the right
numbers and OQ-122 stays open — but they are an order of magnitude closer than $3,000 and they come from
a document in this library. Use them in the cases with a comment that says exactly that, and note in
CO-01 that p1/p2 at $3,210 are then **within** a size-2 ceiling of $4,423.07, so their expected
`leap_is_eligible` turns on vulnerability (C-14) and the eligibility period (C-3) rather than on income.

**C-14 (should-fix). CO-1004 models one of eight non-vulnerable living arrangements, and the one that
matters for the target household — institutional group care — is not it.**

3.752.25.B (`documents/D-63.md:471-487`, S492 quotes only B.6) lists eight: institutional group care
(B.1, "nursing homes, foster care homes, group homes ... where the provider is liable for the costs of
shelter and home heating"), room and board (B.2), correctional facilities (B.3), dormitories (B.4),
subsidized housing without a check meter (B.5), homeless or non-traditional dwellings (B.6), commercial
properties (B.7), hotels (B.8). CO-1004 implements B.6 alone.

In CO-01, p1 enters a nursing facility on 2026-10-01 (`in_medical_institution: true`,
`institution_entry_date: "2026-10-01"`) and the case nonetheless supplies
`is_responsible_for_heating_costs: true` for her, so she gets a LEAP household, a household income and a
vulnerability of `true`. The SNAP chapter excludes her from the SNAP unit for the same facts. B.1 is not
an exotic arrangement for this volume — it is the target household's central fact.

Fix. Add `[not, in_medical_institution]` to CO-1004 as B.1 (the fact exists and the Medicaid chapter
already reads it), and a supplied `living_arrangement` enumeration for B.2–B.5, B.7 and B.8 with an OQ,
or at minimum an OQ naming the six unmodeled arrangements against CO-1004. Also add 3.752.25.A.3's
subsidized-housing-with-check-meter arm to CO-876's `meaning`, which today asserts it ("or has a
comparable subsidized-housing heating surcharge") without any fact distinguishing it from B.5's
exclusion — the same fact cannot both establish and defeat vulnerability.

**C-15 (should-fix). CO-990 drops the second half of 3.103.GGG's student prong.**

3.103.GGG (`documents/D-64.md:163`, S496):

> all children under nineteen (19) years of age who are still in high school **and the responsibility of
> the adult caretaker(s)**

CO-990 derives `[any, ["<", age, 18], [all, ["<", age, 19], is_enrolled_in_school]]`. Two gaps, both
named nowhere: the "responsibility of the adult caretaker(s)" condition is absent, and
`is_enrolled_in_school` does not distinguish high school from any other schooling — CO-990's `precision`
says "`is_enrolled_in_school` is read as 'still in high school' for an eighteen-year-old", which is an
assumption, not a precision note, and belongs in an OQ. An 18-year-old at community college is a
household member today and is not one under GGG.

Fix. Record both in an OQ against CO-990 and CO-982. If a `is_claimed_as_responsibility_of_caretaker`
fact is out of reach, say so; the existing `is_under_parental_control_of_household_member` fact
(used by the SNAP chapter) is the nearest available and may serve.

**C-16 (minor). Citation errors that will mislead the fix round.**

- CO-1003's `precision` and OQ-122 both call `leap_income_limit_monthly` **CO-877**. It is **CO-875**;
  CO-877 is `has_primary_heating_source`. Three places to correct: `volumes/co/energy/CO-1003.yaml`
  (precision), `volumes/co/open-questions.md` (OQ-122 body, twice).
- CO-982's `sources` list S496, S481, S484. S484 (3.111.A–B) says nothing about household composition;
  the household-composition source is S497 (3.111.D.1), which CO-982's own `meaning` cites ("3.103.GGG
  and 3.111.B.3, D"). 3.111.B.3 is the physical-custody prong, not a composition rule.
- CO-980's `rationale` and CO-986's `rationale` both assert that CO-987 reads them; see C-10.
- `volumes/co/energy` has no CO-1006. If the id was reserved for `leap_benefit_amount` and released per
  OQ-123, say so in OQ-123 so the gap is not read later as a lost item.

**C-17 (minor). CO-989's `meaning` describes a per-caretaker determination; the item reports a
per-household one on every member, infants included.**

CO-989's `meaning` opens "This adult caretaker's or teen parent's CCCAP eligibility determination for the
month", but every member of the household gets the same value — in CO-01, the infant p5's
`cccap_eligibility_status` is `eligible_low_income`. That is the right behaviour after CO-991 lifted the
activity test to the household (CO-991's `precision` says so explicitly), and it is what makes the
outcome readable for a child, but the outcome item's own `meaning` still describes the pre-fix shape.
Fix: restate CO-989's `meaning` as the household's determination, reported on each member, and say which
person's facts the branches read.

### 1.3 Items I checked and believe are right, where the point is subtle

- **CO-982's closure direction.** `[rel, [role], [P]]` reads "this person stands in that role toward P",
  so the second disjunct joins a *parent of a household child* and the third joins *a child who is
  themselves a household child*. CO-982-T4 confirms the intended asymmetry: a 42-year-old daughter
  living with her parents is not joined to them, and the grandparents' household is the couple alone.
  This is the right reading of 3.103.GGG, which builds the household around the adult caretaker and the
  children in the home rather than around everyone under one roof.
- **CCCAP has no citizenship test for the caretaker, and that is correct.** 3.111.F.1
  (`documents/D-64.md:431`) requires the *child* to verify citizen/legal-resident status; no provision
  of 3.110 or 3.111 imposes one on the adult caretaker. So CO-01's `eligible_low_income` for p3, an
  undocumented mother, follows the text. (The child-side requirement is a genuine gap — see K-1.)
- **LEAP has no resource test, and the chapter correctly has no resource item.** 3.752.24
  (`documents/D-63.md:453`): "There are no resource criteria for the Low-Income Energy Assistance
  Program."
- **CO-1002's zeroing of a child's earned income.** 3.752.23.Q (`documents/D-63.md:417`) excludes
  "Earned income of children under the age of eighteen (18) who are residing with a parent or guardian",
  and CO-1002 zeroes `earned_income` only (not unearned) for a member under 18. That is exactly right —
  and it is the shape C-4 asks CCCAP's CO-985 to adopt. The one gap is the "residing with a parent or
  guardian" condition: CO-1002 zeroes the earnings of any under-18 member, including an emancipated
  minor who would not be in the household at all once C-1's `unless emancipated` clause lands.
- **CO-1007's reuse of `ma_meets_residency`.** The item's `precision` explains the reuse and the
  `dup.compact` governance constraint that motivated it; 3.753.21 (`documents/D-63.md:631`, S495) and
  8.100.3.B do derive identically. I would still prefer a `leap_meets_residency` alias-free item so that
  a future change to Medicaid residency does not silently move LEAP, but the trade-off is recorded and
  defensible.
- **No `[all, x]` single-element wrappers exist in this chapter.** Every `[all, ...]` in
  `volumes/co/childcare` and `volumes/co/energy` has two or more operands. The `derived.alias`-dodging
  pattern the phase-3 review flagged (CO-601, CO-602, CO-700) did not recur here.

### 1.4 Tests that do not exercise the branch they claim

- **CO-1002**: neither test gives a member under 18 a non-zero `earned_income`, so the zeroing arm of
  the `case` — the whole point of the rule and its only citation to 3.752.23.Q — is never evaluated with
  a value that would change the answer. Add a test with a 15-year-old earning $500 expecting the parent's
  income alone.
- **CO-985**: same gap in the other direction. No test gives an eligible child any income, so the filter
  never excludes a non-zero amount, which is why C-4's misreading survived. Add a test with a 10-year-old
  receiving $300 in `social_security_income` (countable under 3.111.I.25, dropped today).
- **CO-984**: `is_in_job_search_activity` is `false` in all three tests; the job-search disjunct — the
  reason supplied fact CO-871 exists — is exercised only indirectly, in CO-991-T4.
- **CO-988**: CO-988-T1 sets `cw_eligibility_status: eligible` **and** `cw_grant_amount: 488`, so the
  `cw_grant_amount > 0` disjunct is never tested alone. See C-6.
- **CO-986**: no test has `cccap_household_size > 8`, so `cccap_poverty_guideline_each_additional`
  (CO-324) and the `[max, 0, [-, size, 8]]` arm are dead in the suite. A size-10 test is two lines.
- **CO-1007**: all four tests are `2026-10`, outside the program year. See C-3.
- **CO-989-T3**: exercises the protective-services branch on a person with no relationships and no
  child, so the branch passes with an empty household. That is fine as a branch test but should be
  paired with one where a placed child is present, once C-9's income test exists.

---

## 2. Completeness

### 2.1 Provisions that determine eligibility and are represented by no item

**K-1. CCCAP child citizenship/legal residency (3.111.F.1, `documents/D-64.md:431`).**

> All children who have had an application made on their behalf or are receiving child care assistance
> shall verify that they are a citizen/legal resident and provide proof of identity if inconsistent.

The chapter has no CCCAP citizenship item of any kind, while LEAP has CO-1005. In CO-01 the eligible
child p5 is a citizen and the question does not bite; in any mixed-status household it decides whether a
child can be served at all. Add `cccap_child_meets_citizenship_requirement` reading `citizenship_status`
/ `lawful_presence_status`, and make CO-980's `cccap_is_eligible_child` (or CO-989's eligible-child
existence test) require it. This is the single largest gap in the CCCAP chapter.

**K-2. LEAP qualified-alien categories (3.753.16, `documents/D-63.md:591`).** The fetched rule lists
twelve categories A–L; S493 quotes four (A, D, E, G). CO-1005's status list is
`[citizen, us_national, lawful_permanent_resident, refugee, asylee, cuban_haitian_entrant,
compact_of_free_association_migrant, other_qualified_non_citizen]`. Two mismatches: **COFA migrants are
not in 3.753.16's list** (they are qualified under later federal law, but this ledger follows the fetched
text, and phase 3 made exactly this call the other way for Medicaid on the strength of a statute that is
in the library — no such document is here for LEAP); and six of 3.753.16's categories (parolees,
conditional entrants, withholding of deportation, trafficking victims, SIV holders, battered aliens,
Amerasian immigrants, the 50%-American-Indian-blood Canadian-born) are represented only by the catch-all
`other_qualified_non_citizen`, whose enumeration meaning does not say it covers them. Extend S493 to
quote A–L, and either drop COFA or add the document that puts them in the qualified class.
Also note 3.753.17 appears **twice** in the fetched text under different headings
(`documents/D-63.md:617` "Aliens and Temporary Residents Not Eligible for Assistance" and
`:627` "Citizenship Requirements"); S494 quotes the second. The first states a list of statuses ineligible
for assistance that no item reads. Record the duplicate numbering in the source note so a later reader
does not conclude the excerpt was mis-cited.

**K-3. CCCAP asset self-declaration (3.111.H.4.c, `documents/D-64.md:529`).**

> Adult caretakers or teen parents shall self-declare that their liquid and non-liquid assets do not
> exceed one million dollars. If assets exceed one million dollars the household is ineligible for CCCAP.

A stated, unambiguous, dollar-valued eligibility condition with a directly available fact
(`countable_liquid_resources`, `countable_nonliquid_resources_snap`). No item. Add
`cccap_meets_asset_limit` with a `cccap_asset_limit` parameter of 1,000,000 sourced to 3.111.H.4.c, and
a conjunct in CO-987/CO-989. This one is cheap and should not wait.

**K-4. CCCAP "needs child care assistance" / "less than twenty four (24) hours" (3.110, S483;
3.111.D.1.a, S497; 3.111.F, S482).** Every statement of the eligibility criteria ends with a need for
care, and the eligible-child definition requires care "during a portion of the day, but less than twenty
four (24) hours". Neither CO-980 nor CO-989 has any need-for-care condition; the chapter approves a
household that has requested nothing. A supplied `needs_child_care_assistance` and the hours prong of
3.111.F would close it.

**K-5. CCCAP time-limited activities (3.111.G.3.a and G.4, `documents/D-64.md:462`, `:476`).** Job search
child care is capped at thirteen weeks per instance of non-temporary cessation, and a caretaker is
"determined ineligible once they have utilized their allotted job search time and have not reentered
into a low-income eligible activity" (G.3.g); training and post-secondary education are capped at 104–208
weeks per lifetime. CO-984 treats `is_in_job_search_activity` and `is_enrolled_in_school` as unlimited.
OQ-124 covers the *mapping* of activities to facts but says nothing about the *limits*, which are
eligibility-determining and stated in dollars-and-weeks terms. Either add supplied
`job_search_weeks_used` / `training_weeks_used_lifetime` with parameters 13 and 208, or extend OQ-124 to
name them.

**K-6. CCCAP federal-minimum-wage-per-hour test (3.111.G.1.b, `documents/D-64.md:440`; repeated in
3.111.I.1, I.2.c, I.3.c).** "Adult caretaker(s) or teen parent(s) must verify that his/her gross income
divided by the number of hours worked equals at least the current federal minimum wage." CO-984's
`precision` says it is not modeled and no OQ records it. Both `earned_income` and `hours_worked` are
supplied; the only missing piece is a federal minimum wage parameter, which the SNAP chapter's work
rules also want (7 CFR 273.7(b)(1)(vii)). One parameter serves two chapters.

**K-7. LEAP shared-fuel and shared-dwelling arithmetic (3.752.25.A.4, A.6, B.5, B.8,
`documents/D-63.md:463-487`).** A.4 makes a household in a multi-household residence vulnerable if it
"contributes toward the total expenses of the residence", and A.6 divides the estimated heating cost by
the number of parties on a shared meter. This is the machinery the text provides for exactly the
situation C-1 creates by splitting a dwelling into several households — and it is unmodeled, so the
chapter takes the split without taking the consequences. It belongs with OQ-123 (the benefit formula) if
the fix round does not implement it.

**K-8. LEAP mandatory weatherization (3.752.26, `documents/D-63.md:495`) and the rest of 3.754.1's
denial factors (`documents/D-63.md:668-700`).** CO-1007's `precision` acknowledges the 3.754.1 list
generally; the specific items with facts available today are D (duplicate household, which 3.751.2.A
makes a hard rule: "Any individual considered as part of an approved household cannot subsequently be
considered as part of another household during the same eligibility period") and L (weatherization
refusal). 3.751.2.A is also the rule that makes C-1's silent household-splitting dangerous: two
overlapping households in one dwelling is a stated denial factor.

**K-9. The teen-parent household merge is a decision the text does not make.** CO-982's closure joins a
teen parent to *both* her parent's household and her own child, producing one household. In CO-01 that
means the grandmother-line income of p3 ($2,380) is tested against a size-3 entry limit on behalf of
p4's infant; if p4 and p5 were their own household of two with $0 income, they would clear a much lower
limit. 3.103.GGG builds the household around "the adult caretaker(s) **or** teen parent(s)" without
saying which one claims a teen parent who is herself a child in her mother's home, and 3.111.D.3
contemplates separate applications for a child across two households. OQ-125 covers absence and
incapacity but not this. Raise it: it is the single modeling choice in the CCCAP chapter with the
largest effect on the target household, and it is currently made by the closure's mechanics rather than
by anyone's reading.

### 2.2 Supplied facts whose meaning is doing policy work that should be a rule

- **CO-876 `is_responsible_for_heating_costs`** carries all three arms of 3.752.25.A — direct-to-vendor
  (A.1), heat in rent in non-subsidized housing (A.2), and the subsidized-housing check-meter/surcharge
  arm (A.3) — in one boolean, while 3.752.25.B.5 makes subsidized housing *without* a check meter
  non-vulnerable. One fact cannot answer both. See C-14.
- **CO-873 `is_protective_services_child_care_case`** carries "open child welfare case", "placed by the
  county in foster/kinship care", and "referral form on file". After C-9 it will also need to identify
  *which* child was placed, since 3.119.A counts only that child's income.
- **CO-870 `cccap_entry_income_limit_pct_fpl`** is correctly supplied per OQ-121, but it is `scope:
  person` and unbounded; see C-5 for the 85% SMI cap.
- **CO-875 `leap_income_limit_monthly`**: see C-13.

---

## 3. Cases

### 3.1 CO-01 and CO-02, recomputed by hand

CCCAP, p3's household (p3 mother 41 undocumented, p4 daughter 17 in school and mother of p5, p5 infant):

- `cccap_household_members` — from p3: p4 joins (p3 is p4's parent and p4, 17, is a household child);
  p5 joins (p4 is p5's parent and p5 is a household child); p1/p2 do not (p3, 41, is not a household
  child). `[p3, p4, p5]`, size 3. Matches the expectation. Whether p4+p5 should instead be their own
  household is K-9.
- `cccap_household_income` — p3 $2,380 earned; p4 and p5 $0. Filter keeps p3 (not an eligible child) and
  p4 (17, no additional care needs, so not an eligible child under 3.111.F) and drops p5. $2,380. The
  expectation is right, but only because p4 has no earnings — with earnings, C-4 would count them
  against 3.111.J.1.
- `cccap_income_within_entry_limit` — 1.85 × $2,151.67 (FPG size 3, S485) = $3,980.59; $2,380 ≤ that →
  true. The 1.85 is illustrative (OQ-121) but is the text's stated floor, so it is defensible.
- `cccap_household_caretakers_in_eligible_activity` — caretakers are p3 (not a household child) and p4
  (teen parent). p3: 138 hours. p4: `is_enrolled_in_school`. Both → true.
- `cccap_eligibility_status` — `eligible_low_income` for all three. **Agrees with the text**, subject to
  K-1 (p5's citizenship is not tested; he is a citizen, so the answer would not change) and K-3.

CCCAP, p1's household (p1 79, p2 81): `[p1, p2]`, no eligible child → `ineligible_child`. The income is
also over (1.85 × $1,703.33 = $3,151.16 against $3,210), but `ineligible_child` is checked first and
CO-989's `precision` states the ordering, so the reported reason is the one the item intends. Agrees.

LEAP, p3's household: `[p3, p4, p5]` (p4 and p5 both under 18), income $2,380 (p3's earnings; p4's and
p5's earned income would be zeroed under 3.752.23.Q but is $0), against the supplied $3,000 → eligible.
**Disagrees with the text on three counts**: the month is October (C-3, denial factor 3.754.1.J); the
household should be the economic unit sharing the dwelling's heat, which on these facts is all five
people (C-1); and the $3,000 ceiling is from nobody's document (C-13, where the text-derived size-3
figure is $5,464.37).

LEAP, p1's household: `[p1, p2]`, income $3,210 = $1,420 + $610 (p1) + $1,180 (p2), against $3,000 →
ineligible. **The expected value is right for the wrong reason.** With C-13's text-derived size-2
ceiling of $4,423.07 the income test passes, and the household is instead not vulnerable, because p1 is
in a nursing facility from 2026-10-01 and 3.752.25.B.1 excludes institutional group care (C-14) — and in
any case October is outside the program year (C-3). Three independent grounds for `false`, none of them
the one the case records.

CO-02 (2026-11-01) carries the same shapes one month later and is inside the program year, so after C-3
it becomes the chapter's only LEAP-eligible case. That is one case too few; hence §3.2.

### 3.2 Facts set only to make the rules resolve

`cccap_entry_income_limit_pct_fpl: 1.85` and `leap_income_limit_monthly: 3000` are carried on all five
persons in CO-01 and CO-02 with a comment marking them illustrative. The first is the text's own floor
and is fine. The second is not traceable to any document; see C-13 for replacements computed from S485.
`is_responsible_for_heating_costs: true` and `has_primary_heating_source: true` are set on p1, who is
institutionalized; see C-14.

### 3.3 The case the fix round should add

Designed to exercise what CO-01/CO-02 do not: two adult caretakers with **different** activities
(3.111.D.1.c.1), a child eligible only through verified additional care needs (3.111.F's second arm), a
household child who is **not** an eligible child and **has earnings** (3.103.GGG vs 3.111.F, and
3.111.J.1 — C-4), an undocumented adult in the home whose income LEAP counts but who is not a LEAP
household member (3.753.17 — C-2), heat included in rent (3.752.25.A.2), and a December month inside the
LEAP program year (3.752.1 — so the case survives C-3's fix).

Valid YAML in CO-04's layout, for `volumes/co/tests/cases.yaml`. Every expectation below was verified
with `npx vite-node scripts/eval-case.ts co CO-06 ...` against a scratch copy of the case file, which was
then restored; the repository is unchanged by this review:

```yaml
- id: CO-06
  title: Two caretakers (one employed, one in job search); a 14-year-old with additional care needs; an 18-year-old in high school with earnings; an undocumented adult relative in the home; heat included in rent
  # Designed in the phase-6 review (docs/reviews/cccap-leap-phase-6.md S3.3). The case is stated for the
  # CCCAP and LEAP chapters; facts for other chapters are omitted, so other programs' outcomes are unknown.
  # p6 is an undocumented adult relative living in the dwelling. The CCCAP and LEAP closures cross only
  # parent/child, caretaker/dependent and spouse edges, so he joins neither household today; the
  # buys_prepares_with edge is the only co-residence edge this volume has and records that he lives there.
  # 9 CCR 2503-7 3.751.1 puts him in the LEAP economic unit and 3.753.17 then excludes him as a member
  # while counting his income - neither of which the chapter implements (review C-1, C-2).
  as_of: "2026-12-01"
  relationships:
    - [spouse, p1, p2]
    - [parent, p1, p3]
    - [parent, p1, p4]
    - [parent, p2, p3]        # step-parent; adult caretaker under 3.103.C
    - [parent, p2, p4]        # step-parent
    - [buys_prepares_with, p1, p6]
  persons:
    p1:
      # Rosa, 34, citizen, works 150 hours a month for $2,600; mother of p3 and p4.
      facts:
        date_of_birth: "1992-06-11"
        sex: female
        citizenship_status: citizen
        lawful_presence_status: lawfully_present
        state_of_residence: CO
        is_enrolled_in_school: false
        is_in_job_search_activity: false
        has_additional_care_needs: false
        is_protective_services_child_care_case: false
        is_emancipated_minor: false
        is_homeless: false
        in_medical_institution: false
        is_responsible_for_heating_costs: true      # heat included in rent, non-subsidized (3.752.25.A.2)
        has_primary_heating_source: true            # building furnace (3.751.1 "Primary Heating Source")
        # Illustrative income ceilings. The CCCAP entry percentage is 3.111.H.1.a's stated floor. The LEAP
        # ceiling is 60% of the SMI implied by 3.111.H.2's 85% SMI column for size 4
        # ($9,215.70 / 0.85 x 0.60 = $6,505.20); the LEAP SMI table itself is not in this library (OQ-122).
        cccap_entry_income_limit_pct_fpl: 1.85
        leap_income_limit_monthly: 6505.20
        cw_eligibility_status: ineligible_income
        cw_grant_amount: 0
      month_defaults:
        earned_income: 2600
        hours_worked: 150
        self_employment_net_income: 0
        social_security_income: 0
        pension_income: 0
        unemployment_income: 0
        child_support_received: 0
        cash_assistance_income: 0
        other_unearned_income: 0
    p2:
      # Andre, 36, citizen, laid off in November and in the job search activity (3.111.G.3); no earnings.
      facts:
        date_of_birth: "1990-02-27"
        sex: male
        citizenship_status: citizen
        lawful_presence_status: lawfully_present
        state_of_residence: CO
        is_enrolled_in_school: false
        is_in_job_search_activity: true
        has_additional_care_needs: false
        is_protective_services_child_care_case: false
        is_emancipated_minor: false
        is_homeless: false
        in_medical_institution: false
        is_responsible_for_heating_costs: true
        has_primary_heating_source: true
        cccap_entry_income_limit_pct_fpl: 1.85
        leap_income_limit_monthly: 6505.20
        cw_eligibility_status: ineligible_income
        cw_grant_amount: 0
      month_defaults:
        earned_income: 0
        hours_worked: 0
        self_employment_net_income: 0
        social_security_income: 0
        pension_income: 0
        unemployment_income: 0
        child_support_received: 0
        cash_assistance_income: 0
        other_unearned_income: 0
    p3:
      # Mateo, 14, citizen, verified additional care needs (IEP): an eligible child only through the
      # second arm of 3.111.F (under 19 with additional care needs). No income.
      facts:
        date_of_birth: "2012-05-20"
        sex: male
        citizenship_status: citizen
        lawful_presence_status: lawfully_present
        state_of_residence: CO
        is_enrolled_in_school: true
        is_in_job_search_activity: false
        has_additional_care_needs: true
        is_protective_services_child_care_case: false
        is_emancipated_minor: false
        is_homeless: false
        in_medical_institution: false
        is_responsible_for_heating_costs: true
        has_primary_heating_source: true
        cccap_entry_income_limit_pct_fpl: 1.85
        leap_income_limit_monthly: 6505.20
        cw_eligibility_status: ineligible_income
        cw_grant_amount: 0
      month_defaults:
        earned_income: 0
        hours_worked: 0
        self_employment_net_income: 0
        social_security_income: 0
        pension_income: 0
        unemployment_income: 0
        child_support_received: 0
        cash_assistance_income: 0
        other_unearned_income: 0
    p4:
      # Elena, 18, citizen, still in high school, works weekends for $400 a month. A "child in the
      # household" under 3.103.GGG (under 19 and in high school) but NOT an "eligible child" under
      # 3.111.F (over 13, no additional care needs).
      facts:
        date_of_birth: "2008-03-14"
        sex: female
        citizenship_status: citizen
        lawful_presence_status: lawfully_present
        state_of_residence: CO
        is_enrolled_in_school: true
        is_in_job_search_activity: false
        has_additional_care_needs: false
        is_protective_services_child_care_case: false
        is_emancipated_minor: false
        is_homeless: false
        in_medical_institution: false
        is_responsible_for_heating_costs: true
        has_primary_heating_source: true
        cccap_entry_income_limit_pct_fpl: 1.85
        leap_income_limit_monthly: 6505.20
        cw_eligibility_status: ineligible_income
        cw_grant_amount: 0
      month_defaults:
        earned_income: 400
        hours_worked: 24
        self_employment_net_income: 0
        social_security_income: 0
        pension_income: 0
        unemployment_income: 0
        child_support_received: 0
        cash_assistance_income: 0
        other_unearned_income: 0
    p6:
      # Hector, 45, Rosa's brother, undocumented, lives in the dwelling and earns $1,500 a month.
      facts:
        date_of_birth: "1981-09-05"
        sex: male
        citizenship_status: undocumented
        lawful_presence_status: not_lawfully_present
        state_of_residence: CO
        is_enrolled_in_school: false
        is_in_job_search_activity: false
        has_additional_care_needs: false
        is_protective_services_child_care_case: false
        is_emancipated_minor: false
        is_homeless: false
        in_medical_institution: false
        is_responsible_for_heating_costs: true
        has_primary_heating_source: true
        cccap_entry_income_limit_pct_fpl: 1.85
        leap_income_limit_monthly: 3382.70    # 60% of the SMI implied for size 1 by 3.111.H.2
        cw_eligibility_status: ineligible_income
        cw_grant_amount: 0
      month_defaults:
        earned_income: 1500
        hours_worked: 160
        self_employment_net_income: 0
        social_security_income: 0
        pension_income: 0
        unemployment_income: 0
        child_support_received: 0
        cash_assistance_income: 0
        other_unearned_income: 0
  expect:
    p1:
      cccap_household_members: [p1, p2, p3, p4]
      cccap_household_size: 4
      cccap_household_income: {"2026-12": 3000}
      cccap_eligibility_status: {"2026-12": eligible_low_income}
      leap_household_members: [p1, p2, p3]
      leap_household_income: {"2026-12": 2600}
      leap_is_eligible: {"2026-12": true}
    p2:
      cccap_household_members: [p1, p2, p3, p4]
      cccap_household_size: 4
      cccap_household_income: {"2026-12": 3000}
      cccap_eligibility_status: {"2026-12": eligible_low_income}
      leap_household_members: [p1, p2, p3]
      leap_household_income: {"2026-12": 2600}
      leap_is_eligible: {"2026-12": true}
    p3:
      cccap_is_eligible_child: true
      cccap_household_members: [p1, p2, p3, p4]
      cccap_household_size: 4
      cccap_eligibility_status: {"2026-12": eligible_low_income}
      leap_household_members: [p1, p2, p3]
      leap_is_eligible: {"2026-12": true}
    p4:
      cccap_is_eligible_child: false
      cccap_household_members: [p1, p2, p3, p4]
      cccap_household_size: 4
      cccap_eligibility_status: {"2026-12": eligible_low_income}
      leap_household_members: [p4]
      leap_household_income: {"2026-12": 400}
      leap_is_eligible: {"2026-12": true}
    p6:
      cccap_household_members: [p6]
      cccap_household_size: 1
      cccap_eligibility_status: {"2026-12": ineligible_child}
      leap_household_members: [p6]
      leap_household_income: {"2026-12": 1500}
      leap_is_eligible: {"2026-12": false}
```

**Derivation of each expected value from the text.**

- `cccap_household_members` = `[p1, p2, p3, p4]`. 3.103.GGG (`documents/D-64.md:163`, S496): the
  household is the adult caretaker(s) plus all children in the home under eighteen plus all children
  under nineteen still in high school. p1 and p2 are adult caretakers (3.103.C, S481: parent and
  step-parent in the home with physical custody); p3 is 14, under eighteen; p4 is 18 and still in high
  school, so under the second prong. p6 is neither a caretaker of these children nor a child, so he is
  outside the CCCAP household on any reading. Every member's value of the item is this same set.
- `cccap_household_size` = **4**, the count of that set (CO-983), and the key by which 3.111.H.2's table
  is read.
- `cccap_household_income` = **$3,000** as the chapter stands (p1 $2,600 + p4 $400: CO-985's filter
  keeps p4 because she is not an *eligible child*), and **$2,600** under 3.111.J.1 as written — "Earnings
  of a child in the household when not a teen parent" (`documents/D-64.md:683`, S486): p4 is a child in
  the household under 3.103.GGG and is not a teen parent, so her $400 is excluded. p3 has no income
  either way. **This is the number C-4 changes**, and it is the reason to add this case: the coordinator
  should enter `3000` if the case lands before the C-4 fix and `2600` after, and the comment above the
  expectation should say which. Both values clear the entry limit, so no outcome flips.
- `cccap_eligibility_status` = **`eligible_low_income`**, in CO-989's stated order: not protective
  services; not Colorado Works (`cw_eligibility_status: ineligible_income`, `cw_grant_amount: 0`); an
  eligible child exists — p3, "a child with verified additional care needs under the age of nineteen
  (19)" (3.111.F, `documents/D-64.md:429`, S482); every caretaker is in an eligible activity — p1 by
  employment (150 hours) and p2 by job search, which is 3.111.D.1.c.1's "Both adult caretakers or teen
  parents are engaged in a low-income eligible activity" (S497) with job search listed as an eligible
  activity by 3.103.OO (`documents/D-64.md:109`, S482); and income is within the entry limit —
  1.85 × $2,600.00 (FPG size 4, 3.111.H.2, S485) = **$4,810.00**, and $3,000 (or $2,600) ≤ $4,810.00.
  Note what the case does *not* test and should not be read as blessing: p4 is a household member and
  raises the household size to 4 (which raises the entry limit), but she is not an eligible child, so no
  care is authorized for her.
- `leap_household_members` = `[p1, p2, p3]` as the chapter stands — 3.751.2.D.1 joins the spouses and
  D.2 joins p3 (14, under eighteen, living with her parents); p4 at 18 is not joined by D.2 and, since
  CO-1000 implements nothing but D, she falls out into a household of one. Under 3.751.1
  (`documents/D-63.md:33`, S489) the household is the economic unit for whom heat is purchased in common
  or who make undesignated payments for heat in rent — here, one rent payment with heat included for the
  whole dwelling — so the LEAP household is p1, p2, p3 and p4, **with p6 excluded as a member by
  3.753.17 (`documents/D-63.md:627`, S494) but his income counted**. Text answer:
  `[p1, p2, p3, p4]`, size 4. **This is what C-1 and C-2 change.**
- `leap_household_income` = **$2,600** as the chapter stands (p1's earnings; p3's earned income is zeroed
  by 3.752.23.Q, `documents/D-63.md:417`, and p4 is in her own household). Under the text: p1 $2,600 +
  p2 $0 + p3 $0 (3.752.23.Q excludes the earned income of a child under eighteen residing with a parent)
  + p4 $400 (she is **18**, so 3.752.23.Q does not reach her) + p6 $1,500 (3.753.17: "all countable
  income of this individual shall be counted as part of the household's total income") = **$4,500**.
- `leap_is_eligible` = **true** for p1–p4, on either reading, which is why this case is safe to add
  before the fixes land: 3.752.2 (S491) requires Colorado residency (`state_of_residence: CO`, 3.753.21),
  a qualified household member (p1 is a citizen, 3.753.16), income within the limit
  ($2,600 today and $4,500 under the text, both at or below the $6,505.20 size-4 ceiling of 3.752.22.D),
  vulnerability (heat paid in the form of rent in non-subsidized housing, 3.752.25.A.2,
  `documents/D-63.md:461`, and none of 3.752.25.B's excluded arrangements), and a primary heating source
  (3.751.1). The month, 2026-12, is inside the November-1-to-April-30 eligibility period of 3.751.1 and
  3.752.1, so the case also survives C-3 — unlike CO-01.
- `leap_is_eligible` for **p6 = false**. As the chapter stands he is a household of one and
  `leap_has_lawfully_present_member` is false, since `undocumented` is in none of 3.753.16's categories;
  3.754.1.C makes "Not a U.S. citizen or a qualified alien" a denial factor (`documents/D-63.md:675`).
  Under the text he is not a separate household at all — 3.753.17 makes him an excluded member of p1's
  household whose income counts — so after C-1 and C-2 this expectation becomes
  `leap_household_members: []` (or the outcome becomes unknown) and the fix round must decide which. The
  case is worth adding precisely because it forces that decision.
- `cccap_eligibility_status` for **p6 = `ineligible_child`**: his CCCAP household is himself, and there
  is no eligible child in it, which is CO-989's first substantive row.

---

## Summary for the fix round

1. **C-3** — `volumes/co/energy/CO-1007.yaml`, two new parameters in `volumes/co/parameters`, a new
   `leap_month_in_eligibility_period` item, `volumes/co/tests/cases.yaml`: add the November-1-to-April-30
   eligibility period from 3.751.1 and 3.752.1 and make it a conjunct of `leap_is_eligible`; CO-01's
   three October `leap_is_eligible: true` expectations become `false`.
2. **C-1** — `volumes/co/energy/CO-1000.yaml`, a new supplied `shares_heating_fuel_with`, new OQ: build
   the LEAP household from 3.751.1's economic unit with 3.751.2.D as an unbreakable floor, and add D.2's
   `unless emancipated` clause using the existing `is_emancipated_minor`.
3. **C-2** — `volumes/co/energy/CO-1000.yaml`, `CO-1002.yaml`, `CO-1005.yaml`, a new
   `leap_meets_citizenship_requirement` and a new `leap_household_members_for_income`: implement
   3.753.17 — exclude the non-qualified member from the household (and from the size that picks the
   ceiling), count his income.
4. **C-4** — `volumes/co/childcare/CO-985.yaml`: key the exclusion on `cccap_is_household_child`
   (3.103.GGG), not `cccap_is_eligible_child` (3.111.F), and exclude *earnings* only, per 3.111.J.1; add
   the two tests named in §1.4.
5. **C-5** — new `cccap_smi_income_limit_table` / `_each_additional` parameters from 3.111.H.2's second
   column, `volumes/co/childcare/CO-986.yaml` capped at 85% SMI, and a new exit-limit item or an OQ for
   3.111.H.1.b.
6. **C-6** — `volumes/co/childcare/CO-988.yaml`: conjoin `cw_is_work_eligible_individual` (CO-919) per
   3.115.A and 3.111.D.6, add the `cw_grant_amount > 0` negative test.
7. **C-7** — `volumes/co/childcare/CO-991.yaml`, a new `cccap_is_adult_caretaker` (3.103.C), OQ-125:
   quantify over actual caretakers, and exempt the incapacitated (3.111.D.1.c.3, using the existing
   `has_medical_statement_of_unfitness`) and absent (D.1.b, c.2) second caretaker.
8. **C-9, C-11, K-1, K-3** — `volumes/co/childcare/CO-987.yaml` / `CO-989.yaml`: a protective-services
   income test per 3.119.A, a county residency condition per 3.111.A (with 3.119.E's exemption), a child
   citizenship condition per 3.111.F.1, and the $1,000,000 asset condition per 3.111.H.4.c.
9. **C-14** — `volumes/co/energy/CO-1004.yaml` and `volumes/co/supplied/CO-876.yaml`: add
   3.752.25.B.1's institutional group care (the target household's p1), and separate A.3 from B.5.
10. **C-8, C-10, C-12** — `CO-981.yaml` (add the activity prong of 3.103.ZZZZ), `CO-987`/`CO-989` (make
    CO-987 live or delete it), `CO-985.yaml` (state the post-exclusion income convention for 3.111.J and
    open the OQ, plus 3.111.K's child-support adjustment).
11. **C-13, C-15, C-16, C-17** — `CO-875.yaml`/`CO-1003.yaml` (a ceiling keyed by household size; the
    text-derived illustrative figures), `CO-990.yaml` (3.103.GGG's "responsibility of the adult
    caretaker" prong as an OQ), the CO-877/CO-875 citation errors in CO-1003 and OQ-122, CO-982's `sources`,
    and CO-989's `meaning`.
12. **Cases** — add CO-06 from §3.3, and apply §3.1/§3.2 to CO-01 and CO-02: the LEAP ceiling figures,
    p1's institutional non-vulnerability, and the October LEAP expectations.
13. **Completeness OQs** — K-2 (3.753.16's twelve categories and the COFA question), K-4 (need for care),
    K-5 (the 13-week and 208-week activity limits), K-6 (the federal-minimum-wage-per-hour test), K-7
    (LEAP shared-fuel arithmetic), K-8 (3.751.2.A duplicate households and weatherization), K-9 (the
    teen-parent household merge — the largest unexamined modeling choice in the CCCAP chapter).
