# Policy review: Colorado volume, cash programs chapter — Colorado Works and Adult Financial (CO-900..CO-921, CO-940..CO-953, CO-270..CO-282, CO-285..CO-291, CO-840..CO-847)

Reviewer role: Colorado Works policy owner and Adult Financial policy owner. Read-only review at commit
`4a5dbb5` (branch `claude/phase-2-startup-oj6e6g`) against `volumes/co/documents/D-59` (C.R.S. title 26
art. 2 parts 1 and 7), `D-60` (45 CFR 260/261/263/264), `D-61` (9 CCR 2503-6), `D-62` (9 CCR 2503-5),
`D-53`/`D-54` (SSI methodology), `D-58` (2026 SSI federal benefit rate) and the excerpts S401..S421 and
S441..S465 in `volumes/co/sources.md`. `CHECK_BASE=origin/main npm run check -- --volume co` passes at
this commit; every finding below is a policy finding, not a mechanical one.

Outcomes in scope: `cw_grant_amount` (CO-914), `cw_eligibility_status` (CO-921), `af_category` (CO-953),
`af_oap_grant` (CO-951), `af_and_grant` (CO-952).

Findings are grouped (1) correctness, (2) completeness, (3) cases. Each gives severity, item id(s), the
governing text with its document and line, what the item does, and the fix. Document quotes are cited
`documents/D-nn.md:line`; excerpt quotes `sources.md:line`.

Where I give a computed figure I ran it: the designed case in §3.2 was evaluated against the ledger at
this commit with a scratch harness over `src/engine/evaluate`, and every "the items give" number below
is an engine output, not a hand calculation.

---

## 1. Correctness

### 1.1 Blocking

**C-1 (blocking). CO-914 / CO-907: the grant is computed with the $90 eligibility-test disregard. The
text says the payment is computed with the 67% disregard — at application, not only afterwards. Every
Colorado Works grant this chapter authorizes for a unit with earnings is too small.**

9 CCR 2503-6 3.606.2.A.1 (`documents/D-61.md:989`, S416 at `sources.md:2198`) is one sentence with two
halves:

> At application the gross earned income minus the ninety dollar ($90) earned income disregard, plus any
> countable unearned income ... **shall not exceed the need standard** for the household size and shall be
> applied at application. **If income does not exceed the need standard for the household size, the sixty
> seven percent (67%) disregard shall be applied to determine payment amount.**

The $90 figure governs the *eligibility test*; the 67% figure governs the *payment*. 3.606.2.A.2
(`D-61.md:991`) says the same thing for a unit already receiving assistance, and ends with the identical
sentence — which is why both paragraphs converge on 67% for payment. 3.606.1.I.1 (`D-61.md:963`) calls
for "the earned income disregard(s)" — plural, i.e. whichever one this step takes.

`cw_countable_earned_income` (CO-907) implements only `[max, 0, ["-", earned_income, 90]]`, and
`cw_grant_amount` (CO-914) is `grant standard − cw_countable_income` off that same figure. So one number
does both jobs and the payment job is the wrong one.

`OQ-105` frames this as "the ongoing 67% disregard for a currently-receiving unit is not modeled". That
reading does not survive the sentence: A.1's second clause applies the 67% disregard *at application*,
to the payment, for a unit that has just passed the $90 test. The open question describes a smaller gap
than the one the item has.

What it costs: in the designed case §3.2, p1 earns $400. The items give
`cw_countable_income` $310 and `cw_grant_amount` $310. Under 3.606.2.A.1 the unit passes the test at
$400 − $90 = $310 < the need standard, and the payment is then computed on $400 × (1 − 0.67) = $132, so
the authorized grant is the grant standard minus $132 — $488 under the row the items use, $517 under the
row the text gives (C-5). The chapter under-pays by $178 on a $400 wage.

Fix: split the two figures.

- add parameter `cw_earned_income_disregard_rate` = 0.67, source S416, versioned from 2025-07-01;
- add `cw_payment_countable_earned_income` (person-month) =
  `[max, 0, ["-", earned_income, ["*", earned_income, cw_earned_income_disregard_rate]]]`;
- add `cw_payment_countable_income` = the CO-910 sum with that item in place of CO-907;
- CO-914 becomes `[max, 0, [floor, ["-", cw_grant_standard, cw_payment_countable_income]]]`;
- CO-913 and CO-921 keep reading CO-910 unchanged.

Rule tests to add: earned 400, unit size 2 → `cw_countable_income` 310, `cw_grant_amount` 488 − 132 = 356
under the One Caretaker row; earned 0 → both paths agree.

---

**C-2 (blocking). CO-918 / CO-915: the sixty-month limit is applied person by person. The text applies it
to the assistance unit, so the chapter lets a unit that must be denied keep one eligible member.**

9 CCR 2503-6 3.606.6.C (`documents/D-61.md:1179`, S417 at `sources.md:2210`):

> **An assistance unit containing an individual** who has received Federal TANF assistance in Colorado or
> another state as an adult for sixty (60) or more cumulative months **shall not be eligible for Colorado
> Works assistance** in Colorado unless granted an extension by the county department due to hardship or
> domestic violence.

45 CFR 264.1(a)(1) (`documents/D-60.md:453`, S421 at `sources.md:2249`) is the same shape: "no State may
use any of its Federal TANF funds to provide assistance ... **to a family that includes** an adult
head-of-household or a spouse of the head-of-household who has received Federal assistance for a total of
five years".

`cw_time_limit_reached` (CO-918) is `[all, [">=", cw_months_of_assistance_used, 60], [not,
cw_time_limit_exempt]]`, read entirely off this person's own facts. In the designed case §3.2 the engine
returns, for one assistance unit `[p1, p2, p4]`:

| person | months | `cw_time_limit_reached` | `cw_eligibility_status` |
|---|---|---|---|
| p1 (mother, DV extension) | 58 | false | `eligible` |
| p2 (father) | 61 | **true** | `time_limit_reached` |
| p4 (child, age 4) | 0 | false | `eligible` |

Three answers for one unit, and the unit's actual answer under 3.606.6.C — deny, because it contains an
adult over sixty months and the extension is not the unit's — is not among them. A caller reading p1 or
p4 pays a grant the county may not pay.

There is a second, opposite error in CO-915. 45 CFR 264.1(b)(1)(i) (`D-60.md:455`, `sources.md:2252`):
"States must not count toward the five-year limit: (i) Any month of receipt of assistance by an
individual who is not the head-of-household or married to the head-of-household". CO-915 is
`months_of_assistance_received` for whoever is asked, head of household or not, so a child's or a
non-head adult's count is live. Today it is masked by C-2's person-level reading; fix C-2 without fixing
this and every non-head adult's history starts closing the unit.

Fix, both at once:

```
cw_time_limit_reached =
  [all,
    [exists, cw_assistance_unit_members,
      [all, [of, [P], cw_is_adult_member],
            [">=", [of, [P], cw_months_of_assistance_used], cw_time_limit_months]]],
    [not, cw_unit_time_limit_extended]]
```

