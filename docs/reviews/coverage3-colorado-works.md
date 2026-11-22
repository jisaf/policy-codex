# Coverage review, third pass: Colorado Works (9 CCR 2503-6)

Reviewer pass: third exhaustive coverage matrix, 2026-11-22, on HEAD 1743a1d (branch ccr-9d19bf4c-wmnwcl), after the fix rounds recorded in docs/reviews/coverage-colorado-works.md section 7 and docs/reviews/coverage2-colorado-works.md "Disposition (coverage pass 2)".

Governing text: 9 CCR 2503-6, rule version 12030, effective 07/01/2025 (volumes/co/documents/D-81.md). The 2021 poverty guidelines that 3.601 adopts are D-295. Finding CW3-2 also reads 9 CCR 2503-5 3.520.71.F (D-80), because the Adult Financial bar reads the Colorado Works status that the pass 2 fix changed.

Method: I built this matrix from the D-81 text, paragraph by paragraph, without reusing the earlier rows. I worked on a scratch copy of HEAD (`git archive HEAD`, with node_modules symlinked). `npm run export -- --volume co` gave `conformance/co/ledger.json` with 2,169 items, 185 of them Colorado Works. For each carried row I read the item's `derived_english`, meaning and precision against the paragraph. I checked conditions, boundaries, periods, rounding, who the rule applies to and effective dates. I read the fix-round items closely: CO-4350 to CO-4373, CO-4660 to CO-4662, and the edits to CO-906, CO-909, CO-921, CO-1265, CO-2000, CO-2341 and CO-2353. Suspected wrong answers were probed with scratch households built from CO-160 and appended to the scratch `volumes/co/tests/cases.yaml`. I evaluated them with `npx vite-node scripts/eval-case.ts co <case> ...` (as_of 2026-10-15). The generators are in the session scratchpad (`cw3tools/mk.py`, `cw3tools/mk2.py`). `npm run check -- --volume co` passes on the unmodified scratch copy: 4,190 cases, 7,244 checks, 0 failed. That run includes the stored repro households of both earlier passes (CO-160 to CO-164, CO-190 and CO-191).

## 1. Verdict

**3 P1 found** (CW3-1, CW3-2, CW3-3).

- **CW3-1** has been in the matrix since the first fix round. Both earlier passes accepted it. A lodger's room-only payment is earned income under 3.605.2.E.4.d, but the volume has no fact that can carry it as earned income. Both routes the volume offers give the wrong answer.
- **CW3-2** is a regression left by the pass 2 CW2-5 fix. The new `ineligible_disqualified` status comes before the income test, and af_barred_by_colorado_works (CO-1511) now reads it. So Adult Financial is barred for a disqualified client whose Colorado Works unit is ineligible for income anyway, and 3.520.71.F.2.c ends the bar in that case.
- **CW3-3** is in the first-round CW-8 items (CO-4358, CO-4359). When the unit becomes eligible in a month after the application month, the application month is paid as a full month.

There are also 1 new P2 and 3 P3s. All first-pass and second-pass P1s stay fixed (section 5).

## 2. Findings

