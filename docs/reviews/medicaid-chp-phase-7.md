# Policy review: Colorado volume, phase 7 — Medicaid and CHP+ completion (CO-1100..CO-1164, CO-807/808/827/828/830/831, edits to CO-509..CO-707)

Reviewer role: Colorado Medicaid / CHP+ policy owner. Read-only review of the phase 7 merge,
`git diff edc8d43 worktree-agent-aec41d7b760641b52 -- volumes/co` (tip `ee71628`), against the
fetched current Secretary of State text: `volumes/co/documents/D-65` (10 CCR 2505-10 § 8.100,
effective 11/14/2026), `D-66` (10 CCR 2505-3, effective 08/30/2026), `D-67` (§§ 8.715, 8.730),
`D-68` (§§ 8.940-8.942), `D-69` (C.R.S. 25.5-2), `D-70`..`D-74` (federal text and CMS figures),
`D-75` (§§ 8.7100-8.7101) and `D-76` (§ 8.497.1); excerpts S600..S654; open questions OQ-200..OQ-212
and the phase 7 resolutions of OQ-52, 57, 58, 63, 81, 84, 91, 93.

`npm run check -- --volume co` passes at `ee71628` (812/812 rule tests, 737/737 case expectations),
and every S600..S654 quotation was checked verbatim against its document. Every finding below is
a policy finding against the fetched text, not a mechanical one. Computed values come from
`npx vite-node scripts/eval-case.ts co <CASE> ...` run in the phase 7 worktree. None of the items
named below was changed by the phase 8 or phase 9 merges now on the branch (checked with
`git diff worktree-agent-aec41d7b760641b52 HEAD`), so the findings still apply at HEAD.

The headline: the phase did what it set out to do for the new programs, and the 142/68/195 MAGI
correction is right for every group. But the new emergency-Medicaid determination is built on two
status items that the current text contradicts. `ma_meets_citizenship_requirement` (CO-509) gives
full Medicaid to lawfully present adults whom § 8.100.3.G.1.g.vii limits to pregnant women and
children. It also puts refugees, asylees, Cuban/Haitian entrants and COFA migrants through a
five-year bar that § 8.100.3.G.1.g.iv-v exempts them from. And `ma_ltc_eligibility_status` (CO-652)
never tests status, residency or aged/blind/disabled at all. So the same nursing-facility resident
can be `eligible_institutional` and `eligible_emergency_condition` in the same month.

Findings are grouped (1) correctness, (2) completeness, including every difference found between
the current § 8.100 and the Cornell copy (D-39/D-40/D-41) the earlier phases were built from,
(3) open questions and (4) cases. Each gives severity, item id(s), the governing text with its
document and line, what the item does, and the fix. Document lines are `documents/D-nn.md:line`.

---

## 1. Correctness

### 1.1 Blocking

**B-1 (blocking). CO-509: any lawfully present non-qualified adult meets Medicaid's status test.
The current text admits that population only for pregnant women and children under 19.**

`documents/D-65.md:525` (§ 8.100.3.G.1.g.vii):

> vii) Be a lawfully residing non-citizen **who is a pregnant woman or a child under the age of 19
> years** in the United States who falls into one of the categories listed in Section
> 8.100.3.G.1.g.iii or into one of the following categories listed below. These individuals may
> qualify for Medical Assistance under the Children's Health Insurance Program Reauthorization Act
> of 2009 (CHIPRA) Section 214 option ...

followed by the 28 categories (TPS at :529, pending asylum with work authorization, nonimmigrant
status at :555, parolees, and so on). No other paragraph of § 8.100.3.G.1.g (i-v, viii) admits a
non-qualified, lawfully present adult. The Cornell copy said the same thing (`documents/D-39.md:263`,
old vi), so this is not a text change. The phase-3 C-1 fix narrowed the arm but did not limit it to
pregnant women and children.

CO-509's third disjunct is `[all, [not, ma_is_qualified_non_citizen], ma_is_lawfully_present]`
with no age or pregnancy condition. A 35-year-old with Temporary Protected Status
(`citizenship_status: other_non_qualified_non_citizen`, `lawful_presence_status: lawfully_present`)
meets status. She is then a full MAGI adult (CO-554 `eligible`), and `ma_emergency_medicaid_status`
(CO-1151) reports `not_applicable_status_met`. Under the text she is emergency-only:
`eligible_emergency_condition` or `eligible_no_current_emergency`. The CHIPRA 214 pregnant and child
population this arm was meant for is already covered by the Cover All Coloradans disjuncts
(`is_pregnant`, `ma_is_under_child_age_or_turns_nineteen_this_month`), so the arm adds nothing for
them and is wrong for everyone else.

Fix, in `volumes/co/medicaid/CO-509.yaml`: delete the `[all, [not, ma_is_qualified_non_citizen],
ma_is_lawfully_present]` disjunct, or gate it with
`[any, is_pregnant, ma_is_under_child_age_or_turns_nineteen_this_month]` if CHIPRA 214 is to be kept
distinct from Cover All Coloradans (see S-2). Add a rule test: TPS adult, 35, not pregnant → `false`.
Then add a CO-1151 test with the same person → `eligible_no_current_emergency`. Restate the meaning
of `lawful_presence_status` (CO-084), which still says the iv/vi categories are "the status that lets
a person under 19 or a pregnant/postpartum person qualify". In the current numbering they are vii,
and the age and pregnancy limit belongs in the derivation, not only in the meaning.

---

**B-2 (blocking). CO-509: refugees, asylees, Cuban/Haitian entrants, COFA migrants and trafficking
victims are held to the five-year bar the text exempts them from. The new 40-quarters exemption is
not modeled.**

`documents/D-65.md:517-521` (§ 8.100.3.G.1.g.v):

> v) Be a non-citizen who arrived in the United States **on any date**, andfalls into one of the
> following categories:
> 1) Cuban or Haitian entrant ...; or
> 2) Compact of Free Association (COFA) migrant ...

`documents/D-65.md:493-511` (§ 8.100.3.G.1.g.iv):

> iv) Be a Legal Permanent Resident(LPR) applying for Medical Assistance, who arrived in the United
> States on any date **is exempt from the five-year rule** as set forth in 8 U.S.C.A 1613, and falls
> into one of the following categories:
> 1) Has worked 40 work quarters (8 U.S.C. § 1612(b)(2)(B)).
> 2) ... honorably discharged military veteran ... 3) ... active duty ... 4) ... born in Canada ...
> 50 percent American Indian blood ... 5) ... Amerasian ... 6) ... Hmong or Highland Lao veteran
> ... 7) ... Iraqi special immigrant ... 8) ... Afghan special immigrant ...
> 9) granted asylum under section 208 of the INA; or
> 10) refugee under section 207 of the INA; or
> 11) a victim of a severe form of trafficking in persons ...

