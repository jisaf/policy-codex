# Policy review: Colorado volume, SNAP chapter (CO-300..CO-418, CO-100..CO-176, CO-001..CO-072)

Reviewer role: SNAP policy owner. Read-only review against volumes/co/documents/D-1..D-25 and
volumes/co/sources.md (S1..S135). Both `npm run governance -- --volume co` and
`CHECK_BASE=origin/main npm run check -- --volume co` pass at the reviewed commit (4736bd7);
governance reports 0 errors, 136 warnings (90 dup.similar, 40 supplied.single-consumer, 6 dup.shape).

Findings are grouped: (1) correctness, (2) completeness, (3) cases. Each gives severity, item id(s),
the document text with its line, what the item does, and the fix.

---

## 1. Correctness

### 1.1 Blocking

**C-1 (blocking). CO-336 / CO-338 / CO-341 / CO-342: a person with an empty SNAP household is
classified Basic Categorically Eligible.**

`snap_household_all_members_receive_categorical_assistance` (CO-336) is
`[not, [exists, snap_household_members, [not, [any, receives_ssi, receives_tanf_cash,
receives_general_assistance]]]]`. Over an empty group the inner `exists` is false, so the fact is
`true` vacuously; CO-337 is likewise false, so CO-338 is true and CO-341 returns
`basic_categorical`. I confirmed this on the live case:

```
$ npx vite-node scripts/eval-case.ts co CO-01 snap_eligibility_category
p1 snap_eligibility_category = "basic_categorical"
```

p1 is the institutionalized grandmother whose `snap_household_members` is `[]`. 10 CCR 2506-1
4.206,C,1,a (S47, sources.md:315) reads "Households in which **all members receive**, or are
authorized to receive, SSI, Colorado Works (CW), Old Age Pension (OAP), Aid to the Needy Disabled
(AND), Aid to the Blind (AB)". There is no household and no member; there is nothing to be
categorically eligible. The consequence is not cosmetic: CO-342 (`snap_is_categorically_eligible`)
becomes true for her, which deems the gross income test (CO-347), the net income test (CO-382) and
the resource test (CO-344) met. Only the `snap_household_size < 1` arm of CO-387, tested first,
hides it. Any future item that reads CO-342 before the size test inherits the error.

Fix: add a non-empty guard. In CO-336, `[all, [">=", [count, snap_household_members], 1],
[not, [exists, ...]]]`; or, preferably, make CO-338 `[all, [">=", snap_household_size, 1],
snap_household_all_members_receive_categorical_assistance, [not, CO-337]]` so both BCE and ECE
inherit it (CO-340's income arm is `2965 <= limit`, which is also vacuously true at gross income 0
for an empty unit).

**C-2 (blocking). CO-415: `hours_worked` and `work_program_hours` are added, but the supplied fact
`hours_worked` already includes work-program hours.**

CO-022 (`hours_worked`) states its meaning as "The number of hours the person worked in the month,
**for pay or in a work program**." CO-415 derives
`[">=", ["+", [otherwise, hours_worked, 0], [otherwise, work_program_hours, 0]], 80]`. A person who
does 45 hours of paid work and 45 hours of a work program, reported honestly, reaches 90+45 = 135
under this rule if the reporter follows CO-022's meaning, or 90 if they do not. The double count
runs in the direction of finding the ABAWD work requirement met when it is not.
7 U.S.C. 2015(o)(2)(A)-(C) (S127, sources.md:552) and 7 CFR 273.24(a)(1)(iii) (S129,
sources.md:592) authorise "any combination" summing to 20 hours a week — a sum, not a double count.

Fix: narrow CO-022's meaning to paid employment only ("hours the person worked for pay, including
self-employment"), which is also what CO-402/CO-404 (work-registration employment exemption) and
CO-407 (student 20-hour exemption) need it to mean, and leave work-program participation to
`work_program_hours` (CO-048). This is a supplied-fact meaning change, so it needs a Data steward
signature as well as SNAP policy owner.

### 1.2 Should-fix

**C-3 (should-fix). CO-381 / CO-334: no rounding of income calculations; 7 CFR 273.10(e)(1)(ii)(A)
requires it.**

D-14 (S102, sources.md:897): "(A) Round down each income and allotment calculation that ends in 1
through 49 cents and round up each calculation that ends in 50 through 99 cents". The chapter
rounds exactly once, at CO-384 (`ceil` of 30% of net income, the (e)(2)(ii)(A)(1) election). Gross
income (CO-334), the excess shelter deduction (CO-379) and net income (CO-381) all carry cents;
CO-01/CO-02 expect `snap_household_net_income: 2198.5`, a figure the regulation does not permit as
a net income. The conventions already have the pattern: P41 `[number] rounded to the nearest whole
dollar` (halves round up), docs/conventions.md.

Fix: wrap CO-381 in P41 (`round`), and — since (e)(1)(ii)(A) says "each income calculation" —
CO-334 and CO-379 too. Record the (e)(1)(ii)(B) alternative (round to the nearest $1 at each step
vs. once at the end) as an OQ alongside OQ-23 if no Colorado document states the election. In
CO-01 this changes the expected `snap_household_net_income` from 2198.5 to 2199 and leaves the
allotment at 125 (see 3.1), so the fix is cheap.

**C-4 (should-fix). CO-385: `snap_allotment` returns the minimum allotment for a one- or two-person
household that is not eligible.**

CO-385's first case arm is `[all, [<=, snap_household_size, 2], snap_meets_net_income_test]`. The
net income test is only one of four eligibility conditions CO-386 applies. A two-person household
over the resource limit, or over the 130% gross limit under Standard Eligibility, still gets
`snap_allotment = 24`. `snap_allotment` is a declared program outcome in volume.yaml, so it is
exported and read on its own. D-14 (S104, sources.md:917) conditions the floor on "all **eligible**
one-person and two-person households".

