# Policy review: Colorado volume, verification chapter across every program (CO-1300..CO-1462, D-95..D-109, S800..S902, OQ-300..OQ-324)

Reviewer role: eligibility-verification policy owner for every Colorado PEAK program (Medicaid, CHP+, SNAP,
Colorado Works, Adult Financial, CCCAP, LEAP), plus SUN Bucks. Read-only review at commit `f277a33`
(branch `ccr-9d19bf4c-wmnwcl`, phase 9 = `git diff edc8d43 worktree-agent-a781899faca6b4e4b`, merged; its
complex case is CO-91). Reviewed against the fetched text in `volumes/co/documents/D-95.md`..`D-109.md`
(and D-41, D-88 where the brief asks about LTC resources and SUN Bucks), with excerpts S800–S902 in
`volumes/co/sources.md`. `npx vite-node scripts/check.ts --volume co` passes (1173/1173 rule tests,
1005/1005 case expectations) and `scripts/eval-case.ts` reproduces every CO-01, CO-02 and CO-91
verification expectation; every finding below is a policy finding, not a mechanical one.

Outcomes in scope: `<prog>_verification_status` and `<prog>_pending_verification_count` for `snap`,
`ma`, `chp`, `cw`, `af`, `cccap`, `leap` (CO-1391/CO-1394, CO-1411/CO-1415, CO-1417/CO-1418,
CO-1425/CO-1427, CO-1436/CO-1438, CO-1449/CO-1451, CO-1460/CO-1462).

Findings are grouped (1) correctness, (2) completeness, (3) open questions, (4) cases, (5) caseworker
usability. Each gives severity, item id(s), the governing text (`documents/D-nn.md:line`, `Snnn`),
what the item does, and the fix.

Headline: the chapter's architecture is sound — one requirement item per element, program-neutral
supplied facts, acceptability items where a rule lists documents, a dated status — and the 435.407
tiers, the 90-day reasonable opportunity period from notice receipt, the SNAP expedited identity rule
and the Medicaid reasonable-compatibility arithmetic are read correctly. Four things are wrong against
the text. (a) LEAP treats a member's missing SSN (and unverified status) as a household verification
failure when 3.751.1 says the member is simply left out; the OQ that raises it quotes the answer, and
CO-02 records three wrong `past_due` results. (b) SNAP runs the non-citizen documentation period from
the request date (10 days) when 4.505.6.E and 273.2(f)(1)(ii)(C) run it to the 30th day after
application. (c) The Cover All Coloradans exemption in CO-1400 switches off immigration verification for
every CHP+ applicant, though 110.1.C — the CHP+ text CO-1400 cites — requires it. (d) Every status is
computed for every person whether or not the program can reach them, so CO-91 records a CHP+
"reasonable opportunity expired" for a 34-year-old man whose CHP+ eligibility is `ineligible`, and an
Adult Financial `past_due` for a person whose `af_category` is `none`. Separately, nothing in the
outcomes tells a caseworker *which* document is outstanding (§5).

---

## 1. Correctness

### 1.1 Blocking

**C-1 (blocking). CO-1458, CO-1459, CO-1460, CO-1462: LEAP counts a member's missing SSN (and an
unverified immigration status) as pending household verification and reports the household
`past_due`; 3.751.1 excludes that member instead. The count also asks for an SSN from a member
already excluded under 3.753.17.**

3.751.1 "Completed Application" B (`documents/D-107.md:44-53`, S893):

> B. The applicant has provided all required verification. A Social Security Number (SSN) for each
> household member or proof of application for a SSN must be provided. A SSN is required to determine
> eligibility. If no SSN is provided for a household member, that member will not be included in the
> household, but the member's income will be counted;

The sentence states the consequence: the member drops out, his income stays, and the application is
complete. CO-1459 counts `[not, ssn_is_verified]` as a pending element for every person, and CO-1460
sums CO-1459 over `leap_household_members_for_income` — the unfiltered economic unit that the
phase-6 fix built precisely to carry the income of people who are *not* household members
(3.753.17, S494). So the undocumented p3 in CO-01/CO-02, who is already outside
`leap_household_members`, is asked for an SSN a non-member does not owe, and her missing SSN turns the
household's status to `past_due` ("the application is denied", CO-1462's meaning). The same holds for
the immigration arm (`claims_lawful_immigration_status` without a SAVE response): 3.753.17 makes a
member who does not meet the status requirement an excluded member whose income counts, not a reason to
deny.

The OQ that raises this (OQ-318) quotes the governing sentence; it is a deferral, not an open question.

Fix. Split the LEAP per-person count by what the text asks of whom:

```
leap_pending_verification_count =
  [+, [sum, leap_household_members_for_income, <income arms: earned (CO-1455), unearned>],
      [sum, leap_household_members,            <citizenship-if-questionable arm (CO-1457)>],
      <heating-cost arm counted once per household — see C-13>]
```

and drop the SSN and SAVE arms from the count altogether, moving them into membership: filter
`leap_household_members` (CO-1000) on `[any, ssn_is_verified]` and on a verified (or not-yet-due)
status, as OQ-318 itself proposes. CO-1458's leading `1` (SSN for everyone) goes with it. Close OQ-318
as answered by S893. Expectation changes: §4.2.

**C-2 (blocking). CO-1394 (with CO-1392, CO-1366): SNAP reports a non-citizen's missing status
document as `past_due` from the 11th day after the request; the text gives the non-citizen until the
30th day after application.**

10 CCR 2506-1 4.505.6.E (`documents/D-103.md:1188`, S829):

> E. The local office shall provide an applicant non-citizen up to the thirtieth (30th) calendar day
> following the date of application to submit acceptable documentation of their non-citizen status or
> at least ten (10) calendar days from the date of the local office's request for an acceptable
> document.

and 7 CFR 273.2(f)(1)(ii)(C) (`documents/D-95.md:167`, not excerpted; S802 stops at (B)(1)) adds
that when the agency has not given that opportunity as of the 30th day, "the State agency must provide
the household with benefits no later than 30 days following the date of application, provided the
household is otherwise eligible." CO-1394's `pending` row tests only
`[<=, det_date, snap_verification_due_date]` (request + 10), so an application of 2026-10-01 with the
checklist sent that day and an I-551 still outstanding on 2026-10-15 reads `past_due` — "the delay is
then the household's" (OQ-309) — while 4.505.6.E says the reasonable opportunity is still open until
2026-10-31. CO-1366 cites S829 for the USCIS-submission branch but nothing reads its period.

Fix. Add `snap_noncitizen_documentation_due_date =
[max_date, [days_after, 30, application_date], snap_verification_due_date]` (a later-of-two-dates form;
if the catalog has no date `max`, use a `case` on `<=`), make the immigration arm of CO-1389 its own
count (`snap_person_pending_status_verification_count`), and give CO-1394 a row ahead of `past_due`:
`[[all, <only status pending>, [<=, det_date, snap_noncitizen_documentation_due_date]], pending]`.
Add a parameter for the 30 days (`snap_noncitizen_documentation_days`, S829). Add a rule test with
the dates above.

**C-3 (blocking). CO-1400 → CO-1416, CO-1417, CO-1418: the Cover All Coloradans exemption turns off
immigration-status verification for every child and pregnant person, so CHP+ — which covers only
children and pregnant persons — never verifies a declared status. 110.1.C, which CO-1400 cites,
requires it.**

10 CCR 2505-3 110.1.C (`documents/D-102.md:50-63`, S870):

> C. For determinations of eligibility for the Children's Basic Health Plan, legal immigration status
> must be verified. This requirement applies to a non-citizen individual who meets the criteria of any
> category defined at 110.1.B and has declared that he or she has a legal immigration status. 1. The
> Verify Lawful Presence (VLP) interface will be used ... 2. If the state cannot verify immigration
> status the individual will receive a Reasonable Opportunity Period ... 3. This requirement does not
> apply to the following groups: a. Individuals applying for Child Healthcare Plan covered by Cover All
> Coloradans ...

The exemption is for an applicant *covered by* Cover All Coloradans — one who has not declared a
qualifying status — not for every child. For Medical Assistance the same holds without even that
carve-out: 8.100.4.B.1.e (`documents/D-101.md:1630`, not excerpted) — "This declaration of legal
immigration status will be verified through the Verify Lawful Presence (VLP) interface ... If status
cannot be verified, or if the applicant does not provide the necessary documents within the reasonable
opportunity period, then the applicant's Medical Assistance application shall be terminated" — and
8.100.3.G.2 (S852) name no age or pregnancy exception. CO-1400 derives
`[all, claims_lawful_immigration_status, [not, ma_is_under_child_age_or_turns_nineteen_this_month],
[not, is_pregnant]]`; CHP+ reads it, so a lawful-permanent-resident child with no SAVE response reads
CHP+ `complete`. The item is also internally inconsistent: if "eligibility does not turn on the result"
were a reason to skip verification, CO-1395 would skip citizenship for children too, and CO-1400 would
exempt the 12-month postpartum group that CO-509 also covers regardless of status. No case exercises a
non-citizen child.

