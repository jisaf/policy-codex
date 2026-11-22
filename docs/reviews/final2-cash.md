# Final verification pass 2: cash family (Colorado Works, Adult Financial)

Reviewer: fresh, independent second pass under the stopping rule (docs/plan-colorado.md). Commit reviewed: `ceba7c2` (branch ccr-9d19bf4c-wmnwcl). Date: 2026-11-22. Read-only; this file was written to the session scratchpad, not the repository.

Governing text read: 9 CCR 2503-6 (D-81, rule version 12030, eff. 07/01/2025) and 9 CCR 2503-5 (D-80, rule version 12428, eff. 03/02/2026); excerpts S2600-S2631 (cash fix round), S2414-S2415 (22 U.S.C. 7105, D-222); 20 CFR 416.1124 (D-207); C.R.S. 26-2-111 (D-59). Fetched for this pass from govinfo.gov (allowed host): Pub. L. 117-43 sec. 2502 (Afghan parolees) and Pub. L. 117-128 sec. 401 (Ukrainian parolees), HTTP 200, kept in the scratchpad (rv-cash/dl/).

Tools run: `npm run check` (OK; conformance self-check 5930/5930), `scripts/eval-case.ts` on CO-07, CO-13, CO-01, CO-120, CO-121, CO-122, and a scratch probe (rv-cash/probe/probe.ts) that evaluates constructed households with the same engine. `npm run export` was not run because it writes into the repository; the identifier closure was computed in memory with the engine's own `buildGraph` instead (rv-cash/probe/closure.ts).

## Summary verdict

**5 P1 found.** The cash family is not yet complete under the stopping rule.

The fix round fixed 11 of the 12 earlier P1s in full. FC-3 and FC-8 were fixed in part, and FC-6 has a residual. V-2 is fixed. Of the 2026 figures, every one checked is right. The stored households recompute by hand.

The five P1s:
- **N-1:** the OAP life-insurance exemption reads the age of the spouse who owns the policy, not the client's program. This is confirmed with the engine.
- **N-2:** a spouse's resources count against the client's limit but are never verified. The fix round deferred this as P2 (V-9); it is really a P1.
- **N-3:** Colorado Works applies the five-year bar to certified trafficking victims and Ukrainian and Afghan humanitarian parolees, whom federal statute gives refugee treatment. The trafficking statute is already in the volume (D-222). The parolee statutes are on govinfo.gov. Confirmed with the engine.
- **N-4:** Adult Financial counts all of the child support an AND-CS child receives, though 3.520.786.K incorporates 20 CFR 416.1124(c)(11). Confirmed with the engine.
- **N-5:** several transfers without fair consideration are penalised on their total, not resource by resource as 3.520.76.D and E require.

Elements: the 53 Colorado Works and Adult Financial outcomes reach 524 identifiers (212 derived, 213 supplied, 98 parameters). All resolve except the engine built-in `relationships`. No derivation has a check error, and every parameter in the closure has a version in force on 2026-11-22.

## Earlier P1s: confirmation