CO-509's qualified arm is `[all, ma_is_qualified_non_citizen, [any, ma_meets_five_year_bar,
is_veteran_or_active_duty]]`. CO-506 puts `refugee`, `asylee`, `cuban_haitian_entrant` and
`compact_of_free_association_migrant` inside `ma_is_qualified_non_citizen`, so each of them is
emergency-only for the first five years after `qualified_status_date`. That is wrong under v
(unambiguous: "on any date", no bar) and under iv.9-11. The only exemption modeled is the veteran
one.

Three changes from the Cornell copy make this worse:
- iv.1, the 40-quarters exemption, is new. The Cornell iv had no such category
  (`documents/D-39.md:233`).
- The Cornell iv was "a non-citizen who arrived ... on any date". The current iv says "Be a Legal
  Permanent Resident". Read literally, a refugee or asylee who has not adjusted to LPR falls outside
  every adult category, which conflicts with 8 U.S.C. 1613(b)(1). That is a genuine question for
  HCPF.
- The Cornell iii (subject to the bar) also listed parolees of at least one year, conditional
  entrants and battered non-citizens. The current iii is LPRs only, and those three groups now appear
  only in vii (pregnant women and children). Adults in those statuses are no longer named anywhere.

Fix, in `volumes/co/medicaid/CO-509.yaml`: replace `is_veteran_or_active_duty` with a new derived
`ma_is_five_year_bar_exempt` (next free id). It is true for `citizenship_status` in
`[refugee, asylee, cuban_haitian_entrant, compact_of_free_association_migrant]`, or
`[>=, qualifying_quarters, ma_bar_exempt_work_quarters]` (CO-004 already exists for SNAP; the new
parameter is 40, from :495), or `is_veteran_or_active_duty`, or a new supplied
`is_bar_exempt_lpr_category` for iv.4-8 and 11. Add rule tests: a COFA migrant with status in 2024 →
`true`; an LPR in 2023 with 40 quarters → `true`; an LPR in 2023 with 12 quarters → `false`. Open a
new question (OQ-213) on iv's "Legal Permanent Resident" wording for refugees and asylees, and on
the adult parolee, conditional-entrant and battered categories that dropped out of iii.

---

**B-3 (blocking). CO-652 (and CO-651, CO-653, CO-654): long-term care eligibility never tests
residency, citizenship or aged/blind/disabled. CO-1150's precision says HCBS "reads citizenship",
and it does not.**

`documents/D-65.md:425-427` (§ 8.100.3.F.1.f-g): the institutional and HCBS groups are
"Persons who are **blind, disabled, or aged** ...". `documents/D-65.md:443-485`
(§ 8.100.3.G.1.a, g): every eligible person shall "Be a resident of Colorado" and "Fall into one of
the following [status] categories". `documents/D-65.md:603` (ix.1.b) extends Cover All Coloradans
to "Long-Term Care waivers except Program of All Inclusive Care for the Elderly (PACE)", which shows
that LTC is otherwise subject to the status test. And `documents/D-75.md` § 8.7100.C.1: "Members
shall meet the Medicaid Assistance eligibility criteria for Long Term Care as stated at Section
8.100."

`ma_ltc_eligibility_status` (CO-652) reads the setting, the transfer penalty, home equity, the
special income group, resources, level of care, PACE and HCBS. `ma_ltc_financially_eligible`
(CO-651), `ma_hcbs_waiver_eligible` (CO-653, except through its `ma_is_ssi_related_eligible`
disjunct) and `ma_pace_eligible` (CO-654) read none of residency, `ma_meets_citizenship_requirement`
or `ma_is_aged_blind_or_disabled`.

Take an undocumented 70-year-old (or CO-71's p3, an LPR inside the bar) in a nursing facility with
income under 2,982, resources under 2,000 and nursing facility level of care:
- CO-652 gives `eligible_institutional`, full Medicaid.
- CO-1150's institutional route is true, so CO-510 is true and CO-1151 gives `eligible_*` (emergency
  only).
- CO-1154 gives `full_coverage`.

Two phase 7 outcomes now contradict each other for the same person and month. CO-1150's precision
("The Buy-In programs and HCBS are not routes here because their own items read citizenship") is
true of Buy-In (CO-618/620, per the phase-4 C-19 fix) and false of HCBS.

Fix: in `volumes/co/medicaid/CO-652.yaml`, add `ineligible_residency` and `ineligible_status`
branches ahead of the financial ones. They read `ma_meets_residency` and a status test that applies
Cover All Coloradans only to HCBS waivers (not PACE or institutional care, per :603). Then add
`ma_is_aged_blind_or_disabled` to CO-651, or a `not_aged_blind_or_disabled` branch to CO-652, for
F.1.f-g. Correct CO-1150's precision. Add a CO-652 test (undocumented 70-year-old nursing facility
resident → `ineligible_status`) and a CO-1151 test (same person → `eligible_*`).

### 1.2 Should-fix

**S-1 (should-fix). CO-1154: the "full coverage" set leaves out BCCP, the protected groups and OAP
SISC B, so a woman eligible for full BCCP Medicaid is reported as limited family planning.**

`documents/D-67.md:137` (§ 8.715.7.A): "Eligible clients shall receive all Medicaid benefits
included in the State Plan." `documents/D-65.md:1991` (§ 8.100.4.G.8): limited family planning "is
available for those not eligible for a Medicaid eligibility category that provides full coverage."
The Pickle, DAC, disabled widow(er) and continued-SSI groups (S623-S627) and SISC B OAP recipients
(`documents/D-65.md:2893`) are all full-benefit Medicaid.

CO-1154's full-coverage disjunction is MAGI, SSI-related, LTC and Buy-In. Its precision justifies
leaving out BCCP and the protected groups because "both already require the person not to be
eligible elsewhere or follow from SSI-related status". That is backwards for BCCP: BCCP requires the
person not to be eligible elsewhere, and BCCP itself is full coverage. It is false for Pickle, DAC
and the widow(er)s, who by construction fail the plain SSI-related test. CO-71's p2 (Rosa, BCCP
`eligible`) is expected and computed as `limited_family_planning` (see 4.1). The same narrow
"otherwise eligible" set appears in two other places:
- CO-616 (QDWI, § 8.100.6.O.4: "not otherwise eligible under another Medical Assistance category")
  leaves out the protected groups and BCCP.
- CO-1152 (BCCP, § 8.715.2.C.6, `documents/D-67.md:43`) reads only MAGI and SSI-related, so a woman
  who is LTC-, Buy-In- or Pickle-eligible is also reported BCCP `eligible`.

Fix: add a derived `ma_has_full_coverage_category` (next free id). It is the union of
`ma_magi_is_fully_eligible`, `ma_is_ssi_related_eligible`, LTC eligible (gated as in B-3),
`ma_buy_in_category` not none, `ma_protected_group_category` not none, the SISC B route of S-3 and,
for CO-1154 only, `ma_bccp_eligibility_status = eligible`. CO-1154 and CO-616 read the union;
CO-1152 reads it without its own BCCP term. Re-expect CO-71 p2 `ma_family_planning_status:
full_coverage`.

---

**S-2 (should-fix). CO-509 applies Cover All Coloradans to every Medicaid category. The text lists
the categories it reaches.**

`documents/D-65.md:599-603` (§ 8.100.3.G.1.g.ix.1):

> 1) Persons who are under the age of 19 ... who are pregnant, or who are within 12 months of the
> beginning of their postpartum period shall not be excluded from **the following** Medical
> Assistance Categories on the basis of immigration status:
> a) MAGI Children, MAGI Pregnant, Psych <21, Transitional Medical Assistance, 4 Month Extended
> Medical Assistance, MAGI Prenatal Presumptive Eligibility, MAGI Child Presumptive Eligibility
> b) Medical Buy-In Program for Working Adults with Disabilities ..., Medicaid Buy-In Program for
> Children with Disabilities, and Long-Term Care waivers except Program of All Inclusive Care for
> the Elderly (PACE)

CO-509 makes the pregnancy, child and postpartum disjuncts satisfy status for every reader. Several
results follow that the list does not support:
- An undocumented postpartum adult with no locked-in pregnancy period becomes a full MAGI Adult.
- An undocumented disabled child becomes SSI-related eligible, and institutional, PACE or MSP
  eligible.
- A pregnant undocumented woman meets the status requirement of limited family planning, which
  § 8.100.4.G.8 conditions on "immigration or citizenship status" (`documents/D-65.md:1991`) and
  which is not on the list.

CO-71's p1 is that last case: computed `limited_family_planning`. Under the listed categories she
fails G.8's status test and is a reproductive health care program participant (C.R.S. 25.5-2-103:
she would be eligible but for status, and state medical assistance under 25.5-2-104 is for children
only, `documents/D-69.md:142`).

Fix: split the Cover All Coloradans disjuncts out of CO-509 into a derived
`ma_is_cover_all_coloradans_person`. CO-509 becomes the status test proper (i-viii). The items for
the categories in ix.1.a-b read `[any, ma_meets_citizenship_requirement,
ma_is_cover_all_coloradans_person]`: CO-545/546 and the MAGI pregnancy and child chain, CO-618/620,
CO-653 and the PE items CO-558/559. CHP+ items read it under 10 CCR 2505-3 § 110.1.B.5.o. If HCPF
reads ix.1 as covering every category, record that as an OQ instead. Either way, CO-71 p1's
expectation should follow the decision.

---

**S-3 (should-fix). OAP recipients who meet SSI criteria except income (SISC B) have no Medicaid
route. CO-1156 reports them `medicaid_eligible` and no Medicaid outcome agrees.**

`documents/D-65.md:2893` (§ 8.100.6.K.4): "Medical Assistance must be provided to all OAP-A and
OAP-B persons who also meet SSI eligibility criteria except for the level of their income
(SISC-B)." See also `documents/D-65.md:1389` (§ 8.100.3.M.2.b) and § 8.100.3.F.1.c-d (:415-421).

CO-1156's second branch sends such a person (citizen, aged, within the SSI resource standard, OAP
grant over the FBR) to `medicaid_eligible`. But `ma_ssi_related_category` (CO-612) tests the SSI
income standard and reports `none`, and CO-1154 does not count them as full coverage. CO-1150 has no
OAP route either. CO-71's p3 is emergency-eligible only through the SSI income standard, and only
because the case states `cash_assistance_income: 0` while `af_oap_grant` computes 1005, which is
over the 994 FBR (see 4.1).

Fix: add a derived `ma_oap_sisc_b_eligible` (next free id): `af_category` OAP, residency, status,
`ma_is_aged_blind_or_disabled` and `ma_meets_ssi_resource_standard`. Read it in CO-612 (new option
`oap_sisc_b`), in CO-1150's route list (without status) and in the full-coverage union of S-1.
CO-1156's branch then reads it. Record in OQ-206 that § 8.100.3.M.2.b names only OAP "A" while K.4
names OAP-A and OAP-B.

---

**S-4 (should-fix). CO-653: every waiver is gated on nursing facility level of care. The current
§ 8.7101 requires ICF/IID level of care for CES, SLS, DD and CHRP's DD route, and allows hospital
level of care for CwCHN, BI and CIH.**

`documents/D-75.md:437` (CES), `:485` (CHRP), `:729` (SLS), `:787` (DD): "Meets Intermediate Care
Facilities for Individuals with Intellectual Disabilities Level of Care". `:519` (CwCHN): "Nursing
Facility / Hospital". `:701` (CIH): "Meets Hospital Level of Care or Nursing Facility Level of
Care". CO-653 conjoins `meets_nursing_facility_level_of_care` (CO-820) for all nine waivers. Phase 7
rebuilt CO-653's waiver list from D-75 but kept the NF-only gate, so an adult with a developmental
disability who meets ICF/IID level of care but not NF level of care is denied SLS or DD.

Fix: add a supplied `meets_designated_waiver_level_of_care` (next free id), the Case Management
Agency's finding of the level of care the designated waiver requires (§ 8.7100.D.9.b), and read it
in CO-653 in place of CO-820. Keep CO-820 for institutional care, PACE and CO-1150. Add an SLS test
with ICF/IID level of care and no NF level of care → `true`.

---

**S-5 (should-fix). The general Medicaid IMD exclusion (ages 21 through 64) is not applied,
although phase 7 created the fact for it.**

`documents/D-65.md:477` (§ 8.100.3.G.1.c): every eligible person shall "Not be a patient in an
institution for tuberculosis or mental disease, unless the person is under 21 years of age or has
attained 65 years of age and is ... receiving active treatment as an inpatient in a psychiatric
facility". `is_patient_in_institution_for_mental_diseases` (CO-1104) is read only by CHP+ and OAP
health care.

Fix: add a derived `ma_meets_imd_requirement` (next free id): `[not, [all,
is_patient_in_institution_for_mental_diseases, [>=, age, 21], [<, age, ma_aged_age]]]`, with the
under-21 and 65+ active-treatment exception carried in the meaning. Read it in CO-551 (or CO-562),
CO-611 and CO-1150.

---

**S-6 (should-fix). CO-1159 (Pickle) compares only with the SSI federal benefit rate, and CO-1158
does not apply the disregard to a spouse's or parent's COLAs.**

`documents/D-65.md:2801` (§ 8.100.6.E.2): "If the countable OASDI income and all other countable
income is less than the current **SSI or OAP standard** ...". `:2803` (E.3): "This disregard must
also be applied to any OASDI cost of living increases paid to any financially responsible individual
such as a parent or spouse". A person who lost OAP (age 60+) is measured against the OAP grant
standard (`af_oap_grant_standard`, CO-289), which is above the 994 FBR. CO-1159's precision says
"the OAP standard alternative is not tested separately", which makes it a narrowing the text does
not allow.

Fix: compare with `[max, <FBR by household size>, af_oap_grant_standard]` when the loss was of OAP
(a new supplied `lost_oap_rather_than_ssi`, or simply the greater of the two standards), and extend
OQ-207 to cover E.3's deemed COLAs.

---

**S-7 (should-fix). CO-1162 (disabled widow(er)s) does not test "have received SSI in the past", and
CO-1161 (DAC) accepts a loss of OAP where the text says SSI.**

`documents/D-65.md:2857` (§ 8.100.6.I.1.b): "have received SSI in the past". § 8.100.6.J.1 (S626):
"who loses SSI due to the receipt of OASDI drawn from his/her parents' Social Security Number", and
§ 8.100.3.F.1.h (:429): "receiving SSI as a disabled child prior to the age of 22, and for whom SSI
was discontinued on or after May 1, 1987". Both items read `lost_ssi_or_oap_due_to_social_security_benefits`
(CO-1108), which is true for a person who lost only OAP.

Fix: add a supplied `lost_ssi_due_to_social_security_benefits` (or `received_ssi_in_past`) and read it
in CO-1161 and CO-1162 in place of CO-1108; keep CO-1108 for Pickle, which § 8.100.6.D.2 states for
"SSI and/or OAP".

---

**S-8 (should-fix). CO-802 (`in_kind_support_and_maintenance`) still says "food or shelter". The
current text is shelter only.**

`documents/D-65.md:2295-2297` (§ 8.100.5.F.5.k): "Any shelter given to an applicant/member ...
**Food is not included in the calculation of in-kind support and maintenance.**" The Cornell copy
read "Support and maintenance in kind - The support and maintenance in kind ..." with no food
exclusion. CO-802's meaning ("The value of food or shelter this person receives ...") is read by
CO-605/606/607 (SSI countable income), CO-618/619 (Buy-In) and CO-641/663 (LTC).

Fix: restate CO-802's meaning and precision as shelter only, with the food exclusion and the shelter
items § 8.100.5.F.5.k.i lists, and cite D-65.

---

**S-9 (should-fix). MAGI income rules added since the Cornell copy are not reflected in
`ma_person_magi_income` or its fact meanings.**

`documents/D-65.md:1715-1733` (§ 8.100.4.C.1.b.xiii-xv) adds capital gains, lottery and gambling
winnings and discharged student loan debt as income. Winnings of $80,000 or more are spread over two
or more months ("If over $79,999 but less than $89,999 ... divided equally between two months. For
every additional $10,000 over $89,999, one month is added"), they count "only in the month received
in determining the eligibility for the members of their household", and a hardship exemption is
available. The Cornell copy listed none of these. `:1793-1807` (C.1.e) adds "Pre-tax contributions to
a 401(k) or 403(b) ... are excluded from earned income", "Net operating losses" and "Capital
losses". CO-502 (`ma_person_magi_income`) sums supplied facts whose meanings say nothing of capital
gains, winnings, discharged debt, 401(k) or NOL treatment. Its precision says "a lump sum is counted
only in the month received", which is now wrong for winnings of $80,000 or more.

Fix: state in the meanings of `other_taxable_income`, `other_unearned_income` and `pretax_deductions`
which of these each carries. Add a supplied `lottery_gambling_winnings` (month) and a derived
spreading item, with an OQ for the hardship exemption, and correct CO-502's lump-sum sentence.

---

**S-10 (should-fix). Text left stale by phase 7's own corrections.** Approvers sign meanings and
precisions, so these are not cosmetic:
- CO-560 and CO-198: the new "Phase 7 (OQ-52, resolved)" sentence is followed by the old one saying
  "8.100.4.G.5's own sentence still states a 60-day ... period ... treating 8.100.4.G.5's 60-day
  sentence as stale - see OQ-52". The two contradict each other; delete the old sentence.
- CO-566's `assumption` still "Carries OQ-52's open 60-day/12-month postpartum-period question"; its
  rationale and CO-566-T1's title still say 185%.
- CO-543 precision and rationale ("Colorado's 185% exceeds the 133% federal floor"); CO-540's
  rationale; CO-504's rationale ("child 133%, parent/caretaker 60% ... pregnant 185%").
- CO-546-T1..T4 pass `ma_magi_highest_income_standard_pct: 1.85`, and CO-548-T6's title says "between
  60% and 65%".
- CO-558's assumption ("state 185% as the presumptive-eligibility standard"); the current
  § 8.100.4.F.2.a (`documents/D-65.md:1911`) says 195%.
- CO-706's precision still says "the same 120.1.C institution exclusion gap noted on CO-705 applies
  here (OQ-58)", but the exclusion is now modeled.
- CO-510's precision still says "Limited to residency, citizenship, and category" (MAGI only) after
  the meaning was widened to CO-1150's three routes.
- CO-707's meaning says "one of five specific ineligibility reasons"; there are now six.

---

**S-11 (should-fix). OQ-203 has a partial published answer, and the rest can be fetched.**
`documents/D-67.md:57` (§ 8.715.3.B) states that limited-scope coverage (dental, vision, long-term
care), single-disease coverage that does not cover breast or cervical cancer, and IHS or tribal
programs are not creditable coverage. CO-1152 reads `has_other_creditable_health_coverage` (CO-090),
the CHP+ fact, whose meaning does not carry those exclusions. C.R.S. 10-16-102 is on
leg.colorado.gov, which the plan lists as reachable. Fix: either a BCCP-specific supplied fact
carrying § 8.715.3.B-D, or an amended CO-090 meaning, plus the § 8.715.3.C exceptions; fetch
10-16-102; narrow OQ-203 to what remains.

---

**S-12 (should-fix). OQ-211's "no fetched document dates the change" is not quite so.**
`documents/D-66.md:933`: "Rules 110.1 E-F, 170.1 A-B, 170.3, 310.1, 430.2 B.ii, 430.3 eff.
06/30/2022." Those are the CHP+ floors (142% children, 195% pregnant women) that mirror the new
Medicaid ceilings, and the presumptive-eligibility figures. D-65's own editor's notes defer to "the
first section, 10 CCR 2505-10" (`documents/D-65.md:5603`), which is on the same SOS site. Fix: fetch
that history, version CO-191/192/194 with a `from:` date (2022-06-30 if the 8.100.4.G amendment is
confirmed as the companion rule), and resolve OQ-211, or record D-66:933 in it as the best evidence
so far. Until this is done, a determination dated before mid-2022 would wrongly apply 142/68/195.

### 1.3 Notes

**N-1 (note). Limited family planning for an 81-year-old man and a 6-year-old.** § 8.100.4.G.8
(`documents/D-65.md:1991`) says "The limited family planning services eligibility category has no
age or gender restriction", so CO-01's p2 and CO-71's p4 are right by the letter. But § 8.730.1
(`documents/D-67.md:180`) defines family planning services as "services provided to individuals of
child-bearing age", and § 8.730.2.A says "All Medicaid clients of childbearing age are eligible".
Open an OQ asking whether the category requires reproductive capacity, and consider having CO-1154
read `has_reproductive_capacity` (CO-1103) for the limited category as it already does for the
reproductive health care program.

**N-2 (note). CO-650's home-equity boundary.** `documents/D-65.md:2509` exempts equity that "Is less
than" the indexed amount, so equity exactly equal to $752,000 disqualifies. CO-650 uses `>`. Use
`>=` and add a test at 752000, or record that 42 U.S.C. 1396p(f)(1)(A)'s "exceeds" governs.

**N-3 (note). CO-1156 does not reach § 8.100.6.K.7** (`documents/D-65.md:2899`): OAP recipients "who
lost their OAP financial assistance because of a cost of living adjustment other than OASDI"
remain in the state-only program (SISC C). CO-1156 requires current OAP receipt. "OAP Refugees"
(§ 8.100.3.F.1.j) are not distinguished either. Add both to OQ-206.

**N-4 (note). CO-653 lets CHRP in through the SSI-related route.** `documents/D-75.md:499-501` lists
CHRP's served groups as foster care children and 42 CFR 435.217 only. That is harmless while the
CHRP population is all children, but the text does not list SSI recipients.

**N-5 (note). CO-71's p3 depends on an unstated reading.** p3 receives OAP-A (`af_oap_grant` 1005),
but the case states `cash_assistance_income: 0`, so `ma_ssi_countable_income` is 0 and he meets the
SSI income standard. Whether a state-only, need-based OAP payment counts as income in the SSI-related
test is not stated anywhere in the volume. S-3 removes the dependency (OAP SISC B is itself a
categorical route for CO-1150). Until then, say in the case comment that the OAP grant is treated as
excluded.

---

## 2. Completeness

### 2.1 Sections of D-65/D-67/D-68/D-75/D-76 that state eligibility rules not represented

| Text | Rule | Status in the volume |
|---|---|---|
| D-65:477, § 8.100.3.G.1.c | IMD exclusion, ages 21-64 | not applied (S-5) |
| D-65:2893, § 8.100.6.K.2-4 | OAP SISC B Medicaid | reported by CO-1156 only (S-3) |
| D-65:2899, § 8.100.6.K.7 | OAP lost to a non-OASDI COLA stays SISC C | missing (N-3) |
| D-65:2803, § 8.100.6.E.3 | Pickle disregard on a spouse's or parent's COLA | missing (S-6) |
| D-65:2941, § 8.100.6.L.9 | QMB "must also meet ... age, citizenship, residency" | CO-613/614/615 read neither residency nor status (pre-existing; same text in the Cornell copy) |
| D-65:1965, § 8.100.4.G.5.a.i | pregnant eligibility ends if income is not reasonably compatible by the end of the **30-day** period (Cornell: 90) | not modeled; for phase 9 |
| D-65:1967, § 8.100.4.G.6.a | Legal Immigrant Prenatal guaranteed period and its eight termination events (new) | not modeled |
| D-65:1915, :1927-1929, § 8.100.4.F.2.c, F.8, F.9 | limited family planning PE (new); no PE while enrolled elsewhere (new); PE once per 12 months, or once per pregnancy (new) | not modeled |
| D-65:1575, § 8.100.3.R | hospital presumptive eligibility (new section) | not modeled |
| D-67:43-49, § 8.715.2.C.7, D, F | BCCP transfer route, pre-July 2002 screening exclusion, treatment within three months | folded into CO-1102's meaning or not modeled (OQ-202); F is a continuing-eligibility rule worth an item |
| D-67:57, § 8.715.3.B-D | what is and is not creditable coverage for BCCP | not modeled (S-11) |
| D-75:437/485/729/787/519/701 | per-waiver level of care (ICF/IID, hospital, NF) | NF only (S-4) |
| D-75 § 8.7100.E.2-3, H.1.b-d | at least one waiver service each month; one waiver at a time; not residing in an institution | the case management agency designation stands in for them; acceptable, but CO-821's precision should cite E.3/H.1.c |
| D-75 § 8.7101.D.6.a | CwCHN: the child's income and resources within 300% of the SSI standard | carried by the special income group; acceptable |
| D-76 § 8.497.1.B.1 with 42 CFR 460.150(b)(3), (c) | PACE service area; able to live safely in the community | stated as not tested in CO-654's precision; acceptable |

### 2.2 The MAGI percentage change, group by group

Checked against `documents/D-65.md:1931-2025` and D-73:
- **Children, § 8.100.4.G.2: 142%.** CO-191 = 1.42 is correct. D-73 lists 142% for ages 0-1, 1-5
  and 6-18 alike, so no separate infant standard is missed.
- **Parents and caretaker relatives, G.3: 68%.** CO-192 = 0.68 is correct.
- **Adults, G.4: 133%.** Unchanged from the Cornell copy; CO-193 = 1.33 is correct.
- **Pregnant women, G.5: 195%, and 12 months postpartum.** CO-194 = 1.95 and CO-560 are correct.
- **Former foster care, H.2: no income or resource test.** Unchanged.
- **Needy newborn, G.7: no income test.** Unchanged.
- **Psych <21, H.1.a: "the MAGI needs standard".** Unchanged, and not modeled before or after.
- **TMA and the four-month extension, I.** Unchanged.
- **Presumptive eligibility, F.2.a-b: 195% pregnant, 142% child.** The Cornell copy said 185% and
  133%. CO-558, CO-559 and CO-708 read the category parameters and so pick up the new figures
  automatically.
- **Limited family planning, G.8: greater than 133% and not over 260%.** New; CO-1131/1132 are
  correct.
- **CHP+ floors, 2505-3 § 110.1.E-F: 142% and 195%.** Unchanged since 06/30/2022 (D-66:933), so the
  band now meets the Medicaid ceilings with no gap (OQ-63).
- **Buy-In for children premium bands, § 8.100.6.Q.1.g.iv: 133/185/250%.** These are the Buy-In's own
  bands, not the MAGI standards. They are unchanged, and CO-621's inline 1.33/1.85 is right.

The correction is right for every group. The only leftovers are the stale texts in S-10.

### 2.3 Every other difference found between the current § 8.100 (D-65) and the Cornell copy (D-39/D-40/D-41)

Found by a word-level diff of D-39+D-40+D-41 against D-65, with formatting-only hunks removed.
Each is classified by whether it changes an item the volume carries.

| § (D-65 line) | Cornell | Current | Effect on the volume |
|---|---|---|---|
| 8.100.3.G.1.g.ii (:489) | "lawfully admitted" non-citizen entered before 8/22/1996 | "lawfully residing" | the pre-1996 arm is still unmodeled (phase-3 K-2) |
| 8.100.3.G.1.g.iii (:491) | bar applies to LPRs, parolees of at least one year, conditional entrants, battered non-citizens | LPRs only; the other three moved to vii.14-16 (pregnant women and children only) | B-2, OQ-213 |
| 8.100.3.G.1.g.iv (:493-515) | any non-citizen "who arrived ... on any date" in 13 exempt categories | "Legal Permanent Resident ... exempt from the five-year rule": **40 work quarters (new)**, veteran, active duty, AI born in Canada, Amerasian, Hmong, Iraqi or Afghan SIV adjusted to LPR, asylee, refugee, trafficking victim | B-2 |
| 8.100.3.G.1.g.v (:517-521) | (in iv) | Cuban/Haitian entrant and COFA migrant, "on any date" | B-2 |
| 8.100.3.G.1.g.vii (:525-585) | old vi, 15 categories | 28 categories, adding Ukrainian parolees (vii.28) and Iraqi/Afghan SIVs "yet to adjust" | B-1; CHIPRA 214 is moot under Cover All Coloradans |
| 8.100.3.G.1.g.viii (:587) | absent | Afghan humanitarian parolees exempt from the bar until 3/31/2023 or end of parole | expired except through parole; note only. The literal BCCP cross-reference "viii" now points here (OQ-202) |
| 8.100.3.G.1.g.ix (:597-617) | old viii | renumbered; text unchanged | CO-509 cites ix (S-2 on scope) |
| 8.100.3.G.1.b.ii (:471-475) | inmates: benefits limited to inpatient stays | adds reentry services 90 days before release | benefit, not eligibility; no item change |
| 8.100.3.F.1.a (:415) | MAGI groups | adds "Family Planning Medical Assistance" | modeled (CO-1154) |
| 8.100.3.F.1.n (:441) | COVID-19 testing group | ended 5/11/2023 (state-only to 5/31/2023) | the volume does not model it; correct |
| 8.100.1 (definitions) | ULTC 100.2 | Long-Term Services and Supports Level of Care Eligibility Determination; hospital PE sites | CO-820's meaning already uses the new name |
| 8.100.3.H.9 / 8.100.4.C reasonable compatibility | "paper documentation"; 90-day period | 30-day reasonable opportunity period for income; PHE-era rules ended 5/11/2023 | phase 9 (verification) |
| 8.100.3.G.3 (:631-639) | 90-day immigration reasonable opportunity period | same 90 days, restated with notice, termination and furnish-benefits rules | phase 9 |
| 8.100.3.K.14 (:1371) | absent | federal tax refunds, EITC and CTC exempt as income (non-MAGI) | state it in the non-MAGI income fact meanings |
| 8.100.3.P (redetermination) | rewritten | ex parte rules; coverage kept if the renewal is returned before the period ends; 90-day reconsideration | phase 9 |
| 8.100.3.R (:1575) | absent | hospital presumptive eligibility | not modeled (2.1) |
| 8.100.4.C.1.b.xiii-xv, e.viii, xiv-xv (:1715-1807) | absent | capital gains; winnings spread over months ($79,999 / $89,999 / +$10,000); discharged student loans; 401(k)/403(b) excluded; NOL and capital losses | S-9 |
| 8.100.4.E.3 (:1897) | absent | limited family planning applicant counted as a household of two | modeled (CO-1153) |
| 8.100.4.F.1-9 (:1905-1929) | 185% / 133%; two-year site recertification; 45-day appeal | 195% / 142%; limited family planning PE; yearly recertification; 90-day appeal when a disability determination is needed; F.8, F.9 | 2.1 |
| 8.100.4.G.2/3/5 (:1935-1961) | 133% / 60% / 185%; 60 days postpartum | 142% / 68% / 195%; 12th month after the pregnancy ends | modeled (OQ-63, OQ-52) |
| 8.100.4.G.5.a.i (:1965) | 90-day period | 30-day period | 2.1 |
| 8.100.4.G.6, G.6.a (:1967) | iii.1-5 and vi.1-15; no termination list | iii.1 and vi.1-29; eight termination events | 2.1 |
| 8.100.4.G.8 (:1991) | absent | limited family planning, 133-260% | modeled (CO-1154/1155) |
| 8.100.5.F.5.k (:2295-2299) | in-kind support and maintenance (food and shelter) | shelter only, "Food is not included" | S-8 |
| 8.100.7 trust rules (several) | distributions "for food or shelter are considered in-kind" | "for shelter are considered unearned" | trusts are not modeled; note for OQ-98 |
| 8.100.7 MQT definition | quotes 42 U.S.C. 1396a(k) | restated in-rule | no effect |

No figure in §§ 8.100.5-8.100.7 changed: the $2,000/$3,000 resource limits, the $8,180/$13,020 MSP
base, the $500,000 home equity base, § 8.100.7.M.1.a's CSRA, the $75 PNA base, the 300% special
income group and the Buy-In 450%/300% all match. Nothing in 10 CCR 2505-3 changed apart from § 310's
repeal, the reentry carve-out in § 120.1.C, hospital PE and renumbering (word diff of D-42 against
D-66).

---

## 3. Open questions

### 3.1 Phase 7 resolutions

| OQ | Verdict | Evidence |
|---|---|---|
| OQ-52 | Resolved correctly | D-65:1961, "through the last day of the 12th month following the date the pregnancy ends". Clean up CO-560/198/566 (S-10). |
| OQ-57 | Resolved correctly | D-66:551-553, "310 [Repealed eff. 10/30/2022]"; editor's notes D-66:933ff confirm the repeal history. |
| OQ-58 | Resolved correctly | D-66 § 120.1.C (S653). The reentry carve-out is a benefit, as the resolution says. |
| OQ-63 | Resolved correctly | D-65:1935 and D-73. Dating remains open (S-12). |
| OQ-81 | Resolved correctly | D-74: $9,950 / $14,910 for QMB, SLMB and QI; D-65:2497 delegates the CPI figure to CMS. The $1,350 QMB income figure on the same page equals the volume's 1330 + $20 exclusion, which is consistent. |
| OQ-84 | Resolved correctly | D-65 § 8.100.6.O.2.a-b (S622); a modeling resolution. |
| OQ-91 | Resolved correctly | D-72: CSRA 32,532 / 162,660, maximum MMMNA 4,066.50, home equity 752,000 / 1,130,000. D-65:2509 states the indexed $500,000 base, so 752,000 is right. N-2 on the boundary. |
| OQ-93 | Resolved, acceptably | D-76 § 8.497.1.B.1 incorporates 42 CFR part 460 (2024) as an obligation of PACE organizations. Reading 460.150(b)(1) as the participant age floor is the natural reading; say so in CO-1133's rationale. |

### 3.2 New questions

| OQ | Genuinely open? |
|---|---|
| OQ-200 | Yes. Add B-3's status gap and S-3's OAP route to the body once fixed. |
| OQ-201 | Yes. |
| OQ-202 | Yes, but incomplete. Add that the literal current "viii" is the Afghan humanitarian parolee paragraph (itself a plausible exception); that "(vi)-(vii)" now points vi at the incorporation-by-reference paragraph; and that (ii)-(iv) skips v (Cuban/Haitian entrants, COFA migrants). CO-1152 reading CO-509 covers v, which is the better outcome. |
| OQ-203 | Partly answered (S-11). |
| OQ-204 | Both readings have published support that the question should cite. "Counted individually as a household member of two" (F.2.c, D-65:1915) supports size + 1. "The five percent (5%) disregard will be applied for each qualifying MAGI program as the last step" (D.1.a, D-65:1851) supports applying the disregard at the 260% ceiling. Consider resolving on those. |
| OQ-205 | Yes. Note that D-69:142 confirms state medical assistance is for children only, so a pregnant adult's "not eligible for ... state medical assistance" condition is met (relevant to S-2). |
| OQ-206 | Yes. Add N-3 and the § 8.100.3.M.2.b vs K.4 conflict (S-3). |
| OQ-207 | Yes. Add E.3 (S-6). |
| OQ-208 | Yes. |
| OQ-209 | Yes. Add I.1.b (S-7). |
| OQ-210 | Yes. Add the per-waiver level of care (S-4) or resolve it with that fix. |
| OQ-211 | Partly answerable (S-12). |
| OQ-212 | Yes. hcpf.colorado.gov refuses; no other allowed source publishes either figure. |

### 3.3 Questions to open

- **OQ-213:** the current iv's "Legal Permanent Resident" wording for asylees, refugees and
  trafficking victims; and the adult parolee, conditional-entrant and battered categories that left
  iii (B-2).
- **OQ-214:** whether Cover All Coloradans reaches only the ix.1.a-b categories (S-2).
- **OQ-215:** whether limited family planning requires reproductive capacity or childbearing age
  (N-1).

---

## 4. Cases

### 4.1 CO-71, recomputed by hand

2026 monthly poverty guidelines: size 1 1330.00, size 2 1803.33, size 3 2276.67, size 4 2750.00.
FBR 994.

| Person | Item | Hand | Computed | Expected | Verdict |
|---|---|---|---|---|---|
| p1 | MAGI household | p1 + p4 + 1 unborn = 3 (E.2) | 3 | 3 | ok |
| p1 | ratio | 5200 / 2276.67 = 2.284; less 5% = 2.234 > 1.95 | 2.284 | - | ok |
| p1 | MAGI status | `ineligible_income` | same | same | ok |
| p1 | CHP+ | 1.95 < 2.284 ≤ 2.60, uninsured → `eligible_prenatal` | same | same | ok |
| p1 | emergency | status met under Cover All Coloradans → `not_applicable_status_met` | same | same | ok |
| p1 | BCCP | `ineligible_not_in_need_of_treatment` | same | same | ok |
| p1 | family planning | household 3 + 1 = 4; 5200 / 2750 = 1.891 in band → `limited_family_planning` under CO-509 as written; **`reproductive_health_care_program`** if Cover All Coloradans reaches only the ix.1 categories | limited | limited | depends on S-2 |
| p2 | MAGI household and status | non-filer [p2], 2600 / 1330 = 1.955; less 5% = 1.905 > 1.33 → `ineligible_income` | same | same | ok |
| p2 | BCCP | female 58, screened, resident, LPR since 2010 (past the bar), uninsured, no full MAGI or SSI category → `eligible` | same | same | ok |
| p2 | family planning | BCCP is full State Plan coverage (D-67:137), so G.8 excludes her → **`full_coverage`** | limited | limited | **mismatch (S-1)** |
| p3 | status | LPR since 2023-03-01: 3.6 years, inside the bar, not a veteran → false | false | false | ok |
| p3 | `af_category` | OAP has no bar; 72 → `oap_a` (grant 1005) | oap_a | oap_a | ok |
| p3 | MAGI status | 72, no category, no category demographics → `ineligible_no_category` | same | same | ok |
| p3 | emergency only | aged; SSI countable income 0 ≤ 994; resources 500 ≤ 2000 → true | true | true | ok, but rests on the OAP grant not counting (N-5); robust only after S-3 |
| p3 | emergency status | October emergency → `eligible_emergency_condition` | same | same | ok |
| p3 | OAP health care | OAP-A; not SSI or MAGI; status fails, so not SISC B; not an IMD patient → `eligible_state_only` | same | same | ok |
| p3 | family planning | status fails, no reproductive capacity → `ineligible` | same | same | ok |
| p4 | MAGI household | p1's household: 3 | 3 | 3 | ok |
| p4 | MAGI status / CHP+ | 2.284 > 1.42, and 2.234 > 1.42 → `ineligible_income`; 1.42 < 2.284 ≤ 2.60 → `eligible_child` | same | same | ok |
| p4 | family planning | household 4, 1.891 → `limited_family_planning` by G.8's letter | same | same | ok (N-1) |
| all | protected group | `none` | none | none | ok |

Two mismatches. p2's is a plain error (S-1). p1's turns on S-2's question. The case would also
catch B-3 if p3 were moved into a nursing facility; consider adding that variant as CO-71's second
month.

### 4.2 CO-01 and CO-02, the new outcome expectations

| Person | Item | Hand | Computed | Expected | Verdict |
|---|---|---|---|---|---|
| CO-01 p1 (79, citizen, PACE-eligible) | emergency / BCCP / family planning | status met; 79 ≥ 65 → `ineligible_sex_or_age`; ABD and `eligible_pace` → `full_coverage` | same | same | ok |
| CO-01 p2 (81, LPR since 1998, male) | family planning | MAGI household [p1, p2] + 1 = 3; 3210 / 2276.67 = 1.41 in band; no full category (SSI 1160 > 994; QMB resources 44100 > 9950) → `limited_family_planning` | same | same | ok by the letter (N-1) |
| CO-01 p3 (undocumented, MAGI adult at 104.5%) | emergency | status fails, MAGI adult → emergency only; October emergency → `eligible_emergency_condition` | same | same | ok |
| CO-01 p3 | family planning | status fails; reproductive capacity; would be a MAGI adult but for status; not a child, so no state medical assistance → `reproductive_health_care_program` | same | same | ok |
| CO-01 p4 (17), p5 (infant) | family planning | MAGI-eligible → `full_coverage` | same | same | ok |
| CO-01 all | BCCP | p1 79 and p2/p5 male → `ineligible_sex_or_age`; p3/p4 not screened → `ineligible_not_in_need_of_treatment` | same | same | ok |
| CO-01 all | OAP health care / protected group | `af_category` none (resources over the OAP limit); nobody lost SSI or OAP → `not_oap_recipient` / `none` | same | same | ok |
| CO-02 p3 | emergency | no emergency in November → `eligible_no_current_emergency` | same | same | ok |
| CO-02 others | as CO-01 for November | | same | same | ok |
| CO-06 | `ma_csra` / attributed | min(180000, 162660) = 162660; 180000 − 162660 = 17340 | same | same | ok |
| CO-05 p3 | Jan/Apr 2027 | 1850 / 1330 = 1.391 ≤ 1.42 → child, eligible; CHP+ `ineligible_medicaid_eligible` | same | same | ok |

No mismatches in CO-01, CO-02, CO-05 or CO-06.

---

## Summary

**3 blocking, 12 should-fix, 5 notes.** Section 3 also proposes three new open questions, and the
completeness tables add items for later phases.

Fix list:
1. **B-1** — `volumes/co/medicaid/CO-509.yaml`, `volumes/co/supplied/CO-084.yaml`: limit the
   lawfully present arm to pregnant women and children (or drop it); TPS-adult tests on CO-509 and
   CO-1151.
2. **B-2** — new derived `ma_is_five_year_bar_exempt` (refugee, asylee, Cuban/Haitian entrant, COFA
   migrant, 40 quarters from CO-004, veteran, the iv.4-8 categories), read in CO-509; new parameter
   for 40 quarters; OQ-213.
3. **B-3** — `volumes/co/medicaid/CO-652.yaml` (and CO-651/653/654): residency, status (Cover All
   Coloradans for HCBS waivers only, not PACE) and aged/blind/disabled; correct CO-1150's precision;
   tests on CO-652 and CO-1151.
4. **S-1** — new `ma_has_full_coverage_category` (adding BCCP, protected groups and SISC B), read by
   CO-1154, CO-616 and CO-1152; re-expect CO-71 p2 `full_coverage`.
5. **S-2** — split Cover All Coloradans out of CO-509 and read it only where ix.1.a-b lists; settle
   CO-71 p1; OQ-214.
6. **S-3** — new `ma_oap_sisc_b_eligible`, read by CO-612, CO-1150, CO-1156 and the S-1 union;
   extend OQ-206.
7. **S-4** — new supplied `meets_designated_waiver_level_of_care`, read by CO-653.
8. **S-5** — new `ma_meets_imd_requirement` (§ 8.100.3.G.1.c), read by the MAGI, SSI-related and
   emergency routes.
9. **S-6** — CO-1159 compares with the OAP standard where OAP was lost; OQ-207 takes E.3.
10. **S-7** — new supplied `lost_ssi_due_to_social_security_benefits`, read by CO-1161 and CO-1162.
11. **S-8** — `volumes/co/supplied/CO-802.yaml`: shelter-only in-kind support and maintenance.
12. **S-9** — MAGI income fact meanings for capital gains, winnings, discharged debt, 401(k), NOL and
    capital losses; a winnings-spreading item; correct CO-502's lump-sum sentence.
13. **S-10** — stale text in CO-198, CO-504, CO-510, CO-540, CO-543, CO-546, CO-548, CO-558,
    CO-560, CO-566, CO-706, CO-707.
14. **S-11** — BCCP creditable coverage (§ 8.715.3.B-D); fetch C.R.S. 10-16-102; narrow OQ-203.
15. **S-12** — fetch the 10 CCR 2505-10 history; version CO-191/192/194; resolve or update OQ-211.
16. **N-1..N-5** — OQ-215 on reproductive capacity; CO-650's `>=` at 752000; CO-1156 and K.7 into
    OQ-206; CHRP's served groups; CO-71's OAP-grant reading.