Fix: condition the floor on the eligibility conditions other than the allotment test — i.e. gate on
`[all, snap_meets_gross_income_test, snap_meets_net_income_test, snap_meets_resource_limit]` — and
floor the whole item at 0 when those fail, so `snap_allotment` is 0 for an ineligible household.
(CO-386's `[">", snap_allotment, 0]` stays non-circular because the gate does not read CO-386.)

**C-5 (should-fix). CO-380: the homeless shelter deduction is given to a household that incurs no
shelter costs.**

10 CCR 2506-1 4.407.3,C (S97, sources.md:846) closes with: "Households experiencing homelessness
that **incur no shelter costs** during the month shall not be eligible for the homeless shelter
deduction." 7 CFR 273.9(d)(6)(i) (S92, sources.md:803) says the same from the other side: the
deduction goes to households "who are **not receiving free shelter** throughout the month", and
permits the State agency to make a household with extremely low shelter costs ineligible. CO-380
tests only that every member of `snap_household_members` is homeless and that the flat $198.99
beats the computed excess shelter deduction. A household with `shelter_cost_monthly` 0 and
`utility_allowance_amount` 0 — the exact configuration every person in CO-01/CO-02 except p2
carries — would take the flat deduction if `is_homeless` were true for all.

Fix: add `[">", snap_shelter_costs, 0]` to CO-380's condition, citing S97.

**C-6 (should-fix). CO-014 (`receives_general_assistance`) is read in CO-336 as standing in for the
Old Age Pension, which contradicts the fact's own stated meaning.**

CO-014's meaning: "The person receives state general assistance benefits **based on disability or
blindness criteria**." That wording is drawn from 7 CFR 271.2's elderly-or-disabled prong (S6,
sources.md:72) and is what CO-302 needs. CO-336 then reads the same fact as evidence of OAP, AND
and AB receipt for BCE (S47, sources.md:315). OAP is an age-based program (65 and over, or 60 with
AND), not a disability-criteria program, so a household of pure OAP recipients — the commonest BCE
household in Colorado — is not BCE under the model as written. OQ-11 records the substitution but
describes it as a gap in the interface; it is in fact a contradiction between a fact's meaning and
a rule that reads it.

Fix: add a supplied fact `receives_adult_financial_cash` (or `receives_oap`) for Colorado Adult
Financial money payments (OAP-A/OAP-B, AND-SO/AND-CS, AB) and have CO-336 read that fact instead of
`receives_general_assistance`; leave CO-014 to CO-302 alone. Amend OQ-11 to say the substitution was
wrong rather than merely approximate.

**C-7 (should-fix). CO-343 / CO-344: the resource test is run on liquid resources only.**

CO-031's meaning: "The person's own countable **liquid** resources (cash, bank accounts, and
similar) under 7 CFR 273.8". CO-343 sums exactly that fact and CO-344 compares it to the $3,000 /
$4,500 limits of S56 (sources.md:446) and 10 CCR 2506-1 4.408,E (S57, sources.md:459). Those limits
are limits on **countable resources** under 273.8, which include non-liquid countable resources
(non-excluded vehicles, non-homestead real property, non-recurring lump sums). The chapter
therefore under-counts resources for every Standard Eligibility household. It does not bite in
CO-01/CO-02 because the household is categorically eligible and resource-exempt under 4.408,A
(S57, sources.md:455), which is exactly why it is easy to miss.

Fix: either rename and re-mean CO-031 as `countable_resources_snap` covering all 273.8 countable
resources (and keep a separate liquid fact for the expedited-service test at CO-348, which does
require *liquid* resources per 7 CFR 273.2(i)(1) — S58, sources.md:468), or add a second supplied
fact for non-liquid countable resources and sum both in CO-343. Note that CO-348 is *correct* to use
the liquid fact; only CO-343/CO-344 are wrong.

**C-8 (should-fix). CO-306 borrows `snap_parental_control_age` (CO-102) for an immigration rule.**

CO-306's "under 18" arm is `["<", snap_age, snap_parental_control_age]`. CO-102 is the household-
composition parameter for 7 CFR 273.1(b)(1)(iii) / 4.304.1.A.2 (S2, S4). The under-18 exemption from
the five-year bar is a different rule with a different source: 8 U.S.C. 1612(a)(2)(J) (S24,
sources.md:248-249, "shall not apply to any individual who is under 18 years of age") and
10 CCR 2506-1 4.305,B,3,c (S14, sources.md:154). The two happen to be 18 today; nothing keeps them
tied. A reader tracing CO-306's provenance is sent to the wrong section.

Fix: add a parameter `snap_immigrant_child_exemption_age` = 18, sources [S14, S24], and have CO-306
read it.

**C-9 (should-fix). CO-405: `is_enrolled_in_school` is treated as an exemption without the
half-time condition the text states.**