Fix. `ma_requires_verification_of_immigration_status = claims_lawful_immigration_status` (it then
restates a fact; per the alias rule, have CO-1410's arm read `claims_lawful_immigration_status`
directly, as CW and LEAP already do), and add S852/S870/8.100.4.B.1.e as sources. The eligibility
consequence for a child or pregnant person whose period expires is CO-509's business (state-only
coverage), not a reason to skip the request. Add a CO-91-style case with an LPR child. Close OQ-308 as
answered (S870; 8.100.4.B.1.e).

**C-4 (blocking). CO-1418, CO-1438, CO-1427, CO-1451 (and every status): a program's verification
status is computed for every person, including people the program cannot reach, and the cases record
those results.**

Evaluated at this commit:

| case / person | program eligibility | verification outcome recorded |
|---|---|---|
| CO-91 p1 (34, male, not pregnant) | `chp_eligibility_status` = `ineligible` | `chp_verification_status` = `reasonable_opportunity_expired` (expected) |
| CO-91 p1 | `af_category` = `none` (34, not disabled) | `af_verification_status` = `past_due`, count 2 (residency, and the $20 cash of C-7) |
| CO-01 p1, p2 (79, 81) | CW unit `[p1]`, `[p2]`, no dependent child | `cw_verification_status` = `pending` (expected) |
| CO-01 p1, p2 | CCCAP household `[p1,p2]`, no eligible child | `cccap_verification_status` = `complete` (expected) |
| CO-01 p1, p3 | `chp_eligibility_status` = `ineligible` | CHP+ `complete` / `pending` (expected) |

A worker reading "CHP+: reasonable opportunity expired" for the father in CO-91 would send a
termination notice for coverage he never had. The design amendment asks for "a per-program
verification status"; a status for a person outside the program's reach is not that program's status.

Fix (smallest). Give each status a first row `not_applicable` keyed on the program's categorical reach,
not on its eligibility result (which verification precedes):

- CHP+: `[not, [any, [<, age, chp_child_age_limit], is_pregnant, <postpartum>]]`;
- Adult Financial: `[not, [any, [>=, age, af_oap_min_age], <AND disability basis>]]`;
- Colorado Works: no `cw_is_dependent_child` and no pregnant member in `cw_assistance_unit_members`;
- CCCAP: no `cccap_is_eligible_child` in `cccap_household_members`.

Better, and needed anyway for 8.100.3.I.1 ("This requirement does not apply to those individuals who
are not requesting Medical Assistance yet appear on the application", `documents/D-101.md:1465`,
S860): a supplied `is_requesting_<prog>` per program from the PEAK application, read by the same row.
Expectation changes: §4.

### 1.2 Should-fix

**C-5 (should-fix). CO-1394: deductible expenses are reported `expenses_disallowed` from the 11th day
after the request; the deduction is lost only if the expense is not verified within 30 days of the
application.**

7 CFR 273.2(f)(3)(ii) (S812) and 4.502.A.3 (S818): "If the expense cannot be verified within thirty
(30) calendar days of the date of application, the local office shall determine the household's
eligibility and benefit level without providing a deduction or exclusion for the unverified expense."
CO-1394's `expenses_disallowed` row follows the `pending` row, which tests only the 10-day due date.
Between day 11 and day 30 the household may be certified without the deduction (the advisory sentence of
4.502.A.3) but has not lost it. Fix: `pending` while `det_date <= [days_after, 30, application_date]`
when only expenses are outstanding (a parameter `snap_expense_verification_days`, S812/S818), then
`expenses_disallowed`. CO-91 is unaffected (2027-02-10 is past both dates).

**C-6 (should-fix). CO-1402, CO-1403, CO-1416: reasonable compatibility is tested against the MAGI
Medicaid standard for everyone, including CHP+ (whose standard is CHP+'s) and aged, blind and disabled
applicants; and a person who attests $0 earnings is never tested.**

8.100.5.B.1.c (`documents/D-101.md:1791ff`, S867) — "both below the applicable Medical Assistance
program income standard", "below the applicable income standard for that program". CO-1402 compares
against `ma_magi_highest_income_standard_pct` (CO-539), the MAGI 5%-disregard standard. A child
attesting 140% FPL with data at 180% is "not reasonably compatible" for Medicaid but both are below the
CHP+ standard, so CHP+ should accept the attestation; CO-1416 reads the Medicaid item and asks for pay
stubs. OQ-302 already concedes the ABD half is "the wrong standard"; that is a defect, not an open
question. Second, CO-1403 is gated on `[>, earned_income, 0]`: an applicant who attests no earnings
while The Work Number reports wages above the standard is the textbook discrepancy of 435.952(c)(2)
(S838) and 8.100.4.C.2 (S864: "when discrepancies arise between self-attested income and electronic
data source results"), and the item never asks. Fix: parameterize the standard (a CHP+ copy of CO-1402
reading the CHP+ standard; an ABD copy reading the SSI-related standard), and gate CO-1403's
compatibility arm on "data reports earnings" (`electronic_data_source_household_income_pct_fpl > 0`)
rather than on attested earnings.

**C-7 (should-fix). CO-1405, CO-1433: resource verification is keyed on *countable* resources being
above zero — a figure that cannot be known until the resources are verified — and Adult Financial asks
for documents for cash, which 3.520.72.D.5 accepts on the client's statement.**

8.100.5.B.1.e (S866): "Verification of all resources shall be provided if the resources were available
to the applicant"; 3.520.72.D (`documents/D-105.md:1077`, S888): "verification of all resources and
associated values ... 5. Client statement is acceptable as verification for cash." CO-1405 reads
`[>, countable_resources_individual, 0]` and CO-1433 `[>, af_countable_resources, 0]`, so a person
whose only asset is an excluded home is never asked (although the exclusion itself needs the facts),
and a person with only cash is. In CO-91, p1's $20 in cash is half of his Adult Financial `past_due`
count. Fix: key both on a gross presence test (a supplied `has_resources_other_than_cash`, or the
gross liquid/non-liquid facts before exclusions), and drop cash from CO-1433 per D.5.

**C-8 (should-fix). CO-1424, CO-1367, CO-1420: Colorado Works lawful presence is treated as verified
by an identity interface match, and by a Colorado driver's license held by a person the case says is
not lawfully present; the I.4.b.6 exemption is missing.**

3.604.3.I.4.a (`documents/D-104.md:865-882`, S877): "a client must: 1) Produce and provide to the county
department: a) A valid Colorado driver's license or a Colorado identification card ...". CO-1424's
lawful-presence arm is satisfied by `identity_verified_by_electronic_data_source` (an SSA or DMV identity
match) — the text requires a produced document, and an identity match is not evidence of lawful
presence. And CO-1367 accepts `colorado_drivers_license_or_id` for anyone: in CO-01, p3
(`lawful_presence_status: not_lawfully_present`, `citizenship_status: undocumented`) has her lawful
presence counted as verified because her identity document is a Colorado license. Colorado issues
licenses to people who cannot show lawful presence; the document type must distinguish them. Also
3.604.3.I.4.b.6 (`documents/D-104.md:923`) exempts "individuals over the age of eighteen years of age
and under the age of nineteen years who continue to be eligible for medical assistance programs", which
CO-1420 omits. Fix: drop the EDS disjunct from the lawful-presence arm; split the license option into
`colorado_drivers_license_or_id` and `colorado_license_not_valid_for_lawful_presence` (or read
`lawful_presence_status` as a guard) with an OQ citing the incorporated 1 CCR 204-30 rules (OQ-315);
add the b.6 exemption.

**C-9 (should-fix). CO-1426, CO-1427: Colorado Works gives 30 calendar days for citizenship,
qualified-non-citizen status, lawful presence, identity and SSN, and excludes only the person who
fails; the chapter uses the 11-day due date for everything and reports the unit.**

3.604.3.K (`documents/D-104.md:966-975`, not excerpted):

> K. When a client is unable to provide verification for citizenship, qualified non-citizenship status,
> lawful presence, identity, and/or their social security number, the county department shall grant
> thirty (30) calendar days to the client to provide the verification. ... Individuals unable to provide
> this verification will not receive payment for themselves and their income will be used to determine
> eligibility for the household.