| id | sev | paragraph | item(s) | quoted text | what is wrong | proposed fix |
|---|---|---|---|---|---|---|
| CW3-1 | **P1** | 3.605.2.E.4.d (also c) | cw_boarder_income CO-4361, cw_gross_earned_income CO-1716, room_and_board_payments_received CO-4161, cw_countable_unearned_income CO-908 | E.4.d: "Room (to provide a person with lodging only) payments shall be considered earned income in the month received to the extent that the room payment exceeds other documented expenses directly related to the provision of room." E.4.c: board-only payments are earned income above "the maximum Food Assistance allotment for a one-person household per boarder and other documented expenses". | CO-4161 states room-and-meals payments only. CO-4361 always subtracts the one-person SNAP allotment per payer. CO-4361's precision sends a room-only payment to the unearned rent facts ("a lodger's payment for a room only is rent, stated in the unearned income facts"). That denies the earned income disregards ($90 at eligibility; 100% or 67% at payment) and applies the 3.605.3.A.2 rental expense list instead of E.4.d's "documented expenses directly related to the provision of room". Neither route gives the rule's answer. **ZT-1** (CO-160 plus $400 room-only, entered as rent, as the precision directs): unearned $400 ≥ $331, `ineligible_income`, $0. Rule: $400 − $90 = $310 < $331, `eligible`, $320 for October. Control **ZT-3** ($400 as wages) gives `eligible`, $320. **ZT-2** ($600 room-only entered in CO-4161 with one payer): $600 − $306 allotment = $294 earned, $204 countable, `eligible`, $320. Rule: $600 − $90 = $510 ≥ $331, `ineligible_income`. Control **ZT-6** ($600 as wages) gives `ineligible_income`. A board-only payment (E.4.c) has no fact either: CO-4161's meaning is room and meals, and CO-4361's precision says meals-only payments "not separately stated". | Add a neutral fact for room-only (lodging) payments received, with their own documented costs. Count them as earned income above those costs in CO-1716, with no allotment deducted. Correct CO-4361's precision so room-only payments are no longer sent to the rent facts. State that a board-only payment is stated in CO-4161 (the same formula as E.4.c), or add a board-only fact. Store ZT-1 and ZT-2 as household cases. |
| CW3-2 | **P1** | 9 CCR 2503-5 3.520.71.F.2.a-c (read with 9 CCR 2503-6 3.604.2.L-M) | cw_eligibility_status CO-921 (CW2-5 branch), af_barred_by_colorado_works CO-1511 | F.2: the client is ineligible for Adult Financial if the Colorado Works case "was denied or discontinued: a. Due to a sanction, demonstrable evidence, or disqualification". F.2.c: "the ineligibility period shall continue until the sanction, demonstrable evidence, or disqualification is removed; **or until the client is found otherwise ineligible for TANF/Colorado Works benefits**." | The pass 2 fix put `ineligible_disqualified` in CO-921 right after the status check. That is before the living-arrangement, strike, child support, diversion, closure, time-limit, sanction and income checks. CO-1511 then bars Adult Financial on that status. A disqualified client whose unit fails the income test is "otherwise ineligible", and the case was not denied because of the disqualification, but the model still bars Adult Financial. **ZT-4**: an adult mother serving a Colorado Works IPV disqualification, her baby, $1,500 wages. Model: p1 `ineligible_disqualified`, p2 `ineligible_income` (her $1,500 is counted without disregards against the No Caretaker $117), and af_barred_by_colorado_works is **true** for p1. Rule: the unit is income-ineligible, so F.2.c ends any bar, and af_barred should be false. Control **ZT-5** (the same mother, not disqualified) gives `ineligible_income` and af_barred false. closed_demonstrable_evidence and sanction_closure, which CO-1511 also reads, come before the time-limit and income checks too, so the same F.2.c test applies to them. | In CO-1511, read ineligible_disqualified (and closed_demonstrable_evidence and sanction_closure) as a bar only when the client is not otherwise ineligible. For a disqualification, test that some other member of the client's unit is `eligible`, meaning the unit was aided without the client. For the closures, add an "otherwise eligible" item (CO-921's checks without the closure and sanction branches) and read that. Add a test from ZT-4 and record the F.2.c reading in CO-1511's precision. |
| CW3-3 | **P1** | 3.609.2.A.1 (initial payment) | cw_partial_month_payment_factor CO-4358, cw_unit_eligible_from_date CO-4359, cw_grant_amount CO-914 | "The initial payment to eligible clients shall include assistance beginning with the date of application. Should the assistance unit be ineligible on the date of application, but become eligible prior to the time that a determination of eligibility is made, the initial payment shall include assistance beginning with the date on which the assistance unit became eligible." | CO-4358 returns the table figure only in the month containing the eligible-from date. Any other month gets 1, the entire month, including the application month when the unit became eligible in a later month. The 45-day processing period (3.602.1.I) makes this common for applications late in a month. **ZT-7**: CO-160 with cw_application_date 2026-09-25 and cw_unit_eligible_from_date 2026-10-03. Model: September factor 1, `eligible`, **$488**; October factor .95342, $465. Rule: nothing for September (assistance begins October 3); October 29 days × .95342 × $488 = $465.27, giving $465. The model overpays $488. | In CO-4358 (or CO-914), return 0 for a month before the month containing the stated cw_unit_eligible_from_date when the determination is not a redetermination. Add a rule test and store ZT-7 with a September expectation of $0. |
| CW3-4 | P2 | 3.605.3.B.10 | cw_countable_unearned_income CO-908, cw_budgetary_member_deemed_income CO-2353 | "The military allotment received by the non-recipient spouse, parent, or stepparent on behalf of individuals not in the assistance unit shall be considered as income in the month received to the extent that such income exceeds the need standard concerning those persons not in the budget unit." | There is no fact or item for it. An allotment stated in a non-recipient's unearned facts is counted in full, or through CO-2353's stepparent formula, with no deduction of the need standard for the persons it is paid for. Both earlier passes called it rare and not modeled, but docs/colorado-notes.md records no reason. | Record it as not modeled in docs/colorado-notes.md, or add a neutral fact (allotment paid for persons outside the unit) and deduct the One Caretaker or No Caretaker need standard for those persons. |
| P3-1 | P3 | 3.605.1.A.4.a ("non-participant") | cw_minor_parent_deemed_parents CO-4660 | "The countable income of a non-participant parent(s) of an unmarried minor parent" | CO-4660 tests only that the parent is not in **her** unit. A parent who receives Colorado Works in a separate unit with the minor parent's siblings (C.1.b lets the minor parent apply apart) is a participant, yet that parent's income is deemed. The effect is usually $0, because that parent's countable income is already below the same need standard that CO-2000 deducts. It can differ where the two counts differ, for example in redetermination child support averaging. | Exclude a parent who is a member of any Colorado Works assistance unit with an `eligible` status, or state the reading in the precision. |
| P3-2 | P3 | 3.605.1.A.4.a | cw_deemed_parent_income_of_minor_parent CO-909 | "minus the maintenance or child support paid to others outside the assistance unit" | The support each parent pays is subtracted inside the sum over parents and is not floored at zero for each parent. One parent's support payments can therefore offset the other parent's income. This is rare. | Floor each parent's result at zero before summing, or record the reading. |
| P3-3 | P3 | OQ-101 body | OQ-101 | — | The first paragraph still says that CO-900 "builds only a single caretaker/dependent-child parent pair". The phase-10 note below it supersedes that. | Strike or mark the stale sentence. |

Not findings (checked): CW2-3/OQ-831 (the 25% is now taken of the partial-month payment, CO-1265 × CO-4358; it is 1 outside the initial month, and the first and fourth levels are unaffected). CW2-4 (CO-2341 now excludes educational assistance less the excess of CO-4661 over CO-4662, floored; B.26 stays exempt). CW2-5's person-level scope (CO-2351 and CO-2561 handle size and participation, and the rest of the unit is unaffected, per ZT-4 p2). CO-4660 and CO-2000 against ZQ-2 (stored CO-191, passing). CO-906 against N.1-N.3 (an unrelated caretaker counts only as a member of her unit; a relative or her parent needs no approval; otherwise county_approved_living_arrangement; stored CO-190, passing). CO-2353's lives_with filter. CO-4350/CO-4351 against D-295 (12,880 to 44,660; +4,540). CO-4355 to CO-4357 against the A.1 table and the $10 and $1 floors.