7 CFR 273.7(b)(1)(viii) (S125, sources.md:524; D-11.md:51) exempts "A student **enrolled at least
half-time** in any recognized school, training program, or institution of higher education."
10 CCR 2506-1 4.310.3,D (S126, sources.md:538) says the same ("enrolled at least half-time, as
defined by the educational facility"). CO-405's arm is the bare fact `is_enrolled_in_school`
(CO-020: "enrolled in a secondary ... school program" — no half-time qualifier). A person enrolled
in one evening class is exempted from work registration.

Fix: add a supplied fact `is_enrolled_school_half_time`, or amend CO-020's meaning to "enrolled at
least half time in a secondary ... school program" and cite S125/S126 on it.

**C-10 (should-fix). CO-403 omits self-employment from the weekly-earnings prong.**

7 CFR 273.7(b)(1)(vii) (S123, sources.md:505) covers "An employed **or self-employed** person
working a minimum of 30 hours weekly or earning weekly wages at least equal to the Federal minimum
wage multiplied by 30 hours". CO-403 reads `earned_income` only; `self_employment_net_income`
(CO-024) is left out, although CO-330 correctly adds the two for income purposes. A self-employed
applicant with no W-2 wages fails the earnings prong.

Fix: CO-403 should read `["+", earned_income, self_employment_net_income]` for the month, as CO-330
does.

### 1.3 Items I checked and believe are right, where the point is subtle

These matter because each is a place an implementer would plausibly "fix" the item into error.

**R-1. CO-332 / CO-335 / CO-373: the child support exclusion is subtracted from gross income but
*not* from the earned income deduction base — and that is exactly right.**
7 CFR 273.9(d)(2) (S90, sources.md:787; D-13.md:277) says the 20% deduction is computed on gross
earned income "except that the State agency **must count any earnings used to pay child support
that were excluded** from the household's income in accordance with the child support exclusion in
paragraph (c)(17)". CO-332 subtracts `child_support_paid_legally_obligated`; CO-335 sums
`snap_person_earned_income` (CO-330), which does not. So the excluded child support still earns the
20% deduction. Correct, and non-obvious. Colorado's 4.407.5,A (S99, sources.md:865) supplies the
exclusion election itself.

**R-2. CO-333: prorating an ineligible non-citizen's income *after* the child support exclusion is
what both texts require.** 10 CCR 2506-1 4.411.1,B,2,c (S107, sources.md:935): "Legally obligated
child support payments are deducted **before** prorating income." 7 CFR 273.11(c)(2)(ii)
(D-15.md, "(2) SSN disqualifications..."): the pro rata share is calculated "by **first subtracting
the allowable exclusions** from the ineligible member's income and dividing the income evenly among
the household members, including the ineligible members." CO-333 prorates
`snap_person_gross_income`, which is post-exclusion. Right.

**R-3. CO-347 takes the correct position on the elderly/disabled gross income test, and OQ-13 can
be closed.** OQ-13 treats the silence of 4.206,C,3,b,1) (S49, sources.md:344) and 4.401,A,3,b (S50,
sources.md:357) as an open question. It is not open: 7 CFR 273.10(e)(2)(i)(B) (S103,
sources.md:909) states "In addition to meeting the net income eligibility standards, households
which **do not contain** an elderly or disabled member shall have their gross income ... compared to
the gross monthly income standards". The federal regulation says in terms what the Colorado manual
says by omission. Fix: keep CO-347 as written, cite S103 on it (it currently cites S41, S49, S50),
and close OQ-13 with that citation rather than leaving it as an assumption.

**R-4. CO-376 does not prorate an ineligible member's medical expenses, and should not.**
7 CFR 273.11(c)(2)(iii) and 4.411.1,B,2,c (S107, sources.md:935) prorate only child support, shelter
and dependent care expenses paid by or billed to the ineligible member; medical is not in either
list, and 273.11(c)(1)(i) allows the medical deduction "in their entirety". OQ-28 correctly scopes
itself to shelter and dependent care. CO-376 is right to sum medical over every elderly-or-disabled
member of `snap_household_members` including ineligible ones.

**R-5. CO-339 / CO-345 / CO-346 / CO-370 key their tables on `snap_household_size` (eligible members
only) rather than the purchase-and-prepare unit, which is what the text requires.**
10 CCR 2506-1 4.401,B (S51, sources.md:365): ineligible members "shall be excluded when determining
the household size and the appropriate income eligibility maximum and/or level of benefits."
7 CFR 273.11(c)(1)(ii)(B)-(C) (D-15.md) excludes them from "assigning a standard deduction" and
"comparing the household's monthly income with the income eligibility standards". Meanwhile CO-314
(elderly/disabled), CO-334 (gross income), CO-343 (resources), CO-374 (dependent care) and CO-377
(shelter) correctly use the *full* unit. The split is handled consistently and each side is cited.

**R-6. CO-135 ($24 minimum allotment) checks out arithmetically.** 7 CFR 273.10(e)(2)(ii)(C) (S104,
sources.md:917): the minimum benefit is "8 percent of the maximum allotment for a household of one,
rounded to the nearest whole dollar." 8% x $298 (S82, sources.md:715) = $23.84 -> $24, which is
D-22's published figure (S85, sources.md:747). The parameter is independently confirmed.

**R-7. CO-166 / CO-412 / CO-414 take the statute over the regulation, as instructed, and say so.**
Pub. L. 119-21 sec. 10102(a) (S128, sources.md:571-580; D-5.md:87-110) strikes 7 U.S.C. 2015(o)(3)
in its entirety and replaces it with a seven-item list containing no homeless, veteran or
former-foster-youth exception and an age exception of "under 18, or over 65". 7 CFR 273.24(c)(1),
(7)-(9) (S131, sources.md:614-618) and 10 CCR 2506-1 4.311.A.2, 4.311.1.C-E (S132,
sources.md:628-639) still say 55-and-over, homeless, veteran, former foster youth. CO-166 takes 65,
CO-414 drops the three exceptions, and OQ-31 and OQ-32 record both conflicts with the reasoning.
Same pattern for immigrants: CO-308 follows the amended 2015(f) (S8, sources.md:90-101) over
4.305 (S10-S17) and 7 CFR 273.4 (S18), recorded in OQ-1. The instruction "where the statute and the
regulation or the Colorado manual disagree, the statute controls; say whether each item takes that
position and records the conflict in an OQ" is satisfied for every conflict I found.

### 1.4 Notes (correctness)