Neither the 30 days nor the per-person exclusion appears in any item, excerpt or OQ (OQ-316 lists
extensions but not K, which is a separate period). Fix: excerpt K; add `cw_status_verification_days`
(30) and `cw_status_verification_due_date`; split CO-1424 into status and other arms as CO-1410/CO-1411
do for Medicaid; give CO-1427 the Medicaid-style rows (status elements pending within 30 days do not
make the unit `past_due`, and past 30 days they exclude the person, which the status should say, e.g.
`member_excluded`).

**C-10 (should-fix). CO-1430: Adult Financial exempts every Old Age Pension non-citizen from providing
an SSN; the text exempts them only from *applying* for one.**

3.520.65.A (`documents/D-105.md:790-800`, S884): "Each Adult Financial program client who has a social
security number (SSN) or is eligible to obtain a SSN shall provide his or her SSN ... 2. If a client is
unable to provide their SSN, the client shall be required to apply for a SSN ... This requirement does
not apply to OAP clients who are non-citizens or qualified non-citizens." The exemption attaches to
A.2 (applying), not to A (providing). CO-01's p2 (LPR, 81, has a verified SSN) is unaffected only
because his SSN is already verified. Fix: a supplied `has_been_issued_ssn`, and
`[all, [not, ssn_exception_applies], [any, has_been_issued_ssn, [not, [all, af_is_oap_age, [not, claims_citizenship]]]]]`.

**C-11 (should-fix). CO-1434, CO-1424, CO-1436, CO-1455: self-employment verification is read the same
way for programs that treat it differently.**

- Adult Financial: CO-1434 requires self-employment verification only when questionable. 3.520.783.E
  (`documents/D-105.md:1134`, S889) says "Self-employment verification may consist of tax documents,
  self-employment ledgers, receipts ... No specific verification shall be required and the
  documentation provided by the client shall be accepted unless questionable" — no *specific* document
  is required, but documentation is; and where it is inadequate the county "shall use the best
  information available". The questionable-only reading belongs to SNAP's 4.506.C (S831, "statement
  ... shall be accepted unless questionable"), not here.
- Colorado Works and Adult Financial: SSA self-employment earnings are verified when entered
  (3.604.3.H.1.a, S875; 3.520.5.A.1, S880), but the earned-income arms of CO-1424 and CO-1436 read only
  `earned_income_verification_document_received`, because the one EDS fact (CO-1315) also carries DOLE
  wages, which those programs do not accept.
- LEAP: 3.755.21.I (`documents/D-107.md:543`) accepts a "written or verbal declaration of monthly gross
  income" for self-employment (receipts are needed only for the expense deduction); CO-1455 requires a
  document whenever `has_earned_income`.

Fix: split CO-1315 into `wages_verified_by_electronic_data_source` and
`self_employment_income_verified_by_electronic_data_source`; Adult Financial requires
self-employment documentation always (questionable only governs whether what is provided is
accepted); LEAP's earned-income item tests wages only, with self-employment satisfied by the
declaration.

**C-12 (should-fix). CO-1446, CO-1448, CO-1451: CCCAP counts court-ordered child support paid as a
pending eligibility element whose absence makes the application `past_due` ("the application is
denied"); 3.111.K only withholds the deduction.**

3.111.K.1 (`documents/D-106.md:737ff`, S892): "Verified court-ordered child support payments ... shall be
deducted ... To qualify for the adjustment, the child support shall be: a. Court ordered and paid".
Unverified support is not deducted; nothing denies the application for it. The same holds for
self-employment expenses (3.111.G.2.a, H.5.a.3: "or they will not be considered"). CO-91's CCCAP
`past_due` rests on p1's residency as well, so its status survives, but its count drops from 2 to 1.
Fix: mirror SNAP — a `cccap_pending_deduction_verification_count`, excluded from the status's
eligibility test, and a status option (`deduction_disallowed`) when only it remains past the period.

**C-13 (should-fix). CO-1456, CO-1459: LEAP heating costs are counted once per member "responsible for
heating costs", so one fuel bill is two or three pending documents; in CO-01 an 8-month-old owes one.**

3.755.11 (S897): "Income, estimated home heating costs, and vulnerability shall be verified in
determining initial eligibility and/or payment amount" — a household element (one dwelling, one fuel
vendor, one vulnerability finding). CO-01 sets `is_responsible_for_heating_costs: true` on every
person, so the p1/p2 household counts heating twice and the p3/p4/p5 household three times (p5 is 8
months old). Fix: count the heating arm once per household (on the applicant, or as
`[case, [[any over leap_household_members, responsible ∧ not verified], 1], [else, 0]]` added at
household level in CO-1460), and correct the CO-01/CO-02 `is_responsible_for_heating_costs` facts for
the children.

**C-14 (should-fix). LEAP has no zero-income verification; CO-91 reads `complete` for a household that
reports no income.**

3.755.21.H (`documents/D-107.md:531`): "In verifying zero income ... the county shall examine income of
all adult members of the household by using the Department of Labor and Employment (DOLE) verification
system and one or more of the following methods: 1. Obtain a reasonable explanation ... 2. Verify final
date of employment with last employer; 3. Colorado Benefits Management System (CBMS)." No item reads it,
so CO-91's p1 (homeless, no income) is LEAP `complete`. SNAP's expedited rule also names "income
statement (including a statement that the household has no income)" (273.2(i)(4)(i)(B), S814). Fix: a
supplied `zero_income_verified` (DOLE check plus explanation) and a LEAP arm
`[all, [not, has_earned_income], [not, has_unearned_income], [>=, age, 18], [not, zero_income_verified]]`.

**C-15 (should-fix). CO-1407, CO-1408, CO-1409: the special-circumstances exception is applied
automatically to every homeless applicant and to no one else; 435.952(c)(3) makes it case-by-case.**

42 CFR 435.952(c)(3) (S839): "an exception to permit, on a case-by-case basis, self-attestation ... when
documentation does not exist ... or is not reasonably available, such as in the case of individuals who
are homeless or have experienced domestic violence or a natural disaster." Homelessness is an example
of unavailability, not a categorical waiver, and the exception reaches every criterion except
citizenship and status. OQ-306 identifies the gap; the text answers the rule, and only a fact is
missing. Fix: the supplied `documentation_not_reasonably_available` OQ-306 proposes, read by every
Medical Assistance non-status arm (income and pregnancy included), replacing `is_homeless`.

**C-16 (should-fix). CO-1401: the newborn SSN exception has no end, and the SSN requirement reaches
household members who are not requesting coverage.**

8.100.3.I.1 (`documents/D-101.md:1465`, S860) exempts "eligible newborns born to a Medical Assistance
eligible mother" and "those individuals who are not requesting Medical Assistance yet appear on the
application". CO-1401 reads `mother_was_enrolled_in_medicaid_at_birth` with no age bound, so a
ten-year-old whose mother was on Medicaid at his birth is exempt for life. (CO-1395's citizenship
exemption is right to be permanent — 435.406(a)(1)(iii)(E), S844, "are or were deemed eligible" — but
the SSN exception is for a newborn.) Fix: conjoin `[<, age, 1]` (the deemed-newborn year) in CO-1401;
the non-requesting carve-out needs the `is_requesting_ma` fact of C-4.

**C-17 (should-fix). S842: the excerpt is titled "Medicaid residency, SSN, pregnancy, age and household
verification" but quotes only 435.956(c)(1); seven items cite it for pregnancy, age and household.**

CO-1314, CO-1334, CO-1335, CO-1406, CO-1407, CO-1408, CO-1409 cite S842. The governing text — (e)
"The agency must accept self-attestation of pregnancy unless the State has information that is not
reasonably compatible" and (f) "may verify date of birth and the individuals that comprise an
individual's household" — is at `documents/D-96.md:229-237` but not in the excerpt; CO-1406 leans on
S868, which is the CHIP rule (457.380(e)). Fix: extend S842 to quote 435.956(c)(1)-(2), (d), (e), (f).

### 1.3 Notes

**C-18 (note). CO-1374:** the meaning says the basic-categorical SSN relief applies "unless
questionable"; the derivation has no questionable path and there is no SSN-questionable fact. 4.505.2.A
(S823) — "For basic categorically eligible clients, the local office shall accept SSNs as verified by
the categorically eligible programs" — has no such carve-out. Correct the meaning.

**C-19 (note). CO-1309/CO-1366:** for SNAP, 273.2(f)(1)(ii)(B)(1) (S802) protects the non-citizen once
"the State agency has submitted a copy of a document provided by the household to USCIS"; CO-1309 is
"has submitted documentation ... that the agency *can* submit". State in CO-1309's precision that the
fact is true only once the agency has submitted it to USCIS (the case suppliers will otherwise read it
as receipt).