| Earlier finding | Status | Evidence |
|---|---|---|
| FC-1 (CW strike, inmate/IMD patient, institution resident, child support) | **fixed** | Scratch household from CO-122: striker gives ineligible_strike for the unit; mother in a correctional facility gives her ineligible_institution and drops her from the unit size (child alone: $173); failed child-support cooperation gives ineligible_child_support; mother 126 days out of State gives ineligible_residency; mother 60 days in a nursing home with the child still at home stays in the home (O.2 exception), grant $488. See P2-6 and P2-7 for two edges. |
| FC-2 (CW exempt income) | **fixed** | CO-2340, CO-2341, CO-2553, CO-2551 read CO-3812-CO-3825. Scratch: $300 county GA gives countable 0 and grant $488; $400 of support, all arrears, gives countable 0. |
| FC-3 (AF exempt income) | **fixed in part** | D, E, F, I, J, L, M, O, P and 416.1124(b), (c)(2), (c)(22) are modeled (scratch: a $100 reverse mortgage is excluded, 490 / $542). The other 416.1124(c) exclusions K incorporates are not, and one of them is material: (c)(11) → **N-4**. |
| FC-4 (married $20 split) | **fixed** | CO-120 recomputed: 490 and $542 each. OQ-661 records the reading. |
| FC-5 (AND-SO rollover) | **fixed** | CO-121 recomputed: 200 and $48. |
| FC-6 (transfer penalty) | **fixed, residual** | Scratch: a $5,000 transfer on 2026-06-10 gives floor(5000/1032) = 4 months, July to October, so October is af_category none. The case states several transfers as one total, which over-penalises → **N-5**. |
| FC-7 (AND-SO substance abuse) | **fixed** | CO-3849 in CO-1203; rule tests T1-T6 pass. |
| FC-8 (OAP life insurance; burial funds) | **not fixed for a spouse's policy** | Fixed for policies the OAP client owns. Policies the spouse owns follow the spouse's own age → **N-1** (engine-confirmed). The burial trusts, contracts and spaces are fixed. |
| FC-9 (other-State assistance; benefit duty; proof of application) | **fixed** | Scratch: other-State payment gives none. CO-3860 in CO-953/CO-1203; CO-3869/CO-3870 in CO-1436/CO-1438. |
| FC-10 (disaster payment) | **fixed** | Scratch: approved $2,500 is capped at $2,000. |
| FC-11 (marital status verification) | **fixed** | CO-1670 is owed whenever the status is questionable. |
| FC-12 (income of deemed persons) | **fixed** | CO-122: count 1 (stepfather's wages), pending. CO-01 p4/p5: count 3. AF: CO-3884 in CO-1436. |
| V-2 (verification family) | **fixed** | Same as FC-12 (CO-3879-CO-3881 in CO-1425). |
| V-9 (P2: spouse income and resources) | income **fixed**; resources **deferred P2, really P1** → **N-2** | Engine-confirmed; see N-2. |
| FC-20 (P2: CW supportive payments, deferred out of scope) | stays P2 | 3.606.8.B states no eligibility test or amount beyond an "assessed need" and county decision. It differs from the AF disaster payment, which has criteria and a $2,000 cap. Recorded in docs/colorado-notes.md:309. |

## Findings

| id | sev | item(s) | governing excerpt | what is wrong | proposed fix |
|---|---|---|---|---|---|
| N-1 | **P1** | af_life_insurance_countable_cash_value CO-3854, af_person_countable_resources CO-3400, af_client_and_spouse_countable_resources CO-2389 | 3.520.75.E (S2618): "For OAP only, if the total face value of all life insurance policies owned by a client and his or her spouse is equal to more than $1,500 and the CSV of all policies combined is $250,000 or less ... 1. If all policies were purchased more than forty-eight (48) months prior ... all CSV is exempt". F is the same for over $250,000. | CO-3854's first branch is `[not, af_is_oap_age] → whole CSV`. CO-2389 evaluates it on the spouse (`[of, [P], af_person_countable_resources]`), so it reads the **spouse's** age. **Engine probe** (CO-120 base; OAP client 72, spouse 55, $1,000 bank each, a $10,000 policy bought 2010, CSV $5,000, no payments in 48 months): if the spouse owns the policy, af_countable_resources = 7000, af_meets_resource_limit false, af_category none. If the client owns the same policy, the result is 2000, true and oap. The rule exempts "all policies owned by a client and his or her spouse" for an OAP client, so the first result is wrong. The reverse also holds: an AND client whose spouse is 60 or older has the spouse's policy exempted, though E-F are "For OAP only". | Make the OAP test the client's: evaluate the spouse's life insurance part under the client's program. For example, CO-2389 adds the spouse's resources with the spouse's life-insurance term recomputed for the client's af_is_oap_age. Or CO-3854 takes the program from the client the resources are counted for. Add a case like the probe. |
| N-2 | **P1** (was V-9's deferred P2) | af_resources_verification_is_pending (CO-1433 / its pending item), af_pending_verification_count CO-1436 | 3.520.72.A (D-80:2381): "a resource is countable, and together with all other countable resources of the client, spouse, and sponsor(s) shall be considered against the resource limit." D (D-80:2489): "The county department shall obtain verification of all resources and associated values." | The spouse's resources are counted (CO-2389) but never verified. The resource element is gated on the person's own Adult Financial applicability, and CO-1436 adds only the spouse's income (CO-3884). **Engine probe:** OAP client 72 with every element verified; spouse 55 with a $1,500 retirement account and no resource document. af_countable_resources = 2500 (counted), but af_pending_verification_count = 0 and af_verification_status = complete. The disposition deferred this because CO-1433 carries the SSI and 24-month rules. That is an implementation reason, not text; under criterion 1 ("no verification requirement the rule states left unmodeled") it is P1. | As CO-3884 did for income: state the ungated resource condition once (af_resources_are_unverified: has_resources_other_than_cash and not verified, with D.4's 24-month rule and F's SSI rule for the person owning them), read it in CO-1433, and add a spouse count to CO-1436. Add a case like the probe. |
| N-3 | **P1** | meets_public_assistance_citizenship_requirement CO-905 (Colorado Works; AND by the fix round's own reading), OQ-550 | 22 U.S.C. 7105(b)(1)(A) (D-222, S2414): "Notwithstanding title IV of [PRWORA] ... a victim of a severe form of trafficking in persons ... shall be eligible for benefits and services under any Federal or State program or activity funded or administered by [HHS] to the same extent as an alien who is admitted to the United States as a refugee". Pub. L. 117-128 sec. 401(b)(1) (govinfo, fetched 2026-11-22): a Ukrainian parolee "shall be eligible for ... entitlement programs, and other benefits available to refugees ... to the same extent as such refugees". Pub. L. 117-43 sec. 2502(b)(1): an Afghan parolee is eligible for "entitlement programs, and other benefits available to refugees ... until March 31, 2023, or the term of parole granted ..., whichever is later". 9 CCR 2503-6 3.604.2 K (D-81:1407): "Refugees are qualified non-citizens exempt from the five-year bar." | CO-905 exempts refugees from the bar (through CO-1725) and, since FC-13, Iraqi and Afghan special immigrants. It does not exempt trafficking_victim, ukrainian_humanitarian_parolee or afghan_humanitarian_parolee, which CO-506 reads as qualified non-citizens subject to the bar. **Engine probe** (status from 2024-03-01, determination 2026-10-01): trafficking_victim, ukrainian_humanitarian_parolee and afghan_humanitarian_parolee are all false; refugee and iraqi_afghan_special_immigrant are true. Colorado Works is TANF, an HHS-administered program, so 7105 reaches it, as the volume already holds for CHP+ (CO-2706 statute_override) and Medicaid (CO-1172). OQ-550 keeps the parolee reading under "blocked on a named document" (SAVE), but the statutes that answer it are on an allowed host, so criterion 2 also fails for that part. | In CO-905, accept trafficking_victim, ukrainian_humanitarian_parolee and afghan_humanitarian_parolee (while the parole is unterminated; for the Afghan, within the term of parole) as refugees are accepted, with a statute_override naming 3.604.1.B.3 and the three statutes. Decide AND by the same reading FC-13 used for special immigrants (7105 reaches HHS programs only, so AND is a choice for trafficking victims). Fetch Pub. L. 117-43 and 117-128 into documents. Narrow OQ-550 to the SAVE code mapping. |
| N-4 | **P1** | af_excluded_unearned_income CO-2343 (FC-3 residual), af_countable_income CO-946 | 3.520.786.K (S2608): exempt income includes "Unearned income as defined in the [POMS] Guide to Unearned Income Exclusions ... and consistent with ... 20 CFR 416.1124 (September 2025), which are hereby incorporated by reference". 416.1124(c)(11) (D-207): "One-third of support payments made to or for you by an absent parent if you are a child". | CO-2343 implements K only for 416.1124(b), (c)(2) and (c)(22). An AND-CS child (AND-CS reaches ages 0-59) who receives child support has all of it counted. **Engine probe:** AND-CS child 9 with SSI $500 and child support $300 gives countable 780 and a grant of $214. With (c)(11): 200 - 20 + 500 = 680 and a grant of $314. Medicaid's SSI-related budget already applies the one-third (CO-2281). Smaller K remainders with no fact: (c)(1) refunds of real-property or food taxes, (c)(19) hostile-fire pay, (c)(21) gifts to a child with a life-threatening condition, (c)(23) AmeriCorps payments (unless federally_excluded_payments_received is read to carry them). | Add `[case, [[all, child age < 18 (af_dependent_child_age_limit or the SSI child test), true], child_support_received × 1/3]]` (a dated parameter for the one-third) to CO-2343, applied to current support net of arrears (P is already excluded). State in CO-2343's precision which of the other (c) exclusions are carried by which fact, and add facts or a residual for the rest. |
| N-5 | **P1** (narrow) | af_twfc_penalty_months CO-3840, resource_transfer_date CO-3834, resource_transfer_uncompensated_value CO-3835 | 3.520.76.D.3 (S2614): "Divide the uncompensated value by the TWFC monthly penalty value and round down to the nearest whole number." D.5: "If there are multiple transfers, the period of ineligibility would begin the month following the end date of the first transfer's period of ineligibility." E: "from 1 month up to a maximum of 36 months depending on the amount of the uncompensated value **for each resource transferred**." | The case states the first transfer's date and the total value. CO-3840 floors the total, and its precision admits that the rule's result "can be up to one month shorter for each further transfer". Example: two transfers of $1,000 each by an OAP client ($1,032 standard). The rule gives 0 + 0 = 0 months; the volume gives floor(2000/1032) = 1 month, so af_category is none for a month the rule pays. No open question carries this, and the rule text is not ambiguous. | State the transfers per resource: a list fact, or a supplied per-transfer penalty-month total that the case derives from per-resource values. Alternatively, add a fact for the sum of the per-resource floored months and read it in place of the floor of the total. |
| P2-1 | P2 | CO-905 | docs/conventions.md (Override): "one county-facing sentence where a statute governs over the Colorado rule paragraph ... (YAML statute_override)". | CO-905 now departs from 3.604.1.B.3 ("exceptions to the five-year bar consistent with 8 U.S.C. 1613(b)") and 3.520.68.A for Iraqi and Afghan special immigrants on Pub. L. 111-118 sec. 8120. The departure is in the precision only, with no statute_override, unlike CO-929, CO-1432 and CO-2706. | Add the statute_override sentence (and N-3's statutes with it). |
| P2-2 | P2 | cw_excluded_unearned_income CO-2341 | 3.605.4.A.5 (S2605): personal care or home care allowances "shall be exempt as income in determining the amount of attributable non-recipient spouse, non-recipient parent, or non-recipient stepparent income". | The text scopes the exemption to deemed income. CO-2341 exempts in_home_care_allowance_received for every member, including a recipient. | Apply it to the deemed persons only (CO-2353, CO-909), or record the broader reading in an open question as a state policy choice. |
| P2-3 | P2 | af_excluded_infrequent_income CO-3827 | 3.520.786.O: "Infrequent or irregular income of less than $60 in a calendar quarter" (not limited to unearned). | Infrequent earned income is not exempt (the precision admits it). Rare. | Add an earned counterpart or a reading in an open question. |
| P2-4 | P2 | resource_transfer_uncompensated_value CO-3835 | 3.520.76.D.6.a: when the whole resource is returned in a later month, "the period of ineligibility continues through the month the resource is returned". | The fact's precision says a transfer whose whole resource was returned "is not stated", so the month of return is not a penalty month. | State the return month, and end the period after it. |
| P2-5 | P2 | docs/colorado-notes.md | 9 CCR 2503-6 3.606.8.C (D-81): Family Preservation eligibility (income under $75,000, out-of-home placement criteria, a specified relative within six months), Title IV-A Emergency Assistance under 12 CCR 2509-4. | Not modeled and not recorded as out of scope (3.606.8.B and D are). | Record it as out of scope (a child-welfare service, 12 CCR 2509-4). |
| P2-6 | P2 | cw_is_considered_living_in_home CO-3354, cw_is_institution_resident CO-3804 | 3.604.2.O.2: "A client who is a resident of an institution is not considered to be in the home." | O.2 is read only in the `medical_treatment` and `other_with_intent_to_return` branches. A parent whose residence_setting_type is a nursing facility, with an entry date over 30 days ago and no temporary_absence_reason stated, falls in the "none: present" branch and stays in the home. Facts that contradict each other give the wrong answer silently. | Read cw_is_institution_resident (with the CO-3805 exception) ahead of the "none" branch, or make an institutional setting imply an absence. |
| P2-7 | P2 | cw_assistance_unit_members_for_size CO-2351 | 3.604.2.O.1: out-of-State status "shall not exceed ninety (90) consecutive days". | Scratch probe: a mother 126 days out of State is ineligible_residency but stays in the unit's size, so the child's grant is still the one-caretaker $488. | Drop a member who fails the 90-day test (or any person-level bar) from the size, as CO-2351 now does for CO-3802; or record the reading. |
| P2-8 | P2 | disaster assistance (CO-3872, CO-3877) | 3.570.53.B (S2625): "Only request verification related to the client's request for disaster assistance if the county considers the request questionable." | No verification element. It is a may-if-questionable limit, so P2. | Add a questionable-request element, or state the limit in CO-3877's precision as a documented limit. |
| P3 | P3 | OQ-550 body | — | The body still says 22 U.S.C. 7105 "the volume did not save", but it is D-222. | Update with N-3. |

## Coverage map (changes since the first pass; everything else as docs/reviews/final-cash.md's map, re-checked)

### Colorado Works (9 CCR 2503-6)

| Provision | Items |
|---|---|
| Institution patient and inmate (3.604.1.D-E) | CO-3802, CO-3801, CO-2351, CO-921 (ineligible_institution); OQ-660 |
| Strikers (3.604.2.L.2) | CO-3800, CO-3808, CO-921 (ineligible_strike) |
| Out of State 90 days, institution resident 30 days (3.604.2.O) | CO-3806, CO-3807, CO-904; CO-3803-CO-3805, CO-3354; OQ-660; P2-6, P2-7 |
| Child support assignment and cooperation (3.604.4.A) | CO-3809-CO-3811, CO-921 (ineligible_child_support) |
| Short-term and subsidized wages (3.605.2.C, 3.605.4.B.35) | CO-3817-CO-3819, CO-2340 |
| Exempt unearned income (3.605.4.A-B) | CO-3812, CO-3813, CO-3815, CO-3816, CO-3820-CO-3825, CO-2341; P2-2 |
| Child support arrears (3.605.5.D) | CO-3814, CO-2553, CO-2551 |
| Five-year bar and its exceptions (3.604.1.B.3; 8 U.S.C. 1613(b); statutes giving refugee treatment) | CO-905, CO-1725; **gap: trafficking victims and humanitarian parolees (N-3)** |
| Verification of household members' income (3.604.3.B.2.e) | CO-3879-CO-3881, CO-1425, CO-1649, CO-2588 |
| Family Preservation (3.606.8.C) | not modeled, not recorded (P2-5) |
| Supportive payments, other assistance (3.606.8.B, D) | out of scope, recorded (colorado-notes) |

### Adult Financial (9 CCR 2503-5)

| Provision | Items |
|---|---|
| Other-State assistance (3.520.64.B.2) | CO-3859, CO-942 |
| Duty to apply for benefits; refused income; proof of application (3.520.61.G, 3.520.71.B-D, G) | CO-3860, CO-3861, CO-3831; CO-3862-CO-3870, CO-1436, CO-1438 |
| TWFC (3.520.76) | CO-3834-CO-3841 in CO-953, CO-1203; **multi-transfer gap (N-5)**; P2-4 |
| AND-SO substance abuse (3.541.3) | CO-3842-CO-3849, CO-1203 |
| OAP life insurance (3.520.75.E-F) | CO-3850-CO-3854, CO-3400; **spouse-owned policy wrong (N-1)** |
| Revocable burial funds, excess burial spaces (3.520.72.B.8-9, 3.520.77.G-I) | CO-3855-CO-3858, CO-3400 |
| Married $20 split; rollover OAP/AND-CS only (3.533.A.2.c.1, f; 3.544.B.2; 3.549.A.2.c.1, f, D.2; 3.544.E.2) | CO-3828-CO-3833, CO-946, CO-2384; OQ-661 |
| Exempt income (3.520.786) | CO-3812-CO-3826, CO-3827, CO-2343; **K's 416.1124(c)(11) gap (N-4)**; P2-3 |
| Disaster assistance payment (3.570.5) | CO-3871-CO-3878; P2-8 |
| Resource limit boundary | CO-948; OQ-662 |
| Verification: marital status (3.520.63) | CO-1670 |
| Verification: spouse income (3.520.5.A.3) | CO-3882-CO-3884, CO-1436 |
| Verification: spouse resources (3.520.72.A, D) | **gap (N-2)** |

## Correctness checks (rules checked against the text this pass)

Each line gives the rule, the result, and the item(s). All are correct unless marked.

1-6. Colorado Works chart, 3.606.1.F (D-81:2997-3012), all six rows (need and grant for no, one and two caretakers, 0-10 children): correct, and current through 2028-07-01 under SB 26-181 (CO-274, CO-276, CO-351-CO-354).
7-8. Each additional child: $67 need, $90 grant (CO-275, CO-277).
9. Pregnancy allowance $10 (CO-355).
10. $90 disregard at application (CO-273).
11. 67% and 100% disregards (CO-350, CO-1503).
12. Strike bar on the unit, adult members only (CO-3808).
13. Inmate bar, with the work-release and court-monitoring exception (CO-3802).
14. TB and IMD patient bar, with the under-21 psychiatric exception for a child (CO-3802).
15. Thirty consecutive days makes a resident of an institution, counted ≥ 30 (CO-3803, CO-3804).
16. O.2 exception: responsibility for a child in the home or the institution (CO-3805).
17. Ninety consecutive days out of State, counted ≤ 90 (CO-3807, CO-904).
18. Child support assignment and cooperation, with good cause and FVO as not failing (CO-3809-CO-3811).
19. Short-term wages excluded unless the job ended through the client's fault (CO-3818, CO-3819, CO-2340).
20. Subsidized wages, B.35 (CO-3817).
21. A.3, A.7 one-time emergency assistance and General Assistance (CO-3812).
22. A.8 crime victim compensation (CO-3813).
23. B.13, B.14, B.16 WIOA and youth programs (CO-3815).
24. B.20-22 and B.25 savings account distributions (CO-3816).
25. 3.605.5.D arrears exempt, both at application and in the six-month average (CO-2553, CO-2551).
26. Household-member income verification, B.2.e (CO-3881, CO-1425).
27. OAP standard $1,032, ISM $351 and floor $189 from 2026-01-01 (D-80:3919-3924; CO-289, CO-1513, CO-1200).
28. AND-SO standard $248 from 2022-04-01 (CO-290).
29. AND-CS standard $994 and floor $13 (D-80:4842, 4880; CO-291, CO-1201).
30. HCA floor $977 (D-80:5718; CO-1202).
31. Married split of the $20 (CO-3828, CO-3829; OQ-661).
32. Rollover for OAP and AND-CS only (CO-3833).
33. Infrequent or irregular income under $60 per calendar quarter, and the quarter arithmetic (CO-3826, CO-3827); P2-3.
34. Exempt income D, E, F, I, J, L, M, O, P (CO-2343); K is incomplete (N-4).
35. TWFC 36-month look-back, counted from the application, or while receiving (CO-3838, CO-3840).
36. TWFC divisor is the current grant standard of the client's program, rounded down (CO-3840).
37. TWFC cap of 36 months (CO-3839).
38. Penalty begins the month after the transfer (CO-3841).
39. Several transfers per resource: wrong (N-5).
40. Substance abuse: 12 cumulative months, treatment, termination, two positive tests in three months (CO-3847-CO-3849).
41. OAP life insurance: 48 months, contributions within 48 months counted, $250,000 cap, a recent policy counts the whole CSV (CO-3852-CO-3854). Correct for the client's own policy; wrong for the spouse's (N-1).
42. Revocable burial trust or contract over $1,500, and excess burial spaces (CO-3855-CO-3858).
43. Other-State payment bar (CO-3859, CO-942).
44. Proof of SSA application: 11 days from the SSA application; AND-SO 60 days from the interview; subsequent AND-SO 30 days (CO-3866-CO-3870).
45. Disaster payment: $2,000 per client per disaster, the four criteria, from 2022-07-01 (CO-3871-CO-3878).
46. Marital status verified if questionable (CO-1670).
47. Spouse income verification (CO-3882-CO-3884).
48. Burial cost limit $2,500 from 2020-03-01 (CO-1227, S2631).
49. Resource limits $2,000 and $3,000 at most, OQ-662 (CO-3045, CO-3046, CO-948).

## Cases recomputed by hand

| Case | Hand derivation | Engine |
|---|---|---|
| CO-120 (2026-10), FC-4 | Each spouse: SS 500, married share of the $20 = 10, so countable 490. Deeming: each spouse on Medicaid with 500 ≤ 1,032, so 0 (3.534.C). Resources 1,000 + 1,000 = 2,000 ≤ 3,000. OAP grant 1,032 − 490 = **542** (> $189 floor). | 490 / oap / 542 each; disregard 10 |
| CO-121 (2026-10), FC-5 | AND-SO, wages 465: (465 − 65) / 2 = 200, no rollover (3.544). 200 < 248, so and_so; grant 248 − 200 = **48**. | rolled 0 / 200 / and_so / 48 |
| CO-122 (2026-10-05), V-2 | Unit: Ana and her son (one caretaker, one child), need 331. Stepfather Luis deemed: 2,000 − 90 − 253 (need standard, 0 children of his own outside the unit; OQ-102) = 1,657 ≥ 331, so ineligible_income. Verification: Luis's wages are undocumented and used, so the count is 1; Oct 5 ≤ Oct 12, so pending. | members [p1,p2,p3]; 1657; ineligible_income; count 1; pending |
| CO-07 (2026-10) | CW: 2 caretakers, 1 child (p3 on SSI excluded): 439 / 649. p1 wages 400 × (1 − 0.67) = 132. Grant 649 − 132 = 517; second-level sanction 25% = 129.25, so 387.75 → **387**. p3 AND-CS: SSI 700 only, no $20, countable 700, grant 994 − 700 = **294**. p5 OAP: 900 − 20 = 880; 1,032 − 880 = 152 < floor, so **189**. | 439/649/132/517/387; 700/and_cs/294; 880/oap/189 |
| CO-13 (2026-11) | p1 OAP (widowed): 700 − 20 = 680, grant 1,032 − 680 = **352**; HCA max(977, 900) = **977**. p2 burial: unmet 2,800 − 300 − 200 − 0 = 2,300; benefit min(2,300, 1,500) = **1,500**. p3/p4 CW: 488 − 25% = **366**. | 680/oap/352/977; 2300/1500; 331/488/366 |
| CO-01 (2026-10), p4/p5 | p3's wages 2,380 − 90 − 253 = 2,037 ≥ 245, so ineligible_income. Count 3 (two citizenship elements plus p3's undocumented wages). | 2037 / ineligible_income / 3 / pending |

Scratch households (not stored): see the confirmation table and N-1 to N-4. The probe files are in rv-cash/probe/ (p_life.yaml, p_ver.yaml, p_imm.yaml, p_cs.yaml, p_cw.yaml, p_fc.yaml).

## Verification (document collection)

**Colorado Works:** modeled for every 3.604.3.B.2 primary element. B.2.e now reaches the budgetary unit and the minor parent's parents (CO-3881). The C secondary items are discretionary ("may include"). No gap found.

**Adult Financial:** modeled for age, residency, identity, SSN, citizenship and immigration status (AND, and OAP under the statute), resources, earned and unearned income, SSI disability, the AND-SO certification, marital status if questionable, sponsor, proof of application (11, 60 or 30 days), and the spouse's income.

**Gaps:**
- The spouse's resources (N-2, P1).
- The disaster request (3.570.53.B), a may-if-questionable limit (P2-8).

## Open-question confirmations (cash scope)

| OQ | Class line | Confirmed? | Text checked |
|---|---|---|---|
| OQ-660 (new) | state policy choice | Yes | 3.604.1.D-E, 3.604.2.M, 3.604.2.O.2 (S2600, S2602): "at least thirty (30) consecutive days" does not say elapsed or expected; "unless individual needs are provided for through other state" is unclear; M lists the members removed from size, and D-E bars are not among them. No other rule answers it. |
| OQ-661 (new) | state policy choice | Yes | 3.533.A.2.c.1 says "split equally"; 3.544.B.2 and 3.549.A.2.c.1 say "split"; 3.544.E.2 "unless the client also has unearned income"; 3.549.D.2 "any remaining ... from the client". The text does not settle pool against half. |
| OQ-662 (new) | state policy choice | Yes | 3.520.71.A.1 "below" against C.R.S. 26-2-111(2)(a) and 20 CFR 416.1205 "not more than". |
| OQ-101, OQ-102, OQ-104, OQ-153, OQ-252, OQ-352, OQ-354, OQ-355, OQ-553, OQ-611, OQ-613 | state policy choice | Yes | Re-read against the same paragraphs the first pass cited (D-81, D-80 current versions); unchanged. |
| OQ-138, OQ-591 | needs Legal | Yes | 3.540 against C.R.S. 26-2-111(4)(a); 26-2-111(2)(c) against 3.520.5.D and 3.520.67.E. |
| OQ-250, OQ-530, OQ-531 | blocked on a named document | Yes | HCA tier maximums; the SFY 2028-29 COLA; the TANF State Plan. None is on an allowed host. |
| OQ-550 (shared) | blocked on a named document | **No, for the Colorado Works part** | The SAVE mapping is blocked (uscis.gov refused). The reading that Afghan and Ukrainian humanitarian parolees are qualified aliens subject to the bar is answered by Pub. L. 117-43 sec. 2502 and Pub. L. 117-128 sec. 401 (govinfo.gov, fetched this pass). The trafficking-victim reading for CW is answered by D-222, already in the volume. See N-3. |
| OQ-114, OQ-390 (resolved remainders) | resolved | OQ-114 yes. OQ-390 **no for AF**: K's 416.1124(c)(11) is unmodeled (N-4). | — |

## P2 dispositions (proposed)

- P2-1: add the statute_override, together with N-3.
- P2-2 and P2-3: record a reading in an open question, or narrow the item.
- P2-4 and P2-6: small derivation fixes; they can follow the P1 round.
- P2-5: record as out of scope in docs/colorado-notes.md.
- P2-7: record the reading, or extend CO-2351.
- P2-8: document as a limit in CO-3877.

No earlier "deferred P2" other than V-9's resource half (N-2) is a P1. FC-20 stays P2.
