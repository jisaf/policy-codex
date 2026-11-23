# Independent hand-check of the promoted probe households: cash, food and child care

Reviewer: independent second hand computation (product-owner requirement before the probe households CO-300 to CO-457 are
relied on). Scope: every case in CO-300..CO-457 whose expectations concern SNAP, Colorado Works, Adult Financial
(OAP/AND/AB, HCA, disaster assistance), CCCAP, LEAP or SUN Bucks. Medicaid/CHP+ cases (CO-375..CO-404, CO-452, CO-453)
are the other reviewer's (docs/reviews/probe-handcheck-medicaid.md).

Tree: HEAD b3bb737 (branch ccr-9d19bf4c-wmnwcl), extracted with `git archive` into a scratch copy; codex output from
`npx vite-node scripts/eval-case.ts co <CASE> <identifiers> [month]` in that copy. The working tree's uncommitted edits
(Medicaid cases, CO-3379/CO-3380, one known-failures line) touch no case in this scope.

## Method

1. Blind pass. For each case a script printed only the facts, dates, relationships and the list of expected identifiers
   (person, identifier, month), with expected values and YAML comments stripped. The value of each identifier was then
   derived by hand from the rule text in `volumes/co/documents/` (D-80 9 CCR 2503-5; D-81 9 CCR 2503-6; D-82 10 CCR
   2506-1; D-87 8 CCR 1403-1; D-86/D-173 9 CCR 2503-7; D-88 7 CFR 292; D-9, D-95, D-116 7 CFR 273; D-59 C.R.S. 26-2;
   D-260/D-261 the Ukrainian and Afghan parolee laws) and the figures only of the dated parameters (FY 2027 SNAP tables,
   2026 OAP/AND standards, CW need and grant standards, CCCAP FPG and SMI tables, LEAP 60% SMI table). Blind values and
   their arithmetic are kept in the scratch notes; the essentials are in the rows below.
2. Compare. Then each blind value was compared with (a) the stored expectation and (b) the codex output. Every
   disagreement was re-read against the case comment, the rule text the comment cites and the rule text I had used.
3. Known failures (conformance/known-failures.json) contain no key in this scope; every key there is Medicaid/CHP+.

Disclosure of blind-protocol breaches (so the reader can discount those agreements): before the stripping script
existed I read the YAML of CO-300 to CO-302 with their comments while learning the file format; CO-450's title (which
names Medicare) was printed by a grep; and to learn identifier semantics I read the `meaning` text of CO-905, CO-4005,
CO-910, CO-914, CO-3354 and CO-2895 before finishing the blind values of CO-352..CO-364, CO-427..CO-431, CO-438..CO-442
and CO-417. Those meanings state part of the codex's reading. CO-440/CO-441 still came out against the codex, so they
were not steered; the others are marked "(semantics read)" below.

## Summary

| | Count |
|---|---|
| Cases in scope | 126 (Adult Financial 19, CCCAP 40, Colorado Works 27, LEAP/SUN Bucks 8, SNAP 32) |
| Identifier values checked (person x identifier x month) | 366 |
| Codex output vs stored expectation | 366 agree, 0 differ (no known failure in scope) |
| My hand value vs stored (= codex) | 338 agree, 28 disagree (13 cases) |
| - stored expectation wrong | 0 |
| - codex wrong, not a known failure (new P1) | 0 |
| - genuinely ambiguous text | 8 values, 3 cases (CO-338, CO-345, CO-370), each already an open question; two need the OQ widened |
| - my own error after re-reading | 20 values, 10 cases (CO-303, CO-323, CO-334, CO-360, CO-418, CO-420, CO-421, CO-440, CO-441, CO-443) |

Bottom line: no stored expectation in scope is shown wrong by the rule text, and the codex reproduces every one of them.
Three expectations rest on a recorded draft reading of genuinely open text (OQ-871, OQ-873, OQ-561) and will move if the
policy owner answers those questions otherwise; for OQ-871 and OQ-873 I found a rule-text argument the OQ body does not
yet record (below).