**C-20 (note). CO-1318, CO-1300:** the program-neutral EDS facts merge sources the programs treat
differently. Colorado SNAP's verified-upon-receipt list is closed — "shall consider *only* the
following information as VUR: 1. Social Security and SSI ... 2. Death information ... 3. Unemployment
insurance benefits" (4.504.6.D, S820) — yet CO-1318 also counts "public assistance or child support
system records" and SNAP's unearned arm (CO-1361) accepts them. Either narrow the SNAP arm to an
SSA/UIB fact or record in CO-1318's precision which sources each program accepts.

**C-21 (note). Program-neutral "document received" facts cannot express period adequacy.** LEAP wants
pay stubs for 4 of the 8 weeks before application (3.755.21.D, S898); CCCAP the prior 30 days, up to 12
months (3.111.H.5.a, S891); Medicaid a single recent stub (8.100.4.B.1.c). One
`earned_income_verification_document_received` cannot say a Medicaid-sufficient stub is LEAP-
insufficient. Acceptable for this phase; state it in CO-1316's precision.

**C-22 (note). Colorado's conditional document rules are not representable by a document-type fact**:
two affiants, one unrelated, for the citizenship affidavit (8.100.3.H.2.b.xxi,
`documents/D-101.md:845`), records "created near the time of birth or at least 5 years before" for
children under 16 (`documents/D-101.md:840`), and the parent's identity affidavit "cannot be used if an
affidavit for citizenship was provided" (`documents/D-101.md:1074`). CO-1397/CO-1399 accept the
types unconditionally. Record in their precision.

**C-23 (note). Checked and correct.** P46 `days_after` (UTC arithmetic, negative counts back; parse
order does not collide with `months after`). The reasonable opportunity period: request
2026-10-01 + 5 (receipt, 435.956(b)(2)(i), S841) + 90 = 2027-01-04 (CO-01), 2026-11-02 + 95 =
2027-02-05 (CO-91). The 435.407 tiers: CO-1396 is the federal stand-alone list (a)(1)-(5),(7), SSA and
SAVE matches go through the EDS fact, (b) documents require a separate identity document (CO-1398), and
CO-1399 matches 435.407(c) and 8.100.3.H.3.a-j. Reasonable compatibility arithmetic matches
8.100.4.C.2.a.i-iii. SNAP expedited: identity always (S814, S816, S835), postponement to application +
30 (S835). Due dates: SNAP 10 days from request (S813, S834), CW and AF 11 calendar days from the written
request (S871, S879), CCCAP 15-day noticing period (S891), LEAP two calendar weeks from postmark (S899).
Status ordering (worst first: past due, then expired, then pending, then within-ROP) is coherent in
every program, subject to C-2, C-5, C-9 and C-12.

---

## 2. Completeness

**K-1 (should-fix). Only initial application is modeled; every fetched text also has
recertification/renewal verification, and some of it *forbids* re-verifying.**

- SNAP: 4.502.B (`documents/D-103.md:514`) — at recertification verify only changed, incomplete,
  questionable or outdated factors; income changed by $50 or more; dependent care, medical and child
  support changed by more than $25; newly obtained SSNs. 4.502.C (`:558`) periodic report. 7 CFR
  273.2(f)(8)(i) (`documents/D-95.md:237-243`). 4.506 (S830) "Income is also verified at
  recertification when ... changed more than fifty dollars".
- Medicaid: 435.956(a)(4)(ii) (`documents/D-96.md:199`) — "the agency may not re-verify or require an
  individual to re-verify citizenship at a renewal"; 8.100.3.H.4.h (`documents/D-101.md`, "Once an individual has provided the required citizenship and identity
documentation") —
  not again unless questioned or a five-year gap. 42 CFR 435.916 itself is **not in D-96** (its
  `citation` field lists 435.910 and 435.940–435.965 only), so renewal verification cannot be reviewed
  against text; fetch it.
- Adult Financial: 3.520.72.D.4 (`documents/D-105.md:1089`) — after resources are verified at
  application, client statement until each 24-month redetermination.
- Colorado Works 3.604.3.B.2.c.1-2 (SSN by next recertification); CCCAP 3.111.H.5.e.2 (closure at
  redetermination after 15 days) and 3.111.K.2.c (child support at each redetermination).

A case evaluated at renewal today asks for everything again, including citizenship the federal rule
forbids re-requesting. Fix: a supplied `is_renewal` (per program, or one per case) gating the
application-only arms, or a sentence in the design amendment scoping phase 9 to initial applications
with an OQ for each rule above.

**K-2 (should-fix). Sponsor (deeming) verification has no item in any program.**
SNAP 4.505.7.A-B (`documents/D-103.md:1380ff`): verify the sponsor's and spouse's income and resources,
other sponsored non-citizens, dependents, and contact details; "Until the non-citizen provides
information or verification necessary to determine eligibility, the sponsored non-citizen shall be
ineligible." Colorado Works 3.604.3.J.1 (`documents/D-104.md:960`): "the client must provide income
information about the non-citizen's sponsor(s)". Adult Financial 3.520.69.A (`documents/D-105.md:957`) and 3.520.5.A.3 (S880: verify income "for the client, client's spouse, and sponsor(s)").
4.502.A.4 (S819) even lists "sponsored non-citizen information" among the factors categorical
eligibility relieves. Fix: supplied `is_sponsored_non_citizen` and `sponsor_information_verified`, an
arm in SNAP (eligibility factor, ineligible member until provided), CW and AF.

**K-3 (should-fix). Long-term care: the documentary requirements Colorado does state are not
represented; there is no fetched "bank statements" rule.** The fetched text names no bank-statement
requirement and no "60 months of statements" verification rule; 8.100.5.B.1.e (S866) verifies
resources "available ... in the month", with the Asset Verification Program as valid verification. What
the volume's D-41 (10 CCR 2505-10 8.100.7) does require at application for LTC is:
8.100.7.A.2.h — no transfer without fair consideration on or after the look-back date
(`documents/D-41.md:1013`), the look-back being "60 months prior to the date of application"
(8.100.7.F.2.a, `:1301`); A.2.i — trust documents (`:1015`); A.2.j — "documents verifying that an
annuity conforms" (`:1017`); A.2.c.ii — documentation of the 30-day institutional stay (`:993`);
plus verification of joint ownership and of efforts to sell real property (`:429`, `:497`). CO-01's p1
is applying for nursing facility care, and her Medicaid status reads `pending` on resources alone. Fix:
items for the transfer declaration (60-month look-back), trust and annuity documents, gated on an LTC
application; or an OQ scoping LTC documentation out with these citations.

**K-4 (should-fix). CCCAP activity hours and the other 3.111.C.2 verifications.** 3.111.G.1.b
(`documents/D-106.md:278`): "must verify that his/her gross income divided by the number of hours
worked equals at least the current federal minimum wage" (hours are verified, not just the activity);
G.2.b and G.2.d (self-employment weekly schedule and minimum-wage test); 3.111.C.2.e and 3.112.F
(`:125`, `:819`, schedule when non-traditional hours are requested); C.2.g and D.1.c.3 (incapacitation
by physician's statement, `:139`); F (verified additional care needs); D.5 (an unrelated caretaker's
verification from the parent or a court order); C.2.h (custody/parenting schedule); C.2.c, F.2 and
3.112.D (immunizations for non-school-age children with unrelated exempt providers). None has an item;
`has_additional_care_needs` and the incapacitated-second-caretaker exemption already drive CCCAP
eligibility unverified. Fix: at least the hours/minimum-wage element (it decides eligibility) and
additional care needs; the rest as one OQ.

**K-5 (should-fix). SUN Bucks has no verification items, and 7 CFR 292 does state verification rules.**
D-88 (7 CFR 292, the sections fetched in phase 8):

- 292.2 "Verification means confirmation of eligibility ... when a child's eligibility is established
  through a Summer EBT application. ... Direct verification ... must be attempted prior to contacting the
  household. ... If a SNAP or TANF case number ... is provided for a child, verification for such child
  must only include confirmation that the child is a member of a household receiving SNAP, TANF, or
  FDPIR benefits." (`documents/D-88.md:216`; "Direct verification" `:46`, "Rolling verification" `:146`,
  "Verification for cause" `:218`)
- 292.12(d)(3): "Streamlined certification does not require further confirmation of school
  enrollment." (`:322`)
- 292.12(e)(2): confirmation of NSLP/SBP school enrollment is required for application-based children
  (`:334`); (e)(4): "Summer EBT agencies are prohibited from requiring income documentation at the time
  of application." (`:338`)
- 292.13(f): follow up an incomplete application within 10 operational days (`:388`).
- 292.15(c)(1)(iv): "Children on applications that are selected for verification must not be issued
  benefits until verification is complete and eligibility is confirmed. Additional information about the
  verification requirements ... can be found at § 292.14." (`:456`)