## 3. Coverage matrix

Legend: **C** = carried by (derivation read against the text); **N/A** = not applicable (reason); **OQ** = open question; **GAP** = no item and no recorded reason. "Notes" = docs/colorado-notes.md.

### 3.600 Program administration
| ¶ | disposition |
|---|---|
| 3.600.1 performance contract | N/A: state and county administration |
| 3.600.2 county policies (A-) | N/A: county administration; county options that change an answer enter as supplied findings (CO-1268, CO-845, CO-4353) |
| 3.600.3, 3.600.31, 3.600.32 contracting, religious organizations | N/A: administration |
| 3.600.4 pilots; 3.600.5 review and oversight | N/A: administration |

### 3.601 Definitions (as used)
| ¶ | disposition |
|---|---|
| Dependent child: under 18, or 18 and a full-time secondary student expected to finish before 19; lives with a caretaker | C: cw_is_dependent_child CO-901 (CO-270, CO-271); residence through CO-900 and CO-2608; a minor parent not in a caretaker's home through CO-4352 |
| Parent includes an expectant parent | C: CO-921 first check (is_pregnant), CO-1260 pregnancy allowance |
| Federal Poverty Guidelines = 86 FR 7732 (2021), no later editions | C: CO-4350, CO-4351 (values match D-295), read by CO-2364 |
| Fleeing felon; inmate; institution | C: is_fleeing_felon in CO-928; CO-3802 |
| Demonstrable evidence | C: CO-4353 (demonstrable_evidence) in CO-921 |
| Diversion; Period of Ineligibility | C: CO-1270, CO-1269 |
| Good cause, hardship, exceptional dis-engagement, collateral contact, prudent person, other terms | C where an item reads them as supplied findings (CO-2370, CO-846, CO-847, CO-1261); otherwise N/A: definitions with no condition of their own |

### 3.602 Applications
| ¶ | disposition |
|---|---|
| 3.602.1.A.1-5 apply without delay, no pre-screening, withdrawal | N/A: procedure |
| B-D administrative review, information, releases | N/A: procedure |
| E.1-5 receiving applications, interviews, any county | N/A: procedure |
| E.6 only a caretaker with whom a dependent child lives may apply | C: CO-921 (ineligible_no_dependent_child), CO-900 |
| F.1-2 minimum application | N/A: procedure |
| F.3 date of application | C: cw_application_date CO-2372 (supplied), read by CO-4358 |
| G-H information sharing, confidentiality | N/A |
| I 45-day processing; I.1 | N/A: county timeliness |
| I.2 eleven days for verification; to the twentieth day on good cause | C: CO-1351, CO-2371, CO-2370, CO-1426, CO-2373 |
| I.3 30-day reuse of a denied application | N/A: procedure (the date is supplied) |
| I.4 one interview; J immunization information | N/A |
| K.1 bases for denial (ten days) | C: CO-1427; OQ-770 |
| K.2-3 withdrawal, case actions | N/A: notice and case actions |
| 3.602.2 voter registration | N/A |

### 3.603 Case files
| ¶ | disposition |
|---|---|
| 3.603.1 | N/A: records management |

### 3.604.1 Eligibility criteria
| ¶ | disposition |
|---|---|
| A, A.1-2 resident, no durational requirement, retained until abandoned | C: CO-904 |
| A.3 TANF from another State in the month | C: CO-904 reads received_tanf_from_another_state_this_month CO-842 |
| B.1-3 citizen; qualified before 8/22/1996; five-year bar and 1613(b) exceptions | C: CO-4005 (reads CO-905) |
| C member of a unit meeting income and verification; noncustodial parent gets services only | C: CO-913, CO-1427, CO-4372; noncustodial parent N/A (services, no cash) |
| D TB or mental-disease patient, except a child in under-21 psychiatric care | C: CO-3802 |
| E inmate; exceptions (public medical institution, work release, court monitoring) | C: CO-3802 |
| F.1-4 no USCIS status, voluntary departure, status applicants, temporary visas | C: CO-905 or CO-4005 (status not qualified) |