- **N-1.** CO-384 (`snap_benefit_reduction`) is `ceil(0.3 x net)`, the 7 CFR 273.10(e)(2)(ii)(A)(1)
  election, per OQ-23. Correct as an election; the OQ correctly records that no fetched Colorado
  document states which of (A)(1)/(A)(2) CDHS uses. In CO-01 both options give the same $125
  (option (2): 785 - 659.55 = 125.45, floored to 125), which is worth adding to OQ-23 as evidence
  the choice is not load-bearing for the target household.
- **N-2.** The homeless shelter deduction amount is $198.99 (CO-134, from D-20 Table 4, S84,
  sources.md:739), while 7 CFR 273.9(d)(6)(i) and 273.10(e)(1)(i)(G) still say $143 (S92,
  sources.md:803; S101, sources.md:887). The FNS COLA memo supersedes the stale regulatory figure
  and the draft is right, but this regulation-versus-memo conflict is not recorded anywhere, unlike
  the parallel conflicts in OQ-15 and OQ-25. Add a sentence to OQ-25 or a new OQ.
- **N-3.** Cross-reference errors in prose that will mislead a reader: OQ-2 says "CO-313 models S15
  literally" — the S15 logic is in CO-306 (CO-313 is `snap_household_size`). OQ-23 says
  "snap_benefit_reduction (CO-382)" — CO-382 is `snap_meets_net_income_test`; the item is CO-384.
  CO-110's `precision` says "see snap_gross_income_limit (CO-344)" — CO-344 is
  `snap_meets_resource_limit`; the item is CO-345. CO-112's `precision` says
  "snap_net_income_limit (CO-345)" — the item is CO-346. OQ-22 lists CO-378 among the items
  carrying the child support exclusion; only CO-332 does.
- **N-4.** CO-307 uses `qualified_status_date` for the five-year clock, matching 4.305,B,3,a's
  "begins on the date the non-citizen obtains status as a qualified non-citizen or enters the U.S.
  in a qualifying status" (S12, sources.md:138). The supplied fact `lpr_entry_date` (used in CO-01
  and CO-02) is read by no item at all. Either drop it from the interface or state in CO-003 why
  the two dates are distinct facts.