§ 292.14 — the verification section itself (sample selection, deadlines, (e) direct verification,
(f)(3) documents) — was not fetched. Fix: fetch 292.14; add `sebt_verification_status`
(`not_required` for streamlined certification and categorical eligibility on a case number;
`pending`/`complete` for an application selected for verification, with enrollment confirmation as an
element), and an outcome pair matching the other seven programs.

**K-6 (should-fix). Adult Financial: the AND-SO disability certification and marital status.**
3.520.4.C.4.c.4 (`documents/D-105.md:109`): for AND-SO "provide the client with a medical
disability certification form"; CO-1435 verifies disability only for SSI recipients (AND-CS, S533), so
an AND-SO applicant's disability is never pending (3.541, the disability section, is not fetched).
3.520.63.A,C (`documents/D-105.md:642`): marital status verified "if questionable" (divorce decree, death certificate). Fix: an
arm for AND-SO disability certification (fetch 3.541) and a questionable-marital-status arm.

**K-7 (note). SNAP 273.2(f)(1) elements without an item.** (x)'s second sentence — individuals claiming
to be a separate household "shall be responsible for proving" it; (xi) student physical/mental
unfitness; (xiv)(B) countable time-limit months used in another state; (ii)(A) and 4.505.61 the 40
qualifying quarters (QCHS) for an LPR; 4.505.8 the IPV/disqualification database (an agency check, not a
household document); (iii) actual utilities and unoccupied homes (OQ-312). All in
`documents/D-95.md:153-203` / D-103. The (f)(1) list is otherwise represented: (i) CO-1376/1377,
(ii) CO-1373, (iv) CO-1380, (v) CO-1374, (vi) CO-1375, (vii) CO-1370, (viii) CO-1384, (x) CO-1383,
(xii) CO-1382, (xiv)(A) CO-1386.

**K-8 (note). Medicaid/CHP+ Express Lane.** 10 CCR 2505-3 180.1-180.2 (`documents/D-102.md:87`, `:130`) give a child "90 days of eligibility while awaiting" citizenship and identity, and base
eligibility on income declared on a Free/Reduced Lunch, SNAP or Colorado Works application; 435.407(c)(1)(ix)
accepts an Express Lane finding of identity. No item; add an OQ. Also 435.956(a)(3) (veteran status for
the five-year-bar exemption, verified through the hub or by attestation) and 8.100.5.B.1.d's "or during
the previous month" for ABD unearned income (CO-1404 reads the current month only).

**K-9 (note). Colorado Works secondary verifications** 3.604.3.C.2, C.3, C.5, C.6 (good cause,
noncustodial parent and child support, work participation, absences; `documents/D-104.md:593`) and
B.2.e's "other household member whose income is used" (CO-1425 sums the assistance unit only). And
LEAP 3.755.21.K (gift income verified by declaration) and the prior-year vulnerability copy of 3.755.11.

**K-10 (note). Acceptability lists not modeled where the text gives one**: Adult Financial age
documents (3.520.62.A-K, S882 — `age_is_verified` accepts any document); Colorado Works and LEAP
immigration documents (3.604.3.I.5, 3.753.14 — I-94, I-551, I-688B/I-766, USCIS/HHS letters, SIV).
Harmless while the status arm requires a SAVE result, but the design amendment asks for "which
documents they accept where they list them".

---

## 3. Open questions OQ-300..OQ-324

Each was checked against D-95..D-109 (and D-41, D-88). "Answered" means a fetched text settles it and
the OQ should be closed with the fix named; "gap" means the rule is clear and only a fact is missing.

| OQ | Verdict |
|---|---|
| OQ-300 one request date | Open (design). But two SNAP periods do not run from any request: 4.505.6.E and 4.502.A.3 run from the application date — C-2, C-5. |
| OQ-301 ROP start | Answered: 435.956(b)(2)(i) (S841) is a federal floor ("considered to be 5 days after the date on the notice"); 8.100.3.G.3.a.i/H.9.a cannot shorten it. Close as decided; the volume's reading is right. |
| OQ-302 20% threshold; ABD | First half open (no fetched text says 20% of what). Second half answered by 8.100.5.B.1.c (S867, "applicable ... program income standard") — a defect, C-6 (and CHP+). |
| OQ-303 period for other MA documents | Open: only "a reasonable period" (435.952(c)(2)(iii), S838) and 8.100.3.D.1-2. Genuine. |
| OQ-304 identity documents | Answered by 435.407(c)(1) "must accept" (S848). Close as decided. |
| OQ-305 stand-alone tier | Answered by 435.407(a) "must be accepted" (S845). Close as decided. |
| OQ-306 special circumstances | Answered: 435.952(c)(3) (S839) is case-by-case; the `is_homeless` shortcut is the defect, C-15. Gap: a fact. |
| OQ-307 MSP attestation | Rule answered by 435.952(e) (`documents/D-96.md:137`); gap: an MSP-only-application fact. Keep as gap. |
| OQ-308 immigration for children/pregnant | Answered against the exemption by 110.1.C (S870) and 8.100.4.B.1.e (`documents/D-101.md:1630`) — C-3. |
| OQ-309 past due ≠ denial | Open by design scope (4.205.3, 273.2(g)(3), (h) exist but are processing). Fine. |
| OQ-310 application date; migrant/newly arrived | Rule answered (4.505.3.A, S824; 273.2(f)(1)(vi), S805); gap: a fact. |
| OQ-311 categorical relief | Mostly answered by 4.502.A.4 (S819) with 273.2(j)(2)(v) (`documents/D-95.md:423`); the BBCE reading follows the "unless not already collected and verified by the other PA program" clause. Close. |
| OQ-312 actual utilities | Rule answered (273.2(f)(1)(iii)); gap: facts. |
| OQ-313 third-party citizenship statement | Open (worker judgment). Genuine. |
| OQ-314 CW citizenship for every client | Answered by 3.604.3.B.2.b (`documents/D-104.md:531`, "All participating clients shall provide") read with I.2 (guidelines for questionable *statements*) and K (30 days, individual exclusion). Close; apply C-9. |
| OQ-315 incorporated lists | Open but fetchable: 45 CFR 1626.6 (eCFR) and 1 CCR 204-30 (Rule 5 App. A/B for CW, `documents/D-104.md:818ff`; Rule 16 for AF, `documents/D-105.md:861`). Fetch. |
| OQ-316 extensions | Open as a modeling gap; add 3.604.3.K (C-9) and CCCAP's 60-day new-application rule (3.111.H.5.e.1.b, S891), which are periods, not extensions. |
| OQ-317 AF income verification | Answered by 3.520.5.A.2.a (S880: wage data "Additional verification must be obtained ... within eleven (11) days ... or the case will be discontinued or denied") and A.3. Close. |
| OQ-318 LEAP missing SSN | Answered by 3.751.1 Completed Application B (S893) — the OQ quotes it. C-1. |
| OQ-319 LEAP citizenship documents | Open (fetch 1 CCR 204-30 Appendix A). Genuine. |
| OQ-320 9 CCR 2503-1 | Confirmed: D-108 is "RESERVED FOR FUTURE USE" (S900). 9 CCR 2503-8 remains unfetched. |
| OQ-321 SSN never delays | Answered by the five texts it cites (S804, S823, S843, S878, S884). Close as decided. |
| OQ-322 CHP+ follows MA | Answered by 130.1 (S869). Close, subject to C-3 and C-6. |
| OQ-323 postponement 30 days vs 2nd/3rd month | Open: a real conflict between 273.2(i)(4)(iii)(A)-(B) and 4.205.11.B.2.b (S835). Genuine. |
| OQ-324 foster-care exemption fact | Rule clear (S844, S854); gap: a dedicated foster-care fact. Keep as gap. |