### 3.604.2 Household composition
| ¶ | disposition |
|---|---|
| A.1 unit lives together and applies as one; separate units for persons not required together; each unit's own standard | C: CO-900 (lives_with, CO-3354), CO-911, CO-912 |
| A.2 budgetary unit | C: CO-2352 |
| A.3 verification of composition | C: CO-1421, CO-1648 |
| B MOE or TANF funding | N/A: funding source |
| C.1.a dependent children in the caretaker's home | C: CO-900, CO-2608 |
| C.1.b parents in the home, except a minor parent requesting for her own child, or custody elsewhere | C: CO-900 (is_requesting_assistance_for_own_child CO-850), CO-2347 |
| C.1.c siblings in the requesting caretaker's legal care | C: CO-900 (common caretaker) |
| C.1.d half siblings without child support | C: CO-900, CO-2842 |
| C.1.e spouse of a pregnant parent | C: CO-900 |
| C.2.a-g optional members on request (stepparent; non-parent caretaker and spouse; half sibling with child support; sibling not in custody; parent without custody; parents of a minor parent) | C: CO-2346, CO-2347, CO-2349, CO-2558, CO-900 |
| C.3.a-b SSI and Title IV recipients excluded | C: CO-2350, CO-841, CO-2561 |
| D.1.a-e budgetary members (unit; spouse of a parent or caretaker; unborn child; non-recipient parents of a minor parent; sponsor) | C: CO-2352, CO-2353 (spouse), CO-1260 and the pregnancy column (unborn), CO-909 and CO-4660 (parents of a minor parent, in the home per A.4.a), CO-2365 (sponsor) |
| D.2.a-b excluded from the budgetary unit | C: CO-2352 (requesting optional members only; SSI and Title IV out) |
| E.1-4 child living in the home during listed absences | C: CO-3354 |
| F school attendance | C: CO-1422, CO-1652 (verification); attendance itself N/A (no eligibility consequence stated) |
| G.1-3 absences over 45 days (medical or education; parenting-plan visit up to 6 months; voluntary foster care up to 3 months) | C: CO-3354 (CO-3355 to CO-3357); shorter unlisted absences OQ-611 |
| H caretaker hierarchy | P2 deferred (CW-18, reason in Notes) |
| I.1-3 caretaker temporarily away (uniformed service, medical treatment, under 45 days with intent to return) | C: CO-3354 |
| J tribal members not eligible under a tribal plan | OQ-772 |
| K refugees exempt from the five-year bar; CRSP referral | C: CO-4005 (status); referral N/A |
| L.1 fugitives and fleeing felons | C: CO-928 in CO-921 (ineligible_disqualified), CO-2351, CO-2561. **CW3-2** on the Adult Financial reader |
| L.2 adult in a strike | C: CO-3808 |
| L.3 five-year bar | C: CO-4005 |
| M removal from size; income counted without disregards; month counts toward 60 | C: CO-2351, CO-910/CO-923 (IPV and felon: gross; status and SSN: less $90 per 3.605.1.A.6), CO-915 |
| M.1-2 IPV (10 years for two-state residence; 12, 24 months, lifetime; other-state IPV) | C: cw_is_serving_ipv_disqualification CO-1730 (county finding with the period) |
| M.3 fleeing felon while the definition is met | C: is_fleeing_felon |
| M.4 failure to apply for an SSN | C: CO-2348 |
| M.6 non-qualified non-citizen, no proof | C: CO-905 or CO-4005, CO-4372 |
| N.1 unmarried, non-emancipated minor parent: another adult caretaker or a county-approved setting | C: CO-906, CO-921 (every member barred) |
| N.1.a county assists in finding a setting | N/A: county service |
| N.1.b education within 60 days, or termination | C: CO-4353 (minor_parent_education_nonparticipation) |
| N.2.a not in a caretaker's home: approval unless emancipated, married or with an adult relative | C: CO-906 |
| N.2.b-c emancipated or married not in a caretaker's home; assisted as an adult | C: CO-4352 in CO-926, CO-927, CO-924, CO-916, CO-3808 |
| N.3.a unrelated caretaker not joining: approved setting | C: CO-906 (fixed CW2-1; CO-190 passes) |
| N.3.b unrelated caretaker joining: county may require approval | OQ-830 |
| N.3.c with her own parent: no approval | C: CO-906 (parent disjunct) |
| N.3.d dependent child of a caretaker assisted as a child | C: CO-4352 (inverse), CO-927 |
| O.1 out of State up to 90 days with intent to return | C: CO-904, CO-2351 (CO-3807) |
| O.2 institution resident (30 days), the exception for a child in care | C: CO-3804, CO-3805, CO-3354; OQ-660 |

### 3.604.3 Program verifications
| ¶ | disposition |
|---|---|
| A request contents, eleven-day due date, process without the verification | C: CO-1351, CO-1426, CO-2381, CO-1427; OQ-770 |
| A collateral contact substitution; verification continues for the life of the case | N/A: procedure (a verification received is stated) |
| B.1 IEVS: no delay if other evidence establishes eligibility | N/A: procedure |
| B.2.a-b lawful presence, citizenship or status | C: CO-1420, CO-1644 to CO-1646, CO-1655, CO-1656, CO-4372 |
| B.2.c SSN or proof of application; only that client is ineligible | C: CO-1647, CO-2348; the eight-month validity is P2 deferred (CW-25, Notes) |
| B.2.c.1-4 SSN verification at recertification, SOLQ | C: CO-1647; SOLQ N/A |
| B.2.d caretaker's responsibility unless a parent | C: CO-1421, CO-1648 |
| B.2.e income of members whose income is used | C: CO-1649, CO-2588, CO-3879 to CO-3881 |
| B.2.f residency | C: CO-1651 |
| B.3 questionable information; B.4 extension past 45 days | N/A: county discretion and timeliness |
| B.5 SAVE for immigrants | C: CO-1646 |
| C.1-7 secondary verifications (relationship, good cause, child support, school attendance, work participation, absences, pregnancy with no children) | C: CO-1421, CO-2370, CO-1422, CO-1652, CO-1423, CO-1653; child support and work participation N/A (no stated eligibility consequence beyond 3.604.4 and 3.608) |
| D-G sources, collateral contacts, flexibility | N/A: procedure |
| H.1-4 interfaces (IEVS, PARIS, SAVE, DMV) | C: SAVE and electronic sources in CO-1644 to CO-1647; DMV match per OQ-376 |
| I.1-6 citizenship and lawful presence (18 and older; Rule 5 appendices, Mar. 2, 2021) | C: CO-1352, CO-1367, CO-1644, CO-1645; OQ-376 |
| J sponsored non-citizen verification | C: CO-1654 |
| K thirty days for status, identity or SSN; payment withheld for that person, income counted | C: CO-1598, CO-1655, CO-1656, CO-4372, CO-2351, CO-2561 |