## Disagreements

Stored and codex are equal in every row, so one column gives both.

| Case | Identifier (person) | Month | My blind value | Stored = codex | Rule text | Verdict |
|---|---|---|---|---|---|---|
| CO-303 | af_category, af_and_grant (p1) | 2026-10 | and_so, 248 | none, 0 | C.R.S. 26-2-111(1)(d): no assistance payment unless "the person is not an inmate of a public institution ... or is not a patient in any institution for tuberculosis or mental diseases" | My error. I read only 9 CCR 2503-5 3.543.D-E (PNA list, unlicensed/uncertified bar), where a psychiatric hospital under 65 is not addressed; the statute bars it. |
| CO-323 | cccap_eligibility_status (p1, p3) | 2026-11 | eligible_low_income | ineligible | 8 CCR 1403-1 3.115.C: a caretaker not work eligible "may be eligible for Low-Income Child Care if the adult caretaker ... is not a part of the Colorado Works assistance unit" | My error. I applied 3.111.D.6, which omits the condition; p1 receives TANF cash, so she is in the unit. |
| CO-334 | cccap_eligibility_status, cccap_parent_fee, cccap_household_income (p1, p3) | 2026-11 | ineligible_income, 0, 3,500 | eligible_low_income, 122, 2,500 | 3.111.I.12 "Net rental income"; fact CO-4458 rental_property_expenses_paid covers property "whose rents are rental_income_received (CO-4457) or are stated in the person's other unearned income facts" | My error. I treated the $1,500 of other taxable unearned income as non-rent because rental_income_received is unstated; the expense fact's meaning says the rents may sit in the other unearned facts. 2,000 + 1,500 - 1,000 = 2,500; fee 25 + .14 x 696.67 = 122.53, 122. |
| CO-338 | cccap_eligibility_status (p1, p3) | 2026-11 | eligible_low_income | ineligible_activity | 3.114.A (exhaustive mid-period terminations): A.3 "not involved in a low-income eligible activity and their job search period has expired"; 3.111.G.3.a, f: no fewer than 13 weeks of job search "for each instance of non-temporary cessation of activity"; vs 3.125.Q.2, EE.1.b, 3.111.E | Ambiguous; OQ-871 records the question (state policy choice) and the stored value is its draft reading. OQ-871's body does not mention 3.114.A.3 or the 13-week job-search entitlement of G.3, which argue that the household keeps care (as job search) rather than closing at the change. Recommend adding that to OQ-871. |
| CO-345 | cccap_eligibility_status, cccap_household_income (p1, p3) | 2026-11 | eligible_low_income, 2,125 | ineligible_income, 3,500 | 3.103.S (county diversion not cash assistance); 3.111.H.4.i: "Non-recurring lump sum payments ... may be included as income in the month received or averaged over a twelve (12) month period, whichever is most beneficial" | Ambiguous; OQ-873 records whether a non-cash-assistance diversion is income at all; the stored value is its draft reading. Even on that reading, a one-time county diversion is a non-recurring lump sum, and H.4.i would count 1,500 / 12 = 125: 2,000 + 125 = 2,125, under 185% FPL (3,336.16). The codex averages only lump_sum_received, which the case does not state. OQ-873 should add the H.4.i question (or the case should state the diversion as lump_sum_received if it is one-time). |
| CO-360 | cw_eligibility_status, cw_grant_amount (p2) | 2026-10 | ineligible, 0 | eligible, 113 | 9 CCR 2503-6 3.604.2.M (an ineligible required member is removed from the unit size); O.2 (an institution resident's child "continues to be cared for in the home") | My error. I read the incarcerated mother as leaving no caretaker; the rules keep the child, paid on the No Caretaker row: 173 x .65754 = 113.75, 113. |
| CO-370 | leap_is_homeless_or_in_non_traditional_dwelling, leap_is_eligible (p1) | 2026-11 | true, false | false, true | 9 CCR 2503-7 3.752.25.B.6 ("considered homeless") and B.8 ("Hotels, unless proof ... thirty (30) calendar days ... and that heat is included in rent") | Ambiguous; OQ-561 records it and its Assumption already adopts the stored reading. My reading: B.8's exception lifts only B.8, so a hotel stay "for lack of an alternative" stays B.6 homelessness; B.8 would keep content for households in a hotel by choice. Both readings are open until the LEAP owner answers OQ-561. |
| CO-418 | snap_countable_nonliquid_resources (p1) | - | 1,200 | 0 | 10 CCR 2506-1 4.410.F.2: a non-liquid resource "that would have a net return of one thousand five hundred dollars ($1,500) or less if sold, shall be considered an inaccessible resource" | My error; missed 4.410.F.2. |
| CO-420 | snap_pending_verification_count (p1) | 2027-02 | 0 | 2 | 4.505.A.3 (an expense unverified at 30 days is determined "without providing a deduction or exclusion"); snap_pending_verification_count (CO-1391) meaning: elements "still pending ... eligibility factors and deductible expenses together" | My error of semantics: I counted the two disallowed expenses (child support paid, dependent care) as closed; the identifier counts them as still pending (status expenses_disallowed). The probe's point, that p2's excluded wages add no verification, holds either way. |
| CO-421 | snap_requires_verification_of_child_support_paid (p1) | 2027-02 | false | true | 7 CFR 273.2(f)(8)(i)(A): "require the household to verify any changes in ... the amount of legally obligated child support"; 10 CCR 2506-1 4.507.D.5 (re-verify at recertification) | My error: I applied 4.505.B.3.c (verify only if the amount "changed by more than twenty-five dollars"), which conflicts with the federal rule and with 4.507.D.5. The federal rule governs. Note for the owners: 4.505.B.3.c's $25 tolerance for child support is inconsistent with 273.2(f)(8)(i)(A); I found no OQ recording that. |
| CO-440 | cw_meets_citizenship_and_immigration_requirement, meets_public_assistance_citizenship_requirement (p1) | - | false, false | true, true | Pub. L. 117-43 sec. 2502(a)(1)(A) (paroled July 31, 2021 - Sept. 30, 2022) or (B) (later parole of a spouse, child or parent); option meaning in CO-002: afghan_humanitarian_parolee is "an Afghan humanitarian parolee under section 2502" | My error after re-reading the fact vocabulary: the status option asserts sec. 2502 coverage, so a parole on 2024-03-01 is coverage under (a)(1)(B). Note: the case comment should say so, since its entry date is outside (a)(1)(A)'s window. |
| CO-441 | same two (p1) | - | false, false | true, true | Pub. L. 117-128 sec. 401(a)(1)(A) (paroled Feb. 24, 2022 - Sept. 30, 2023) or (B) (later parole of a family member); CO-002 ukrainian_humanitarian_parolee "under section 401" | As CO-440: my error; same comment note. |
| CO-443 | snap_allotment (p1) | 2026-10 | 0 | 23 | 7 U.S.C. 2017(c)(1) and 7 CFR 273.10(a)(1)(ii): no initial-month allotment only "if ... less than $10"; 10 CCR 2506-1 4.207.3.B says less than "the federal minimum allotment" ($25) | My error: I followed 4.207.3.B (23 < 25). The statute governs and the codex already carries a statute_override (OQ-38 resolution notes, final-snap F-1). Full month: 808 - .3 x 214 = 743.8, 743; 743 x 1/31 = 23.97, 23. |

## Per-case agreement rows

One line per case; "agree" means my blind value equals the stored expectation and the codex output for every listed
identifier. Arithmetic is shown where a number is asserted.

### Adult Financial (19 cases, 43 values)

- CO-300 agree: OAP; resources 2,200 - 500 refund (3.520.77.K, within 12 months) = 1,700 <= 2,000; oap. (comment seen before blind)
- CO-301 agree: 600 - 20 + (800 - 500 rent net, 3.520.785.B.20) = 880; oap. (comment seen before blind)
- CO-302 agree: 600 - 20 + 5,000 inheritance (B.12) = 5,580 >= 1,032; none. (comment seen before blind)
- CO-303 disagree (my error), see table.
- CO-304 agree: face 2,000 > 1,500, policies bought within 48 months, OAP: all CSV counts (3.520.75.E.3); 700 + 700 + 900 + 900 = 3,200 > 3,000; none.
- CO-305 agree: SSI recipient, capacity 25, need 30 (tier 2), not HCBS-functional; HCA eligible; 500 raised to the $977 floor (3.570.11.B, E.2).
- CO-306 agree: died 2026-09-15; none, OAP grant 0, HCA ineligible_deceased.
- CO-307 agree: sponsor 4,000 - 994 (FBR 2026), no half-FBR for a spouse living elsewhere (3.534.D.2.B "living in the same household") = 3,006; none.
- CO-308 agree: 4,000 - 994 = 3,006; none.
- CO-309 agree: spouse not on AF/SSI/Medicaid, deemed 1,000 + 2,000 prize - 1,032 = 1,968 (3.534.B); 600 - 10 (split $20, 3.533.A.2.c.1) + 1,968 = 2,558; none.
- CO-310 agree: same with $2,000 other unearned: 1,968; 2,558; none.
- CO-311 agree: spouse 2,000 - 1,500 offset = 500 < 1,032, deemed 0; 590; oap; 1,032 - 590 = 442.
- CO-312 agree: deemed 0; oap; 442.
- CO-313 agree: own 2,000 - 1,500 = 500 - 10 = 490; spouse 1,000 < 1,032 deemed 0; oap; 542.
- CO-433 agree: reverse mortgage exempt (3.520.786.L); spouse on Medicaid with income <= OAP standard not deemed (3.534.C); 500 - 10 = 490; oap; 542.
- CO-434 agree: TWFC 5,000 / 1,032 = 4 months from July 2026 (3.520.76.D): October in penalty; none.
- CO-435 agree: assistance from another state this month (3.520.64.B.2); none.
- CO-436 agree: approved OAP client, requested, emergent need; min(2,500, 2,000 cap, 3.570.51.A) = 2,000.
- CO-437 agree: face 10,000 > 1,500 but bought 2010, no payments in 48 months: CSV exempt (3.520.75.E.1); 1,000 + 1,000 = 2,000 <= 3,000; oap.

### CCCAP (40 cases, 152 values)

Common figures: Denver entry limit 1.85 x FPG; FPG from 2026-10-01: 2 = 1,803.33, 3 = 2,276.67; fee 3.124.P: 1% of
income plus 14% of income over FPG, cents dropped. Household of p1 and child p3 unless stated.

- CO-314 agree: both caretakers incapacitated, neither in an activity (3.111.D.1.c); ineligible_activity.
- CO-315 agree: p2 involuntarily absent, so a one-caretaker household (D.1.b); incapacitated single caretaker without activity (E); ineligible_activity.
- CO-316 agree: post-secondary beyond a first bachelor's degree is not an activity (G.4.a.1); ineligible_activity.
- CO-317 agree: move out of county mid-period keeps eligibility (3.111.A); 20 + .14 x 196.67 = 47.53, 47 (decrease allowed, 3.124.B.2).
- CO-318 agree: child turning 13 is terminated only at redetermination (3.114.B.1); fee 47.
- CO-319 agree: foster care payments excluded (J.10); 2,000; fee 47.
- CO-320 agree: boarder receipts counted (I.18); 3,500 > 3,336.16; ineligible_income.
- CO-321 agree: GI Bill subsistence counted (I.7.c); 3,500; ineligible_income.
- CO-322 agree: launch period income 7.25 x 120 = 870 (G.2.e); fee 8.70, 8.
- CO-323 disagree (my error), see table.
- CO-324 agree: child welfare child care (3.120); eligible_child_welfare; verification not_required.
- CO-325 agree: assets over $1M declared (H.5.c); all ineligible.
- CO-326 agree: assets; ineligible.
- CO-327 agree: child's residence facts are not a caretaker requirement; fee 47.
- CO-328 agree: homelessness stabilization (3.121), no fee (3.124.I.5); 0.
- CO-329 agree: p2 contributes financially (D.2), no activity, not incapacitated; ineligible_activity.
- CO-330 agree: one working, other incapacitated and verified (D.1.c.3); household 3, 2,000 <= 2,276.67: fee 20; complete.
- CO-331 agree: SUD treatment from 2026-07-01 is an activity (G.4.a.3; treated as training, so the 19-year-old is an adult caretaker); no income, fee 0.
- CO-332 agree: seasonal break is a temporary break (3.112.C); eligible_low_income.
- CO-333 agree: guardian not in the TANF unit (child-only TANF, 3.115.C); fee 47.
- CO-334 disagree (my error), see table.
- CO-335 agree: 2,000 + (1,500 - 1,000) = 2,500; fee 122.
- CO-336 agree: stepparent caretaker with no activity at redetermination; ineligible_activity.
- CO-337 agree: same at redetermination though he joined mid-period; ineligible_activity.
- CO-338 disagree (ambiguous, OQ-871), see table.
- CO-339 agree (my lean): Colorado Works child care on p1's referral (3.116.A), CW verifies (3.116.E-F): not_required; paid employment fee on 1,000 (3.124.E), household 3 under FPG: 10.
- CO-340 agree: both referred; eligible_colorado_works; fee 10; not_required.
- CO-341 agree: in-kind compensation counted (I.4); 3,500; ineligible_income.
- CO-342 agree: as CO-321; 3,500; ineligible_income.
- CO-343 agree: transition from Colorado Works is not blocked by assets (3.117.A lists the only bars; B: no new verification); eligible_low_income.
- CO-344 agree: SUD activity "up to one (1) year per instance" from 2026-07-01 has ended by 2027-08; ineligible_activity.
- CO-345 disagree (ambiguous, OQ-873), see table.
- CO-346 agree: state diversion over 6 months is cash assistance, excluded (3.103.S, J.26); 2,000; fee 47.
- CO-347 agree: involuntarily absent p2 is not in the household (D.1.b); size 2; fee 47; complete.
- CO-348 agree: same, p2's other county irrelevant; 47; complete.
- CO-349 agree: medical leave during the period is a temporary break; eligible_low_income.
- CO-350 agree: medical leave counts only for an "open and active" case (D.9); application: ineligible_activity.
- CO-454 agree: maternity leave while in an activity (D.8); eligible_low_income.
- CO-455 agree: stabilization; fee 0; verification pending (3.121.B).
- CO-456 agree: child 15 without additional care needs is not an eligible child (F); ineligible_child.

### Colorado Works (27 cases, 105 values)

Common figures: one caretaker + one child need 331, grant 488; No Caretaker one child 117/173 (3.606.1.F); application
2026-10-12 prorates October 20 days x .65754 (3.609.2.A.1); 488 x .65754 = 320.88, 320. Cases with application 2026-10-01
pay the full month. (semantics read for CO-352..CO-364 and CO-427..CO-431: CO-910, CO-914, CO-3354.)

- CO-351 agree: in a diversion period of ineligibility; ineligible_diversion_period, 0.
- CO-352 agree: minor parent in a county-approved setting, her parent lives elsewhere so no deeming (3.605.1.A.4); eligible; 320; countable 0.
- CO-353 agree: prize counted (3.605.3.A.14); 2,000 > 331; ineligible_income; 0.
- CO-354 agree: room and board 1,500 - 2 x 306 (one-person SNAP max) = 888 earned (3.605.2.E.4.e); 888 - 90 = 798 > 331; ineligible_income.
- CO-355 agree: eligible; 320.
- CO-356 agree: adult on strike (3.604.2.L.2); ineligible_strike.
- CO-357 agree: refused assignment of support (3.604.4.A); ineligible_child_support.
- CO-358 agree: county general assistance exempt (3.605.4.A.7); 0; 320.
- CO-359 agree: trafficking victim treated as refugee, no five-year bar; eligible; 320.
- CO-360 disagree for p2 (my error), see table; p1 ineligible_institution agrees.
- CO-361 agree: minor parent living with her parent: 600 - 90 - 253 (parent's one-person need) = 257 deemed (3.605.1.A.4.a); unit paid as children (N.3.d), No Caretaker two children need 245 < 257; ineligible_income.
- CO-362 agree: emancipated minor treated as adult; room payments earned 600 (E.4.d); 600 - 90 = 510 > 331; ineligible_income.
- CO-363 agree: 400 - 90 = 310 <= 331 (eligibility figure); 100% payment disregard first period (3.606.2.A.1); 320.
- CO-364 agree: 600 - 90 = 510; ineligible_income.
- CO-365 agree: wages 1,500 - 90 > 331; ineligible_income; af_barred false (no sanction, disqualification or withdrawal, 9 CCR 2503-5 3.520.71.F.2).
- CO-366 agree: p1 IPV-disqualified; af_barred true (F.2.a); child-only 173 x .65754 = 113.75, 113.
- CO-427 agree (my lean): nursing-facility mother away for medical treatment (3.604.2.I.2) keeping the child in care at home (O.2); in the home; eligible; 488.
- CO-428 agree: mother out of state over 90 days (O.1); ineligible_residency; child-only 173.
- CO-429 agree: institution resident and the child also away: not in the home.
- CO-430 agree (my lean): no absence reason, institution resident but the child is cared for at home (O.2 last sentence); in the home; 488.
- CO-431 agree: institution resident, child away; not in the home.
- CO-432 agree: child support arrears exempt (3.605.5.D); countable 0; 488.
- CO-438 agree: refugee; true, true.
- CO-439 agree: Iraqi/Afghan special immigrant treated as refugee; true, true.
- CO-440 disagree (my error), see table.
- CO-441 disagree (my error), see table.
- CO-442 agree: trafficking victim: Colorado Works true (22 U.S.C. 7105(b)(1)(A), HHS-funded); the shared State requirement false (inside five years).

### LEAP and SUN Bucks (8 cases, 14 values)

- CO-367 agree: p2 not in the heating household; income 1,000 <= 3,774; eligible.
- CO-368 agree (my lean): an eviction notice with heat in the rent is not homelessness (3.751.1 emergency applicant); eligible.
- CO-369 agree: hotel since 2026-09-01 with heat in rent (3.752.25.B.8); 1,000; eligible.
- CO-370 disagree (ambiguous, OQ-561), see table.
- CO-371 agree: Title IV-E foster child, categorically eligible (7 CFR 292.12(d)(1)(i)(B)(3)); eligible_categorical.
- CO-372 agree: TANF September to December 2026 falls in the period to establish eligibility (292.7(a)); eligible_categorical.
- CO-373 agree: crime victim compensation excluded (9 CCR 2503-7 3.752.23.G); 3,000 <= 3,774; eligible.
- CO-374 agree: one-time refugee resettlement grant excluded (3.752.23.AA); 3,000; eligible.

### SNAP (32 cases, 52 values)

Common figures (FY 2027): max 2 = 562, 3 = 808, 1 = 306; standard deduction 217; heating SUA 616; shelter cap 769; 130%
gross 3 = 2,960; 200% gross 3 = 4,554; allotment = max - 30% of net, cents dropped (4.207.3.A). The CO-408 family
(CO-408..CO-426, CO-457) is a homeless father earning 1,000 and a child of 6, applied 2026-11-02, evaluated 2027-02-10;
child support paid (150) and dependent care (200) were never verified, so after 30 days they are not allowed (4.505.A.3).

- CO-405 agree: household refused to cooperate (7 CFR 273.2(d)(1)); refused_to_cooperate; 0.
- CO-406 agree: p2 declines immigration documents, ineligible non-citizen (4.505.6.J); 2,400 / 2 = 1,200 (4.411.1.2.b); shelter 250 + 500 + SUA 616 = 1,366; 1,200 - 240 - 217 = 743; excess 994.5 capped 769; net 0; 306.
- CO-407 agree: declining alien is not eligible, so no sponsor deeming (273.4(c)(2)); 900 / 2 = 450; deemed 0; no sponsor verification.
- CO-408 agree: WIOA excluded (4.405); 1,000; 1,000 - 200 - 217 = 583; 562 - 174.9 = 387.
- CO-409 agree: reverse mortgage is a loan (4.405.F.2); 1,000; 387.
- CO-410 agree: PASS excluded (4.405, item 22); 1,000; 387.
- CO-411 agree: $20 irregular, not over $30 in three months (4.405.A); 1,000; 387.
- CO-412 agree: $20 in January and $20 in February exceed $30; 1,020. (Case nit: January states infrequent_or_irregular_income_received 20 while other_unearned_income_nontaxable is 0 for January, a part larger than its whole.)
- CO-413 agree: 1,400; 1,400 - 200 - 217 = 983; 562 - 294.9 = 267.
- CO-414 agree: 1,075; 643; 562 - 192.9 = 369.
- CO-415 agree: 1,500 - 300 child support exclusion (4.407.5) = 1,200; 1,200 - 300 - 217 = 683; shelter 1,816 capped 769; 808.
- CO-416 agree: student turning 18 on Feb 15 is excluded until the following month (4.405.C); 1,000; 387.
- CO-417 agree (semantics read): 100 + one-person maximum at certification 306 (4.407.6.A.8) = 406.
- CO-418 disagree (my error), see table.
- CO-419 agree: own 3,000 + accessible joint share 3,000 = 6,000.
- CO-420 gross agrees (child's excluded wages: 1,000; no p2 wage verification); pending count disagree (my error), see table.
- CO-421 disagree (my error), see table.
- CO-422 agree: 6,000 - ABLE 2,000 = 4,000.
- CO-423 agree: VISTA payments to a volunteer not on SNAP when joining are earned income; verification required.
- CO-424 agree: recertification, income unchanged and source unchanged (4.505.B.2); not required.
- CO-425 agree: boarder income, attestation questionable; required.
- CO-426 agree: 16-year-old less than half time: wages count (4.405.C); 1,400; 1,400 - 280 - 217 = 903; 562 - 270.9 = 291.
- CO-443 disagree (my error), see table.
- CO-444 agree: Family Preservation confers BCE (4.206); zero benefit does not deny a BCE household (4.207.3.B); eligible.
- CO-445 agree: 6,000 > 4,554; over_gross_income_limit; 0.
- CO-446 agree: p1 an ineligible student (child 8, adequate care, 273.5(b)); her 5,000 not counted; 300 + 300 = 600; members p2, p3.
- CO-447 agree: farm loss 500 offset after the earned deduction (273.11(a)(2)(iii)): 1,500 - 300 - 500 - 217 = 483.
- CO-448 agree: LPR adjusted from refugee, five-year exemption kept; true.
- CO-449 agree: LPR since 2024-01-15, 20 quarters; false; ineligible_member_non_citizen.
- CO-450 agree: railroad disability annuity with Medicare (7 CFR 271.2); true. (title seen before blind)
- CO-451 agree: ECE at 3,600 <= 4,554; 3,600 - 720 - 217 = 2,663; 808 - 798.9 = 9.
- CO-457 agree: p1 was 60 at the quit, above the work-registration age (59), and the one-month first-violation period (December 2026) is over in any case; false.

## Recommendations

1. No expectation change and no codex fix follows from this hand-check.
2. OQ-871 (CO-338): add 8 CCR 1403-1 3.114.A.3 and 3.111.G.3.a, f (13 weeks of job search per non-temporary cessation)
   to the body, since they bear on whether the household closes at the change.
3. OQ-873 (CO-345): add 3.111.H.4.i (a non-recurring lump sum averaged over 12 months when more beneficial); if a county
   diversion is one-time, the case could state it as lump_sum_received, and the answer would be 2,125, eligible.
4. SNAP child support at recertification (CO-421): record that 10 CCR 2506-1 4.505.B.3.c's $25 tolerance conflicts with
   7 CFR 273.2(f)(8)(i)(A) and with 4.507.D.5; the codex follows the federal rule, as it should.
5. CO-440/CO-441 comments: say that a parole on 2024-03-01 is covered by sec. 2502(a)(1)(B) / sec. 401(a)(1)(B) (a
   family member of an earlier parolee), as the status option asserts, since the date alone falls outside (a)(1)(A).
6. CO-412: make January's other_unearned_income_nontaxable 20 so the part-of fact does not exceed its whole.

## Disposition (fix round, 2026-11-23)

| Recommendation | Disposition |
|---|---|
| 1. No expectation change | Agreed; none made from this hand-check. |
| 2. OQ-871 (CO-338) | Widened: the body now quotes 8 CCR 1403-1 3.114.A.3 ("not involved in a low-income eligible activity and their job search period has expired") and 3.111.G.3.a-b (no fewer than 13 weeks of job search "for each instance of non-temporary cessation of activity", for a caretaker who met the criteria at the last determination), states the reading under which CO-338 would be eligible_low_income through job search, and adds a Checked line for G.3 and 3.114.A. Class unchanged (state policy choice); assumption unchanged. |
| 3. OQ-873 (CO-345) | Widened: the body now quotes 3.111.H.4.i (a non-recurring lump sum "may be included as income in the month received or averaged over a twelve (12) month period, whichever is most beneficial"), gives the averaged figure for CO-345 (2,125, eligible) and adds the second question, whether CCCAP must average every one-time payment whatever fact the case states it in or only one stated as lump_sum_received (whose meaning, CO-3367, includes "a similar one-time payment"). The assumption now says so: averaged only when stated as a lump sum. CO-345 is unchanged (it states the diversion as other unearned income). |
| 4. SNAP child support at recertification (CO-421) | Already recorded, as a statute override rather than an open question: the paragraph cited as 4.505.B.3.c is 10 CCR 2506-1 4.502.B.3.c (the same text in the 2026-10-01 version, D-82), and snap_requires_verification_of_child_support_paid (CO-1382) has carried since coverage review CF-11 a statute_override naming 7 CFR 273.2(f)(8)(i)(A) over 4.502.B.3 and 4.507.D.5. CO-1382's precision now says so and names the reviewer's citation. docs/conventions.md gives a governing federal rule the statute_override form; no open question is added. |
| 5. CO-440, CO-441 comments | Done: each comment now says the 2024-03-01 parole is outside the (a)(1)(A) window and that the status option asserts coverage under the section, which for that date is (a)(1)(B) (a spouse or child of an earlier parolee, or a parent or guardian of an unaccompanied child); CO-441 notes that 10 CCR 2506-1 cites sec. 401 as amended in 2024, whose text the volume does not hold. |
| 6. CO-412 | Done: January now states other_unearned_income_nontaxable 20 beside the irregular 20, so the part no longer exceeds its whole. February's expectation (1,020) is unchanged and passes. |