- **N-5.** CO-314 tests elderly/disabled status over `snap_household_members` including ineligible
  members, so an elderly ineligible non-citizen uncaps the shelter deduction and raises the resource
  limit. 7 CFR 271.2 defines "elderly or disabled member" as "a member of a household" (S6,
  sources.md:70) and 273.11(c) keeps ineligible members in the household, so this is defensible —
  but it is a reading, not a quotation, and it is the single largest lever on the allotment in the
  target case (it is what makes CO-01's shelter deduction uncapped). It deserves an explicit
  sentence in CO-314's `assumption`, or an OQ.

---

## 2. Completeness

### 2.1 Provisions that determine eligibility, category or amount and are represented by no item

**Matters for a typical Colorado household**

- **P-1 (blocking for amounts). The standard utility allowance is not a rule at all.**
  7 CFR 273.9(d)(6)(iii) (D-13.md:329) authorises the SUA and its tiers: "(*2*) A standard utility
  allowance for all utilities that includes heating or cooling costs (HCSUA); and (*3*) a limited
  utility allowance (LUA)... The LUA must include expenses for at least two utilities." Entitlement
  to the HCSUA, the LUA and the telephone-only standard, and the dollar figures for each, are the
  ordinary case for a Colorado renter and routinely the largest single deduction after the standard
  deduction. The chapter has no SUA item and no SUA parameter table: `utility_allowance_amount`
  (CO-036) is a supplied number whose meaning is "The CDHS standard utility allowance
  (heating/cooling, basic, or telephone-only) that applies to the person's unit." That is a
  supplied fact deciding a rule (see 2.2). In CO-01 the fact is set to 0 for all five people, which
  is why the target household's shelter deduction is only $200.50 (see 3.3).
  Fix: fetch the CDHS SUA table (10 CCR 2506-1 4.407.3 / the CDHS annual SUA notice) as a document,
  add `snap_sua_hcsua` / `snap_sua_lua` / `snap_sua_telephone` parameters and a
  `snap_standard_utility_allowance` derived item keyed on which utility costs the household incurs,
  and reduce CO-036 to the underlying utility-expense facts.

- **P-2 (should-fix). Pub. L. 119-21 sec. 10103 — LIHEAP-triggered SUA narrowed to households with
  an elderly or disabled member — is not represented.** D-5.md:209: "Section 5(e)(6)(C)(iv)(I) ...
  is amended by inserting ``with an elderly or disabled member'' after ``households''" and,
  correspondingly, 7 U.S.C. 2014(k)(4)(A)-(B). This is a 2025 change that removes the automatic
  HCSUA from most non-elderly LEAP recipients — squarely a typical-household rule, and one this
  volume will need for the phase 6 LEAP chapter anyway. No item, no excerpt in sources.md.

- **P-3 (should-fix). Pub. L. 119-21 sec. 10104 — internet fees excluded from the shelter
  deduction — is not represented.** D-5.md:222: "Any service fee associated with internet
  connection shall not be used in computing the excess shelter expense deduction under this
  paragraph." Colorado's LUA may include internet (D-13.md:329, "(*3*) ... may also include
  telephone and/or internet costs"), so this interacts directly with P-1.

- **P-4 (should-fix). Initial-month proration of the allotment.** 7 CFR 273.10(a)(1)(ii)-(iii)
  (D-14.md:9-17) prorates the first month's allotment from the date of application, and
  273.10(e)(2)(ii)(B) precludes issuance of less than $10 in an initial month. CO-01 is an
  application case (`as_of: 2026-10-01`) and only escapes the rule because the 1st of the month
  gives a proration factor of 1. Nothing in the chapter models the application date as distinct
  from the determination date, or an initial month at all. This also undercuts CO-385: S104
  (sources.md:917) conditions the minimum allotment on "**Except during an initial month**, all
  eligible one-person and two-person households" and CO-385 has no initial-month carve-out.

- **P-5 (should-fix). The elderly/disabled separate-household election.** 7 CFR 273.1(b)(2)
  (D-7.md:25; excerpted as S20, sources.md:211) lets an otherwise eligible member 60 or older who
  cannot purchase and prepare meals because of a permanent disability be a separate household with
  their spouse, unless the others' income exceeds 165% of poverty. The parameters exist and are
  unused — CO-105 (`snap_elderly_disabled_separate_household_income_limit_pct`, 1.65) and CO-114
  (the 165% table) — and so does the supplied fact CO-019
  (`is_elderly_disabled_unable_to_prepare_meals`), read by no item. For the target household this is
  live: p1 (79) and p2 (81) are exactly the couple the provision contemplates. CO-105's own
  `precision` admits it: "Not used by any batch-1 item; provided because ... a later batch's income
  test will read it." That batch never came.

- **P-6 (should-fix). The 273.1(b)(1)(iii) parental-control mandatory combination.** D-7.md:23:
  "A child (other than a foster child) under 18 years of age who lives with and is under the
  parental control of a household member other than his or her parent" must be in the same
  household. 10 CCR 2506-1 4.304.1.A.2 (S4, sources.md:49) says the same. CO-305's `precision`
  states it is not modelled as an edge type, and CO-018
  (`is_under_parental_control_of_household_member`) is supplied and read by no item. Three-generation
  households — the volume's own target shape — are exactly where this rule decides composition when
  a `buys_prepares_with` edge is absent.

- **P-7 (should-fix). The ABAWD second set of three months and regaining eligibility.**
  7 CFR 273.24(b) (S130, sources.md:601): individuals "may be eligible for up to three additional
  countable months in accordance with paragraph (e) of this section", and 273.24(d) governs
  regaining eligibility by working 80 hours in a 30-day period. CO-418's status enum is
  `not_subject | within_limit | limit_reached` with no representation of either. For an ABAWD
  applicant this is half the rule.

- **P-8 (should-fix). Voluntary quit and reduction of work effort.** 7 CFR 273.7(a)(1)(vii)
  (D-11.md:23): "Do not voluntarily and without good cause quit a job of 30 or more hours a week or
  reduce work effort to less than 30 hours a week". This is an independent ground of
  *ineligibility*, not merely a sanction procedure, and the chapter has only
  `is_disqualified_for_work_requirement_noncompliance` (CO-040) as a supplied conclusion.

**Edge cases**

- **P-9 (note).** 7 CFR 273.1(b)(7)(vi) exceptions (A)-(E) (D-7.md:55): residents of federally
  subsidised elderly housing, drug/alcohol treatment centres, group living arrangements, shelters
  for battered persons, and homeless shelters are *not* excluded as institution residents. CO-304
  models the exclusion with no exceptions. A nursing-facility resident (the target case) is
  correctly excluded either way, but a treatment-centre resident would be wrongly excluded.
- **P-10 (note).** Boarders (273.1(b)(3), D-7.md:27-35), foster care individuals (b)(4, D-7.md:37),
  roomers (b)(5, D-7.md:39) and live-in attendants (b)(6, D-7.md:41) all determine composition and
  none is modelled.
- **P-11 (note).** Student exemptions 7 CFR 273.5(b)(7) (on-the-job training, D-10.md) and
  (b)(10)(ii) (a full-time student with parental control over the child where no parent is in the
  household, D-10.md) are not in CO-410 or CO-409. OQ-34 covers the (b)(10)(i) single-parent
  approximation but not (b)(10)(ii).
- **P-12 (note).** Destitute households, 7 CFR 273.10(e)(3) (D-14.md:151) — the special income
  calculation (not just the expedited-service trigger OQ-14 covers) changes the *amount* for
  migrant and seasonal farmworkers.
- **P-13 (note).** Strikers, 7 CFR 273.1(e) / D-7.md:87-89 — an eligibility rule with its own income
  computation, unrepresented.
- **P-14 (note).** Pub. L. 119-21 sec. 10102(b)-(c) (D-5.md:110-208) rewrote the ABAWD waiver
  standard (noncontiguous States at 1.5x national unemployment) and added the noncontiguous-State
  exemption. Not Colorado-relevant on its face, but the waiver machinery it replaced is what
  `abawd_waiver_area_month` (CO-052) stands for, and nothing states the new standard.
- **P-15 (note).** Pub. L. 119-21 sec. 10101 (D-5.md:8) constrains re-evaluation of the Thrifty Food
  Plan, which is the source of CO-130. Worth a sentence in OQ-21, which already flags that the
  FY2027 table could not be fetched.
- **P-16 (note).** sources.md has gaps at S25-S40, S60-S80, S106 and S108-S120. These are not
  errors, but a reader cannot tell whether an excerpt was dropped or never written; a one-line note
  in sources.md would help.

### 2.2 Supplied facts whose meaning is doing policy work that should be a rule

| Fact | What it decides | Rule it should be |
|---|---|---|
| **CO-036 `utility_allowance_amount`** | The entire SUA: entitlement, tier (HCSUA / LUA / telephone-only) and dollar amount. Meaning: "The CDHS standard utility allowance (heating/cooling, basic, or telephone-only) that applies to the person's unit." | P-1 above: a derived SUA item + parameter table, from 7 CFR 273.9(d)(6)(iii) and CDHS's annual SUA. This is the highest-value conversion in the chapter. |
| **CO-023 `earned_income`, CO-024 `self_employment_net_income`, CO-025..CO-030** | The whole of the 7 CFR 273.9(c) income exclusions. CO-330's and CO-331's `assumption` fields say the supplied values are "already the countable, post-exclusion amounts". | At minimum the exclusions with bright lines — (c)(3) educational assistance, (c)(5) reimbursements, (c)(8) lump sums (a resource, not income, D-14.md:37), (c)(17) child support (already done in CO-332) — should be rules. |
| **CO-031 `countable_liquid_resources`** | The 7 CFR 273.8 resource test, via a fact whose own meaning says "liquid". See C-7. | Split the fact; or re-mean it as all countable resources and add the excluded-resource rules of 273.8(e). |
| **CO-014 `receives_general_assistance`** | Both the 271.2 disability prong and (in CO-336) OAP/AND/AB receipt for BCE. See C-6. | Separate facts. |
| **CO-022 `hours_worked`** | Whether hours in a work program count as employment for the work-registration exemption and are double-counted for the ABAWD requirement. See C-2. | Narrow the meaning; keep `work_program_hours` distinct. |
| **CO-040 `is_disqualified_for_work_requirement_noncompliance`, CO-041 `is_disqualified_drug_felony`, CO-039 IPV** | Supplied conclusions standing in for 273.7(f)-(g) disqualification periods, 273.11(m) and 273.16. Acceptable as scope exclusions under docs/design-colorado.md ("sanctions and overpayments ... enter as supplied facts") — but CO-040 also absorbs the voluntary-quit rule of P-8, which is an eligibility rule, not a sanction procedure. | Voluntary quit / reduction of work effort should be a rule. |
| **CO-052 `abawd_waiver_area_month`, CO-053 `abawd_discretionary_exemption_month`** | Whether the county is under an FNS waiver and whether a discretionary exemption applies — both now governed by the amended 7 U.S.C. 2015(o)(4) and (o)(6). | Reasonable to leave supplied (they are agency determinations), but the meanings should cite the amended standards rather than the pre-H.R.1 ones. |
| **CO-055 `is_destitute_migrant_or_seasonal_farmworker`** | 273.10(e)(3). Already recorded at OQ-14; D-14 *is* in the document set and D-14.md:151 contains the definition, so OQ-14's premise ("which this batch's document set does not include") is now stale and the rule can be written. | Write the rule from D-14.md:151-171 and close OQ-14. |

**Supplied facts read by no item at all** (interface debt, and in three cases evidence of a missing
rule): `is_under_parental_control_of_household_member` (CO-018, P-6),
`is_elderly_disabled_unable_to_prepare_meals` (CO-019, P-5), `was_foster_youth_at_eighteen` (CO-054,
deliberately orphaned by OQ-32 — say so on the item), `workfare_hours` (CO-049, superseded by
`participates_in_workfare` CO-068), `is_in_snap_employment_and_training` (CO-047),
`is_medicare_entitled_or_enrolled` (CO-017, a Medicaid fact), `state_of_residence` (CO-006, see
OQ-3), `lpr_entry_date` (N-4).

---

## 3. Cases: CO-01 and CO-02

### 3.1 The arithmetic, recomputed by hand from the documents

Both cases carry the identical comment block (cases.yaml:342-349 and 718-725) and identical
expected values, with `as_of` 2026-10-01 and 2026-11-01 respectively.

*Composition.* p1 (b. 1947-03-12, 79) has `in_medical_institution: true` with
`institution_entry_date: 2026-10-01`, so under 7 CFR 273.1(b)(7)(vi) (S3, sources.md:37) and
10 CCR 2506-1 4.304.4.D (S5, sources.md:62) she is a resident of an institution and not a member of
any household. CO-304 excludes her on or after the entry date; on 2026-10-01 the test is
`institution_entry_date <= det_date`, so she is out from the first day. Her own unit is empty.
**Correct**, and the entry-date boundary is the right one.

The rest reach each other over `buys_prepares_with` edges (p2-p3, p3-p4, p4-p5), so
`snap_household_members = [p2, p3, p4, p5]` for each of them. **Correct** under 273.1(a)(3) (S1,
sources.md:18). p4 (17) living with her parent p3 and p5 (8 months) living with p4 would be
mandatory combinations under 273.1(b)(1)(ii) / 4.304.1.A.1 (S2, S4) in any event, so the answer does
not depend on the purchase-and-prepare edges. **Expected `[p2, p3, p4, p5]`: correct.**

p3 is `undocumented`, so `snap_meets_citizenship_requirement` is false (CO-309; amended
7 U.S.C. 2015(f)(2), S8, sources.md:93-101, lists only citizens/nationals, LPRs, Cuban/Haitian
entrants and COFA migrants) and she is an ineligible member. p2 is an LPR with
`qualified_status_date: 1998-05-14` and 40 qualifying quarters, so he clears the five-year bar
twice over (8 U.S.C. 1612(a)(2)(L) and (B), S22/S23, sources.md:227/235-237).
**`snap_eligible_household_members = [p2, p4, p5]`, `snap_household_size = 3`: correct**, per
4.401,B (S51, sources.md:365).

*Gross income.* p2 Social Security $1,180. p4 and p5 nil. p3's earned income $2,380, prorated under
4.411.1,B,2,b (S46, sources.md:305): "This pro rata share is calculated by dividing the income
evenly among the household members, **including the disqualified member**. All but the disqualified
member's share is counted." n = 4 (p2, p3, p4, p5), so 2,380 x 3/4 = **$1,785**. Total
**$2,965**. **Expected 2965: correct.** (Federal 273.11(c)(3)(i), D-15.md, would let Colorado count
p3's income in full for the gross income test and prorated for the net; Colorado's own rule states
only proration, and the draft follows Colorado. That state-option point is not recorded anywhere and
should be a sentence in CO-333's `assumption`.)

*Category.* No member receives SSI/TANF/GA, so not BCE. ECE needs gross income at or below 200% FPL
for the household size, $4,304 for a household of 3 (CO-122, from 4.401.1, S59, sources.md:478).
2,965 <= 4,304, no IPV and no drug felony. **`expanded_categorical`: correct** on the draft's
figures. It is also correct on the FY2026 figures OQ-15 says are missing (200% of the 2026
guideline for 3 is 27,320 x 2 / 12 = $4,553), so OQ-15 does not bite here.

*Deductions.* Earned income deduction base = eligible members' earned income ($0) + p3's prorated
earned share ($1,785) = $1,785; 20% = **$357** (4.407.2,A, S95, sources.md:828: "The twenty percent
(20%) deduction shall also apply to prorated income earned by the disqualified member"). Standard
deduction for size 3 = **$209** (D-20 Table 2, S81, sources.md:704). Dependent care $0; medical $0
(the only elderly member in the unit, p2, has `medical_expenses_out_of_pocket: 0`). Adjusted income
before shelter = 2,965 - 357 - 209 = **$2,399**. **Expected 2399: correct.**

*Shelter.* `shelter_cost_monthly` is 1,400 on p2 and 0 on p3/p4/p5; `utility_allowance_amount` is 0
on everyone. CO-377 sums the known values: **$1,400**. Excess shelter = 1,400 - 0.5 x 2,399 =
1,400 - 1,199.50 = **$200.50**, uncapped because the unit contains p2, aged 81 (4.407.3,B, S96,
sources.md:838; 7 CFR 273.9(d)(6)(ii), S93, sources.md:811). Net income = 2,399 - 200.50 =
**$2,198.50**. **Expected 2198.5: arithmetically correct, legally not a permitted figure** — see
C-3; under 273.10(e)(1)(ii)(A) it should be **$2,199**.

*Allotment.* Maximum allotment for size 3 = **$785** (D-20 Table 1, S82, sources.md:717). Benefit
reduction = ceil(0.3 x 2,198.50) = ceil(659.55) = **$660**. Allotment = 785 - 660 = **$125**.
**Expected 125: correct** — and robust: with C-3's rounding applied, ceil(0.3 x 2,199) =
ceil(659.70) = 660, still $125; under the (A)(2) rounding option, floor(785 - 659.55) = 125 as well.

*Eligibility.* Categorically eligible, so the gross and net income tests are deemed met (4.401,A,1,
S50, sources.md:353) and the resource test does not apply (4.408,A, S57, sources.md:455). Allotment
> 0. **`eligible`: correct.** For p1, `snap_household_size` 0 gives **`no_eligible_members`** — the
right outcome but the wrong reason on the face of it: she is ineligible because she is an
institution resident (273.1(b)(7)(vi)), not because a household of hers has no eligible members.
Adding an `institution_resident` option to CO-387's enum, tested first, would state the ground the
documents state (should-fix, low cost).

*Work registration.* p1 (79) and p2 (81) exceed `snap_work_registration_max_age` 59, so false.
p3 works 138 hours in the month; CO-402 gives 138 x 12 / 52 = 31.8 hours a week, at or above the
30-hour exemption of 273.7(b)(1)(vii) (S123, sources.md:505), so exempt and not a registrant. p4
(17) is exempt via `is_enrolled_in_school` (see C-9 — the exemption is right on these facts because
she is a full-time high-school student, but the rule as written would also exempt a one-class
enrollee). p5 (0) is below 16. **All five `snap_is_work_registrant: false`: correct.**

*ABAWD.* p1 (79) and p2 (81) are over 65 and p4 (17) and p5 (0) are under 18, so all four are
outside the range under the amended 7 U.S.C. 2015(o)(3)(A) (S127, sources.md:557). p3 (41) is in
range but is exempt under (o)(3)(D) ("otherwise exempt under subsection (d)(2)", via CO-405's
30-hour employment exemption; see OQ-33). **All five `not_subject`: correct.** Note that the target
household therefore exercises no part of the ABAWD counting machinery (CO-416, CO-417): every person
also has `received_full_snap_benefit_month: false` in every month, so
`snap_abawd_countable_months_in_period` is 0 for everyone. A third case with an in-range,
non-exempt adult would be worth adding; the chapter's most contested rules (OQ-31, OQ-32) are
currently untested by any case.

*CO-02.* Same persons a month later; p1 has been removed as a `parent` of p3 and from the
`buys_prepares_with` chain, and p4 is still 17 (b. 2009-04-08, as of 2026-11-01). Every SNAP figure
is unchanged and every expectation recomputes identically. **Correct.** But see 3.3: CO-02 does not
exercise a single SNAP rule that CO-01 does not, so as a SNAP case it is a duplicate. Its purpose
is the phase 4 spousal-impoverishment story. If the chapter wants a second SNAP data point, CO-02 is
the natural place to vary something (p2's admission to the household, a month in which p1's
institution status changes mid-month, or a positive SUA).

### 3.2 Summary table

| Expectation | Hand-computed | Verdict |
|---|---|---|
| `snap_household_members` p2-p5 = [p2,p3,p4,p5]; p1 = [] | same | correct |
| `snap_eligible_household_members` = [p2,p4,p5] | same | correct |
| `snap_household_size` = 3 (p1: 0) | same | correct |
| `snap_is_ineligible_member` p3 true, others false | same | correct |
| `snap_meets_citizenship_requirement` p3 false, others true | same | correct |
| `snap_eligibility_category` = expanded_categorical | same | correct (p1's own value is `basic_categorical` — C-1 — but is not asserted) |
| `snap_household_gross_income` = 2965 | 2965 | correct |
| `snap_household_net_income` = 2198.5 | 2198.50 unrounded / **2199** rounded | arithmetically correct, legally should be 2199 (C-3) |
| `snap_allotment` = 125 | 125 | correct under both rounding options |
| `snap_eligibility_status` = eligible (p1: no_eligible_members) | same | correct outcome; p1's *reason* should be "institution resident" |
| `snap_abawd_time_limit_status` = not_subject (all) | same | correct |
| `snap_is_work_registrant` = false (all) | same | correct |

### 3.3 Plausibility, and facts set only to make the rules resolve

- **`utility_allowance_amount: 0` on all five people, in both cases — set to make the rules
  resolve, and it distorts the headline number.** A household paying $1,400 a month for a Colorado
  home in October and November incurs heating costs and would draw the CDHS HCSUA. The fact is 0
  because the chapter has no SUA rule (P-1) and the sum in CO-377 would otherwise need a figure the
  volume cannot derive. The cost is large: at a plausible HCSUA of roughly $600, shelter costs become
  $2,000, the excess shelter deduction $800.50, net income $1,598.50, the reduction ceil(479.55) =
  $480 and the allotment **$305** rather than $125. The target household's SNAP allotment is thus an
  artefact of an unmodelled rule by a factor of nearly 2.5. This is the single most important thing
  to fix about the case.
- **`shelter_cost_monthly: 1400` on p2 and `0` on p3, p4, p5 — half-artefact.** $1,400 is a plausible
  Denver-area rent and p2 is `is_head_of_household: true`, so carrying it on the head is right per
  CO-035's stated convention. The zeros on the other three exist only because CO-377 would otherwise
  need OQ-29's known-value filter to do more work than it does; OQ-29 itself admits that a member's
  stated $0 is indistinguishable from a member never asked. The case is therefore relying on the
  reader to know that three zeros mean "not asked". Fix the interface (one shelter fact per unit, or
  an explicit household-level scope) rather than the case.
- **`countable_liquid_resources: 0` for all five — implausible, and internally inconsistent.** p1
  carries `countable_resources_couple: 46000` and `countable_resources_individual: 1900` for the
  Medicaid chapter. The same couple cannot hold $46,000 in countable resources for Medicaid and $0
  in countable liquid resources for SNAP. It does not change the SNAP answer (the unit is ECE and
  resource-exempt under 4.408,A), which is precisely why it has gone unnoticed — and it means the
  resource test (CO-343, CO-344) and its C-7 defect are exercised by no case at all.
- **`medical_expenses_out_of_pocket: 0` for p1 in the month she enters a nursing facility** —
  implausible on its face; 7 CFR 273.9(d)(3)(ii) (D-13.md) makes nursing home care an allowable
  medical expense. It does not affect the SNAP answer because p1 is outside every unit, but it means
  the excess medical deduction (CO-376) is exercised by no case either.
- **`received_full_snap_benefit_month: false` in every month for every person** — necessary for a
  first-application case, but it zeroes out CO-416 and CO-417 entirely (see 3.1).
- **Plausible and well-chosen:** p3's $2,380 for 138 hours is $17.25/hour, consistent with Colorado's
  minimum wage; p1's $1,420 Social Security plus $610 pension and p2's $1,180 Social Security are
  realistic for an 79/81-year-old couple; p2's 1998 LPR admission with 40 quarters is a clean way to
  exercise both five-year-bar exceptions at once; p3 undocumented with p4 and p5 citizens is a real
  and common Colorado configuration and is the only thing exercising the pro rata rule; p4 as a
  17-year-old minor parent correctly exercises both the mandatory-combination and the
  under-18-ABAWD rules.

---

## Ranked list of fixes, first things first

1. **C-1** — guard CO-336/CO-338 against an empty household, so a person with no SNAP unit is not
   reported Basic Categorically Eligible and deemed to pass the income and resource tests.
2. **P-1 (+P-2, P-3)** — make the standard utility allowance a rule with a parameter table, and add
   H.R.1 secs. 10103 and 10104. This is what makes CO-01's $125 allotment an artefact; on a
   realistic HCSUA the answer is roughly $305.
3. **C-2** — stop double-counting work-program hours in CO-415 by narrowing CO-022's meaning to paid
   employment.
4. **C-3** — apply 7 CFR 273.10(e)(1)(ii)(A) rounding in CO-381 (and CO-334, CO-379), and change
   CO-01/CO-02's expected `snap_household_net_income` from 2198.5 to 2199; the allotment stays $125.
5. **C-4** — make `snap_allotment` 0 for an ineligible household rather than $24 for a one- or
   two-person household that fails the gross or resource test.
6. **C-6 and C-7** — split `receives_general_assistance` so BCE reads an OAP/AND/AB fact, and fix the
   resource test so it counts all 273.8 countable resources, not only liquid ones. Then give CO-01
   or a new case non-zero resources so the test is exercised at all.
7. **C-5, C-9, C-10, C-8** — the four narrow derivation corrections: homeless shelter deduction
   requires incurred shelter costs; school enrollment exemption requires half time; the weekly
   earnings prong must include self-employment; CO-306 needs its own age parameter.
8. **R-3 and N-3** — close OQ-13 by citing 7 CFR 273.10(e)(2)(i)(B) (S103), and fix the five wrong
   item ids in OQ-2, OQ-22, OQ-23, CO-110 and CO-112.
9. **P-4, P-5, P-6, P-7, P-8** — the five missing typical-household rules: initial-month proration
   and the initial-month carve-out from the minimum allotment; the elderly/disabled separate
   household (whose parameters and supplied fact are already sitting unused); the parental-control
   mandatory combination; the ABAWD additional three months and regaining eligibility; voluntary
   quit.
10. **Cases** — add a third SNAP case with an in-range, non-exempt ABAWD accruing countable months,
    non-zero resources, non-zero medical expenses and a real SUA, so that the chapter's most
    contested rules (OQ-26, OQ-31, OQ-32, CO-343/344, CO-376, CO-416/417) are exercised by
    something. Reconcile p1's `countable_liquid_resources: 0` with her
    `countable_resources_couple: 46000`.