with `cw_is_adult_member` = `[any, [">=", age, cw_dependent_child_age_limit], [all, is_head_of_household,
cw_has_dependent_child]]` (45 CFR 264.1(a)(2)'s minor parent head-of-household, `sources.md:2251`), and
`cw_months_of_assistance_used` gated on `[any, is_head_of_household, [exists_related, [spouse], [of, [P],
is_head_of_household]]]` per 264.1(b)(1)(i). `cw_unit_time_limit_extended` is C-3's item.

---

**C-3 (blocking). CO-917: the extension is read off the individual, not the unit, and
`has_domestic_violence_waiver` is the wrong fact — the regulation's FVO waiver expressly does not stop
the clock.**

Two defects in one three-term disjunction (`[any, cw_child_only_unit, has_domestic_violence_waiver,
has_hardship_extension_approved]`).

*(a) Unit, not person.* 3.606.6.C (`D-61.md:1179`) grants the extension to "an assistance unit"; 3.606.6.C.5
"An extension may be granted for up to six (6) months" is likewise a unit-level authorization. The
designed case gives `cw_time_limit_exempt` = true for p1, false for p2, false for p4 — three values for
one unit. Fix: `cw_unit_time_limit_extended` = `[any, cw_child_only_unit, [exists,
cw_assistance_unit_members, [any, [of, [P], has_domestic_violence_extension_approved], [of, [P],
has_hardship_extension_approved]]]]`.

*(b) The DV fact names the wrong instrument.* 3.604.5.A.1.b (`documents/D-61.md:517`):

> b. TANF time clock. **Assistance received while the FVO waiver is in effect does not prevent the TANF
> time clock from advancing**, but is an allowable reason to extend assistance beyond the sixtieth (60th)
> month.

So the Family Violence Option waiver is a *ground* on which a county may grant an extension, not itself an
extension, and months under it still count. `has_domestic_violence_waiver` (CO-840..CO-847 range, CO-846)
has a meaning field that says the right thing ("The county department has granted this person a good-cause
domestic violence extension") under an identifier that says the wrong one. An engineer implementing
`has_domestic_violence_waiver` from its name will wire in the FVO waiver flag, and the chapter will stop
the clock the regulation says keeps running. Fix: rename the identifier
`has_domestic_violence_extension_approved`, parallel to CO-847, and cite `D-61.md:517` in its meaning so
the distinction is on the record.

*(c) The disqualified-member bar is missing.* Same paragraph, last sentence: "Assistance units that
contain disqualified members shall not be eligible for consideration of an extension." Nothing in CO-917
reads it. Add as a conjunct once a disqualification fact exists (see K-3).

---

**C-4 (blocking). CO-953: the `and_cs` branch applies no income test, no resource test and no citizenship
test. A person with any income and any resources is paid the full $967 AND-CS standard.**

`af_category`'s second branch is the bare predicate `af_and_cs_eligible`, while the `and_so` and `ab`
branches each carry `af_meets_citizenship_requirement`, `af_meets_residency`, `af_meets_resource_limit`
and `[<, af_countable_income, af_and_so_grant_standard]`. `af_and_cs_eligible` (CO-950) is
`[all, [<=, age, 59], receives_ssi, [any, is_disabled_ssa, is_blind], af_meets_residency]` — recipiency,
disability, age, residence, nothing else.

9 CCR 2503-5 3.520.61 (`documents/D-62.md:525`) opens "To be eligible for Adult Financial programs, a
client **shall**:" and ends at I "Meet all other program eligibility requirements, **including income and
resource limits**" (S449, `sources.md:2337`). 3.520.71.A (S453, `sources.md:2371`) repeats it: "The client
shall: 1. Have countable resources below the resource limit ...; and, 2. Have income below the income
limit". 3.549 (S465) states the AND-CS disregards for the same reason every other program's do — so that
a countable figure can be compared. And 3.546 (`D-62.md:2053`, S462) limits the program to SSI recipients
"**but are not receiving the full SSI benefit standard**".

The designed case makes the size of this concrete: p3 is a nine-year-old SSI recipient with $1,500 in
countable resources. The engine returns `af_category` = `and_cs` and `af_and_grant` = **$967** — the
entire standard, with no test of her income, her resources, or how much SSI she already receives.

The volume can do better than OQ-116 allows. `ma_ssi_federal_benefit_rate_individual` (CO-235) carries the
2026 figure **$994** from D-58. Since $994 − $20 = $974 exceeds the $967 AND-CS standard, a client
receiving the full federal benefit rate is arithmetically ineligible for any AND-CS payment — which is
exactly what 3.546's "not receiving the full SSI benefit standard" says. The only missing piece is a
supplied fact for the dollar amount of SSI (K-6).

Fix:

```
[af_and_cs_eligible → and_cs]  becomes
[[all, af_and_cs_eligible, af_meets_citizenship_requirement, af_meets_resource_limit,
       ["<", af_countable_income, af_and_cs_grant_standard]], "and_cs"]
```

and add to CO-950 `["<", ssi_income, ma_ssi_federal_benefit_rate_individual]` once `ssi_income` exists,
closing OQ-116. Rule tests: SSI recipient, age 45, resources $4,000 → `none`; SSI recipient receiving
$994 → `none`; SSI recipient receiving $700, resources $500 → `and_cs`, grant $967 − (700 − 20) = $287.

---

**C-5 (blocking for any two-parent unit). CO-274 / CO-276 / CO-911 / CO-912: the standards tables carry
only the One Caretaker row and are keyed by unit size, so a two-parent unit — which 3.604.2.B expressly
contemplates — is given the wrong need standard and the wrong grant standard with full confidence.**

3.606.1.F's chart (`documents/D-61.md:955`, S414 at `sources.md:2175`) is keyed by **number of children**
across three caretaker rows:

> COLORADO WORKS STANDARDS OF ASSISTANCE CHART Number of Children 0 1 2 3 4 5 6 7 8 9 10 Each Additional
> Child No Caretaker Need Standard 0 117 245 ... One Caretaker Need Standard 253 331 421 510 ... Grant
> Standard 374 488 620 754 ... Two Caretakers Need Standard 357 439 533 628 ... Grant Standard 527 649 788
> 927 ...

3.604.2.B (`D-61.md:125`) is explicit that two-parent cases exist and are funded differently: "Two parent
household cases will be paid with county maintenance of effort (MOE) funds. All other single parent and
child only cases will be paid with county TANF block grant funds."

For the designed case's unit `[p1, p2, p4]` — two caretakers, one child — the text gives need **$439**
and grant **$649**. The items return need **$421** and grant **$620**: the One Caretaker row at index 3.
That is not a rounding difference, it is the wrong row, and it flows straight into `cw_grant_amount` and
into `cw_eligibility_status` (a unit with countable income between $421 and $439 is reported
`ineligible_income` when the text makes it eligible).

OQ-101 records the limitation honestly — "understating the standard for a no-caretaker unit and
overstating it for a two-caretaker unit" — but the items still emit a confident number. Under this
ledger's own completeness rule (`docs/conventions.md`, "An outcome that is `unknown` is reported as
*cannot determine*"), a unit the tables do not cover should be `unknown`, not silently mapped to the
modal row.

Fix: re-key both tables on the chart's own two axes.

- add `cw_caretaker_count` = `[count, [filter, cw_assistance_unit_members, [not, [of, [P],
  cw_is_dependent_child]]]]`, capped at 2;
- add `cw_child_count` = `cw_unit_size − cw_caretaker_count`;
- make CO-274/CO-276 tables keyed by `(caretaker count, child count)` carrying all three rows verbatim
  from `D-61.md:955`, and CO-911/CO-912 two-key lookups;
- have the lookup return `unknown` above ten children until CO-275/CO-277 (`each additional`, $67/$90) are
  wired in — today they are read by nothing and a unit of twelve returns `null` (see M-4).

Rule tests: two caretakers + one child → 439/649; no caretaker + two children → 245/362; one caretaker +
zero children → 253/374 (the present values, preserved).

---

### 1.2 Should-fix

**C-6. CO-919: `cw_is_work_eligible_individual` is true for anyone over 18 who is a citizen and not on
SSI, whether or not they or anyone near them receives TANF. The minor-parent exclusion is dead code, and
the rule carries a bare literal 18.**

45 CFR 261.2(n)(1) (`documents/D-60.md:278`, S418 at `sources.md:2220`):

> *Work-eligible individual* means an adult (or minor child head-of-household) **receiving assistance
> under TANF or a separate State program** or a **non-recipient parent living with a child receiving such
> assistance** unless the parent is: (i) A minor parent and not the head-of-household; ...

The derivation is

```
[all, [any, [">=", age, 18], is_head_of_household],
      [not, [all, ["<", age, cw_minor_parent_age_limit], [not, is_head_of_household]]],
      cw_meets_citizenship_requirement, [not, receives_ssi]]
```

Three problems.

*(a) No assistance test at all.* Neither "receiving assistance" nor "living with a child receiving such
assistance" appears. The consequence is visible in the target household: `npx vite-node
scripts/eval-case.ts co CO-01 cw_is_work_eligible_individual` returns **true for p1**, a 79-year-old
entering a nursing facility whose Colorado Works status is `ineligible_no_dependent_child`. In the
designed case it returns true for p5, a 62-year-old OAP client who is in no assistance unit. Fix: add
`[any, cw_eligibility_status is eligible, [exists_related, [parent, caretaker], [of, [P],
cw_eligibility_status is eligible]]]` — or, if the circularity with CO-921 is unwanted, gate on
`[">", cw_unit_size, 0]` plus `cw_meets_income_test` and say so in `precision`.

*(b) The second conjunct is the first conjunct restated.* `[not, [all, [<, age, 18], [not,
is_head_of_household]]]` is, by De Morgan, `[any, [">=", age, 18], is_head_of_household]` — character for
character the first conjunct. It can never change the value. Worse, it is the clause that is supposed to
carry 261.2(n)(1)(i)'s *minor parent* exclusion, and it never reads `cw_has_dependent_child`: the rule
excludes every non-head minor, parent or not, and excludes no minor parent that the age test has not
already excluded. Fix: delete the second conjunct and write the exclusion the text writes —
`[not, [all, cw_has_dependent_child, ["<", age, cw_minor_parent_age_limit], [not, is_head_of_household]]]`
— keeping the first conjunct as the adult/minor-head test.

*(c) Bare literal `18`.* `docs/governance.md:118`'s `name.digits` rule exists to keep values out of rules;
this one puts the value in the derivation instead of the identifier, which is the same defect one level
down, and it is the only bare age literal in either program's items. Two parameters of value 18 already
exist (`cw_dependent_child_age_limit` CO-270, `cw_minor_parent_age_limit` CO-272). Use
`cw_dependent_child_age_limit`, since 261.2(n)'s "adult" is the complement of the minor child the same
statute uses.

**C-7. CO-944 / CO-953: AND-SO is given to SSDI recipients, whom 3.540 excludes by definition.**

9 CCR 2503-5 3.540 (`documents/D-62.md:1709`, S458 at `sources.md:2421`):

> The Aid to the Needy Disabled State Only (AND-SO) program provides **interim** assistance to clients age
> eighteen (18) through fifty-nine (59) ... who are disabled or blind **but have not been approved for
> Supplemental Security Income (SSI) or Social Security Disability Insurance (SSDI)**.

`af_and_so_disability_met` (CO-944) is `[any, is_disabled_ssa, receives_social_security_disability]`, so
receiving SSDI is by itself a qualification for AND-SO, and CO-953's `and_so` branch adds no
"not approved" condition. The statute CO-944 cites, 26-2-111(4)(a) (S442, `sources.md:2270`), does offer
the SSDI route — "or he or she is determined to be disabled and eligible for social security disability
insurance benefits" — but the regulation implementing it makes AND-SO the interim program for people
*waiting* on those determinations, and 3.520.75.B (`D-62.md:775`) confirms the direction of travel: "The
AND-SO client **shall apply for** Supplemental Security Income (SSI) benefits ... the client shall also
apply for Social Security Disability Insurance (SSDI)."

Fix: add `[not, receives_social_security_disability]` and `[not, receives_ssi]` to CO-953's `and_so`
branch (not to CO-944, which states the disability finding rather than the program), and record the
statute/regulation tension as a new OQ alongside OQ-113, since 26-2-111(4)(a) read alone points the other
way. Rule test: age 40, `receives_social_security_disability: true`, low income and resources →
`none`, not `and_so`.

**C-8. CO-945: "determined to be blind and eligible for SSDI" is modeled as "disabled and receiving
SSDI", which is a different determination, and 26-2-111(5)(a)(II) is not modeled at all.**

26-2-111(5)(a) (S443, `sources.md:2280`) has three conjunctive prongs:

> (I) Is blind as defined by section 26-2-103 (3) **or is determined to be blind and eligible for social
> security disability insurance benefits** ...; (II) **Has applied for supplemental security income
> benefits** and complied with any recommendations for referrals made by the county department except for
> good cause shown; **and** (III) Meets the resource eligibility requirements ...

`af_ab_eligible` is `[any, is_blind, [all, is_disabled_ssa, receives_social_security_disability]]`. The
second disjunct reads a *disability* determination where the statute reads a *blindness* determination,
so any SSDI recipient with `is_disabled_ssa` is "Aid to the Blind eligible" — identical to CO-944's test,
which makes AB and AND-SO coextensive for that population and defeats the ordering in CO-953. Prong (II)
is absent entirely, and no open question records its absence (OQ-112 covers the missing regulation,
OQ-117 the AFDC carve-out; neither reaches (II)).

Fix: the second disjunct is `[all, is_blind, receives_social_security_disability]` — which, being
subsumed by the first, means the honest model is `is_blind` alone plus a new supplied fact
`determined_blind_by_ssa` if the distinction is to survive; and add `has_applied_for_ssi` as a conjunct
with a supplied fact and an OQ for the "good cause" exception.

**C-9. CO-953: the `ab` branch is capped at age 59, a cap the statute does not impose.**

CO-953's `ab` branch opens `[<=, age, af_and_max_age]` (59). 3.520.61.A (`documents/D-62.md:527`) states
age ranges for AND-SO and AND-CS and for OAP — it says nothing about Aid to the Blind, and 26-2-111(5)
(S443) states no age condition at all. Because the `oap` branch is tested first, a blind 70-year-old who
fails OAP on resources falls through `and_cs`, `and_so` and `ab` alike and is reported `none`, when the
statute leaves AB open. OQ-112 records that 9 CCR 2503-5 has no AB section; it does not record that the
chapter borrowed AND-SO's age cap for a program the statute does not age-limit. Fix: drop
`[<=, age, af_and_max_age]` from the `ab` branch and add the point to OQ-112's body.

**C-10. CO-943: the five-year bar is applied to OAP. Both the regulation that states the bar and the
regulation that states the citizenship requirement say "for AND only".**

9 CCR 2503-5 3.520.61.C (`documents/D-62.md:531`): "**For AND only**, be a citizen of the United States or
be a qualified non-citizen or legal immigrant as outlined in Sections 3.520.67". 3.520.68.A
(`D-62.md:717`, S452 at `sources.md:2363`): "Qualified non-citizens arriving in the U.S. on or after August
22, 1996, are **barred from receiving AND** for five years". 3.520.67.E (`D-62.md:701`, S451): "all
non-citizens are eligible to apply for **OAP**". And 26-2-111(1)(a) (S441, `sources.md:2260`) includes as a
residency-qualified person "**the person is a legal immigrant who would be otherwise eligible in all
respects except for citizenship**".

`af_meets_citizenship_requirement` (CO-943) applies one test — citizen, or qualified non-citizen past the
bar — and CO-953 conjoins it into the OAP branch as well as the AND branches. OQ-119 records the tension
between 26-2-111(2)(a)(I) and 3.520.67.E, and resolves it for the statute. That resolution is defensible
for *citizenship*; it is not a resolution for the *five-year bar*, which no OAP provision states and which
3.520.68.A affirmatively confines to AND. Fix: split the item — `af_meets_citizenship_requirement_and`
(today's derivation, read by the `and_so`/`and_cs`/`ab` branches) and
`af_meets_citizenship_requirement_oap` (`[any, citizen/us_national, ma_is_qualified_non_citizen]`, no bar),
read by the OAP branch — and extend OQ-119's body to name 3.520.68.A's "for AND" wording.

**C-11. CO-909: the minor-parent deeming ignores the marital-status condition the rule is built on, drops
two of the six unearned-income components CO-908 counts, and silently omits one of the two needs
deductions.**

9 CCR 2503-6 3.605.1.A.4 (`documents/D-61.md:625`, S413 at `sources.md:2165`):

> 4. Income of a non-participant stepparent and a non-participant parent of an **unmarried** minor parent
> ... The countable income equals gross earned income minus the employment disregard of $90, minus the
> maintenance or child support paid to others outside the assistance unit, minus the amounts actually paid
> ... **plus any unearned income** received by the stepparent or non-participant parent. **The needs of the
> stepparent or parent of the minor parent, and the needs of individuals living in the home for whom the
> stepparent or parent are responsible** shall be deducted from the result ...

*(a) Unmarried.* CO-909's guard is `[all, ["<", age, cw_minor_parent_age_limit], cw_has_dependent_child]`.
A married minor parent living with her own parent has that parent's income deemed to her — which the rule's
own title and first sentence exclude. `marital_status` (CO-844) is already a supplied fact and CO-906
already reads it. Fix: add `["=", marital_status, single]` to the guard, and a rule test with
`marital_status: married` expecting 0.

*(b) Two unearned components missing.* CO-909 sums `social_security_income`, `pension_income`,
`unemployment_income`, `other_unearned_income`. `cw_countable_unearned_income` (CO-908) counts those four
**plus** `cash_assistance_income` and `child_support_received`. "any unearned income" does not admit a
shorter list than the program's own unearned definition. A non-participant parent drawing a pension has
her income deemed; the same parent drawing unemployment plus child support has part of it disappear. Fix:
read `[of, [P], cw_countable_unearned_income]` instead of re-enumerating four facts — which also keeps the
two items from drifting apart again.

*(c) The second needs deduction.* OQ-102 says the "needs of individuals living in the home for whom the
... parent are responsible" deduction is not added because "none exist in this batch's target household".
That is not so: in CO-01, p3 is the non-participant parent and p4 — her own seventeen-year-old daughter,
living in the home — is a person for whom she is responsible. The deduction is skipped in the very
household the open question says has nobody to skip. (It happens not to change CO-01's outcome: deducting
the size-2 need standard $331 instead of $253 gives deemed income $1,959 rather than $2,037, still far
above the $331 need standard, so p4's unit remains `ineligible_income`. The household therefore does not
test the rule either way.) Fix: correct OQ-102's body, and add the deduction as
`cw_need_standard_table` for one plus the count of the non-participant parent's other dependants in the
home — or state explicitly in `precision` that it is unmodeled.

**C-12. CO-900: the assistance unit splits on "is a minor parent", where the text splits on "is a minor
parent *who is requesting assistance for their own child*".**

9 CCR 2503-6 3.604.2.C.1 (`documents/D-61.md:129-131`, S408 at `sources.md:2106`):

> a. Dependent child(ren) who live in the home of a caretaker.
> b. Parents of dependent child(ren) who live in the home **unless the child is a minor parent who is
> requesting assistance for their own child** or responsibility is established with another caretaker ...

and 3.604.2.N.3.d (`D-61.md:281`, S411 at `sources.md:2148`): "A minor parent who **is the dependent child
of a caretaker will receive assistance as a child** if approved even if the caretaker is not included in
the assistance unit."

CO-900's edge condition severs the minor parent from her own parent whenever `cw_has_dependent_child` is
true, with no reference to whether she is requesting assistance for that child. For the target household
the answer happens to be right (p4 is requesting for p5, so p3 is not a mandatory member and the units are
`[p3]` and `[p4, p5]`). Change one fact and it is wrong: give the baby SSI. `cw_has_dependent_child` reads
`cw_is_dependent_child` of the related child and never consults unit membership, so p4 still "has a
dependent child" — but her baby is excluded from every assistance unit by 3.604.2.C.3.a (`D-61.md:157`),
so she is not requesting assistance for him, 3.604.2.C.1.b's exception does not fire, and under
3.604.2.N.3.d she belongs in her mother's unit *as a child*. The items instead return `[p3]` and `[p4]`,
and CO-921 denies both for `ineligible_no_dependent_child`: a household that is plainly eligible is
denied twice over.

Fix: add supplied fact `is_requesting_assistance_for_own_child` (supplied by: the Colorado Works
application, county case record; source S408, S411) and conjoin `[of, [P],
is_requesting_assistance_for_own_child]` — and its mirror — to the two `cw_has_dependent_child` terms in
CO-900's edge condition. Add a case-level test in the shape above expecting `[p3, p4]` and `[p4]` → `[p3,
p4]`.

**C-13. CO-906 is read by nothing, so the statute's mandatory bar on approving a minor parent's grant has
no effect on any outcome.**

26-2-706(2)(b) (S403, `sources.md:2046`): "The rules shall provide that an unmarried parent under eighteen
years of age **shall not receive assistance unless** such unmarried parent resides with his or her parent
or other specified caretaker in an adult-supervised home or in any other arrangement approved by the county
department." 3.604.2.N.1 (`documents/D-61.md:263`): "grant payments **may not be approved** unless the minor
parent resides with another adult caretaker or ... an appropriate setting."

`cw_minor_parent_living_arrangement_met` (CO-906) computes this correctly and `cw_eligibility_status`
(CO-921) never reads it. CO-906's `rationale` says so out loud, resting on 3.604.2.N.2.c ("will receive
assistance as an adult if approved"). But N.2.c is about the *unit composition* of an approved minor
parent, not a waiver of N.1's approval condition. Fix: add a branch to CO-921 before the income test —
`[[not, cw_minor_parent_living_arrangement_met], ineligible_status]` — or add an
`ineligible_living_arrangement` option; and a rule test with an unemancipated single minor parent, no
county approval, no parent in the home, expecting the new value rather than `eligible`.

A smaller point inside CO-906: 3.604.2.N.2.b says an emancipated or married minor parent "is not considered
to be living in the home of a caretaker **even if they are living in the home of their parent**". CO-906
reaches the same result by a different route (those two states are their own disjuncts), so nothing is
wrong today, but the `[exists_related, [child], true]` disjunct — "she has a parent in the case" — will
give the wrong answer if a later item asks CO-906 *why* it is satisfied.

### 1.3 Minor

**M-1. An excluded person's unit-level items return vacuous truths and `null`s rather than
not-applicable.** For p3 in the designed case (the SSI child, excluded by 3.604.2.C.3.a) the engine gives
`cw_assistance_unit_members` `[]`, `cw_unit_size` 0, `cw_child_only_unit` **true**, `cw_time_limit_exempt`
**true**, `cw_need_standard` **null**, `cw_grant_standard` **null**, `cw_grant_amount` **null**. The
`true`s are `[all, ...]` and `[=, count, 0]` over an empty set; the `null`s are table lookups at key 0,
which CO-274/CO-276 do not have. `cw_eligibility_status` masks all of it by short-circuiting to
`ineligible_no_dependent_child`, so nothing is presently wrong downstream — but `cw_grant_amount` is a
declared outcome and for this person it reports *cannot determine* rather than "not in an assistance
unit". Fix: give CO-911/CO-912 a `[["=", cw_unit_size, 0], 0]` first branch, or state in CO-914's
`precision` that a person outside every assistance unit has no grant amount.

**M-2. CO-913 picks one of two inconsistent sentences without recording the conflict.** 3.606.1.H
(`documents/D-61.md:959`) says countable income "**shall not exceed** the need standard" — income equal to
the standard passes. 3.606.1.J.4 (`D-61.md:977`) says "If the net countable income **equals or exceeds**
the need standard, the assistance unit is not eligible" — income equal to the standard fails. CO-913 takes
J.4 (strict `<`), which is the better reading, and CO-913-T2 tests exactly the disputed boundary
(income 331, standard 331 → false). But the conflict is in the fetched text and no open question names it.
Fix: add an OQ citing both lines and pointing at CO-913.

**M-3. CO-949 (`af_grant_standard`) is read by nothing.** Its `rationale` says "Needed for af_oap_grant
(CO-951) and af_and_grant (CO-952)"; both read `af_oap_grant_standard` / `af_and_so_grant_standard` /
`af_and_cs_grant_standard` directly. Fix: either point CO-951/CO-952 at CO-949 (which removes the
duplicated `case` on `af_category` from three items) or delete CO-949 and its claim.

**M-4. CO-275 and CO-277 (`each additional child`, $67 and $90) are read by nothing**, and CO-911/CO-912
return `null` for a unit of twelve. Fix with C-5's re-keying: `[+, [lookup, table, 11],
["*", cw_need_standard_each_additional, ["-", cw_child_count, 10]]]` above ten children.

**M-5. Four cross-reference errors in `rationale`/`meaning` fields.** CO-278 says "cw_time_limit_reached
(CO-917)" — CO-917 is `cw_time_limit_exempt`, CO-918 is `cw_time_limit_reached`. CO-280, CO-281 and CO-282
each say "cw_meets_work_participation (CO-919)" — CO-919 is `cw_is_work_eligible_individual`, CO-920 is
`cw_meets_work_participation`. CO-916's `meaning` cites "26-2-706.5(4)(a)(I)" correctly but its own
`rationale` calls CO-921 "cw_eligibility_status (CO-921)" while CO-918's says the same for a different
purpose; harmless, but the four id errors above will mislead anyone tracing dependencies by hand.

**M-6. CO-948 recomputes CO-947's married test instead of reading it.** Both items carry
`[exists_related, [spouse], true]`. If the "married" reading ever changes (3.520.72.A's plain-marriage test
versus SSI's living-together test — CO-947's `precision` already flags the divergence from CO-608), it must
be changed in two places. Fix: add `af_is_married` and have both read it.

**M-7. Adult Financial grants carry cents; Colorado Works drops them.** 3.606.1.K.2 states "Drop the
cents" and CO-914 implements it; no AF provision states a rounding rule and CO-951/CO-952 do none. In the
designed case p1's `af_countable_income` is **167.5**. Correct as drafted — but worth a sentence in
CO-951/CO-952's `precision` so the asymmetry is deliberate rather than accidental.

---

## 2. Completeness

Gaps where the fetched text states a rule this chapter does not model, with the document and section that
would settle each.

**K-1. The budgetary unit is not modeled at all, and the income test is specified over it.** 3.604.2.D
(`documents/D-61.md:163-177`) defines a budgetary unit that includes the assistance unit *plus* "b. The
spouse of a parent or non-parent caretaker who requested assistance, regardless of whether or not the
spouse has requested assistance for themselves ... c. The unborn child of a pregnant parent ... d. The
non-recipient parent(s) of a minor parent ... e. The sponsor of a non-citizen". 3.606.1.J.1-2
(`D-61.md:971-973`) then computes the income test over it: "Apply the appropriate earned income disregards
to the gross earned income of each employed member of **the budgetary unit** ... Add the unearned income
received by each member of **the budgetary unit**". `cw_countable_income` (CO-910) sums over
`cw_assistance_unit_members` only, reaching the non-participant parent of a minor parent through CO-909's
special-case deeming and reaching nobody else. Note that D-61:971's "each employed member" also settles,
in favour of the item, CO-907's `assumption` that the $90 disregard is per person rather than per unit —
that assumption is right and should cite `D-61.md:971`. A `cw_budgetary_unit_members` item and a
CO-910 that sums over it would close both.

**K-2. No Colorado Works sanction exists anywhere in the chapter.** 3.601 (`D-61.md:11`) defines
"Sanction" as "a reduction in Colorado Works grant payments for an established period of time as a result
of not participating in the Workforce Development program", and 3.606.6.B (`D-61.md:1177`) — "Months in
which a **partial** Colorado Works payment was made **due to a sanction** shall be counted toward the time
limit" — presupposes that the payment calculation knows about sanctions. `cw_grant_amount` has no sanction
term, no supplied fact states a sanction, and `cw_meets_work_participation` (CO-920), the one item that
could detect non-participation, is read by nothing. The sanction schedule itself lives in 3.607-3.608,
which D-61 references (`D-61.md:11`, `:1161`) but does not carry in substantive form — so the *amount* of
the reduction cannot be authored from the fetched text and needs a fetch of 9 CCR 2503-6 3.608. Until
then this should be an open question on CO-914, not silence.

**K-3. Disqualified and ineligible members (3.604.2.M, `documents/D-61.md:243`) are not modeled.** The
paragraph states three operative consequences: such persons "shall be **removed from the assistance unit
for the purposes of determining the assistance unit size**"; their "income must be considered when
determining eligibility **without applying income disregards**"; and their month counts toward their own
sixty-month maximum "when a grant payment is received for others in the assistance unit". The six
categories follow (IPV, fraud, fleeing felon, drug felony, no SSN, non-qualified non-citizen). CO-900 keeps
them in the unit, CO-907 gives them the $90 disregard, CO-915 counts nothing for them. OQ-103 mentions
3.605.1.A.6's deeming only. The volume already carries `is_disqualified_for_intentional_program_violation`,
`is_disqualified_drug_felony` and `is_fleeing_felon_or_probation_violator` as supplied facts (they appear
on every person in `tests/cases.yaml`), so the inputs exist and the rule does not.

**K-4. The pregnancy allowance is not modeled and no open question names it.** 3.606.1.G
(`documents/D-61.md:957`): "Upon verification of pregnancy, pregnant parents are eligible for the basic
cash assistance grant **plus a ten dollar ($10.00) pregnancy allowance**. The client is eligible for the
pregnancy allowance through the month in which the pregnancy ends." `is_pregnant` is already a supplied
fact used by the MAGI chapter. A one-parameter, one-term addition to CO-914.

**K-5. Two time-limit provisions cited as sources are not modeled.** S417 is listed on CO-915, CO-917 and
CO-918, and includes 3.606.6.F (`documents/D-61.md:1223`): months of assistance received by an adult while
living in Indian Country or a qualifying Native Alaskan village "**shall not be counted** toward the sixty
(60) cumulative months". `is_indian_or_urban_indian` is already a supplied fact in this volume. Separately,
3.606.6.G (`D-61.md:1217`) caps extensions at "up to twenty percent (20%) of the Statewide caseload" — a
caseload-level constraint no per-person rule can express, which is itself worth stating as an open
question on CO-917 so an approver is not left thinking an approved extension is unconditional.

**K-6. No supplied fact states a person's dollar amount of SSI.** This single omission blocks four stated
rules: 3.533.A.2.b and 3.549.A.2.b's "Subtract any amount received from SSI" before the $20 disregard
(`documents/D-62.md:1625`, `:2141`); 3.546's "not receiving the full SSI benefit standard"
(`D-62.md:2053`); and, through them, OQ-115 and OQ-116. The comparison value already exists —
`ma_ssi_federal_benefit_rate_individual` (CO-235) carries $994 for 2026 from D-58. Fix: add supplied fact
`ssi_income` (money, person-month; supplied by SDX/SVES per 3.547.A, `D-62.md:2067`), which closes OQ-115's
first half and OQ-116 outright and is a precondition for C-4.

**K-7. Two Adult Financial application duties are unmodeled and unrecorded.** 3.520.75.B
(`documents/D-62.md:775`) requires an AND-SO client to apply for SSI and, where work history exists, SSDI,
and to appeal denials; 26-2-111(5)(a)(II) (S443) requires an AB applicant to have applied for SSI. Neither
appears in CO-944, CO-945 or CO-953, and no open question names either. See C-8 for the AB half.

**K-8. `af_countable_income` does not implement the SSI methodology's ordering, and D-53/D-54 are not
cited by it.** 3.533.A / 3.544.A-B / 3.549.A state the $65-and-half earned exclusion and the $20 unearned
disregard, which CO-946 implements. The underlying SSI methodology (20 CFR 416.1112(c), 416.1124(c)(12),
D-53/D-54) applies the $20 general exclusion to unearned income first and rolls any unused remainder onto
earned income; 3.533.A.1.f and 3.549.A.2.f state the rollover for Colorado too. OQ-115 records the
rollover as unmodeled. Beyond OQ-115: 3.544.B.2's married split ("If the client is married, the $20.00
disregard shall be split between the client and the spouse so that no more than a $20.00 disregard is
applied", `sources.md:2447`) is not modeled and not mentioned in any open question; for a married AND-SO
couple applying separately the chapter gives $20 each.

**K-9. Assistance-unit composition beyond the parent/child pair.** CO-900's `precision` lists what is
unmodeled — 3.604.2.C.1.c-e (siblings, half-siblings, the spouse of a pregnant parent), C.2 (all seven
optional-member categories, including C.2.g's parent of a minor parent), E-G (temporary absence), H
(multiple caretakers). That is an honest list and I do not ask for it this round; but C.2.g in particular
interacts with C-12 and with CO-909, because the same person is either an optional unit member or a
deeming source depending on a request the chapter cannot express. One supplied fact
(`requests_assistance_for_self`) would let C.2 be modeled as a family and would retire half of OQ-103.

**K-10. The "table keyed by household size" type cannot express the chart.** Noted under C-5; recording it
here as the type-system half of the same gap. The three-row chart needs either a two-key table type or
three tables plus a selector, and `docs/conventions.md`'s P42 (`table keyed by household size`) supports
neither today. This is a catalog change, which per `docs/conventions.md` is the tech member's to make and
to record — not something CO-274 should paper over.

---

## 3. Cases

### 3.1 CO-01/CO-02, recomputed by hand

`cw_need_standard_table` (One Caretaker): 1 → $253, 2 → $331, 3 → $421. `cw_grant_standard_table`:
1 → $374, 2 → $488, 3 → $620. All from `documents/D-61.md:955`.

**p1 (grandmother, 79), p2 (grandfather, 81).** Neither has a dependent-child edge (their only child p3
is 41), so each unit is the singleton. Size 1 → need $253, grant standard $374. p1's countable income
$1,420 SSA + $610 pension = $2,030; p2's $1,180. `cw_eligibility_status` is
`ineligible_no_dependent_child` for both — right, and reached at CO-921's first branch before income ever
matters. `cw_grant_amount` 0. Matches the expectations and matches 3.604.2.C.1.a.
Adult Financial: p1 is 79 → `af_oap_group` `oap_a`; married, so `af_countable_resources` is
`countable_resources_couple` $46,000 against the $3,000 limit of 3.520.72.A.2 (`D-62.md:833`) → over →
`af_category` `none`, `af_oap_grant` 0. p2 the same. Both right. Note what the case therefore does *not*
test: p1's income is $2,010 after the $20 disregard, already above the $1,005 OAP standard, so the
resource bar and the income bar fail together and CO-953's ordering is untested.

**p3 (mother, 41, undocumented, earns $2,380).** Unit `[p3]` — p4 is a minor parent, so 3.604.2.C.1.b's
exception removes p3 from mandatory inclusion, and CO-900 severs the edge. `ineligible_no_dependent_child`,
grant 0. Right on these facts (see C-12 for the facts on which it is not). `af_category` `none`: age 41 is
under the OAP floor, over AND-SO's... no — she is inside AND-SO's 18-59 range, but `is_disabled_ssa` and
`is_blind` are false, so `af_and_so_disability_met` fails. Right.

**p4 (granddaughter, 17, in school, mother of p5) and p5 (great-grandson, 8 months).** Unit `[p4, p5]`,
size 2, need $331, grant standard $488. Income: neither earns; the whole $2,037 is deemed from p3 under
3.605.1.A.4 — $2,380 − $90 = $2,290, plus $0 unearned, minus the size-1 need standard $253 = **$2,037**.
$2,037 ≥ $331 → `ineligible_income`, `cw_grant_amount` 0. The arithmetic matches the item and the item
matches 3.605.1.A.4.a on everything it models; C-11(c) notes the one deduction it drops, which does not
change this outcome. `af_category` `none` for both (p4 is 17 — under AND-SO's floor of 18 and not blind;
p5 is an infant with no SSI).

Every Colorado Works and Adult Financial expectation in CO-01 and CO-02 is what the items give, and all
but one is what the text gives. What the target household does not exercise is the whole of C-1 (nobody
in an eligible unit earns), C-2/C-3 (`months_of_assistance_received` is 0 for all five and both waiver
facts are false), C-4 (no SSI recipient under 60), C-5 (no two-caretaker unit), C-7, C-9, C-10, C-12 and
K-1. Five of those are blocking.

### 3.2 Designed case CO-06

Design intent: a single household that runs every interaction the target household cannot — a
**two-caretaker** unit (C-5), a **sanctioned** parent with no sanction rule to catch him (K-2), an **SSI
child excluded** from the unit who nonetheless picks up an untested AND-CS grant (C-4, M-1), **counted
months straddling sixty** with an extension on one parent only (C-2, C-3), a **work-participation
failure** that changes nothing (C-6, K-2), and a **62-year-old grandparent** who is an OAP-B client and a
defeated AND-SO candidate, with Social Security as her only income (the A/B split, the $20 disregard, the
resource limit, and the age ordering in CO-953).

Add verbatim to `volumes/co/tests/cases.yaml`:

```yaml
- id: CO-06
  title: Two-parent Colorado Works unit with a sanctioned parent, an SSI child, months straddling the sixty-month limit and a DV extension on one parent; a 62-year-old grandparent on OAP-B
  # Designed in docs/reviews/cash-phase-5.md S3.2 to exercise what CO-01 cannot.
  # The expectations below are what the items at commit 4a5dbb5 give. Four of them are
  # what the fetched text gives and four are not; each divergence is named in a comment
  # and carries a finding id. They are recorded as-is so the fix round can see them move.
  as_of: "2026-10-01"
  relationships:
    - [spouse, p1, p2]
    - [parent, p1, p3]
    - [parent, p1, p4]
    - [parent, p2, p3]
    - [parent, p2, p4]
    - [parent, p5, p1]        # Rosa is Dana's mother, same home; not a CW unit member
    - [grandparent, p5, p3]
    - [grandparent, p5, p4]
  persons:
    p1:
      # Dana, 34, citizen, head of household, earns $400/month, 58 counted months,
      # granted a domestic violence extension of the time limit.
      facts:
        date_of_birth: "1992-03-14"
        sex: female
        citizenship_status: citizen
        state_of_residence: CO
        marital_status: married
        is_head_of_household: true
        is_enrolled_in_school: false
        is_emancipated_minor: false
        county_approved_living_arrangement: false
        receives_ssi: false
        receives_title_iv_foster_adoption_kinship_payment: false
        received_tanf_from_another_state_this_month: false
        months_of_assistance_received: 58
        has_domestic_violence_waiver: true
        has_hardship_extension_approved: false
        is_fleeing_felon_or_probation_violator: false
        is_disabled_ssa: false
        is_blind: false
        receives_social_security_disability: false
        is_disqualified_for_work_requirement_noncompliance: false
        countable_resources_individual: 900
        countable_resources_couple: 1400
      month_defaults:
        earned_income: 400
        social_security_income: 0
        pension_income: 0
        unemployment_income: 0
        cash_assistance_income: 0
        child_support_received: 0
        other_unearned_income: 0
        hours_worked: 60
        work_program_hours: 0
    p2:
      # Marco, 36, citizen, under a Workforce Development sanction (no CW sanction item
      # exists - K-2), 61 counted months, no extension of his own.
      facts:
        date_of_birth: "1990-07-02"
        sex: male
        citizenship_status: citizen
        state_of_residence: CO
        marital_status: married
        is_head_of_household: false
        is_enrolled_in_school: false
        is_emancipated_minor: false
        county_approved_living_arrangement: false
        receives_ssi: false
        receives_title_iv_foster_adoption_kinship_payment: false
        received_tanf_from_another_state_this_month: false
        months_of_assistance_received: 61
        has_domestic_violence_waiver: false
        has_hardship_extension_approved: false
        is_fleeing_felon_or_probation_violator: false
        is_disabled_ssa: false
        is_blind: false
        receives_social_security_disability: false
        is_disqualified_for_work_requirement_noncompliance: true
        countable_resources_individual: 500
        countable_resources_couple: 1400
      month_defaults:
        earned_income: 0
        social_security_income: 0
        pension_income: 0
        unemployment_income: 0
        cash_assistance_income: 0
        child_support_received: 0
        other_unearned_income: 0
        hours_worked: 0
        work_program_hours: 0
    p3:
      # Alma, 9, citizen, receives SSI on her own disability: excluded from the
      # assistance unit by 3.604.2.C.3.a.
      facts:
        date_of_birth: "2017-05-09"
        sex: female
        citizenship_status: citizen
        state_of_residence: CO
        marital_status: single
        is_head_of_household: false
        is_enrolled_in_school: true
        is_emancipated_minor: false
        county_approved_living_arrangement: false
        receives_ssi: true
        receives_title_iv_foster_adoption_kinship_payment: false
        received_tanf_from_another_state_this_month: false
        months_of_assistance_received: 0
        has_domestic_violence_waiver: false
        has_hardship_extension_approved: false
        is_fleeing_felon_or_probation_violator: false
        is_disabled_ssa: true
        is_blind: false
        receives_social_security_disability: false
        countable_resources_individual: 1500
        countable_resources_couple: 0
      month_defaults:
        earned_income: 0
        social_security_income: 0
        pension_income: 0
        unemployment_income: 0
        cash_assistance_income: 0
        child_support_received: 0
        other_unearned_income: 0
        hours_worked: 0
        work_program_hours: 0
    p4:
      # Theo, 4, citizen, the unit's only countable dependent child.
      facts:
        date_of_birth: "2022-01-18"
        sex: male
        citizenship_status: citizen
        state_of_residence: CO
        marital_status: single
        is_head_of_household: false
        is_enrolled_in_school: false
        is_emancipated_minor: false
        county_approved_living_arrangement: false
        receives_ssi: false
        receives_title_iv_foster_adoption_kinship_payment: false
        received_tanf_from_another_state_this_month: false
        months_of_assistance_received: 0
        has_domestic_violence_waiver: false
        has_hardship_extension_approved: false
        is_fleeing_felon_or_probation_violator: false
        is_disabled_ssa: false
        is_blind: false
        receives_social_security_disability: false
        countable_resources_individual: 0
        countable_resources_couple: 0
      month_defaults:
        earned_income: 0
        social_security_income: 0
        pension_income: 0
        unemployment_income: 0
        cash_assistance_income: 0
        child_support_received: 0
        other_unearned_income: 0
        hours_worked: 0
        work_program_hours: 0
    p5:
      # Rosa, 62, citizen, widowed, Dana's mother in the same home; SSA disability
      # determination and $900/month SSDI; $1,200 countable resources.
      facts:
        date_of_birth: "1964-05-20"
        sex: female
        citizenship_status: citizen
        state_of_residence: CO
        marital_status: other
        is_head_of_household: false
        is_enrolled_in_school: false
        is_emancipated_minor: false
        county_approved_living_arrangement: false
        receives_ssi: false
        receives_title_iv_foster_adoption_kinship_payment: false
        received_tanf_from_another_state_this_month: false
        months_of_assistance_received: 0
        has_domestic_violence_waiver: false
        has_hardship_extension_approved: false
        is_fleeing_felon_or_probation_violator: false
        is_disabled_ssa: true
        is_blind: false
        receives_social_security_disability: true
        countable_resources_individual: 1200
        countable_resources_couple: 0
      month_defaults:
        earned_income: 0
        social_security_income: 900
        pension_income: 0
        unemployment_income: 0
        cash_assistance_income: 0
        child_support_received: 0
        other_unearned_income: 0
        hours_worked: 0
        work_program_hours: 0
  expect:
    p1:
      cw_assistance_unit_members: [p1, p2, p4]
      cw_unit_size: 3
      cw_countable_income: {"2026-10": 310}
      cw_need_standard: 421          # C-5: the text's Two Caretakers/1 child row is 439
      cw_grant_standard: 620         # C-5: the text's Two Caretakers/1 child row is 649
      cw_grant_amount: {"2026-10": 310}   # C-1 + C-5: the text gives 649 - 132 = 517
      cw_eligibility_status: {"2026-10": eligible}   # C-2: the unit contains a 61-month adult
      cw_time_limit_exempt: true
      cw_time_limit_reached: false
      cw_is_work_eligible_individual: true
      cw_meets_work_participation: {"2026-10": false}
      af_category: {"2026-10": none}
      af_oap_grant: {"2026-10": 0}
      af_and_grant: {"2026-10": 0}
    p2:
      cw_assistance_unit_members: [p1, p2, p4]
      cw_unit_size: 3
      cw_countable_income: {"2026-10": 310}
      cw_grant_amount: {"2026-10": 310}
      cw_eligibility_status: {"2026-10": time_limit_reached}
      cw_time_limit_exempt: false    # C-3: the extension belongs to the unit, not to p1
      cw_time_limit_reached: true
      cw_is_work_eligible_individual: true
      cw_meets_work_participation: {"2026-10": false}   # K-2: no sanction follows from this
      af_category: {"2026-10": none}
      af_oap_grant: {"2026-10": 0}
      af_and_grant: {"2026-10": 0}
    p3:
      cw_assistance_unit_members: []
      cw_unit_size: 0
      cw_countable_income: {"2026-10": 0}
      cw_eligibility_status: {"2026-10": ineligible_no_dependent_child}
      cw_child_only_unit: true       # M-1: vacuously true over an empty unit
      cw_time_limit_reached: false
      af_category: {"2026-10": and_cs}
      af_oap_grant: {"2026-10": 0}
      af_and_grant: {"2026-10": 967} # C-4: no income, resource or FBR test is applied
    p4:
      cw_assistance_unit_members: [p1, p2, p4]
      cw_unit_size: 3
      cw_countable_income: {"2026-10": 310}
      cw_grant_amount: {"2026-10": 310}
      cw_eligibility_status: {"2026-10": eligible}
      cw_time_limit_exempt: false
      cw_time_limit_reached: false
      cw_is_work_eligible_individual: false
      af_category: {"2026-10": none}
      af_oap_grant: {"2026-10": 0}
      af_and_grant: {"2026-10": 0}
    p5:
      cw_assistance_unit_members: [p5]
      cw_unit_size: 1
      cw_countable_income: {"2026-10": 900}
      cw_grant_amount: {"2026-10": 0}
      cw_eligibility_status: {"2026-10": ineligible_no_dependent_child}
      cw_time_limit_reached: false
      cw_is_work_eligible_individual: true   # C-6: she receives no TANF and lives with no TANF child of her own
      af_oap_group: oap_b
      af_countable_income: {"2026-10": 880}
      af_meets_resource_limit: true
      af_category: {"2026-10": oap_b}
      af_oap_grant: {"2026-10": 125}
      af_and_grant: {"2026-10": 0}
```

**Derivation of each outcome, from the text.**

*`cw_assistance_unit_members` = `[p1, p2, p4]` (p1, p2, p4); `[]` (p3); `[p5]` (p5).* 3.604.2.C.1.a
(`documents/D-61.md:129`) puts p4 in as a dependent child living in the home of a caretaker; C.1.b
(`:131`) puts both p1 and p2 in as his parents, the minor-parent exception not applying to anyone here.
C.3.a (`:157`) excludes p3 outright — "Individuals receiving SSI payments" — so she is in no unit and her
own value is empty. p5 reaches p1 only over a parent edge whose child, at 34, is not a dependent child, so
CO-900 does not cross it and her unit is herself. All four values are what the text gives.

*`cw_unit_size` = 3 / 0 / 1.* `[count, cw_assistance_unit_members]` (CO-903). Note that the size the
standards chart wants is not this number but the pair (2 caretakers, 1 child) — see C-5.

*`cw_countable_income` = $310.* p1 earns $400; 3.606.2.A.1 (`D-61.md:989`) at application deducts $90 →
$310. p2 and p4 earn nothing. No unearned income; no minor parent, so CO-909 deems nothing. $310 is
therefore the figure 3.606.1.J.3 compares against the need standard — and it is the right figure *for that
comparison*. It is the wrong figure for the payment (C-1).

*`cw_grant_amount` = $310.* The items: grant standard $620 (One Caretaker, size 3) minus $310. The text:
the unit passes the income test ($310 < $439, the Two Caretakers/one-child need standard at
`D-61.md:955`), so 3.606.2.A.1's second sentence applies the 67% disregard for the payment — $400 × 0.33 =
$132 — and 3.606.1.K.1-2 deducts it from the Two Caretakers/one-child grant standard: $649 − $132 =
**$517**, cents dropped. The chapter pays $310. The $207 difference is C-1 plus C-5.

*`cw_eligibility_status` = `eligible` / `time_limit_reached` / `ineligible_no_dependent_child`.* CO-921
tests in order. p3 and p5 stop at the first branch: no dependent child in their (empty, or singleton-adult)
units. For p1, p2 and p4, residency and citizenship pass; the time limit then splits the unit, because
CO-918 reads each person's own count — p2 at 61 months with no extension of his own is
`time_limit_reached`, p1 at 58 months with a domestic violence extension and p4 at 0 are not, and both fall
through to the income test, which $310 < $421 passes. Under 3.606.6.C (`D-61.md:1179`) the unit contains an
adult past sixty months and the correct answer for **all three** is one answer, turning on whether *the
unit* holds an extension. That is C-2 and C-3, and this case is the evidence for both.

*`cw_time_limit_reached` = false / true / false / false / false.* CO-918 = months ≥ 60 and not exempt.
p2: 61 ≥ 60 and `cw_time_limit_exempt` false → true. p1: 58 < 60 → false regardless of the extension.
p4: 0, and `cw_time_limit_exempt` false, because he is neither child-only nor waivered — the unit contains
two adults. Under 45 CFR 264.1(b)(1)(i) (`documents/D-60.md:455`) p4's months would never have counted
anyway; under 3.606.6.C the unit-level answer is the one that matters.

*`af_category` = `none` (p1, p2, p4) / `and_cs` (p3) / `oap_b` (p5).* p1 (34) and p2 (36) are inside
3.520.61.A's AND-SO range but have no disability or blindness, so `af_and_so_disability_met` fails; p4 (4)
is inside AND-CS's 0-59 range but receives no SSI. p3 is 9, receives SSI, and is disabled: CO-950 is
satisfied and CO-953's second branch takes her with no further test (C-4). p5 is 62: `af_is_oap_age`
(60+, 3.530 / 26-2-111(2)(a)(I), `sources.md:2392`) is true; 62 < the assumed 65 split, so `af_oap_group`
is `oap_b` (OQ-111 — see §3.3); residency, citizenship and the $2,000 unmarried resource limit
(3.520.72.A.1, `documents/D-62.md:833`) all pass; and her countable income $880 < the $1,005 OAP grant
standard (3.530.A, `D-62.md:1537`), which is what 3.533's "equals or exceeds ... shall be denied"
(`D-62.md:1609`) requires. She is `oap_b`. Her AND-SO candidacy — a real total disability under
26-2-103(14)(a) and an SSDI award — is defeated twice over and correctly: 3.520.61.A caps AND-SO at 59
(`D-62.md:527`), and 3.540 excludes anyone "approved for ... SSDI" (`D-62.md:1709`, which the items do not
yet implement — C-7 — but which does not change her answer).

*`af_oap_grant` = $125 for p5, 0 for everyone else.* 3.532.B (`sources.md:2401`): "the amount of the
client's authorized OAP grant payment shall be determined by deducting the client's total countable income
from the OAP grant standard". Her countable income: earned $0; unearned $900 SSDI, minus the $20 disregard
of 3.533.A.2.c = **$880**. $1,005 − $880 = **$125**. This is what the items give and what the text gives.

*`af_and_grant` = $967 for p3, 0 for everyone else.* CO-952's `and_cs` branch: $967 (3.546.A,
`documents/D-62.md:2055`) minus `af_countable_income` $0. Under the text it should not be $967. 3.546
limits AND-CS to SSI recipients "not receiving the full SSI benefit standard"; 3.549.A.2.b
(`D-62.md:2141`) subtracts the SSI amount before the $20 disregard and 3.549 then compares the result to
the standard. With the 2026 federal benefit rate of $994 (CO-235, from D-58) a full-rate recipient has
countable income $974 ≥ $967 and is due nothing; a partial-rate recipient is due the difference. The
chapter pays a nine-year-old the whole standard because no branch of CO-953 tests her income, her $1,500
in resources, or her SSI amount. That is C-4, and closing it needs K-6's `ssi_income`.

### 3.3 Facts set only to make the rules resolve

Three in the designed case, flagged so the fix round does not mistake them for policy:

- **`is_disqualified_for_work_requirement_noncompliance: true` on p2 does nothing.** It is the only fact
  in this volume that can say "sanctioned", and it is a SNAP fact (CO-0xx) read by the SNAP chapter. No
  Colorado Works item reads it, and `cw_meets_work_participation` — which correctly returns false for p2
  on 0 hours — is read by nothing either. The case states the sanction so that K-2's gap is visible on a
  real household; when a Colorado Works sanction item lands, p2's `cw_grant_amount` share should change
  and this fact should be replaced by a Colorado Works-specific one.
- **`has_domestic_violence_waiver: true` on p1** is stated in the item's *meaning* sense (a granted
  extension), not in 3.604.5's sense (an FVO waiver, which does not stop the clock). See C-3(b). If the
  fact is renamed, rename it here too.
- **`marital_status: other` on p5** — the supplied fact's option list (CO-844) is
  `[single, married, other]`, so a widow is `other`. Correct as the vocabulary stands; worth noting that
  the vocabulary was authored for 3.604.2.N's single/not-single distinction and carries no more resolution
  than that.

And one in the target household, carried forward: **`months_of_assistance_received: 0` on all five persons
of CO-01/CO-02** means the entire time-limit apparatus — CO-915, CO-917, CO-918 and CO-921's
`time_limit_reached` branch — is exercised only by rule tests in the target household. CO-06 fixes that.

---

## Summary for the fix round

Blocking first, then should-fix, then minor and completeness.

| id | file(s) | change |
|---|---|---|
| **C-1** | `cash/CO-914.yaml`, `cash/CO-907.yaml`, new `parameters/CO-283.yaml`, new `cash/CO-9xx`, `open-questions.md` (OQ-105) | Add the 67% payment disregard (3.606.2.A.1, `D-61.md:989`): new rate parameter and payment-income items; CO-914 deducts payment income, not test income; rewrite OQ-105, which mis-states the gap. |
| **C-2** | `cash/CO-918.yaml`, `cash/CO-915.yaml` | Make the sixty-month test unit-level — any adult (or minor head-of-household) member at 60+ months, per 3.606.6.C (`D-61.md:1179`) and 45 CFR 264.1(a) — and stop counting months for a member who is neither head-of-household nor spouse (264.1(b)(1)(i)). |
| **C-3** | `cash/CO-917.yaml`, `supplied/CO-846.yaml` | Read the extension over the assistance unit, not the person; rename `has_domestic_violence_waiver` → `has_domestic_violence_extension_approved` (3.604.5.A.1.b, `D-61.md:517`); add the disqualified-member bar. |
| **C-4** | `cash/CO-953.yaml`, `cash/CO-950.yaml` | Put the income, resource and citizenship tests on the `and_cs` branch (3.520.61, `D-62.md:525`; 3.549), and the FBR test on CO-950 once `ssi_income` exists. |
| **C-5** | `parameters/CO-274.yaml`, `CO-276.yaml`, `cash/CO-911.yaml`, `CO-912.yaml`, new caretaker/child-count items, `open-questions.md` (OQ-101) | Carry all three rows of the 3.606.1.F chart (`D-61.md:955`) keyed by caretaker count and child count; return `unknown` for a composition the tables do not cover. |
| **C-6** | `cash/CO-919.yaml` | Add 45 CFR 261.2(n)'s assistance test; delete the tautological second conjunct and write the minor-parent exclusion with `cw_has_dependent_child`; replace the literal `18` with `cw_dependent_child_age_limit`. |
| **C-7** | `cash/CO-953.yaml`, new OQ | Add "not approved for SSI or SSDI" to the `and_so` branch (3.540, `D-62.md:1709`) and record the 26-2-111(4)(a) tension. |
| **C-8** | `cash/CO-945.yaml`, new supplied facts | Make the second AB disjunct read blindness, not disability; add 26-2-111(5)(a)(II)'s "has applied for SSI" prong. |
| **C-9** | `cash/CO-953.yaml`, `open-questions.md` (OQ-112) | Drop the age-59 cap from the `ab` branch; the statute imposes none. |
| **C-10** | `cash/CO-943.yaml`, `cash/CO-953.yaml`, `open-questions.md` (OQ-119) | Split the citizenship item so the five-year bar applies to AND only (3.520.61.C, 3.520.68.A). |
| **C-11** | `cash/CO-909.yaml`, `open-questions.md` (OQ-102) | Add `marital_status = single`; read `cw_countable_unearned_income` instead of four of its six components; correct OQ-102's claim that the second needs deduction has nobody to apply to. |
| **C-12** | `cash/CO-900.yaml`, new supplied fact | Condition the minor-parent split on `is_requesting_assistance_for_own_child` (3.604.2.C.1.b, `D-61.md:131`; 3.604.2.N.3.d, `:281`). |
| **C-13** | `cash/CO-921.yaml` | Gate eligibility on `cw_minor_parent_living_arrangement_met`, which today no item reads (26-2-706(2)(b); 3.604.2.N.1). |
| **M-1** | `cash/CO-911.yaml`, `CO-912.yaml`, `CO-914.yaml` | Return 0 (or state not-applicable) for a person in no assistance unit instead of `null`/vacuous `true`. |
| **M-2** | `open-questions.md` | New OQ on 3.606.1.H "shall not exceed" vs 3.606.1.J.4 "equals or exceeds", pointing at CO-913. |
| **M-3** | `cash/CO-949.yaml`, `CO-951.yaml`, `CO-952.yaml` | Either wire CO-949 into the two grant items or delete it; today it is an orphan. |
| **M-4** | `cash/CO-911.yaml`, `CO-912.yaml` | Use CO-275/CO-277 above ten children; both parameters are unread and both lookups return `null`. |
| **M-5** | `parameters/CO-278.yaml`, `CO-280.yaml`, `CO-281.yaml`, `CO-282.yaml` | Fix four wrong item ids in `rationale` (CO-917→CO-918; CO-919→CO-920). |
| **M-6** | `cash/CO-947.yaml`, `CO-948.yaml` | Factor the married test into one item. |
| **M-7** | `cash/CO-951.yaml`, `CO-952.yaml` | State in `precision` that Adult Financial grants carry cents while Colorado Works drops them. |
| **K-1** | new `cw_budgetary_unit_members`, `cash/CO-910.yaml`, `cash/CO-907.yaml` | Model 3.604.2.D (`D-61.md:163`) and sum the income test over it (3.606.1.J.1-2, `:971`); cite `:971` on CO-907's per-person assumption, which it vindicates. |
| **K-2** | new OQ on `cash/CO-914.yaml`; fetch 9 CCR 2503-6 3.608 | No Colorado Works sanction exists; 3.606.6.B presupposes one. The reduction schedule is not in D-61. |
| **K-3** | new items, `open-questions.md` (OQ-103) | Model 3.604.2.M (`D-61.md:243`): remove disqualified members from unit size, count their income without disregards, count their months. |
| **K-4** | `cash/CO-914.yaml`, new parameter | Add the $10 pregnancy allowance (3.606.1.G, `D-61.md:957`). |
| **K-5** | `cash/CO-915.yaml`, `CO-917.yaml`, `open-questions.md` | Model 3.606.6.F's Indian Country exemption; record 3.606.6.G's 20% statewide cap as an OQ. |
| **K-6** | new supplied fact `ssi_income` | Precondition for C-4 and for closing OQ-115's first half and OQ-116; the comparison value (CO-235, $994, from D-58) already exists. |
| **K-7** | `cash/CO-944.yaml`, `CO-945.yaml`, `open-questions.md` | Record 3.520.75.B's duty to apply for SSI/SSDI and 26-2-111(5)(a)(II). |
| **K-8** | `cash/CO-946.yaml`, `open-questions.md` (OQ-115) | Add 3.544.B.2's married split of the $20 disregard, which no open question names. |
| **K-9** | `cash/CO-900.yaml`, new supplied fact | Optional members (3.604.2.C.2), especially C.2.g, which interacts with C-12 and CO-909. |
| **K-10** | `docs/conventions.md` (P42) | A two-key table type, or the three-table-plus-selector alternative, for the 3.606.1.F chart — a catalog change, per conventions the tech member's to record. |
| **§3.2** | `volumes/co/tests/cases.yaml` | Add CO-06 verbatim. It is green against the items at this commit and turns red on C-1, C-2, C-3, C-4, C-5 and C-6 as each is fixed — which is the point. |