### 3.604.4-3.604.5 Child support services and FVO
| ¶ | disposition |
|---|---|
| 3.604.4.A assignment (precludes the unit); cooperation without good cause | C: CO-3811 (CO-3809, CO-3810) |
| A.1-4 good cause claims and review | C: CO-3810 is a finding net of good cause; review N/A |
| B unreimbursed public assistance | N/A: child support accounting |
| C reinstatement when child support is not received | C: month-by-month evaluation (the month's stated support, CO-2553) |
| 3.604.5 FVO waiver of work activities, time limits and child support cooperation | C: has_domestic_violence_extension_approved CO-846 in CO-925; work and cooperation waivers enter through the findings CO-1261 and CO-3810; procedure N/A |

### 3.605.1 Income
| ¶ | disposition |
|---|---|
| A all countable gross income of the assistance and budgetary units | C: CO-910, CO-923, CO-2353 |
| A.1 prior month and application month | OQ-771 |
| A.2 available when legally available | C: fact convention (the month received) |
| A.3, a-b securing potential income; no delay | N/A: procedure |
| A.3.c refused potential income counted after notice | C: CO-4362 in CO-908 and CO-2554 |
| A.3.d withdrawn on action | C: CO-4362 reads 0 |
| A.4.a stepparent: gross earned − $90 − maintenance or support paid − payments to tax dependents outside the home + unearned − needs of the stepparent and those in the home he is responsible for | C: CO-2353 (CO-4354, CO-2354; lives_with filter, P3-2 fixed); "needs" OQ-102 |
| A.4.a non-participant parents of an unmarried minor parent living in the same home | C: CO-909, CO-4660, CO-2000 (CW2-2 fixed; CO-191 passes); P3-1, P3-2 |
| A.4.b parents in the same home attributed to the minor parent's unit | C: CO-909 into CO-910 and CO-923 |
| A.5.a-b sponsor and spouse: earned − min(20%, $175) − support to dependents elsewhere + unearned; rebuttal | C: CO-2365 (CO-2367, CO-2368), CO-2361 |
| A.5.c.1 qualified non-LPR | C: CO-2364 (LPR only) |
| A.5.c.2 adjusted from refugee or asylee | C: CO-2364 |
| A.5.c.3 sponsorship before 12/19/1997; c.7 affidavit other than I-864 | C: is_sponsored_non_citizen is defined as an I-864 sponsorship |
| A.5.c.4 battery or extreme cruelty | C: CO-2364 |
| A.5.c.5 combined income less than 125% FPG for both households | C: CO-2364 (deems at ≥ 125%; CO-2366, CO-4350, CO-4351, CO-2360) |
| A.5.c.6 40 quarters | C: CO-2364 |
| A.5.d recovery from the sponsor | N/A: recovery |
| A.6 disqualified required members: net income deemed | C: CO-910, CO-923, CO-2557 |
| B countable income in the application month and after | C: CO-907, CO-908 |

### 3.605.2 Earned income
| ¶ | disposition |
|---|---|
| A in-kind earned income | C: CO-4360 in CO-1716 |
| B.1-2 diverted or garnished wages; paid when paid; held wages | C: fact convention (wages_gross is gross pay in the month paid) |
| C short-term (≤ 90 days) and subsidized employment not counted unless ended by own fault | C: CO-2340 |
| D.1-2 earned income against the standard after disregards | C: CO-907, CO-922 |
| D.3 HCA payment is earned income to the care provider | C: wages convention; OQ-700 |
| D.4 dependent child not in school: earnings count | C: CO-3385 (only students' earnings excluded) |
| E.1.a business costs; 1-4 exclusions | C: CO-1705, CO-1706 |
| E.1.b day care provider $55 and $22 unless documented costs are greater | C: CO-3376, CO-3377 in CO-1705 |
| E.1.c net profit treated as earned | C: CO-1716 |
| E.1.d ledger as verification | N/A |
| E.2-3 regular income in the month; irregular averaged over 12 months | C: fact convention (CO-1706 precision) |
| E.4.a farm income | C: self-employment facts |
| E.4.b rental income as self-employment at 20 hours a week | C: fact convention (other_unearned_income_taxable is passive rent) |
| E.4.c board-only above the allotment per boarder and costs | **CW3-1** (no fact; CO-4161 is room and meals) |
| E.4.d room-only above documented costs, earned | **GAP, CW3-1 (P1)** |
| E.4.e room and board above the allotment per boarder and costs | C: CO-4361 in CO-1716 |
| F.1-3 donated in-kind services (regular, necessary, would be hired); going rate | C: CO-4360 (meaning states the going rate) |
| G in-kind income for employment at value or market value | C: CO-4360 |

### 3.605.3 Countable unearned income
| ¶ | disposition |
|---|---|
| A (lead-in) any gain or benefit not earned | C: other_unearned facts in CO-908 |
| A.1, A.3, A.7-10, A.12-20 VA, alimony, strike benefits, jointly owned property, lease bonuses, royalties, garnished amounts, loans and inheritances, gifts and prizes, dividends, annuities, disability, workers' compensation, UC, Social Security | C: CO-908 (social_security_income, pension_income, unemployment_income, other_unearned facts, lottery_gambling_winnings_received); a bona fide loan is exempt under B.1 (CO-2341) |
| A.2 rental income above allowable expenses | C: CO-4369 (rental_property_expenses_paid up to the rent) |
| A.4 VA educational and attendance-conditional benefits above school expenses | C: CO-2341 with CO-4661, CO-4662 (CW2-4 fixed) |
| A.5 life insurance above last illness and burial | C: CO-4365 in CO-4369 |
| A.6 health insurance or injury award above medical care | C: CO-4365 in CO-4369 |
| A.11 stepparent and sponsor income | C: CO-2353, CO-2365; sponsor gifts CO-4363 |
| B.1-3, B.5-8 periodic payments | C: CO-908 |
| B.4 workers' compensation less medical, legal and related expenses | C: CO-4366 in CO-4369 |
| B.5 VA pension portion for a dependent counted to the dependent | C: fact convention (stated on the dependent) |
| B.9 SMIB: award counted gross; lump-sum refund exempt | C: CO-4370 in CO-4369 |
| B.10 military allotment; non-recipient's allotment for persons outside the unit above their need | C as unearned; the excess-over-need computation is **CW3-4 (P2)** |

### 3.605.4 Exempt income
| ¶ | disposition |
|---|---|
| A.1, A.1.a tax refunds; EITC in the month and the next | C: tax_refunds_and_credits_received in CO-2341 (the following month is a resource matter); A.1.b N/A (county assistance) |
| A.2 third-party payments for medical care or services | C: not income to the client (fact convention: not stated as received) |
| A.3, A.7 one-time emergency assistance; county General Assistance | C: CO-2341 |
| A.4 energy assistance | C: CO-2341 |
| A.5 personal care and home care allowances | C: CO-2341; OQ-700 |
| A.6 VA Aid and Attendance used for uncovered care | C: CO-2341 |
| A.8 crime victims compensation | C: CO-2341 |
| B.1 bona fide loan | C: CO-2341 (loan_proceeds_received) |
| B.2-3, B.7-8, B.10, B.12, B.14, B.17, B.19, B.23 federal-statute exclusions | C: federally_excluded_payments_received in CO-2341 |
| B.4 home produce | N/A: not stated as income |
| B.5 relocation payments | C: federally_excluded_payments_received (Uniform Relocation Act) |
| B.6 EHAP | N/A: recorded in Notes (CW-22, no current payments) |
| B.9 assistance for items outside the need standard | N/A: recorded in Notes (CW-22) |
| B.11, B.27, B.32 Title IV foster care or kinship, SSI and adoption subsidy recipients excluded with their income | C: CO-2350, CO-2561 (income outside the unit); CO-2341 foster care provider payments |
| B.13, B.16 WIOA training allowances and income | C: workforce_program_payments_received in CO-2341 |
| B.15 Social Security set aside under a plan | C: pass_set_aside_income in CO-2341 |
| B.18 reimbursements | C: CO-2341 |
| B.20-22, B.25 IDA, retirement, health and educational savings distributions | C: savings_account_distributions_received in CO-2341 |
| B.24.a work-study; B.24.b a student dependent child's earnings (full-time employee test) | C: CO-2340, CO-3385; OQ-613 |
| B.26 educational grants, loans, stipends, scholarships | C: CO-2341 |
| B.28-29 refugee resettlement, R&P, CRSP Interim Cash | C: CO-4367 in CO-4369 |
| B.30 insurance cash value taken | C: CO-4368 in CO-4369 |
| B.31 LEAP | C: energy_assistance_received in CO-2341 |
| B.33 exempt income as a lump sum; amounts for legal fees, medical bills, funeral and burial, taxes | C: CO-4365 in CO-4369 |
| B.34 tax credits identified as exempt | C: CO-2341 |
| B.35 subsidized employment wages | C: CO-2340 |

### 3.605.5 Child support income
| ¶ | disposition |
|---|---|
| A at application counted for eligibility | C: CO-2553 in CO-908 |
| B excluded from the grant once eligible | C: CO-2554 |
| C.1 at redetermination, consistent only if received in 6 of 6 months | C: CO-2550, CO-2556 |
| C.2 averaged; $500 or less disregarded; over $500 counted | C: CO-2551, CO-2552, CO-2555 (over $500) |
| C.3 disregarded in the grant | C: CO-2554 |
| D arrears exempt | C: CO-2553, CO-2551 (less arrears) |

### 3.606.1-3.606.2 Standards, computation, disregards
| ¶ | disposition |
|---|---|
| 3.606.1.A-D county limits, UPA, client's right to decide, vendor payments | N/A |
| E six-month certification; income in the application month and through the period | C: CO-1501 (first certification), CO-2375; the month evaluated from its own facts |
| F need and grant standards chart (three rows, 0-10 children, +67 or +90) | C: CO-274 to CO-277, CO-351 to CO-354, CO-911, CO-912, CO-926, CO-927; three or more caretakers OQ-101; dates from July 1, 2028 OQ-530 |
| G $10 pregnancy allowance through the month the pregnancy ends | C: CO-355 in CO-1260 |
| H, J.1-4 income against the need standard ("not exceed" vs "equals or exceeds") | C: CO-913 (strict <); OQ-153 |
| I.1-3, K.1-2 grant = grant standard − net countable income; drop cents | C: CO-1260, CO-914 |
| 3.606.2 (lead-in) disregards not for disqualified individuals | C: CO-910, CO-923 |
| A.1 $90 at application for eligibility; 100% in the first certification period; 67% after | C: CO-273, CO-907, CO-922, CO-1501, CO-350 |
| A.2.a-b new source 100% for its first certification period; current source 67% | C: CO-1502, CO-2374, CO-1503, CO-922 |

### 3.606.3-3.606.5 Changes, redetermination, county moves
| ¶ | disposition |
|---|---|
| 3.606.3 change reporting and effective dates | N/A: recorded out of scope in Notes (CW-17); a month is evaluated from its own facts |
| 3.606.4 redetermination procedure | C where it changes a figure (CO-2375 for child support and the factor); otherwise N/A: procedure |
| 3.606.5 county moves | N/A: administration |

### 3.606.6 Time limits
| ¶ | disposition |
|---|---|
| A 60 cumulative months for units containing an adult; months count for adult members whether or not eligible | C: CO-278, CO-915, CO-918, CO-924 |
| B partial payments under a sanction count | C: CO-840 (system count) |
| C unit containing an individual with 60+ adult months is ineligible unless extended; units with disqualified members cannot be extended | C: CO-918, CO-925 (reads CO-928) |
| C.1-7 extension procedure, up to six months, renewal | C: the extension findings CO-846, CO-847; procedure N/A |
| D.1-4, E hardship and domestic violence criteria | C: CO-847, CO-846 (county findings) |
| F Indian Country months | C: CO-1723 in CO-915 |
| G 20% statewide allocation | N/A: state monitoring |

### 3.606.7 Funeral, burial and cremation
| ¶ | disposition |
|---|---|
| A.1-2 death reimbursement, $1,500 maximum | C: CO-1505, CO-1507, CO-1508 |
| A.3 no certificates for certain burials | N/A |
| B.1-4 deceased client who received assistance; estate insufficient; authorization; charge limit | C: CO-1504, CO-1507, CO-1506 |
| C.1-17, D items of disposition, arrangements | N/A: items the charges stated may include |
| E limitation of total charges | C: CO-1506 |
| F.1, F.2.a-b method of disposition, procedure | N/A: procedure |
| F.2.c responsible persons' resources and voluntary contributions | C: CO-1508, CO-4373; OQ-354 |
| F.2.d-f prepaid plot, SS lump sum, insurance | C: CO-1508; OQ-354 |
| F.2.g non-responsible contributions do not reduce | C: CO-4373's meaning excludes them |
| F.3, G unclaimed bodies, provider agreements | N/A |

### 3.606.8 Diversion and other assistance
| ¶ | disposition |
|---|---|
| A.1-3 no long-term need; specific need; agreement | C: CO-1266, CO-1267, CO-1270 |
| A.4-5 POI; county may end it or grant BCA | C: CO-1269 in CO-921 and CO-1270; the POI bound OQ-252 |
| A.6 needs-based; eligible for BCA or the county's higher limit; no assignment, no time-limit count | C: CO-1270, CO-1268, CO-2559, CO-2560; cap OQ-531; county limit OQ-252 |
| A.7 no diversion in a month of BCA | C: CO-1270 (no CW cash received) |
| B supportive payments and referrals; C-D other assistance, family needs payments | N/A: county services (not a cash eligibility or grant) |

### 3.607-3.608 Workforce development and sanctions
| ¶ | disposition |
|---|---|
| 3.607.1.A.1-2 work eligible | C: CO-919 |
| 3.607.1.B.1-3 not mandatory (minor parent not head; ineligible non-citizen; SSI) | C: CO-919 |
| 3.607.1.C hardship or good cause | N/A: participation planning |
| 3.607.2-3.607.4 screening, assessment, condition agreement | N/A: procedure |
| 3.607.5 Individualized Plan; closure without participation before the first IP | C: CO-4353 (demonstrable_evidence) |
| 3.608.1-3.608.2 case management, work activities, hours | C: CO-920, CO-1745, CO-2885, CO-280 to CO-282, CO-3044 (participation is not an eligibility condition); OQ-104 |
| 3.608.3 re-engagement and good cause | C: sanction level supplied (CO-1261) |
| 3.608.4.A-B other counties' sanctions served; other States' not recognized | C: CO-1261 (county finding) |
| C.1 $1, then 25% of the grant payment; one month per level | C: CO-1262, CO-1263, CO-1265 (partial month OQ-831) |
| C.2 fourth level: 100%, closure | C: CO-1265, CO-921 (sanction_closure) |
| D-F serving, progression, one level per case | C: CO-1264 (highest level in the unit) |
| G re-engagement | N/A: county procedure |
| 3.608.5 appeal | N/A |

### 3.609 Notice, payments, overpayments, IPV, hearings
| ¶ | disposition |
|---|---|
| 3.609.1 notice | N/A |
| 3.609.2.A issuance schedule | N/A |
| A.1 initial payment from the date of application, or the later eligibility date | C: CO-4358, CO-4359; **CW3-3 (P1)** for months before the eligibility month |
| A.1.a-d partial month table | C: CO-4355, CO-4358, CO-914 |
| A.1.e deductions; under $10 not paid; under $1 not paid | C: CO-914, CO-4356, CO-4357, CO-1265 |
| A.2 prospective determination | C: month evaluation |
| B overpayments | N/A: recovery |
| C.1-3 death before or on the first of the month | C: CO-921 (ineligible_deceased) |
| D drop cents | C: CO-914 |
| E-F use of the grant, holding payments | N/A |
| G underpayments; a retroactive payment is not income | C: CO-4371 in CO-4369 |
| H lost or stolen payments | N/A |
| J.1-4 EBT misuse: warning, card disabled, one-month denial or discontinuance | C: CO-4353 (continued_ebt_misuse) |
| 3.609.3-3.609.4 overpayments and recovery | N/A: recovery |
| 3.609.5 IPV and fraud procedure | C: the disqualification result CO-1730; procedure N/A |
| 3.609.6-3.609.74 dispute resolution, appeals, hearings, protections, non-discrimination | N/A |
| 3.609.75, 3.609.751 optional noncustodial parent programs | N/A: services, no cash eligibility |

Matrix size: 239 paragraph rows. They have 2 GAP rows (E.4.c-d, both under CW3-1) and 2 P1 mismatch rows (L.1's Adult Financial reader, CW3-2; A.1's initial payment, CW3-3). Every other row is carried, not applicable, or covered by an open question or a recorded deferral.

## 4. Open-question confirmations (Colorado Works)

| OQ | class | confirmation |
|---|---|---|
| OQ-101 | state policy choice | 3.606.1.F has no row for three or more caretakers. Confirmed (P3-3: a stale sentence) |
| OQ-102 | state policy choice | A.4.a names no figure for "needs". Confirmed; the persons counted are now settled (CW2-2 note) |
| OQ-104 | state policy choice | No monthly-hour equivalent in D-81. Confirmed |
| OQ-153 | state policy choice | H "not exceed" vs J.4 "equals or exceeds" are both in D-81. Confirmed |
| OQ-252 | state policy choice (defaults, county options) | A.4's POI bound and A.6's county limit are county matters. Confirmed |
| OQ-354 | state policy choice | F.2.b-f state no order of application. Confirmed; CO-4373 is named |
| OQ-376 | partly resolved | The Colorado Works half is resolved (Rule 5 incorporated as of Mar. 2, 2021). Confirmed |
| OQ-530 | blocked on a named document | The SFY 2028-29 standards are set from SSA COLAs not yet announced, on no allowed host. Confirmed |
| OQ-531 | blocked on a named document | The Colorado TANF State Plan is not on an allowed host (sos, ecfr, govinfo, cornell, medicaid, cms, fns and leg.colorado.gov do not serve it). Confirmed |
| OQ-611 | state policy choice | 3.604.2.E-I are silent on shorter unlisted absences. Confirmed |
| OQ-613 | state policy choice | No definition of full-time employee. Confirmed |
| OQ-660 | state policy choice | O.2's thirty days and last words, and M's list. Confirmed |
| OQ-700 | state policy choice | A.5's scope. Confirmed |
| OQ-770 | state policy choice | Ten days (K.1.c) vs eleven (I.2, 3.604.3.A.2). Confirmed |
| OQ-771 | state policy choice | A.1 does not say how two months combine. Confirmed |
| OQ-772 | state policy choice | J states no bar. Confirmed |
| OQ-830 | state policy choice | N.3.b leaves approval to county policy. Confirmed |
| OQ-831 | state policy choice | C.1 and A.1.e name no base for a percentage in a partial month. Confirmed |

No open question is misclassified.

## 5. Earlier P1s (re-checked at 1743a1d)

`npm run check -- --volume co` passes, including the stored repro households. I also re-read each fix's items.

| earlier P1 | status |
|---|---|
| CW-1 diversion POI | fixed: CO-921 ineligible_diversion_period (CO-1269) |
| CW-2 minor parent assisted as adult | fixed: CO-4352 in CO-926 and CO-927; CO-160 passes |
| CW-3 time limit for every member | fixed: CO-915; CO-161 passes |
| CW-4 2021 poverty guidelines | fixed: CO-4350 and CO-4351 match D-295; CO-162 passes |
| CW-5, CW-6 deemed parents not in the unit, in the same home | fixed: CO-4660 in CO-909; CO-163 passes |
| CW-7 adult relative or caretaker | fixed, as narrowed by CW2-1: CO-906; CO-164 and CO-190 pass |
| CW-8 partial initial month | fixed for the month containing the start date; **CW3-3** is new and covers an earlier month |
| CW-9 lottery, sponsor gifts, in-kind earnings | fixed: CO-908 and CO-2554, CO-4363, CO-4360 |
| CW-10 room and board | fixed for E.4.e; **CW3-1** is new (E.4.c-d) |
| CW-11 refused potential income | fixed: CO-4362 |
| CW-12 status verification not provided | fixed: CO-4372 in CO-2351 and CO-2561 |
| CW-13 county closures | fixed: CO-4353 |
| CW-14 unearned income deductions | fixed: CO-4369 |
| CW2-1 unrelated caretaker not joining | fixed: CO-906; CO-190 passes |
| CW2-2 deemed parents' needs | fixed: CO-2000 reads CO-4660; CO-191 passes |

## 6. Reproducing households

Built in a scratch copy of HEAD 1743a1d from CO-160: p1 is the mother and p2 her baby, with the application on 2026-10-12. Each case was appended to the scratch `volumes/co/tests/cases.yaml` and evaluated with `npx vite-node scripts/eval-case.ts co <id> ...`.

| case | finding | key facts | model | rule |
|---|---|---|---|---|
| ZT-1 | CW3-1 | $400 room-only, entered as rent (other_unearned_income_taxable) | unearned $400 ≥ $331, ineligible_income, $0 | earned: $310 < $331, eligible, $320 (Oct) |
| ZT-3 | control | $400 wages | $310, eligible, $320 | same |
| ZT-2 | CW3-1 | $600 room-only, entered in room_and_board_payments_received, 1 payer | earned $294, countable $204, eligible, $320 | $510 ≥ $331, ineligible_income |
| ZT-6 | control | $600 wages | $510, ineligible_income | same |
| ZT-4 | CW3-2 | adult mother (born 1990) with a Colorado Works IPV disqualification, $1,500 wages | p1 ineligible_disqualified, p2 ineligible_income; af_barred_by_colorado_works p1 **true** | unit otherwise ineligible (F.2.c): no bar |
| ZT-5 | control | ZT-4 without the IPV | ineligible_income; af_barred false | same |
| ZT-7 | CW3-3 | application 2026-09-25; cw_unit_eligible_from_date 2026-10-03 | Sep: factor 1, $488; Oct: .95342, $465 | Sep: $0; Oct: $465 |