Of 25: 10 are answered by fetched text (301, 304, 305, 308, 311, 314, 317, 318, 321, 322), as is the
ABD half of 302; 5 are fact gaps with the rule settled (306, 307, 310, 312, 324); 1 is confirmed
informational (320); 9 are genuinely open (300, 302's first half, 303, 309, 313, 315, 316, 319, 323),
two of which (315, 319) close once an incorporated text is fetched.

---

## 4. Cases

### 4.1 CO-91, recomputed by hand

Facts: p1 (34, citizen, homeless, no income, $20 cash, pays $150 court-ordered support and $200
dependent care, job search), p2 (6); application and checklist 2026-11-02; evaluated 2027-02-10.

- **SNAP** (household p1, p2; `expanded_categorical`, expedited: $0 income, $20 liquid). Required:
  identity (head, DMV match: verified), SSN p1/p2 (SSA: verified), dependent care (S832, always),
  child support paid (S809, always); residency not required (homeless, CO-1375). Eligibility pending 0,
  expenses pending 2. Postponement end 2026-11-02 + 30 = 2026-12-02 and due date 2026-11-12 both past;
  only expenses → `expenses_disallowed`, count 2. **Agrees** (also under C-5: application + 30 =
  2026-12-02, past).
- **Medicaid** p1: citizenship required (no exemption), no SSA match, no document → pending; identity
  required (citizenship not by SSA or stand-alone) but DMV match verifies it (8.100.3.H.1.a.ii, S854);
  SSN verified. Status count 1, other 0. ROP end 2026-11-02 + 5 + 90 = 2027-02-05 < 2027-02-10 →
  `reasonable_opportunity_expired`, count 1. **Agrees.** p2: birth certificate (CO-1397) plus a school
  record (CO-1399, under 19) → `complete`. **Agrees.**
- **CHP+** p1: arithmetic reproduces `reasonable_opportunity_expired`/1, but p1 is a 34-year-old man and
  `chp_eligibility_status` = `ineligible`. **Disagrees under C-4**: `not_applicable`. p2 `complete`
  agrees.
- **Colorado Works** (unit p1, p2): p1 lawful presence satisfied by the DMV *identity* match (C-8 would
  make it pending: no document produced), citizenship pending, residency pending; p2 citizenship by
  birth certificate. Count 2 → `past_due` (due 2026-11-13). **Agrees as built.** Under C-8 the count is
  3; under C-9 citizenship and lawful presence have until 2026-12-02 (still past) and exclude p1, not
  the unit.
- **Adult Financial** (not expected in the case): evaluates to `past_due`, count 2 — residency and the
  $20 cash. Under C-4 `not_applicable` (`af_category` = `none`; 34, not disabled); under C-7 the cash
  arm goes regardless.
- **CCCAP** (household p1, p2): p1 residency pending, activity (job search) verified, child support paid
  pending; p2 nothing questionable. Count 2, due 2026-11-17 → `past_due`. **Agrees as built**; under
  C-12 the count is 1 (residency) and the status stays `past_due`.
- **LEAP** (p1, p2): SSNs verified, no income, not responsible for heat → count 0, `complete`.
  **Agrees as built**; under C-14 the zero-income verification is pending (no fact states the DOLE
  check), so `past_due` once modeled.

Recommended expectation changes: p1 `chp_verification_status` → `not_applicable` (C-4); p1
`cccap_pending_verification_count` → 1 (C-12); add p1 `af_verification_status: not_applicable` to pin
C-4; add an LPR child (C-3) and a second household with a non-citizen whose document is outstanding on
day 15 (C-2) as new cases or persons.

### 4.2 CO-01 and CO-02, recomputed by hand

CO-01 (2026-10, checklist 2026-10-01; due dates SNAP 10-11, CW/AF 10-12, CCCAP 10-16, LEAP 10-15, MA
10-31, ROP 2027-01-04):

- **SNAP** (p2..p5; p1 institutional; `expanded_categorical`): p2 residency (head, not homeless, not
  basic-categorical) pending; p3 wages (ineligible member, income counted; DOLE not VUR, S821) pending;
  everything else verified by SSA/SAVE or furnished. Count 2, `pending`. **Agrees.**
- **Medicaid**: p1 resources (ABD, countable $1,900) → `pending` 1; p2 resources ($44,100) → `pending` 1
  (status SAVE-verified); p3 wages (no SSN, so no EDS match, 8.100.4.B.1.c) → `pending` 1; p4 citizenship
  and identity → `pending_reasonable_opportunity` 2; p5 deemed newborn → `not_required`. **Agrees.**
  Note K-3: p1's LTC application owes transfer, trust and annuity documentation not modeled.
- **CHP+**: p4 `pending_reasonable_opportunity` 2, p5 `not_required` agree; p1 `complete`, p2 `complete`,
  p3 `pending` 1 are results for people CHP+ cannot reach → `not_applicable` (C-4).
- **Colorado Works**: p1, p2 (units of one, no child) `pending` 1 (residency) → `not_applicable` (C-4).
  p3 count 3 (SSN, wages, residency) — and her lawful presence reads verified by a Colorado license
  although the case states `not_lawfully_present` (C-8); her unit of one has no child → `not_applicable`.
  p4/p5 count 2 (p4 and p5 citizenship, OQ-314) `pending`: **agrees**.
- **Adult Financial**: p1, p2 `pending` 2 (residency, resources); both are of OAP age, so C-4's
  categorical row keeps them — **agrees** if they applied (no fact says so); p3..p5 evaluate to unknown
  (no resource facts), which the case rightly does not expect.
- **CCCAP**: p1/p2 `complete` → `not_applicable` (no eligible child, C-4). p3/p4/p5: p3 wages, p4
  residency and activity (teen parent) → 3, `pending`. **Agrees.**
- **LEAP**: p1/p2 count 2 (heating twice) → **1** under C-13. p3/p4/p5 count 5 (p3 SSN, p3 wages, heating
  ×3) → **2** under C-1 and C-13 (p3 wages, heating once); still `pending`.

CO-02 (2026-11, the October documents in except p4's citizenship and identity):

- SNAP, Medicaid, CCCAP: as expected (p4 `pending_reasonable_opportunity` 2; everyone else complete or
  not required). **Agree.** CHP+ results for p1, p2, p3 → `not_applicable` (C-4).
- **Colorado Works**: p3 `past_due` 1 (no SSN; `ssn_exception_applies` is ignored by CO-1424) →
  `not_applicable` (unit of one, no child, C-4). p4/p5 `past_due` 2 (p4 and p5 citizenship): under C-9
  the 30-day period ran to 2026-10-31, so still past, but the right status is that p4 and p5 are
  excluded from payment, not that the unit fails.
- **LEAP**: p3/p4/p5 `past_due` 1 — p3's SSN. **Disagrees with the text**: p3 is not a household member
  (3.753.17) and in any case a member without an SSN "will not be included in the household" (3.751.1,
  S893) → count 0, `complete` for p3, p4 and p5 (C-1). p1/p2 `complete` agrees.

Expectation changes for the fix round: CO-02 p3/p4/p5 `leap_verification_status` → `complete`,
`leap_pending_verification_count` → 0; CO-01 p1/p2 `leap_pending_verification_count` → 1, p3/p4/p5 → 2;
the CHP+, CW and CCCAP rows listed above → `not_applicable`.

---

## 5. Caseworker usability

**U-1 (should-fix). Neither outcome tells a worker which document is outstanding.**

A worker opening CO-01 p4 sees `snap_pending_verification_count: 2`, `cw_pending_verification_count:
2`, `cccap_pending_verification_count: 3`, `leap_pending_verification_count: 5` — household sums
repeated identically on every member, so the worker cannot tell *whose* document is missing, let alone
*which*. The status adds only the time position. The intermediate items do not fill the gap: the
`<prog>_requires_verification_of_<element>` items say what is required, not what is missing; several
programs have none for elements read straight from facts (CW citizenship and SSN, AF age, residency and
identity, LEAP SSN); and the per-element "pending" logic exists only as anonymous `case` arms inside the
count items (CO-1389, CO-1390, CO-1410, CO-1411, CO-1417, CO-1424, CO-1436, CO-1448, CO-1459). Only SNAP
identity (CO-1387) is a named pending item. A CBMS checklist (the very notice S813, S815, S871 and S879
require: "a specific list of verifications necessary to determine eligibility") cannot be produced from
these outcomes.

Fix (smallest, ledger-only, no engine change). Name each `case` arm as its own item
`<prog>_<element>_verification_is_pending` (yes/no, person-month, `role: outcome`), and rewrite each
count as `[+, [case, [<prog>_<element>_verification_is_pending, 1], [else, 0]], ...]`. The logic does
not change; it is lifted out of the counts. About 60 items: SNAP 15 (12 factors + 4 expenses, less the
existing CO-1387), Medical Assistance 11 (CHP+ reads them), Colorado Works 10, Adult Financial 10,
CCCAP 8, LEAP 6 (fewer after C-1). Also promote the existing per-person counts
(`snap_person_pending_verification_count`, `cw_person_…`, `cccap_person_…`, `leap_person_…`) to outcomes
so the household sum can be traced to a member. A single list-valued outcome per program
(`<prog>_pending_verification_elements`, "set of one of") would be tidier for a UI but needs a new type
in conventions and the engine; the per-element yes/no needs neither. Pair it with C-4's
`not_applicable` row so a worker's checklist does not list documents for programs the person is not in.

---

## Summary for the fix round

1. **C-1** — `energy/CO-1458`–`CO-1460`, `CO-1462`, `energy/CO-1000`: drop the SSN and SAVE arms from
   the LEAP count; filter household membership on them (3.751.1 B, 3.753.17); income arms over
   `leap_household_members_for_income`, citizenship over `leap_household_members`. Close OQ-318.
2. **C-2** — `snap/CO-1389`, `CO-1394`, a new parameter and due date: the non-citizen's 30th day after
   application (4.505.6.E, 273.2(f)(1)(ii)(C)).
3. **C-3** — `medicaid/CO-1400`: verify every declared legal status (110.1.C, 8.100.4.B.1.e); close
   OQ-308; add an LPR-child case.
4. **C-4** — every `<prog>_verification_status`: a `not_applicable` first row on categorical reach (or
   supplied `is_requesting_<prog>` facts); update CO-01, CO-02, CO-91 per §4.
5. **C-5..C-17** — SNAP expense 30 days; reasonable-compatibility standard per program and the
   zero-attested earner; gross-resource keying and AF cash; CW lawful presence (no EDS, license types,
   I.4.b.6); CW 3.604.3.K 30 days and individual exclusion; AF OAP non-citizen SSN; self-employment per
   program; CCCAP deductions; LEAP heating once per household and zero income; MA special circumstances
   by fact; newborn SSN age bound; S842 excerpt.
6. **K-1..K-6** — renewal/recertification scope (fetch 42 CFR 435.916); sponsor verification; LTC
   transfer/trust/annuity documents (D-41); CCCAP hours and minimum-wage test; SUN Bucks (fetch
   7 CFR 292.14, add `sebt_verification_status`); AND-SO disability and marital status.
7. **OQs** — close OQ-301, 304, 305, 308, 311, 314, 317, 318, 321, 322 and the ABD half of OQ-302 with
   the citations in §3; fetch 45 CFR 1626.6 and 1 CCR 204-30 (OQ-315, OQ-319).
8. **U-1** — name each pending arm as `<prog>_<element>_verification_is_pending` (outcome) and promote
   the per-person counts.

Counts: **4 blocking** (C-1, C-2, C-3, C-4); **20 should-fix** (C-5..C-17, K-1..K-6, U-1); **10 notes**
(C-18..C-23, K-7..K-10). Of the 25 open questions, 10 (and half of OQ-302) are answered by fetched text,
5 are fact gaps with the rule settled, 1 is confirmed, and 9 are genuinely open.

---

## Disposition (fix round, 2026-11-21)

Fix round on branch `ccr-9d19bf4c-wmnwcl`'s worktree, two commits after `cbf1f56`. New items CO-1560..CO-1699
(34 supplied facts, 6 parameters, 96 derived items; CO-1400 and CO-1434 retired), documents D-115..D-120,
excerpts S1050..S1098, open questions OQ-370..OQ-382. Eligibility items (ma_/chp_ eligibility, CO-1000 and
the other programs' eligibility chains) were read, not edited. `CHECK_BASE=origin/main npm run check`:
co 1416/1416 rule tests, 2063/2063 case expectations; mwr unchanged; typecheck and `npm test` (586) pass.

Documents fetched this round: D-115 42 CFR 435.916 (eCFR, as amended 91 FR 33480, June 3, 2026); D-116
7 CFR 273.14 and 273.2(f)(8) (eCFR, current 2026-11-19); D-117 7 CFR 292.14 (eCFR); D-118 45 CFR 1626.6
(eCFR); D-119 1 CCR 204-30 Rule 5 with Appendices A and B (SOS archived version effective 06/30/2026, Rule 5
unchanged since 08/30/2016, so the Mar. 2, 2021 edition 3.604.3.I.1 incorporates); D-120 1 CCR 204-30
current version effective 10/15/2026 (Rule 5 withdrawn and, per the editor's notes, repealed effective
10/15/2026; Rule 6 § 2.3.1 excludes Road and Community Safety Act licenses; Rule 16 exceptions-processing
documents). 435.956 was re-fetched and matches D-96, which S842 now quotes in full for (c)-(f). AND-SO's
3.541 was already in D-80 (SOS, effective 03/02/2026) and is cited from there.

### Blocking

| Finding | Disposition |
|---|---|
| C-1 LEAP member exclusion | **Fixed.** SSN and SAVE arms left CO-1458/CO-1459/CO-1460 and the status; new outcome `leap_member_is_excluded_for_verification` (CO-1694, S893, S494). Income arms sum over `leap_household_members_for_income`; the citizenship arm reads Rule 5 Appendix A. Filtering CO-1000 itself is an eligibility-item change, handed to the LEAP eligibility round as OQ-370. CO-02 p3/p4/p5 now `complete`/0; CO-01 LEAP counts 1 and 2. OQ-318 resolved. |
| C-2 SNAP non-citizen 30 days | **Fixed.** `snap_noncitizen_documentation_days` (CO-1594, 30) and `snap_noncitizen_documentation_due_date` (CO-1617: the later of application + 30 and request + 10, a `case` on `<=` since `max` is numeric only); CO-1394 has a pending row while only status documents are outstanding before that date. New excerpts S1057 (273.2(f)(1)(ii)(C)) and S1097 (4.505.6.E); case CO-92 is the day-15 household. |
| C-3 Cover All Coloradans and immigration verification | **Fixed.** CO-1400 retired (it would have been an alias of `claims_lawful_immigration_status`); `ma_immigration_status_verification_is_pending` (CO-1622) and the required counts (CO-1412, CO-1416) read the declaration directly, cited to S852, S870 and 8.100.4.B.1.e (S1085). OQ-308 resolved; CO-92 has an LPR child in the reasonable opportunity period for Medicaid and CHP+. |
| C-4 not_applicable | **Fixed.** Every status has a first `not_applicable` row: Medical Assistance on `is_requesting_health_coverage` (CO-1560, needed anyway for 8.100.3.I.1); CHP+ on that fact and categorical reach (under 19 or pregnant); SNAP on `snap_is_household_member`; Colorado Works on a dependent child or pregnant member in the unit; Adult Financial on OAP age or an AND/AB basis (SSI, blindness, SSA disability, or `claims_disability`, CO-1584, needed for K-6); CCCAP on an eligible child; LEAP on a non-empty `leap_household_members`; SUN Bucks on school age or NSLP enrollment. Only Medical Assistance/CHP+ and AND-SO needed a new fact (OQ-382). CO-01, CO-02, CO-91 updated as §4 lists. |

### Should-fix

| Finding | Disposition |
|---|---|
| C-5 SNAP expenses 30 days | **Fixed.** `snap_expense_verification_days` (CO-1595), `snap_expense_verification_due_date` (CO-1618); CO-1394 pending row before `expenses_disallowed`. CO-91 unchanged. |
| C-6 reasonable compatibility standard; zero-attested earner | **Fixed.** `chp_income_is_reasonably_compatible` (CO-1641) on the CHP+ upper limit and `chp_requires_verification_of_earned_income` (CO-1642) for CHP+; `ma_abd_income_is_reasonably_compatible` (CO-1640) on the SSI rate (300% for long-term care) with the new data fact CO-1589; CO-1403 picks the standard by category and asks an adult attesting no earnings when the data figure is positive and not compatible. ABD half of OQ-302 resolved; the approximation is OQ-374. |
| C-7 gross resources; AF cash | **Fixed.** `has_resources_other_than_cash` (CO-1562); CO-1405 keys on it or countable resources, CO-1433 on it alone (cash on the client's statement, 3.520.72.D.5). CO-91 AF count no longer counts the $20. |
| C-8 CW lawful presence | **Fixed.** `cw_lawful_presence_verification_is_pending` (CO-1644) accepts a produced listed document, a Rule 5 Appendix A citizenship document, or a SAVE result, not an identity match; new document type `colorado_road_and_community_safety_act_license_or_id` (CO-1302, Rule 5 § 1.8, Rule 6 § 2.3.1) and CO-01/CO-02 p3 now carry it; CO-1420 has the I.4.b.6 exemption. CO-91 CW count 3. The DMV check of 3.604.3.H.4 is OQ-376. |
| C-9 CW 30 days and individual exclusion | **Fixed.** `cw_status_verification_days` (CO-1598), `cw_status_verification_due_date` (CO-1656), `cw_person_pending_status_verification_count` (CO-1655); CO-1427 adds `members_excluded`. CO-02 p4/p5 now `members_excluded`. Excerpt S1064. |
| C-10 AF OAP non-citizen SSN | **Fixed.** `has_been_issued_ssn` (CO-1564); CO-1430 as the review proposes. |
| C-11 self-employment per program | **Fixed.** `self_employment_income_verified_by_electronic_data_source` (CO-1563); CO-1315's meaning narrowed to wage matches; CW (CO-1649) accepts SSA self-employment data; AF (CO-1665) requires self-employment documentation and does not accept it when questionable; LEAP (CO-1455) asks documents for wages only (S1084). CO-1434 retired as a restatement of `has_earned_income`. |
| C-12 CCCAP child support | **Fixed.** `cccap_child_support_paid_verification_is_pending` (CO-1683) is counted in `cccap_pending_deduction_verification_count` (CO-1688), not the eligibility count; CO-1451 adds `deduction_disallowed`. CO-91 CCCAP count 1, still `past_due`. The self-employment expense half (3.111.G.2.a) is OQ-378. |
| C-13 LEAP heating once | **Fixed** in the count (CO-1460 adds one if any member's heating is pending). **Deferred:** the CO-01/CO-02 `is_responsible_for_heating_costs` facts for the children are left as they are, because LEAP vulnerability, an eligibility item owned by another round, reads them (OQ-381). |
| C-14 LEAP zero income | **Fixed.** `zero_income_verified` (CO-1565), `leap_zero_income_verification_is_pending` (CO-1693, S1083). CO-91 LEAP now `past_due`. |
| C-15 special circumstances by fact | **Fixed.** `documentation_not_reasonably_available` (CO-1561) replaces `is_homeless` in CO-1407-CO-1409 and is read by CO-1403-CO-1406 and CO-1642. OQ-306 resolved. |
| C-16 newborn SSN; non-requesters | **Fixed.** CO-1401 bounds the newborn exception by `ma_needy_newborn_age_limit_years` and requires `is_requesting_health_coverage`. |
| C-17 S842 | **Fixed.** S842 quotes 435.956(c)(1)-(2), (d), (e), (f). |
| K-1 renewal/recertification | **Fixed for Medical Assistance and SNAP.** `ma_determination_is_renewal` (CO-1566) keeps CO-1395 from re-verifying citizenship at renewal (435.956(a)(4)(ii), S1052; 8.100.3.H.4.h, S1053); 435.916's 30-day renewal form equals the existing 30-day due date (S1050). `snap_determination_is_recertification` (CO-1567) with last-verified amounts (CO-1568-CO-1572), the $50 and $25 thresholds (CO-1596, CO-1597) and `snap_income_changed_since_last_certification` (CO-1619) gate the identity, immigration, residency, income, expense and disability items (273.14(b)(4), 273.2(f)(8), 4.502.B; S1054-S1056). **Deferred** for Colorado Works, Adult Financial and CCCAP (OQ-373: their renewal rules are cited but not modeled); boundary and outdated-information gaps are OQ-371, OQ-372. |
| K-2 sponsor verification | **Fixed.** `is_sponsored_non_citizen`, `sponsor_information_verified` (CO-1573, CO-1574); SNAP requirement and pending items (CO-1616, CO-1611, S1061), Colorado Works (CO-1654, S1062), Adult Financial (CO-1672, S1063, entry on or after 1996-08-22). Member-level ineligibility and deeming exemptions are OQ-380. |
| K-3 long-term care documentation | **Fixed.** `ma_is_long_term_care_applicant` (CO-1631) gates the 30-day stay (CO-1632/CO-1636), the 60-month transfer look-back documentation (CO-1637), trust (CO-1634/CO-1638) and annuity (CO-1635/CO-1639) documents, with six supplied facts (CO-1575-CO-1580; S1086-S1088). CO-01 p1 now owes the transfer documentation (count 2); CO-02 has it. Joint ownership and sales-effort verification are OQ-379. |
| K-4 CCCAP hours and other verifications | **Fixed** for hours worked (CO-1684/CO-1685, 3.111.G.1.b, G.2.d; S1081) and additional care needs (CO-1686/CO-1687, CO-1581; S1082); CO-92 has hours pending. **Deferred** the remaining 3.111.C.2 verifications (OQ-378: none decides eligibility on a fact the volume carries). |
| K-5 SUN Bucks | **Fixed.** 7 CFR 292.14 fetched (D-117); `sebt_requires_verification_of_income` (CO-1699), `sebt_requires_verification_of_school_enrollment` (CO-1633), the two pending items (CO-1695, CO-1696), `sebt_pending_verification_count` (CO-1697) and `sebt_verification_status` (CO-1698), with four supplied facts (CO-1590-CO-1593). No past-due state, since 292.14 sets no fixed period (OQ-377). |
| K-6 AND-SO disability; marital status | **Fixed.** `af_requires_verification_of_and_so_disability` (CO-1668) and its pending item (CO-1669) from 3.520.4.C.4.c.4 and 3.541/3.541.1 (D-80, S1079, S1080), with its 30-day period in CO-1438 (OQ-375); marital status (CO-1670/CO-1671, CO-1582/CO-1583, S1078). |
| U-1 per-element outcomes | **Fixed.** 71 per-element pending items, each `role: outcome` and listed in volume.yaml: Medical Assistance 15 (CHP+ reads them, plus `chp_earned_income_verification_is_pending`), SNAP 17 (CO-1387 promoted), Colorado Works 10, Adult Financial 12, CCCAP 9, LEAP 4, SUN Bucks 2, and the shared `unearned_income_verification_is_pending` (CO-1650; Colorado Works, Adult Financial, CCCAP and LEAP carried an identical arm, which governance would reject as four duplicate derivations). Every count sums them; the per-person counts (SNAP eligibility and expense, Colorado Works, CCCAP, LEAP) and `cw_person_pending_status_verification_count` are outcomes. CO-01 and CO-02 expect every new outcome for every person. |

### Notes

| Finding | Disposition |
|---|---|
| C-18 CO-1374 meaning | **Fixed.** The "unless questionable" carve-out is gone from the meaning. |
| C-19 CO-1309 | **Fixed.** Precision: true only once the agency has submitted the document to USCIS. |
| C-20 CO-1318 | **Fixed.** Precision records SNAP's closed verified-upon-receipt list. |
| C-21 CO-1316 | **Fixed.** Precision records that one fact cannot express each program's period. |
| C-22 CO-1397/CO-1399 | **Fixed.** Precision records the affidavit, five-year-record and parent-affidavit conditions. |
| C-23 checked and correct | No change. |
| K-7 SNAP (f)(1) elements | **Partly addressed**: actual utilities (Colorado's mandatory SUA, S1059) and unoccupied homes (OQ-312). The separate-household, student unfitness, other-state time-limit months, 40 quarters and IPV database checks remain unmodeled notes. |
| K-8 Express Lane; veteran status; ABD previous-month income | Not addressed (note). |
| K-9 CW secondary verifications; LEAP gifts and prior-year vulnerability | Not addressed (note). |
| K-10 acceptability lists | **Partly addressed**: Colorado Works and LEAP citizenship documents now follow Rule 5 Appendix A (CO-1657), Adult Financial citizenship 45 CFR 1626.6 (CO-1673) and identity Rule 16 (CO-1674); immigration documents remain verified through SAVE; AF age documents not listed. |

### Open questions

Resolved with citations in open-questions.md: OQ-301 (S841), OQ-304 (S848), OQ-305 (S845), OQ-306 (S839 and
CO-1561), OQ-307 (S1089 and CO-1588), OQ-308 (S870, S1085), OQ-310 (S824 and CO-1586; the application-date
half left to the vocabulary round), OQ-311 (S819), OQ-312 (S1059, S1060 and CO-1585), OQ-314 (S872, S1064),
OQ-315 (D-118, D-119, D-120), OQ-317 (S880), OQ-318 (S893), OQ-319 (S1069), OQ-321, OQ-322 (S869), OQ-324
(CO-1587); the ABD half of OQ-302 (S867). OQ-316 notes the modeled 3.604.3.K period. Still open: OQ-300, the
first half of OQ-302, OQ-303, OQ-309, OQ-313, OQ-316, OQ-320 (confirmed, informational), OQ-323. Opened:
OQ-370 (LEAP membership filter for the eligibility round), OQ-371 (SNAP recertification boundaries), OQ-372
(Medical Assistance renewal), OQ-373 (Colorado Works, Adult Financial, CCCAP renewals), OQ-374 (ABD
compatibility approximation), OQ-375 (AND-SO 30 days from the interview), OQ-376 (Rule 5 repealed; editions;
DMV checks), OQ-377 (SUN Bucks periods and exceptions), OQ-378 (other CCCAP verifications), OQ-379 (long-term
care documentation scope), OQ-380 (sponsor scope), OQ-381 (LEAP household elements), OQ-382 (one health
coverage request fact).

### Cases

CO-01, CO-02 and CO-91 carry the expectation changes §4 lists, the ones the fixes add (SNAP `not_applicable`
for CO-01/CO-02 p1, in an institution; Medical Assistance 2 for CO-01 p1 with the transfer documentation;
Colorado Works counts with lawful presence; CO-02 `members_excluded`; CO-91 LEAP `past_due`), and every new
outcome for every person in CO-01 and CO-02. New case CO-92 (LPR mother and child, day 15) exercises C-1, C-2,
C-3, C-9 and K-4.
