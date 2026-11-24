# Coverage matrix: Adult Financial (OAP, AND-SO, AND-CS, Home Care Allowance, burial, disaster assistance)

Reviewer: independent coverage pass under docs/plan-colorado.md's stopping rule. This pass is exhaustive, not sampled: every numbered paragraph of the governing texts is mapped below.
Commit reviewed: built and probed on `5fc915b`; re-checked against `d5e69af` (HEAD when this file was written). The only commits in between are Medicaid, CHP+ and UI changes, and no Adult Financial item changed. Date: 2026-11-22. This file is the only repository file written. Nothing is committed.

Governing texts:
- 9 CCR 2503-5 (D-80), rule version 12428, effective 03/02/2026. Confirmed current on sos.state.co.us on 2026-11-22: the ruleinfo page (ruleId 3144) lists 03/02/2026 (eDocket 2025-00587) as the "Current version". The archived version 10320 (effective 08/30/2022) was also fetched from the same host for F-16.
- C.R.S. 26-2-111 and 26-2-111.8 (D-59).
- The 20 CFR 416 provisions D-80 incorporates: 416.1124 (D-207), 416.1856 (D-262), 416.405-415, 416.1205 and 416.2095-2099.

Tools:
- `npm run export -- --volume co` was run in a scratch copy (`git archive HEAD`). It wrote 1,887 items to the scratch ledger.
- `scripts/eval-case.ts` was run on CO-94, CO-120, CO-130 and CO-131, and on nine scratch households (PR-ABS, PR-ISM, PR-PNA, PR-APART, PR-PTC, PR-RENT, PR-LUMP, PR-IMD and PR-SPON). They are kept, with the full scratch cases file, at /tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/af-probe-cases.yaml. Each one runs on a determination date of 2026-10-01.

## 1. Verdict

**16 P1 found.** The Adult Financial family does not yet meet the stopping rule.

Most of the P1s sit in parts of 9 CCR 2503-5 that no earlier review mapped:
- the resource valuation and exemption rules (3.520.73, 3.520.741, 3.520.742, and 3.520.77.C-F and J-M);
- the remaining income-type rules (3.520.782.B, 3.520.784, and 3.520.785.B.1.a, 9, 12-16 and 20);
- the absence presumptions of 3.520.64.E;
- the sponsor obligation's end (3.520.69.B);
- the IPV and EBT bars (3.581.I and 3.583.N).

One P1 is a stopping-rule failure: OQ-553 says no published rule settles a question that an archived text on an allowed host answers. Ten P1s were reproduced with the engine; six rest on the text alone, because no fact exists to state the case.

All of the earlier P1s spot-checked stay fixed (section 5).

## 2. Findings

| id | sev | paragraph | item(s) | governing text (quoted) | what is wrong | proposed fix |
|---|---|---|---|---|---|---|
| F-1 | **P1** | 3.520.64.E.1-4; 3.570.17.C.8.b | af_meets_residency CO-942 (read by CO-953, CO-1203, CO-1217) | E: "A client who is out of State temporarily shall be considered a resident, with the following exceptions: 1. A client who leaves the country for a period of thirty (30) or more consecutive days creates a rebuttable presumption ... that the client shall no longer be considered a resident and shall be ineligible ... 2. ... leaves the State for a period of ninety (90) or more consecutive days ... An exception to this is for individuals temporarily out of the State to receive documented medical treatment. 3. ... more than one hundred eighty (180) days in any calendar year ... 4. ... to care for an immediate family member injured in the line of military duty for ... one hundred eighty (180) or more consecutive days". HCA, C.8.b: "Clients who leave the State on a temporary basis with the intent to return to Colorado within thirty (30) calendar days shall not be discontinued. If the client fails to return ... discontinued on day thirty one (31)." | No Adult Financial item reads an absence. CO-942 reads only `state_of_residence`, which is the State the person "lives and intends to remain" in. `temporarily_out_of_state_start_date` (CO-3806) exists for Colorado Works but has no Adult Financial reader (ledger `used_by`). **Probe PR-ABS**: an OAP client with $600 of Social Security who left on 2026-06-01, 122 days before the determination, not for medical treatment, gets af_meets_residency true, oap, and a grant of **$452**. The rule presumes the client is not a resident, so she is ineligible unless she rebuts the presumption. HCA's own 30-day limit is not carried either. | In CO-942, read the absence start date, the absence reason (medical treatment), an out-of-country flag, the days out of State in the calendar year, and a county finding that the presumption was rebutted. Apply E.1-4, and C.8.b's 30 days for HCA in CO-1217. Add a case like PR-ABS. |
| F-2 | **P1** | 3.520.69.B.1-6, C.1 | af_deemed_sponsor_income CO-2386, af_countable_resources CO-947, is_sponsored_non_citizen CO-1573 | B: "Sponsors are expected to meet their financial commitments ... until such time as the: ... 2. Qualified non-citizen has worked, or can be credited with forty (40) qualifying quarters of coverage under Title II ...; 3. ... leaves the United States ...; 5. Sponsor of the qualified non-citizen dies ...; 6. ... removal proceedings ... new grant of admission". C.1: "Sponsor deeming shall not apply to qualified non-citizens admitted as refugees or as political asylees." C.R.S. 26-2-111.8(3.5): repayment "during the time that the sponsorship affidavit of support is in effect". | CO-2386 and CO-947 deem from every I-864 sponsor of a non-citizen client. Nothing tests the end of the obligation or the refugee/asylee exemption. SNAP (CO-2337) and Colorado Works (CO-2364) read `qualifying_quarters`, `sponsor_has_died` and `status_before_lpr_adjustment`; Adult Financial reads none of them. **Probe PR-SPON**: an OAP client who has been an LPR since 2010 with 40 qualifying quarters, whose sponsor earns $4,000, has $3,006 deemed, so the category is none. Under the rule the obligation has ended, nothing is deemed, and the category is oap ($452). | Add `af_sponsor_deeming_applies`. Make it false when the client has at least federal_qualifying_quarters_threshold quarters, the sponsor has died (with the joint sponsor's obligation kept, B.5), or the client adjusted from refugee or asylee status. Read it in CO-2386 and in CO-947's sponsor term. |
| F-3 | **P1** | 3.534.A-C, 3.544.D-F, 3.549.C-D; 3.520.63.D | af_deemed_relative_income CO-2384 | 3.534.A: "the amount of income to deem to a client from a the client's spouse who does not meet the criteria described below in 'C'"; 3.534.B.3: "each dependent child living in the household of the spouse"; 3.520.63.D: "Clients who are not legally separated or divorced are considered married." No paragraph of 3.534, 3.544 or 3.549 limits spouse deeming to a spouse who lives with the client. | CO-2384 deems only from a relative who `lives_with` the client (precision: "Deeming reads a spouse or parents in the home"). For resources, CO-2389 reads the same text the other way: "The spouse of the case wherever the spouse lives ... with no living-together condition". No open question records the income reading. **Probe PR-APART**: an OAP client with $600 of Social Security whose husband (not legally separated, not on AF, SSI or Medicaid) lives in another home and has $3,000 of Social Security. The volume deems 0, gives oap, and pays **$442**. By the text, 3,000 - 1,032 = $1,968 is deemed, and the category is none. | Deem from the spouse wherever the spouse lives, as CO-2389 does. Keep parents to the AND-CS child's home (3.549.E). If the program office holds the SSI living-together reading, record it as a state-policy-choice open question and say so in CO-2384. |
| F-4 | **P1** | 3.548.F | af_and_grant CO-952, af_resides_in_care_facility_thirty_consecutive_days CO-1510; OQ-352 | "The AND-CS Personal Needs Allowance maximum shall be seventy-nine dollars ($79) ... The AND-CS grant shall not be reduced until the month following the first full calendar month that the client is a resident in an approved facility." | CO-1510 is true in the first full calendar month, and CO-952 then pays the PNA. OQ-352 part (2) and CO-952's precision say the lag "is carried by that meaning", but CO-1510 is now derived from `institution_entry_date`, so that is no longer true. **Probe PR-PNA**: an AND-CS client, 30, with $500 of SSI, entered a licensed nursing facility on 2026-09-15. For October, the first full calendar month, the volume pays **$0** (79 - 500). The rule leaves the grant unreduced: 994 - 500 = **$494**. | For AND-CS, apply the PNA from the second full calendar month: entry on or before the first day of the previous month. Correct OQ-352 (2) and CO-952's precision, and add the probe as a test. |
| F-5 | **P1** | 3.520.79.B.3; 3.510 "Homeless" | af_in_kind_support_and_maintenance CO-1512 | 3.510: "'Homeless' means a person with no permanent living arrangement ... He or she is neither a member of a household nor a resident of an institution. This can mean someone who sleeps in a doorway; supervised shelter ...; a halfway house ...; a place not designed for ... sleeping ...; or a person who stays with a succession of friends or relatives and has no permanent living arrangement." | CO-1512 treats `shared_housing_due_to_loss_or_hardship` as homeless, so there is no ISM. That option means "staying in another person's home because of the loss of housing, economic hardship or a similar reason". It is the usual ISM case: an older client living rent-free with family. It is not "a succession of friends or relatives ... no permanent living arrangement". (The motel and campground options are arguable; the 3.510 list is illustrative.) **Probe PR-ISM**: an OAP client with $600 of Social Security, living rent-free in her daughter's home after losing her apartment ($1,200 of household shelter costs at market value). The volume gives ISM 0, countable income 580, and a grant of **$452**. Under the rule the ISM is $351 (C.3), countable income is 600 + 351 - 20 = 931, and the grant is **$101**. | Read homelessness from 3.510's own list: shelter, halfway house, a place not designed for sleeping, and a stay with a succession of others with no permanent arrangement. Add a fact for the last if the options cannot state it. Do not map shared housing for hardship to homeless. |
| F-6 | **P1** | 3.520.77.D.1.b, E, F, J, K, L, M; 3.520.786.A (second sentence) | af_person_countable_resources_other_than_life_insurance CO-4000 | J: "Any retroactive SSI or Social Security retirement or disability benefits still remaining after the month of receipt shall be exempt as a resource for nine months". K: "An income tax refund, including the Property Tax/Rent/Heat Credit (PTC) rebate, shall be exempt in the month received. Any remaining balance shall be counted as a resource after twelve (12) months." L: "Monies from a bona fide loan are exempt in the month received." M: "Monies specifically placed in an Achieving a Better Life Experience (ABLE) Account". E: insurance proceeds used to restore an exempt resource, for 3 or 6 months. F: home sale proceeds for a replacement home, for 6 months. D.1.b: "cash and convertible assets considered necessary for use in the trade or business shall be excluded". | CO-4000 counts all of `liquid_resources_value`, which includes "a lump sum still held". None of these holdings is subtracted. `federal_tax_refunds_held_value` (CO-4172) and the retroactive-benefit facts exist, but Adult Financial reads none of them. No fact states the PTC rebate held, ABLE funds, insurance or home-sale proceeds held, or business cash. **Probe PR-PTC**: an OAP client with $2,200 of savings, $500 of it a refund received in August, gets countable resources 2,200, so the category is none. Under the rule, 1,700 is countable and the category is oap. PTC rebates are common among OAP clients. | Add the held-exempt parts of liquid resources, each a part of `liquid_resources_value` dated by receipt where the rule gives a period (12 months for refunds including PTC; 9 months for retroactive SSA benefits; the month of receipt for loans; 3 or 6 months for proceeds; ABLE always; business cash), and subtract them in CO-4000. |
| F-7 | **P1** | 3.520.77.D.1.c, D.3, D.4; C.1; 3.520.72.B.1, B.3-4 | CO-4000; real_property_other_than_home_equity CO-3393, vehicles_equity_value | D.4.a: "If a client owns non-business, income-producing property, a maximum of six thousand dollars ($6,000) of the equity value of such property is an exempt resource, as long as the property produces a net annual income of at least six percent (6%) ... only the equity value above $6,000 will be counted". D.3.a: non-business property producing goods for the client's own consumption, "A maximum of six thousand dollars ($6,000) ... Any equity value in excess of $6,000 shall be a countable resource." D.4.c: the whole equity counts if the return is under 6%. | The neutral holdings facts leave out everything "used to produce income" (CO-3393's meaning; `vehicles_equity_value` likewise). Adult Financial reads nothing else. So a rental house, land rented out, or a large subsistence property counts **0**, where the rule counts all of the equity over $6,000 (or all of it under the 6% test). No fact exists to state such property, so no household can reproduce the answer the rule gives. The D.1.c and D.3.c 12- or 24-month continuation of the exemption is not carried either. | Add a neutral fact for the equity of non-business income-producing property and its net annual return, and one for non-business property producing goods for home use. Apply the $6,000 cap and the 6% test in CO-4000. Leave trade or business property exempt (D.1, D.2, D.5). |
| F-8 | **P1** | 3.520.73.B.1; 3.520.741.B.2-3, D.2-4; 3.520.742.C.1-3 | CO-4000; retirement_accounts_value CO-3392; CO-3393 | 3.520.73.B.1: "a. The gross value of the account, less any taxes due, is the amount that is countable ... b. If the client is not able to provide the amount of taxes that are due, the value shall be determined by deducting 20% from the gross value". 3.520.741.D.3: "If the client ... cannot sell the property for two-thirds of the actual value, the property shall be exempted provided there continues to be reasonable efforts to sell"; D.2: co-owner undue hardship; D.4: "If the property interest cannot be disposed of because of legal technicalities, the ... equity value is not a countable resource." 3.520.742.C: the same for personal property. | CO-4000 counts `retirement_accounts_value`, "the value the person could withdraw", in full. Neither the deduction for taxes nor the 20% default is applied. A client with a $2,400 IRA and no tax figure has $1,920 countable under the rule, below the $2,000 limit, but $2,400 in the volume, which is over it. The real- and personal-property exemptions for property not saleable at two-thirds of value, co-owner hardship and legal impediment are not carried. The holdings facts state equity with no such exemption, and Adult Financial reads none of the Medicaid sale-effort facts (CO-2242, CO-2244). | Add `retirement_accounts_taxes_due` (unstated means 20% of the gross) and subtract it for Adult Financial. Add a neutral "excluded as unsaleable or legally restricted" part of real and personal property, with the county's finding, and subtract it in CO-4000. |
| F-9 | **P1** | 3.520.72.B.12, B.13 (a-c); 3.520.71.A.3, H, H.1-2; 3.520.61.H | CO-4000, CO-947; (no item for potential resources) | B.13: "Trusts, both revocable and irrevocable, will be countable as resources or income according to the guidelines of SSA ... a. When all or a portion of the corpus of a trust, cannot be paid to or for the benefit of the client, the portion that cannot be paid is considered a transfer of resources ... and a penalty shall be assessed as outlined in Section 3.520.76.D. b. Refusal of a trustee to make payments ... the full amount of the trust shall be considered available". B.12: "The estate and all resources identified in the estate inventory for a client adjudicated incapacitated by a court." H.1: "If the client or legal fiduciary refuses or fails to make a reasonable effort to secure potential resource(s), such resource(s) shall be considered as if available to the client". H: "Grant payments shall not be approved prior to verification of the attempt to sell, liquidate, or legally acquire a resource". | No Adult Financial item reads a trust. `has_trust_interest` (CO-1577) has no Adult Financial reader, and no fact gives a trust's corpus or its non-payable part. A client with a $50,000 revocable trust is resource-eligible. Potential resources are not carried, though 3.520.71.G's potential income is (CO-3861, FC-9): there is no "potential resource refused" fact and no proof-of-pursuit element. B.12 has no fact. | Add the trust corpus available to the client and the non-payable part (the second as a TWFC value for the month the trust was funded, through CO-3835). Add `af_refused_potential_resources`, counted in CO-4000, and a proof-of-pursuit element read in CO-1436. Name the incapacitated-client estate in the holdings facts' meaning, or add a fact for it. |
| F-10 | **P1** | 3.520.782.B, B.1-2; 3.520.784.A-B; 3.510 "Earned Income" | af_gross_earned_income CO-3830 | 3.510: "'Earned Income' means payment in cash or in-kind". 3.520.782.B: "In-kind earned income is non-monetary benefits received for services performed ... such as shelter as payment for building maintenance ... 2. The amount ... shall be the value of the item supplied." 3.520.784.A: donated work hours "shall be considered countable earned income when the work: 1. Is regular and scheduled; and, 2. Is a necessary service; and, 3. If not performed by the client ... someone would have to be hired ...; and, 4. Is greater than five (5) hours per week." B: valued at "The going rate in the community for similar work; or, 2. The current minimum wage standard, whichever is greater." | CO-3830 reads `wages_gross`, which is "gross wages, salaries, tips, commissions and bonuses", plus self-employment profit. Neither in-kind earned income nor donated work is stated or counted. An OAP manager housed rent-free in exchange for maintenance, or a client giving ten hours a week to a relative's business, has $0 of earned income in the volume. | Add `in_kind_earned_income_value` and an Adult Financial donated-work item (hours a week, whether the four tests are met, the community rate), with the minimum wage as a dated parameter. Count both in CO-3830 before the $65 and the halving (3.520.782.B.1). |
| F-11 | **P1** | 3.520.785.B.20, B.9, B.14, B.15, B.16; 3.520.781.G.2.e | af_unearned_income_other_than_ssi CO-3831 | B.20: "Rental income is countable to the extent it exceeds allowable expenses. Allowable expenses are maintenance, taxes, management fees, interest on mortgage, and utilities paid". B.9: workers' compensation "Payments for medical, legal, or related expenses ... are deducted". B.14: life insurance proceeds "to the extent that they exceed the amount expended ... for ... last illness and burial". B.15: health insurance or personal injury proceeds beyond medical care. B.16: G.I. Bill "to the extent that they exceed expenses necessary for school attendance". | Rent from property the client does not manage is in `other_unearned_income_taxable` gross, and CO-3831 counts all of it. No Adult Financial item deducts rental, workers' compensation, insurance or G.I. Bill expenses. **Probe PR-RENT**: an OAP client with $600 of Social Security and $800 of rent ($500 of allowable expenses) has countable income 1,380, so the category is none. Under the rule, 600 + 300 - 20 = 880, and the grant is **$152**. | Add an Adult Financial expense fact for each of these sources (rental expenses first) and subtract it in CO-3831. Or add one "allowable expenses offset against unearned income" fact whose meaning lists B.9, B.14-16 and B.20. |
| F-12 | **P1** | 3.520.785.B.1.a, B.12, B.13, B.14-15, B.18 | CO-3831 | B.1.a: SSA "Lump sum payments shall be counted as income in the month received". B.12: "Inheritance." B.13: "Gifts and prizes." B.18: "Lease bonuses ... are income in the month received." | `lump_sum_received` (CO-3367: "a retroactive lump-sum Social Security, SSI ... payment; a lump-sum insurance settlement; an inheritance; or a similar one-time payment") and `lottery_gambling_winnings_received` (CO-1181) are not read by any Adult Financial item (ledger `used_by`). The other unearned-income facts take only income "that no other income fact names". **Probe PR-LUMP**: an OAP client with $600 of Social Security inherits $5,000 in October. The volume gives countable income 580, oap, and **$452**. Under the rule, 5,580 counts and the category is none for October. | Count `lump_sum_received` (less any part 3.520.786 or K excludes, such as retroactive SSI) and `lottery_gambling_winnings_received` in CO-3831 in the month received. The held remainder then follows F-6 (J's nine months for SSA lump sums). |
| F-13 | **P1** | C.R.S. 26-2-111(1)(d), (2)(a)(III) | af_meets_residency CO-942, af_and_so_eligible CO-1203, af_category CO-953 | 26-2-111(1): "No person shall be granted public assistance in the form of assistance payments under this article unless ... (d) The person is not an inmate of a public institution, except as a patient in a public medical institution, or is not a patient in any institution for tuberculosis or mental diseases, or is not a patient in any medical institution as a result of having been diagnosed as having tuberculosis or psychosis; but the provisions of this paragraph (d) shall not be applicable to ... the class of old age pension recipients provided for in subsection (2)(a)(III)". | CO-942 applies only 3.520.61.B's correctional bar. The statute also bars an AND client who is a patient in an institution for mental diseases or TB, or in a medical institution for psychosis. 3.543.D and 3.548.D give AND no psychiatric-facility PNA, unlike OAP's 3.532.D.3. The volume's own principle (OQ-430: "a rule's silence ... cannot narrow a statutory bar") applies, and no open question records another reading. **Probe PR-IMD**: an AND-SO client in a State psychiatric hospital since August is and_so and paid **$248**. | Bar AND-SO and AND-CS for a patient in an IMD or TB institution, or in a medical institution for psychosis, with a statute_override naming 26-2-111(1)(d). Keep OAP under (2)(a)(III). Or record the conflict as a needs-Legal open question. |
| F-14 | **P1** | 3.583.N.1-4; 3.581.I.3-4; 3.545.A.2; 3.520.4.C.5.a | af_category CO-953, af_and_so_eligible CO-1203 | 3.583.N.2.c: "The disqualification shall be in effect for twelve (12) months upon the first occasion of any such offense; twenty-four (24) months upon the second ...; and permanently upon the third". N.3: "The disqualification penalizes only the individual(s) found to have committed an IPV". 3.581.I.3: continued EBT misuse: "deny or discontinue the grant payments and impose a one month ineligibility period". 3.545.A.2: "As a condition of eligibility for AND-SO the client shall be required to sign the IM-14 ... at application and at least annually". 3.520.4.C.5.a: "If the client refuses to sign any required forms, the case shall be denied or discontinued". | None is modeled or recorded. The IPV facts in the volume are SNAP's (snap_is_serving_ipv_disqualification, CO-039) and Colorado Works' (cw_is_serving_ipv_disqualification); no Adult Financial item reads either, or one of its own. An Adult Financial client serving a 12-month IPV disqualification, or a one-month EBT-misuse period, or an AND-SO applicant who refuses to sign the IM-14, is found eligible. | Add Adult Financial bars: an IPV disqualification period (the offence count and the start month from the ADH or waiver), an EBT-misuse ineligibility month, and, for AND-SO, the signed IM-14 (or fold it into CO-2004's duty). Read them in every CO-953 branch, in CO-1203, and for the IPV bar in HCA. |
| F-15 | **P1** | 3.520.72.E; 3.520.75.A, D, E.4, F.4; 3.520.741.C-D and 3.520.742.C-D (sponsor references); 3.520.73.B.1.a | af_sponsor_countable_resources CO-2390; af_countable_resources CO-947 (assumption) | 3.520.72.E: "Resources are attributed to the sponsor in the same manner as the non-citizen client, as outlined in Section 3.520.7." 3.520.75.E.4 and F.4: "Sponsor(s) are allowed the same exemptions." D: "Sponsor(s) are allowed the same exemption." | CO-2390 counts each sponsor's resources by the SSI method (`ssi_countable_resources_individual`, CO-800), not by Adult Financial's own count (CO-4000 and CO-4001/4002). The two differ for the cases this text names. A sponsor's old life-insurance policy (CSV $5,000, face over $1,500, bought before the 48 months) is exempt for an OAP client's sponsor under E.4, but CO-800 counts the whole cash value. Revocable burial trusts and contracts over $1,500, and burial spaces beyond the family's needs, count under Adult Financial but are absent from CO-800. The deemed excess, and so the client's eligibility, changes. CO-947 still carries an `assumption` (R-11) saying Adult Financial's figures "are taken to equal the SSI-method figures" and that a sponsor's resources are "not modeled (OQ-392)". That contradicts its own precision and CO-2390. | Count each sponsor with CO-4000, plus life insurance under the client's program (CO-4001/4002), as CO-2389 does for a spouse. Delete CO-947's stale assumption. |
| F-16 | **P1** (stopping rule) | 3.534.D.2.C, 3.544.G.2.c, 3.549.G.2.c | OQ-553; af_deemed_sponsor_income CO-2386 | 3.534.D.2.C: "for each person who is a dependent of the sponsor (other than the non-citizen client and the non-citizen client's spouse), as defined in Section 3.520.68.B.2.b.1." The archived rule on sos.state.co.us (ruleVersionId 10320, effective 08/30/2022, fetched 2026-11-22), 3.520.68.B.2.b.1: "the household includes ... the sponsor(s), the spouse of the sponsor(s), and the sponsor(s)' dependent children, i.e., the children the sponsor(s) claim on his or her income tax." | OQ-553 says 3.520.68 "in the current rule (D-80) and in the earlier Cornell copy (D-62) has only paragraph A ... No published rule settles who is a dependent". An allowed host serves the version the cross-reference was written for, and it answers the question: the narrower, tax-claimed-children reading that the OQ itself names as the alternative. The volume instead counts every other non-citizen the same sponsor sponsors. In **CO-94** (a sponsor's niece and nephew, not her children), each child has 715 deemed. On the archived definition, the other sponsored child is not a dependent: 3,200 - (994 + 497 + 497) = **1,212** each. The open question is misclassified. | Record the archived 3.520.68.B.2.b.1 in documents/sources (version 10320 from sos.state.co.us), and re-decide OQ-553 against it: dependents are the sponsor's children claimed for tax. Drop the "other sponsored non-citizens" term from CO-2386 unless they are such children. Update CO-94. |
| P2-1 | P2 | 3.520.785.B.10 against 3.520.786.K (20 CFR 416.1124(c)(22)) | af_excluded_unearned_income CO-2343 | B.10: countable unearned income includes "Dividends and interest received on financial accounts, savings bonds, leases, etc." K incorporates 416.1124(c)(22), which excludes interest and dividends on countable resources. | The rule contradicts itself. The volume excludes all interest and dividends (FC-3) with no open question, and the choice changes a grant dollar for dollar. | Record a state-policy-choice open question naming both paragraphs. |
| P2-2 | P2 | 3.520.783.C.1, C.3 | af_self_employment_net_profit CO-1708 | C.3: child-care provider allowances "For the first child for whom day care is provided, deduct $55; ... each additional child deduct $22"; C.1: farm income averaged yearly. | CO-1708's precision says "The type-specific methods of 3.520.783.C ... are not modeled", with no open question or reason. The $55/$22 allowance is a stated figure. | Model C.3 as dated parameters with the documented-cost alternative (C.3.d), or record why not. |
| P2-3 | P2 | C.R.S. 26-2-111(4)(b) against 3.520.61.A and 3.546 | CO-287, CO-288, CO-950, CO-1203 | (4)(b): "He or she is eighteen years of age or older." 3.520.61.A: AND-SO "age zero (0) through 59 years of age" if blind, and "age 0 through 59 years of age for AND-CS". | This statute-against-rule conflict is unrecorded. The volume follows the rule (it pays AND-CS to children, and AND-SO to blind children), against the principle OQ-430 states. The answer is plausibly right (AND-CS as the SSI State supplement), but no open question records the choice. | Record a needs-Legal open question citing both texts. |
| P2-4 | P2 | 3.570.13.F; 3.570.17.C.3.a, C.4.b, C.7.a-b | af_hca_grant CO-1219, af_hca_eligibility_status CO-1217 | F: "the HCA grant payment shall begin on the first day of the month following the month in which the HCA is approved ... There shall be no retroactive HCA payments." C.4.b: discontinue when the client "Enters a hospital or other long-term care facility ... that continues for thirty (30) calendar days or more"; C.7.a-b: services may continue on medical or non-medical leave; "Combined leave shall not exceed a total of forty-two (42) days in a twelve (12) month period". | CO-1219's precision says F is "not modeled", with no open question. CO-1217 makes a client ineligible as soon as `resides_in_medical_institution` is true, with no 30-day or 42-day allowance. | Add the HCA approval month (no payment in it) and the leave days. Or record both as documented limits with an open question. |
| P2-5 | P2 | 3.520.77.C.2, C.3, C.5 | CO-4000, home_equity CO-826 | C.3: "When a client requires care in a long-term care facility, the home continues to be exempt so long as there is intent for the client to return". C.5: "If a client's home can no longer be excluded due to a change in his or her principal place of residence, the equity value of the property shall count as a resource." | No Adult Financial item reads `home_equity` or an intent to return. Whether a former home goes in `real_property_other_than_home_equity` ("not the home the person lives in") or stays out depends on how the case is written. The rule's answer turns on intent, and no fact states it. | State the home's equity and the intent to return for a person living away from it, and apply C.2-C.5 in CO-4000. |
| P2-6 | P2 | 3.520.785.B.24; 3.534.C, 3.544.F, 3.549.F (MMMNA sentences) | CO-3831, CO-2384 | B.24: countable unearned income includes the "Minimum monthly maintenance needs allowance (MMMNA) retained from an institutionalized spouse's income". | CO-2384's precision gives a reason for the deduction ("assessed through the Medicaid post-eligibility items"). The reason does not cover B.24: the community spouse's retained MMMNA is income to the Adult Financial client, and no Adult Financial item reads it. | Count the retained allowance (the Medicaid item that computes it, or a supplied amount) in CO-3831. |
| P2-7 | P2 | 3.541.1.A.2.b, A.4, C.1-2 | af_and_so_medical_certification_received CO-2824, CO-1669 | A.2.b: "The medical certification must be dated no earlier than ninety (90) days before the application or recertification." A.4: the re-examination date "shall not exceed twelve (12) months"; C.2: failure to submit by the re-examination date means "terminate assistance". | The validity window and the 12-month re-examination are not carried. A certification older than 90 days, or past its re-examination date, clears the element. | Add the certification date and re-examination date and test both in CO-1669. Or state the limit in CO-2824's meaning. |
| P2-8 | P2 | 3.570.43.C | af_burial_eligible CO-1231 | "Requests made after 30 days shall be evaluated by the county department and an extension may be given if good cause exists, not to exceed one (1) year from the date of death." | CO-1231's precision calls the window "procedural". The one-year outer limit is a time bar on eligibility, not a procedure. | Add the request date and a good-cause finding, and bar a request more than a year after death. |
| P3 | P3 | various | CO-952, CO-949; OQ-662; 3.520.79.D; 3.520.73.A.2; 3.520.75.G; 3.520.5.C; 3.510 "Resources" | (see the right-hand columns) | (1) CO-952's meaning and precision, and CO-949's precision, still describe an "Aid to the Blind"/"ab" branch that af_category no longer has (OQ-112, N-1). (2) OQ-662 cites 3.520.71.A.1 but not the 3.510 "Eligible client" definition, which also says "below the resource limit". (3) 3.520.79.D's life-estate ISM, the joint-account rules of 3.520.73.A.2.a-c (a fiduciary co-owner makes the account 100% the client's), and the "original face value" of 3.520.75.G are not stated in any fact's meaning. (4) PARIS matches (3.520.5.C), which are not verified upon receipt, have no element. (5) 3.510 "Resources" are those "held as of the first day of a calendar month or as of the date of application"; the holdings facts are "as of the determination date". | Correct the text; add the citations; state the readings in the facts' meanings. |

Probe summary (engine results compared with the text):

| probe | the volume | the text |
|---|---|---|
| PR-ABS (F-1) | oap, $452 | ineligible (out of State 122 days), unless the presumption is rebutted |
| PR-SPON (F-2) | $3,006 deemed, none | nothing deemed (40 quarters), oap $452 |
| PR-APART (F-3) | nothing deemed, oap $442 | $1,968 deemed, none |
| PR-PNA (F-4) | AND-CS October $0 | $494 |
| PR-ISM (F-5) | ISM 0, $452 | ISM $351, $101 |
| PR-PTC (F-6) | 2,200, none | 1,700, oap |
| PR-RENT (F-11) | 1,380, none | 880, $152 |
| PR-LUMP (F-12) | 580, oap $452 | 5,580, none |
| PR-IMD (F-13) | and_so $248 | barred by 26-2-111(1)(d) |
| CO-94 (F-16) | 715 deemed to each child | 1,212 |

## 3. Coverage matrix

Key:
- **C** = carried by (the derivation was read and checked).
- **NA** = not applicable, with the reason.
- **OQ** = open question.
- **GAP** = no item and no recorded reason; the finding is named.

Paragraphs that are pure administration, notice, hearing or claims procedure are grouped by lettered paragraph. Everything that states a condition, figure, computation, exception, period or verification is its own row.

### 3.500 and 3.510 (definitions)

| paragraph | status |
|---|---|
| 3.500 program list | C: af_category CO-953 (oap/and_so/and_cs), af_hca_eligibility_status CO-1217, af_burial_eligible CO-1231; no Aid to the Blind (OQ-112, resolved) |
| 3.510 Actual value; Equity value; Value (cash, real/personal); Fair Market Value; Encumbrance | C: the holdings facts are stated as equity (CO-3390-CO-3393) |
| 3.510 Adequate; ADH; Administrative error claim; ALJ; Application; Approval; Authorized representative; Collateral contact; County department; Creditor; Denial; Discontinuation; HCPF; IM-14/IM-19 (form names); Local service delivery agency; Liable individual; Material fact; Overpayment; Preponderance; Prudent person; Recovery; Scheduled appointment; Signature; State Department; Statewide automated system; Termination; Timely notice; Withdraw | NA: procedure, notice or claims |
| Adult Financial approved setting | C: CO-1510 (stated as other_long_term_care_facility) |
| Anticipated income; Received (income) | C: the monthly income facts, stated as the amount for the month |
| Applicant | NA |
| Assets/Resources ("held as of the first day ... less the value counted as income in the same month") | C: holdings facts; the first-of-month timing is stated in CO-4000's precision (P3, coverage round) |
| Available | C: the holdings facts ("the person's own holding, or the person's share") |
| Bona fide loan | C: loan_proceeds_received; the month-of-receipt exemption carried by af_exempt_liquid_resources CO-4412 (F-6 fixed) |
| Convertible asset | C: liquid_resources_value, retirement_accounts_value; valuation less taxes or 20% in CO-4000 (CO-4429, CO-4430; F-8 fixed) |
| Countable income / Countable resource | C: CO-946, CO-947 |
| Date of entry | C: us_entry_date CO-1726, qualified_status_date |
| Demonstrable evidence | C: CO-2008 |
| Disaster assistance | C: CO-3878 |
| Disabling condition | C: CO-1728 |
| Earned income ("cash or in-kind") | C: CO-3830, cash plus in-kind (in_kind_earned_income_value CO-4437) and donated work (CO-4443) (F-10 fixed) |
| Effective date of eligibility | C: CO-2391 |
| Eligibility requirements | NA |
| Eligible client ("below the resource limit") | OQ-662 (3.510 "Eligible client" now cited; P3 fixed) |
| Estate | C: decedent_estate_value CO-1224 |
| Exempt income / Exempt resource | C: CO-2342, CO-2343; CO-4000 |
| Face value | C: life_insurance_face_value; original face value stated in CO-4001's precision (P3 fixed) |
| Facility | C: CO-1510, CO-3343 |
| Federal Poverty Guidelines | NA: used only in 3.520.69.B's presumption, which states no test |
| Fleeing felon | C: is_fleeing_felon CO-038 in CO-942 |
| Fraud; Intent; IPV; Unintentional; Willful; Willful withholding | NA (claims and IPV procedure); the IPV disqualification is C: af_is_serving_ipv_disqualification CO-4447 in CO-953, CO-1203, CO-1217 (F-14 fixed) |
| Good cause | C: the supplied duty findings (CO-2004, CO-3860, CO-3861) |
| Grant payment / Grant standard | C: CO-949, CO-951, CO-952 |
| Homeless | C: af_is_homeless CO-4410 (stays_with_succession_of_others_without_permanent_arrangement CO-4411) in CO-1512 (F-5 fixed) |
| Immediate family | C: burial_spaces_value_beyond_family_needs CO-3857 |
| Income; In-kind | C: income facts; ISM CO-1512; in-kind earned CO-4437 in CO-3830 (F-10 fixed) |
| Involuntary transfer | C: af_transfer_found_not_twfc CO-3836 |
| Irregular | C: CO-3827, CO-4011 |
| Legal fiduciary | NA |
| Life Estate | C: CO-1512's precision (a life-estate holder is not an owner; ISM calculated, 3.520.79.D) (P3 fixed) |
| Marriage | C: spouse relationship |
| Medical provider | NA (certification) |
| Non-citizen; Qualified non-citizen | C: is_qualified_non_citizen CO-506, CO-905 |
| Non-recipient spouse | C: CO-2384 |
| Ownership; Personal property; Real property | C: holdings facts |
| Payment Floor Standard; State Supplementary Payment | C: CO-1200, CO-1201, CO-1202 in CO-951, CO-952, CO-1219 |
| Periodic payments | NA |
| PNA | C: CO-1509 |
| Potential income | C: CO-3861 |
| Potential resource | C: af_refused_potential_resources_value CO-4433 in CO-4000 (F-9 fixed) |
| Questionable | C: *_attestation_is_questionable facts |
| Received (verification) | C: *_document_received facts |
| Redetermination; Twenty-four month redetermination; Traditional verification | C: CO-2376, CO-2377, CO-1433 |
| Shelter costs | C: CO-1512 (shelter_cost_monthly, home_total_shelter_costs) |
| Sponsor (I-864/I-864A) | C: CO-1573, sponsors CO-2713 |
| SSI benefit standard (20 CFR 416.405-415) | C: ssi_federal_benefit_rate_individual CO-235 |
| TWFC | C: CO-3835 |
| Verification; Verified upon receipt | C: verification items, *_verified_by_electronic_data_source |

### 3.520.1-3.520.5 (general requirements, documentation, oversight, application processing, interfaces)

| paragraph | status |
|---|---|
| 3.520.1.A.1-6 (information) | NA |
| 3.520.1.B.1-10 (county duties; B.8 a withdrawal is a denial) | NA (procedure) |
| 3.520.1.C (signed application; date = first working day received; facility/guardian applies; illiterate mark) | C: af_application_date CO-3837 (supplied date); otherwise NA |
| 3.520.1.D-F (answers, voter registration, ACP) | NA |
| 3.520.1.G.1-3 (use of grant) | NA |
| 3.520.1.H.1-4, I.1-4 (notice, appeal rights) | NA (notice and hearing) |
| 3.520.1.J.1-10 (confidentiality) | NA |
| 3.520.1.K.1-6 (non-discrimination) | NA |
| 3.520.2.A-G (case record, retention) | NA |
| 3.520.3.A-F (oversight, QA) | NA |
| 3.520.4 intro (45 days) | NA (processing time) |
| 3.520.4.A | C: CO-3837 |
| 3.520.4.B | NA |
| 3.520.4.C.1-3 (interview; failure to attend means denial) | NA (procedure) |
| 3.520.4.C.4.a-b, c.1-3 | NA |
| 3.520.4.C.4.c.4 (AND-SO: certification form, IM-14, SSI duty) | C: CO-2004, CO-2824; the IM-14 is af_im14_signed CO-4449 in CO-1203 (F-14 fixed) |
| 3.520.4.C.4.d.1-2 | C: verification items (CO-1436) |
| 3.520.4.C.4.e.1-5 (report by the 10th; rights) | NA |
| 3.520.4.C.4.f.1-2 (EBT locations) | NA; the misuse ineligibility is C: af_is_in_ebt_misuse_ineligibility_period CO-4448 (F-14 fixed) |
| 3.520.4.C.4.g-h | NA |
| 3.520.4.C.5 | NA |
| 3.520.4.C.5.a (refusal to sign forms means denial) | C: af_im14_signed CO-4449 for AND-SO's required form; the application's own signature is presupposed by af_application_date (F-14 fixed) |
| 3.520.4.C.5.b (reuse of another program's application within 60 days) | NA (application date supplied) |
| 3.520.4.C.6.a.1-3 (continuing after a missed interview) | NA (application date supplied) |
| 3.520.4.D (verify statements) | C: CO-1436, CO-1438 |
| 3.520.4.D.1.a-c (list; due 11 days after the request; process without) | C: CO-1353 (11), af_verification_due_date CO-1437, CO-2382 |
| 3.520.4.D.2.a-e (collateral contact, home visit, denial for non-cooperation) | NA (method) |
| 3.520.4.D.3-4, D.4.a.1-2, D.5.a-c, D.6 (application date after late verification; re-evaluation) | NA (application date supplied) |
| 3.520.4.D.7.a-b (no delay for SSN or SVES) | NA |
| 3.520.4.E | NA |
| 3.520.5 intro (interfaces acceptable) | C: *_verified_by_electronic_data_source |
| 3.520.5.A (IEVS on client, spouse, sponsor) | C: CO-1665, CO-2589, CO-3884, CO-1672 |
| 3.520.5.A.1.a-b (SSA, SSI, pensions, UIB verified upon receipt) | C: CO-3883, CO-2589 |
| 3.520.5.A.2.a-b (DOLE wages not verified upon receipt; 11 days) | C: CO-1665, CO-3882 (documents only); CO-1353 |
| 3.520.5.A.3 (verify income of client, spouse, sponsor before approval) | C: CO-1665, CO-2589, CO-3884; sponsor CO-1672 |
| 3.520.5.A.4-6 (45 days; notice) | NA |
| 3.520.5.B (SVES) | C: ssn_is_verified CO-1661; receives_ssi |
| 3.520.5.C (PARIS, not verified upon receipt) | NA: a cross-State match the county acts on through received_financial_assistance_from_another_state_this_month (CO-3859, supplied by PARIS) and residency; no element of its own (docs/colorado-notes.md, coverage round) |
| 3.520.5.D.1-3 (SAVE for AND: sponsor, registration number, status) | C: CO-1432, CO-1663, CO-1672 |
| 3.520.5.E (DMV identity) | C: identity_verified_by_electronic_data_source in CO-1660 |

### 3.520.6 (non-financial requirements)

| paragraph | status |
|---|---|
| 3.520.61.A (ages: AND-SO 18-59, blind 0-59; AND-CS 0-59; OAP 60+) | C: CO-285, CO-287, CO-288, CO-940, CO-950, CO-1203; statute (4)(b) conflict recorded as OQ-783 (P2-3) |
| 3.520.61.B (resident; correctional inmates and fleeing felons barred) | C: CO-942, CO-3343, CO-038; statute (1)(d) is af_and_is_barred_as_institution_patient CO-4446 in CO-953, CO-1203 (F-13 fixed) |
| 3.520.61.C (AND citizenship or qualified status) | C: CO-905 in CO-953 and CO-1203 |
| 3.520.61.D (AND valid SSN) | C: CO-1430, CO-1661 through af_verification_status |
| 3.520.61.E (AND disability) | C: CO-944, CO-950, CO-1728 |
| 3.520.61.F (Colorado Works) | C: CO-1511 (OQ-357, resolved) |
| 3.520.61.G (apply for and accept benefits) | C: CO-3860 |
| 3.520.61.H (pursue potential income and resources) | C: CO-3861 for income; resources CO-4433, CO-4434 (F-9 fixed) |
| 3.520.61.I | C: CO-953 |
| 3.520.62.A-K (age verification documents) | C: CO-1658 (age_is_verified; documents not itemized) |
| 3.520.63.A.1-4 (marital status verified if questionable) | C: CO-1670, CO-1671 |
| 3.520.63.B (both spouses may apply; separate cases) | C: person scope |
| 3.520.63.C.1-2 | C: CO-1670 |
| 3.520.63.D (not legally separated means married) | C: spouse relationship; spouse deemed wherever the spouse lives (CO-2384; F-3 fixed) |
| 3.520.64.A | C: CO-942, CO-505 |
| 3.520.64.B, B.1 | C: state_of_residence CO-006 |
| 3.520.64.B.2 (other-State payment month) | C: CO-3859 in CO-942 |
| 3.520.64.C (county of application) | NA (county administration) |
| 3.520.64.C.1-2 (homeless, no fixed address: eligible) | C: no address condition in CO-942 |
| 3.520.64.D.1-9 (indicators of another State's residence) | C: state_of_residence (the county's finding) |
| 3.520.64.E.1 (out of country 30 days) | C: af_is_presumed_nonresident_by_absence CO-4401 (CO-4402, CO-4406) in CO-942 (F-1 fixed) |
| 3.520.64.E.2 (out of State 90 days; medical exception) | C: CO-4401 (temporarily_out_of_state_start_date, temporary_absence_reason, CO-4407) (F-1 fixed) |
| 3.520.64.E.3 (180 days a calendar year) | C: CO-4401 (days_out_of_state_in_calendar_year CO-4403, CO-4408) (F-1 fixed) |
| 3.520.64.E.4 (180 days caring for an injured service member) | C: CO-4401 (CO-4404, CO-4408; OQ-780) (F-1 fixed) |
| 3.520.64.F (prudent person) | NA |
| 3.520.64.G (burden; refusal means denial) | C: CO-1659 |
| 3.520.65.A (provide SSN) | C: CO-1430 |
| 3.520.65.A.1 | NA |
| 3.520.65.A.2 (apply for SSN; OAP non-citizens exempt) | C: CO-1430 (has_been_issued_ssn; the OAP non-citizen arm) |
| 3.520.65.A.3 (refusal means denial) | C: through CO-1661 and af_verification_status |
| 3.520.65.A.4 | NA |
| 3.520.65.B, B.1-3 (SVES; discrepancy) | C: CO-1661 |
| 3.520.66.A-E (identity documents; 1 CCR 204-30 Rule 16) | C: CO-1660, CO-1674 (OQ-315, resolved) |
| 3.520.67.A.1-3 (who is a citizen) | C: is_us_citizen_or_national CO-1358 |
| 3.520.67.B.1-2 (verify AND citizenship when inconsistent) | C: CO-1431, CO-1662 |
| 3.520.67.C (documents; 45 CFR 1626.6) | C: CO-1673, CO-1368 (OQ-315) |
| 3.520.67.D (no targeting) | NA |
| 3.520.67.E (qualified for AF; all non-citizens may apply for OAP) | C: CO-929, with statute_override (OQ-119 and OQ-430 resolved; OQ-591) |
| 3.520.67.F (USCIS documents through SAVE) | C: CO-1432, CO-1663 |
| 3.520.67.G.1-4 (not eligible for AND) | C: CO-506 through CO-905 |
| 3.520.68.A (AND five-year bar from 8/22/1996) | C: CO-905 (statute_override for special immigrants and parolees) |
| 3.520.69 intro (entered on or after 8/22/1996) | C: CO-1573 (a binding I-864) |
| 3.520.69.A.1-3 (sponsor information) | C: CO-1672 |
| 3.520.69.B (125% presumption) | NA (presumption, no test) |
| 3.520.69.B.1 (citizenship) | C: [not is_us_citizen_or_national] in CO-2386 and CO-947 |
| 3.520.69.B.2 (40 quarters) | C: af_sponsor_deeming_applies CO-4400 (qualifying_quarters) (F-2 fixed) |
| 3.520.69.B.3 (leaves the US) | C: residency and LPR status (CO-4400's precision) (F-2 fixed) |
| 3.520.69.B.4 (non-citizen dies) | NA (no determination) |
| 3.520.69.B.5 (sponsor dies; joint sponsor continues) | C: CO-4400 (sponsor_has_died: every signer has died) (F-2 fixed) |
| 3.520.69.B.6 (new admission) | C: the new affidavit's sponsors (CO-4400's precision) (F-2 fixed) |
| 3.520.69.C.1 (no deeming for refugees and asylees; pending status not qualified) | C: CO-4400 (status_before_lpr_adjustment refugee or asylee); pending status is C: CO-506 (F-2 fixed) |
| 3.520.69.C.2 (agreements before 12/19/1997) | C: CO-1573 (I-864 on or after 12/19/1997) |
| 3.520.69.C.3 (12/19/1997-12/31/2013, spouse and non-relative sponsors only) | NA: the period ended; no determination date in scope |
| 3.520.69.C.4 (from 2014, all sponsors) | C: CO-2386 |
| 3.520.69.C.5 (sponsor cannot repay from the grant) | NA (recovery) |
| 3.520.69.D (failure to give sponsor information means denial; recovery) | C: CO-1672 in CO-1438; recovery NA |
| 3.520.69.E | C: CO-2386, CO-947 |

### 3.520.7 (financial requirements and resources)

| paragraph | status |
|---|---|
| 3.520.71.A.1 (resources below the limit) | C: CO-948 (OQ-662) |
| 3.520.71.A.2 (income below the limit) | C: CO-953 and CO-1203, `<` the standard |
| 3.520.71.A.3 (pursue potential income and resources) | C: CO-3861 for income; resources CO-4433, CO-4434 (F-9 fixed) |
| 3.520.71.B ¶1 (AND-SO SSI/SSDI application, appeal within 30 days) | C: CO-2004 in CO-1203 (OQ-151, resolved) |
| 3.520.71.B ¶2 (SSI/SSDI choice, IAR) | NA (IAR) |
| 3.520.71.B ¶3, B.1-4 (OAP apply for and accept SS/SSI; ages 60, 62, 65) | C: CO-3860 (county finding) |
| 3.520.71.C (proof of application: 11 days; AND-SO 60 days from interview; subsequent applications 30 days, no approval before) | C: CO-3862, CO-3865-CO-3870 |
| 3.520.71.D, D.1-5 (OAP SSI application and appeal; excuses) | C: CO-3860 |
| 3.520.71.E (SSA ISM matched) | C: CO-1512 (ssa_in_kind_support_and_maintenance_charged) |
| 3.520.71.F.1, F.1.a (apply for Colorado Works; non-parent caretaker) | C: CO-1511 (OQ-357) |
| 3.520.71.F.1.b | NA |
| 3.520.71.F.1.c (a child's TANF is not the caretaker's) | C: tanf_cash_income is stated on the member it supports |
| 3.520.71.F.2.a-c (sanction, demonstrable evidence, disqualification, withdrawal) | C: CO-1511, CO-2008 |
| 3.520.71.G (other income; proof before approval) | C: CO-3862, CO-3869 |
| 3.520.71.G.1 | C: CO-3861 in CO-3831 |
| 3.520.71.G.2 | NA |
| 3.520.71.H, H.1-2 (potential resources counted as available; proof) | C: CO-4433 in CO-4000; proof pending (af_potential_resource_pursuit_status CO-4434) in CO-1436 (F-9 fixed) |
| 3.520.72.A (client, spouse, sponsor against the limit) | C: CO-947, CO-2389, CO-2390 |
| 3.520.72.A.1.a-c, A.2.a-b (limits $2,000/$3,000; sponsor limits) | C: CO-3045, CO-3046, CO-947 |
| 3.520.72.B.1 (real property not home, not income-producing) | C: CO-3393; income-producing property CO-4422 (CO-4423, CO-4424) (F-7 fixed) |
| 3.520.72.B.2 (excess home-sale proceeds) | C: liquid_resources_value; the 6-month exemption CO-4412 (replacement proceeds CO-4417-CO-4421) (F-6 fixed) |
| 3.520.72.B.3-4 (mobile homes, RVs, vehicles, boats) | C: vehicles_equity_value; income-producing personal property CO-4423 in CO-4422 (F-7 fixed) |
| 3.520.72.B.5 (cash and convertible assets, retirement accounts) | C: CO-3390, CO-3392 (valuation in CO-4000, CO-4429; F-8 fixed) |
| 3.520.72.B.6 (mortgages, notes) | C: CO-3393 (meaning includes them) |
| 3.520.72.B.7 (life insurance CSV) | C: CO-4001, CO-4002, CO-3854 |
| 3.520.72.B.8 (revocable burial contracts and trusts) | C: CO-3855, CO-3856, CO-3858 |
| 3.520.72.B.9 (excess burial spaces) | C: CO-3857 |
| 3.520.72.B.10 (excess insurance proceeds) | C: liquid if held; the exemption CO-4412 (F-6 fixed) |
| 3.520.72.B.11 (unspent or non-bona-fide loan proceeds) | C: liquid if held |
| 3.520.72.B.12 (estate of an incapacitated client) | C: the client's own holdings (CO-4000's precision) (F-9 fixed) |
| 3.520.72.B.13, a-c (trusts per POMS SI 01120.200/.201; non-payable corpus means TWFC) | C: trust_corpus_payable_to_person_value CO-4432 in CO-4000; non-payable corpus is a transfer (CO-3835) (F-9 fixed; POMS not fetchable, ssa.gov) |
| 3.520.72.C (legally separated: sole ownership of non-recipient) | C: no spouse edge when legally separated |
| 3.520.72.D (verify all resources) | C: CO-1433, CO-4003, CO-1664, CO-4004 |
| 3.520.72.D.1-3 | NA |
| 3.520.72.D.4 (client statement until the 24-month redetermination; new resources) | C: CO-1433 (CO-2377, CO-2378) |
| 3.520.72.D.5 (cash by statement) | C: CO-1433 (has_resources_other_than_cash) |
| 3.520.72.E (sponsor's excess deemed; "in the same manner") | C: CO-947, CO-2390 by Adult Financial's own count (F-15 fixed) |
| 3.520.72.F, F.1-2 (SSI: no resource verification unless questionable) | C: CO-1433 |
| 3.520.73.A.1 (account balance verification) | NA (method) |
| 3.520.73.A.2, a-c (joint accounts proportional; fiduciary 100%; intent) | C: the liquid "share"; allocation stated in CO-4000's precision (P3 fixed) |
| 3.520.73.B.1.a-b (retirement less taxes, or 20%) | C: CO-4000 (retirement_accounts_taxes_due CO-4429, af_retirement_account_default_tax_rate CO-4430) (F-8 fixed) |
| 3.520.73.B.2-4 (securities, bonds, mineral rights valuation) | NA (valuation of a supplied amount) |
| 3.520.73.C | NA |
| 3.520.741.A (home exempt; statement) | C: home not counted (CO-4000 does not read home_equity) |
| 3.520.741.B.1.a-c (actual value less encumbrances) | C: CO-3393 |
| 3.520.741.B.2-3 (negotiability, ability to sell) | C: af_property_exempt_as_unsaleable_value CO-4431 in CO-4000 (F-8 fixed) |
| 3.520.741.C.1-2.a-b (shares of ownership) | C: CO-3393 ("the person's share") |
| 3.520.741.D (two-thirds is a reasonable price) | C: CO-4431 (F-8 fixed) |
| 3.520.741.D.1 | C: CO-4431 (F-8 fixed) |
| 3.520.741.D.2.a-e (co-owner undue hardship) | C: CO-4431 (F-8 fixed) |
| 3.520.741.D.3.a-c (unable to sell at two-thirds; quarterly check; rejected offer) | C: CO-4431 (F-8 fixed) |
| 3.520.741.D.4 (legal technicalities) | C: CO-4431 (F-8 fixed) |
| 3.520.742.A.1-3 (taxed personal property value) | NA (valuation) |
| 3.520.742.B (highest-value vehicle exempt) | C: CO-4000 |
| 3.520.742.B.1-2 (vehicle $400 presumption; appraisal) | NA (valuation) |
| 3.520.742.C.1-3.a-c (unsaleable personal property) | C: CO-4431 (F-8 fixed) |
| 3.520.742.D (lesser value) | NA |
| 3.520.75.A-C (CSV and original face value; term policies; documentation) | C: CO-4001, CO-4002, CO-3854 facts (sponsors F-15) |
| 3.520.75.D (face total of client and spouse $1,500 or less: exempt; sponsors too) | C: CO-4001, CO-4002 (CO-3399); sponsors **F-15** |
| 3.520.75.E.1-3 (OAP, CSV $250,000 or less) | C: CO-3854 (CO-3852) |
| 3.520.75.E.4 (sponsors) | C: CO-2390 reads af_life_insurance_countable_value_for_oap (F-15 fixed) |
| 3.520.75.F.1-3 (OAP, CSV over $250,000) | C: CO-3854 (CO-3853) |
| 3.520.75.F.4 (sponsors) | C: CO-2390 (F-15 fixed) |
| 3.520.75.G (original face value) | C: life_insurance_face_value, original face value (CO-4001's precision; P3 fixed) |
| 3.520.75.H (CSV estimation chart) | NA (valuation of the supplied CSV) |
| 3.520.76.A.1-4 (voluntary, without consideration, within 36 months or while receiving, for the purpose) | C: CO-3836, CO-3838, CO-4008 |
| 3.520.76.A.4.a-b.1-3 (rebuttable presumption) | C: CO-3836 |
| 3.520.76.B.1-3 (hardship) | C: CO-3836 |
| 3.520.76.C.1-3 (involuntary) | C: CO-3836 |
| 3.520.76.D.1 (uncompensated value) | C: CO-3835 |
| 3.520.76.D.2 (penalty value = current standard) | C: CO-4007 |
| 3.520.76.D.3-4 (divide, round down) | C: CO-3840 |
| 3.520.76.D.5 (starts the month after; multiple transfers) | C: CO-3841 (same-month limit recorded, N-5) |
| 3.520.76.D.6, a-b (returned resource) | C: CO-4009, CO-3835 |
| 3.520.76.E (1-36 months, per resource) | C: CO-3839, CO-3840 |
| 3.520.77.A (vehicle) | C: CO-4000 |
| 3.520.77.B (household goods) | C: not in any holdings fact |
| 3.520.77.C (home) | C: not counted |
| 3.520.77.C.1 (income-producing part on or adjacent to the home) | C: income-producing property is CO-4423 (F-7 fixed) |
| 3.520.77.C.2-3.a-b (away for medical or long-term care with intent to return) | C: intends_to_return_home CO-4435 in CO-4000 (P2-5 fixed) |
| 3.520.77.C.4 (OAP-C home) | C: not counted |
| 3.520.77.C.5 (home no longer exempt) | C: home_equity counted in CO-4000 when the client lives in a facility with no intent to return (P2-5 fixed) |
| 3.520.77.D (self-support property) | C: trade or business property not counted |
| 3.520.77.D.1.a | C |
| 3.520.77.D.1.b (business cash) | C: business_cash_and_convertible_assets_value CO-4416 in CO-4412 (F-6 fixed) |
| 3.520.77.D.1.c (12- or 24-month continuation) | C: business property is in no holdings fact; continuation is the county's statement of the property as used (CO-4422's precision) (F-7) |
| 3.520.77.D.2 (tools for wage work) | C: not counted |
| 3.520.77.D.3.a-c ($6,000 home-use production property) | C: home_use_production_property_equity_value CO-4425 in CO-4422 (CO-4426) (F-7 fixed) |
| 3.520.77.D.4.a-c ($6,000 and 6% non-business income-producing) | C: CO-4422 (CO-4423, CO-4424, CO-4426, CO-4427, CO-4428) (F-7 fixed) |
| 3.520.77.D.5 (licenses) | C: not counted |
| 3.520.77.E.1-3 (insurance proceeds, 3 or 6 months) | C: CO-4412 (CO-4417-CO-4421) (F-6 fixed) |
| 3.520.77.F.1-3 (home sale proceeds, 6 months) | C: CO-4412 (CO-4417-CO-4421) (F-6 fixed) |
| 3.520.77.G.1 | NA |
| 3.520.77.G.2.a-d (irrevocable burial trust; trustor = beneficiary over $1,500) | C: CO-3855, CO-3858 (meaning) |
| 3.520.77.G.3 (revocable over $1,500) | C: CO-3855, CO-3858 |
| 3.520.77.H.1-2.a-b (prepaid contracts) | C: CO-3856, CO-3858 |
| 3.520.77.I.1-12 (burial spaces) | C: CO-3857 |
| 3.520.77.J (retroactive SSI/SS, 9 months) | C: retroactive_ssa_benefits_held_value CO-4414 in CO-4412 (F-6 fixed) |
| 3.520.77.K (tax refunds and PTC, 12 months) | C: federal_tax_refunds_held_value, state_tax_refunds_held_value CO-4413 in CO-4412 (F-6 fixed) |
| 3.520.77.L (loan, month received) | C: loan_proceeds_received in the determination month, CO-4412 (F-6 fixed) |
| 3.520.77.M (ABLE) | C: able_account_value CO-4415 in CO-4412 (F-6 fixed) |

### 3.520.78-3.520.79 (income and ISM)

| paragraph | status |
|---|---|
| 3.520.781.A (equals or exceeds the standard: ineligible) | C: CO-953, CO-1203 (`<`) |
| 3.520.781.B.1-4 (four types) | C: CO-3830, CO-3831, CO-1512; in-kind earned CO-4437 (F-10 fixed) |
| 3.520.781.C | C: CO-2342, CO-2343 |
| 3.520.781.D | C: CO-946 |
| 3.520.781.E | C: CO-2384, CO-2386 |
| 3.520.781.F | C: CO-951, CO-952 |
| 3.520.781.G, G.1, G.2.a-b, d, f (month received; anticipation; averaging; COLA) | C: the supplied monthly amounts |
| 3.520.781.G.2.c (self-employment 3-month proration) | C: CO-1708 (stated in the supplied amounts) |
| 3.520.781.G.2.e.1-3 (rental: SE if 20 hours a week, else unearned; averaged; jointly owned) | C: fact choice; net of expenses (unearned_income_offsetting_expenses CO-4444) in CO-3831 (F-11 fixed) |
| 3.520.782.A | C: wages_gross, CO-1708 |
| 3.520.782.B, B.1-2 (in-kind earned) | C: in_kind_earned_income_value CO-4437 in CO-3830, CO-2384, CO-2386 (F-10 fixed) |
| 3.520.783.A, B, B.1-4 | C: CO-1707, CO-1708 |
| 3.520.783.C.1 (farm yearly) | P2-2: deferred (coverage round disposition) |
| 3.520.783.C.2.a | C: fact choice (F-11 for the unearned branch) |
| 3.520.783.C.2.b-d (board, room, room and board less expenses) | C: CO-1707 |
| 3.520.783.C.3.a-d (day care $55/$22) | P2-2: deferred (coverage round disposition) |
| 3.520.783.D | C: CO-1708 |
| 3.520.783.E (verification; accept unless questionable) | C: CO-1665 (earned income element) |
| 3.520.783.F (month received; irregular averaged 12 months) | C: supplied amounts |
| 3.520.784.A.1-4, B.1-2 (donated work hours) | C: af_donated_work_income CO-4443 (CO-4438-CO-4442; OQ-781) (F-10 fixed) |
| 3.520.784.C.1-4 (volunteering under 30 hours) | C: not income (no fact) |
| 3.520.785.A | C: CO-3831 |
| 3.520.785.B.1 (SSA benefits) | C: social_security_income, ssi_income |
| 3.520.785.B.1.a (lump sum counted in the month; unspent is a resource after 9 months) | C: the lump sum is part of the unearned income facts (lump_sum_received CO-3367, not P1); the unspent remainder is CO-4414 (F-12, F-6) |
| 3.520.785.B.1.b (gross when SSA recovers) | C: gross facts |
| 3.520.785.B.2 | C: pension_income |
| 3.520.785.B.3-5, B.7, B.11, B.21-23 (disability or survivor, VA, RRB, strike, annuity, Civil Liberties Act income, trust payments, alimony) | C: other_unearned_income_taxable and _nontaxable |
| 3.520.785.B.6 | C: unemployment_income |
| 3.520.785.B.8 (garnishment) | C: gross facts |
| 3.520.785.B.9 (workers' comp less medical and legal) | C: CO-4444 in CO-3831 (F-11 fixed) |
| 3.520.785.B.10 (interest and dividends) | OQ-782 (P2-1) |
| 3.520.785.B.12 (inheritance) | C: an inheritance is part of other_unearned_income_* (CO-3367's precision); counted in CO-3831 (F-12: not P1, the probe left it out of the income facts) |
| 3.520.785.B.13 (gifts and prizes) | C: gifts (other_unearned_income_nontaxable); prizes and lottery lottery_gambling_winnings_received in CO-3831 (F-12 fixed) |
| 3.520.785.B.14-16 (net insurance, lawsuit, GI Bill) | C: CO-4444 in CO-3831 (F-11 fixed) |
| 3.520.785.B.17 (joint property income share) | C: the person's share |
| 3.520.785.B.18 (lease bonuses) | C: in other_unearned_income_taxable, or lump_sum_received as part of it (F-12) |
| 3.520.785.B.19 (royalties averaged) | C |
| 3.520.785.B.20 (rental net of expenses) | C: CO-4444 in CO-3831 (F-11 fixed) |
| 3.520.785.B.24 (MMMNA retained) | C: stated in other_unearned_income_nontaxable, counted in CO-3831 (precision; P2-6 fixed) |
| 3.520.785.B.25 (current child support for the client) | C: child_support_received (stated on the child) |
| 3.520.786.A (tax refunds and PTC; remainder a resource after 12 months) | C: tax_refunds_and_credits_received in CO-2343; resource side CO-4412 (F-6 fixed) |
| 3.520.786.B (third-party medical, room and board in confinement) | C: not in any income fact |
| 3.520.786.C | C: energy_assistance_received |
| 3.520.786.D | C: general_or_emergency_assistance_received |
| 3.520.786.E (personal or home care allowance; spouse provider's pay is employment income) | C: in_home_care_allowance_received; the spouse's wages through CO-2384 |
| 3.520.786.F (VA A&A used for care) | C: va_aid_and_attendance_used_for_uncovered_care |
| 3.520.786.G | C: educational_assistance_received |
| 3.520.786.H | C: work_study_earnings in CO-2342 |
| 3.520.786.I (PASS income) | C: pass_set_aside_income (PASS resources P3) |
| 3.520.786.J | C: crime_victim_compensation_received |
| 3.520.786.K (POMS SI 00830.099; 20 CFR 416.1124) | C: CO-2343, see the 416.1124 rows below |
| 3.520.786.L | C: reverse_mortgage_payments_received |
| 3.520.786.M | C: foster_care_provider_payments_received |
| 3.520.786.N (support for another person) | C: child_support_received is stated on the child |
| 3.520.786.O (under $60 a quarter) | C: CO-3827, CO-4011, CO-4012 (CO-3826) |
| 3.520.786.P (arrears) | C: child_support_arrears_received |
| 3.520.79.A (ISM for OAP and AND-CS) | C: CO-1512, CO-3831 |
| 3.520.79.B.1 (owns the residence) | C: owns_and_lives_in_home |
| 3.520.79.B.2 (subsidized) | C: lives_in_subsidized_housing |
| 3.520.79.B.3 (homeless) | C: af_is_homeless CO-4410 (F-5 fixed) |
| 3.520.79.B.4.a-b (fair share at market value) | C: CO-1512 |
| 3.520.79.B.5 (pays at least the maximum) | C: CO-1512 |
| 3.520.79.B.6.a-b (SSA ISM matched) | C: CO-1512 |
| 3.520.79.C.1-3 (computation) | C: CO-1512 |
| 3.520.79.D (life estate) | C: CO-1512's precision (P3 fixed) |
| 3.520.79.E.1-2 (1/3 of the SSI standard + $20, rounded) | C: CO-1513 ($342 for 2025, $351 for 2026, both checked) |

### 3.530-3.534 (OAP)

| paragraph | status |
|---|---|
| 3.530 intro | C: CO-940 |
| 3.530.A ($1,032 from 1/1/2026) | C: CO-289 |
| 3.530.B ($351) | C: CO-1513 |
| 3.530.C ($189) | C: CO-1200 |
| 3.530.1 OAP | C: CO-940 |
| 3.530.1 OAP-C | NA (OQ-111 resolved; home C, 3.520.77.C.4) |
| 3.531.A-B | NA |
| 3.531.C (within appropriations) | C: versioned CO-289 |
| 3.531.D.1 (MOE lump sums, 20 CFR 416.2095-2099) | NA: not an entitlement, does not affect standards |
| 3.531.D.2 (SSP) | C: CO-951 |
| 3.532.A | C: person scope |
| 3.532.B (standard less income; floor) | C: CO-951 |
| 3.532.B.1-2 (proration) | C: CO-2603, CO-2391 (OQ-491 resolved) |
| 3.532.B.3 (birthday-month transition) | C: CO-940 |
| 3.532.C (payee; OAP-C reserve) | NA |
| 3.532.D.1-2 (PNA facilities, 30 days) | C: CO-1510 |
| 3.532.D.3 (psychiatric at 65+) | C: CO-2006, CO-3052 |
| 3.532.E.1 (penal inmates) | C: CO-942, CO-3343 |
| 3.532.E.2 (unlicensed or uncertified) | C: CO-2007 |
| 3.532.F ($79) | C: CO-1509 (OQ-352 (1)) |
| 3.533 intro | C: CO-953 |
| 3.533.A.1.a-c | C: CO-946 (CO-3047, CO-3048) |
| 3.533.A.2.a-b, d-e | C: CO-946, CO-3831 |
| 3.533.A.2.c | C: CO-3832 |
| 3.533.A.2.c.1 (married split) | C: CO-3829 (OQ-661) |
| 3.533.A.2.c.2 (SSI only) | C: CO-3832 |
| 3.533.A.2.f (rollover) | C: CO-3833 (OQ-351 resolved) |
| 3.533.B | C: CO-951 |
| 3.534.A.1-4 (spouse's earned income) | C: CO-2384, the spouse wherever the spouse lives (F-3 fixed) |
| 3.534.A.5 (garnished wages) | C: gross |
| 3.534.B.1-2, 6-7 (unearned less the OAP standard) | C: CO-2384 |
| 3.534.B.3 (children: half the SSI standard less own income) | C: CO-2392 (CO-3050, CO-3054) |
| 3.534.B.4 (medical payments) | C: CO-2385 |
| 3.534.B.5 (court-ordered support) | C: child_support_paid_legally_obligated |
| 3.534.C first sentence (no deeming from a spouse on AF, SSI or Medicaid with income at or below the OAP limit) | C: CO-2384 |
| 3.534.C MMMNA | C: CO-2384's precision, CO-3831 (P2-6 fixed) |
| 3.534.D.1, D.2.A-B, D.3-5 (sponsor deeming) | C: CO-2386 (with F-2) |
| 3.534.D.2.C (dependents per 3.520.68.B.2.b.1) | C: CO-2386, the children the sponsor claims on income tax (archived 3.520.68.B.2.b.1, D-300, S3200; OQ-553 resolved, F-16 fixed) |

### 3.540-3.545 (AND-SO)

| paragraph | status |
|---|---|
| 3.540 intro (18-59, blind 0-59; not approved for SSI or SSDI; partial or short-term disability ineligible) | C: CO-1203, CO-944 (OQ-138) |
| 3.540.A ($248 from 4/1/2022) | C: CO-290 |
| 3.540.B | C: versioned |
| 3.540.1 Blindness | C: is_blind |
| 3.540.1 Employment in the community; Improvement; Reasonable commute; RFC; SGA; Total disability | C: CO-1728 (the county's finding) |
| 3.541.A, A.1-3 (total disability; certified; SSA listing, 20 CFR 404 Subpt. P App. 1; 6 months) | C: CO-1728, CO-944 |
| 3.541.B.1-2 (Medicaid determination weighed more), C | NA (county weighing; finding is CO-1728) |
| 3.541.1.A.1, a | NA |
| 3.541.1.A.1.b (30 days after the interview) | C: CO-2592, CO-1669 (CO-1599; OQ-375 resolved) |
| 3.541.1.A.1.c-e | NA |
| 3.541.1.A.2 | C: CO-2824 |
| 3.541.1.A.2.a | NA |
| 3.541.1.A.2.b (dated within 90 days) | C: CO-2824's meaning (P2-7 fixed) |
| 3.541.1.A.3 | NA |
| 3.541.1.A.4 (re-examination 12 months or less) | C: CO-2824's meaning (P2-7 fixed) |
| 3.541.1.B.1-4 (fees) | NA |
| 3.541.1.C.1-2 (re-examination; terminate) | C: CO-2824's meaning (P2-7 fixed) |
| 3.541.2.A.1-3.a-f (error, improvement, RFC) | C: CO-1728 |
| 3.541.2.B (working above the standard) | C: income test in CO-1203 |
| 3.541.3 intro, A (12 lifetime months) | C: CO-3843, CO-3847, CO-3849 |
| 3.541.3.B-C (treatment) | C: has_agreed_to_addiction_treatment |
| 3.541.3.D.1-2 (failure ends AND-SO) | C: was_terminated_from_addiction_treatment |
| 3.541.3.E-F (two positives in three months) | C: CO-3848 |
| 3.541.3.G (partial-month counting) | C: CO-3843 (supplied count) |
| 3.542.A | NA |
| 3.542.B (eligibility from application or when all are met) | C: CO-2391 |
| 3.543.A | C |
| 3.543.B, B.1-2 | C: CO-952, CO-2603 |
| 3.543.C | NA |
| 3.543.D.1-2 | C: CO-1510 |
| 3.543.E.1 | C: CO-942 |
| 3.543.E.2 | C: CO-2007 |
| 3.543.F ($79) | C: CO-1509 |
| 3.544 intro | C: CO-1203 |
| 3.544.A.1-3 | C: CO-946 |
| 3.544.B.1-3 (the $20; married split; no rollover) | C: CO-3829, CO-3832, CO-3833 |
| 3.544.C | C: CO-952 |
| 3.544.D.1-5 (spouse earned) | C: CO-2384 (F-3) |
| 3.544.E.1-3 (spouse unearned less the rest of the $20) | C: CO-2384 |
| 3.544.F (exempt spouse at or below the SSI limit) | C: CO-2384; MMMNA P2-6 fixed |
| 3.544.G.1-5 (sponsor) | C: CO-2386 (F-2, F-16 fixed) |
| 3.544.H | C: CO-946 |
| 3.545.A (interim assistance) | NA |
| 3.545.A.1 (repayment from retroactive SSI) | NA (IAR recovery) |
| 3.545.A.2 (IM-14 as a condition of eligibility) | C: af_im14_signed CO-4449 in CO-1203 (F-14 fixed) |
| 3.545.A.2.a-b, B-F, H-J (IAR mechanics) | NA |
| 3.545.G (SSI suspended: may apply for AND-SO) | C: receives_ssi false in CO-1203 |

### 3.546-3.549 (AND-CS)

| paragraph | status |
|---|---|
| 3.546 intro (0-59, SSI for disability or blindness, not the full standard) | C: CO-950 |
| 3.546.A ($994 from 1/1/2026) | C: CO-291 (OQ-391 resolved) |
| 3.546.B | C: versioned |
| 3.546.C.1 (MOE) | NA |
| 3.546.C.2 (SSP) | C: CO-952 |
| 3.546.D ($351) | C: CO-1513 |
| 3.546.E ($13) | C: CO-1201 |
| 3.547.A (approved for SSI for disability or blindness; SVES/SDX) | C: CO-950 |
| 3.547.B-C | NA |
| 3.547.D (SSI terminated: AND-CS ends) | C: receives_ssi in CO-950 |
| 3.548.A | C |
| 3.548.B, B.1-2 | C: CO-952, CO-2603 |
| 3.548.C | NA |
| 3.548.D.1-2 | C: CO-1510 |
| 3.548.E.1-2 | C: CO-942, CO-2007 |
| 3.548.F ($79) | C: CO-1509 |
| 3.548.F (not reduced until the month after the first full month) | C: CO-952 (entry on or before the first of the previous month) (F-4 fixed) |
| 3.548.G (gross SSI) | C: ssi_income (gross) |
| 3.549.A.1.a-c | C: CO-946 |
| 3.549.A.2.a-f | C: CO-946, CO-3829-CO-3833 (OQ-661, OQ-351) |
| 3.549.B | C: CO-952 |
| 3.549.C.1-4 | C: CO-2384 (F-3) |
| 3.549.D.1-3 | C: CO-2384 |
| 3.549.E (unemancipated child: parents deemed as a spouse) | C: CO-2384 (CO-3053, is_emancipated_minor) |
| 3.549.F | C: CO-2384; MMMNA P2-6 fixed |
| 3.549.G.1-5 | C: CO-2386 (F-2, F-16 fixed) |
| 3.549.H | C: CO-952 |

### 3.550-3.560 (redetermination, changes, notice, transfers)

| paragraph | status |
|---|---|
| 3.550.A.1.a-b (OAP 24 months: no earned income and resources $200 under the limit; else 12) | C: CO-2377 (supplied, system-assigned) |
| 3.550.A.2-3 | C: CO-2376 (supplied) |
| 3.550.B.1-3, C.1-4 (filing, interview) | NA |
| 3.550.D.1.a-c (SSI-only: SDX/SVES verified) | C: CO-1433, CO-3883 |
| 3.550.D.2.a-g, i | NA |
| 3.550.D.2.h (re-verify at 24 months; new resources) | C: CO-1433, CO-2378 |
| 3.550.E-I | NA (contact, mail-out, review) |
| 3.551.A.1-2, B (late redeterminations) | NA |
| 3.552.A-E (reporting) | NA |
| 3.552.F (failure to cooperate: terminate) | C: af_verification_status CO-1438 |
| 3.553.A-D (action on changes) | NA |
| 3.553.E (no claim below the floor) | NA (claims) |
| 3.554.A-D (timely and adequate notice; continued payment) | NA |
| 3.560.A-C (case transfers) | NA |

### 3.570 (Home Care Allowance, burial, disaster)

| paragraph | status |
|---|---|
| 3.570.11.A (age 5+; personal care) | C: CO-1209, CO-1217 |
| 3.570.11.A.1 | NA (non-entitlement) |
| 3.570.11.A.2.a-c (HCBS functional eligibility bars; 3-month transition; not with HCBS) | C: CO-1206, CO-1217, CO-2009, receives_hcbs_services |
| 3.570.11.A.3 | NA |
| 3.570.11.B ($977 floor, all tiers) | C: CO-1202, CO-1219 |
| 3.570.11.C (not taxable) | NA |
| 3.570.11.D (tier standards within appropriations) | OQ-250 (confirmed blocked) |
| 3.570.11.E.1 | NA |
| 3.570.11.E.2 | C: CO-1219 |
| 3.570.12 Home | C: CO-2010, resides_in_medical_institution in CO-1217 |
| 3.570.12 Medical and non-medical leave | P2-4: the 42-day combined leave deferred (coverage round disposition) |
| 3.570.12 other definitions | NA |
| 3.570.13.A | C: CO-1217 |
| 3.570.13.B.1-3 (SSI; all AND-SO criteria; OAP+HCA since 12/31/2013) | C: CO-1215, CO-1203, CO-1208, CO-2600 |
| 3.570.13.C.1-3 (capacity at least 21; need tiers 1-23, 24-37, 38-51) | C: CO-1204, CO-1205, CO-1216, CO-1210-CO-1214 (values checked) |
| 3.570.13.D.1-3 (authorized amount) | C: CO-1218 (OQ-250) |
| 3.570.13.E.1-3 | C: CO-1217 |
| 3.570.13.F (start; no retroactive payment) | P2-4: deferred (coverage round disposition) |
| 3.570.13.G | NA |
| 3.570.14.A-F (scoring) | C: CO-1204, CO-1205 (supplied scores), CO-1209 for under 5 |
| 3.570.15 (ADLs) | C: scores |
| 3.570.16.A-F (care planning) | NA |
| 3.570.17.A-B | NA |
| 3.570.17.C.1-2 | C: CO-1217 |
| 3.570.17.C.3.a (no services for a month) | NA (CMA case-management finding) |
| 3.570.17.C.3.b-d | NA |
| 3.570.17.C.4.a | C: CO-1217 |
| 3.570.17.C.4.b (30 days in hospital or LTC) | C: CO-1217 (institution_entry_date, expects_institutional_stay_of_thirty_days, CO-4409) (P2-4 fixed) |
| 3.570.17.C.5-6 (safety, cost) | NA (CMA discretion) |
| 3.570.17.C.7 (not home) | C: CO-1217 |
| 3.570.17.C.7.a-b (leave, 42 days) | P2-4: deferred (coverage round disposition) |
| 3.570.17.C.8 (moved out of State) | C: CO-942 |
| 3.570.17.C.8.b (30 days temporary) | C: CO-1217 (temporarily_out_of_state_start_date, af_hca_absence_max_days CO-4409) (F-1 fixed) |
| 3.570.17.C.9-10 | NA |
| 3.570.17.D | NA |
| 3.570.18.A-B | NA |
| 3.570.41-42 (definitions, legally responsible person) | C: CO-3312, CO-3313 |
| 3.570.43.A.1 | C: CO-1220 |
| 3.570.43.A.2 | C: CO-1224, CO-1230 |
| 3.570.43.A.3 | C: CO-1225, CO-1229 |
| 3.570.43.A.4.a-b ($2,500; plot exclusions) | C: CO-1227, CO-1222 (OQ-355) |
| 3.570.43.B.1 ($1,500) | C: CO-1228 |
| 3.570.43.B.2 | NA |
| 3.570.43.C (30 days; one year) | C: af_burial_request_is_timely CO-4436 in CO-1231 (P2-8 fixed) |
| 3.570.43.C.1-3 | NA |
| 3.570.43.D.1 | C: CO-1223 |
| 3.570.43.D.2 | C: CO-1224 |
| 3.570.43.D.3.a (death benefit exempt) | C: CO-1225 |
| 3.570.43.D.3.b, b.1 (SSI limits; widow(er) individual) | C: CO-1229, CO-1226 (20 CFR 416.1205) |
| 3.570.43.D.3.b.2 (voluntary) | C: CO-1230 precision |
| 3.570.43.D.3.c | C: CO-1229 |
| 3.570.43.D.4 | C: CO-1232 |
| 3.570.43.E | NA |
| 3.570.43.F.1 | C: CO-1231 (OQ-355) |
| 3.570.43.F.2, G-J | NA |
| 3.570.51.A ($2,000 per client per disaster) | C: CO-3876, CO-3878, CO-3875 |
| 3.570.51.B-C (period) | C: declared_disaster_in_effect |
| 3.570.51.D (petition after rescission, discretionary) | NA (county discretion) |
| 3.570.52.A-C | C: CO-3877 |
| 3.570.52.D | C: CO-3877 precision |
| "3.750.53".A, C, E-G | NA |
| "3.750.53".B | C: documented limit in CO-3877 (P2-8 of round 2) |
| "3.750.53".D | C: CO-3878 precision |

### 3.580-3.587 (payments, overpayments, IPV, fraud, recovery, appeals)

| paragraph | status |
|---|---|
| 3.581.A-B | NA |
| 3.581.C.1-3.a-b (death: eligibility ends; payment held 3 months) | NA (no determination outcome for a decedent's grant) |
| 3.581.D.1-4 (partial-month table) | C: CO-2602, CO-2603 (all 30 factors checked) |
| 3.581.E (cents dropped unless SSI reduces) | C: CO-951, CO-952, CO-2604 |
| 3.581.F-H | NA |
| 3.581.I.1-2 | NA |
| 3.581.I.3-4 (one-month EBT-misuse ineligibility) | C: af_is_in_ebt_misuse_ineligibility_period CO-4448 in CO-953, CO-1203, CO-1217 (F-14 fixed) |
| 3.582.A-G | NA (claims) |
| 3.582.F.4-5 (restates eligibility) | C: CO-953 |
| 3.583.A-M, O and following | NA (IPV procedure) |
| 3.583.N.1-2.a-c, N.4 (12, 24 months, permanent; statewide) | C: af_is_serving_ipv_disqualification CO-4447 (F-14 fixed) |
| 3.583.N.3 (only the individual; a spouse's or sponsor's income still counted) | C for the income side (CO-2384, CO-2386); the bar is CO-4447 on the individual only (F-14 fixed) |
| 3.584 (fraud) | NA |
| 3.585 (recovery, including grant reduction for claims) | NA |
| 3.586 (county conference) | NA |
| 3.587, 3.587.1, 3.587.2 (hearings) | NA |

### C.R.S. 26-2-111 and 26-2-111.8

| paragraph | status |
|---|---|
| 111(1)(a) | C: CO-942 |
| 111(1)(b) | C: CO-948, CO-953 |
| 111(1)(c)(I)(A)-(B), (II) (TWFC; home transfer exception) | C: CO-3834-CO-3841, CO-3836 |
| 111(1)(d) (public institution, IMD or TB patient, psychosis) | C: af_and_is_barred_as_institution_patient CO-4446 (medical_institution_stay_is_for_tuberculosis_or_psychosis CO-4445), statute_override; inmate prong CO-3343 (F-13 fixed) |
| 111(2)(a)(I) | C: CO-929, CO-940, CO-948 (OQ-662) |
| 111(2)(a)(III) (OAP inmate of a non-penal institution) | C: CO-942 bars only correctional; PNA CO-2006 |
| 111(2)(b) (spouse and sponsor considered) | C: CO-2384, CO-2386, CO-2389 |
| 111(2)(c)(I)-(III) | C: CO-929 (OQ-430 resolved; OQ-591) |
| 111(2)(d)(I) | C: CO-1511 |
| 111(3) | NA (Colorado Works) |
| 111(4)(a) | C: CO-944, CO-1203 (OQ-138) |
| 111(4)(b) (18 or older) | OQ-783 (P2-3) |
| 111(4)(b.5)(I)-(II) | C: CO-2004 |
| 111(4)(c)(I) | C: CO-1511 |
| 111(4)(c)(II) (1991 supplement) | NA (closed group) |
| 111(4)(d) | C: CO-948 |
| 111(4)(e)-(f) | C: CO-3849, CO-3847, CO-3848 |
| 111(5) (Aid to the Blind) | OQ-112 and OQ-139 (resolved: no rule program; blind 0-59 is AND-SO) |
| 111(6), 111.8(2)(a)-(b) | C: CO-905, CO-929 |
| 111.8(2)(c) (deeming after five years) | C: CO-2386 (F-2) |
| 111.8(3.5) (repayment while the affidavit is in effect) | NA (recovery); supports F-2 |

### Incorporated federal and other texts

| text | status |
|---|---|
| 20 CFR 416.1124(b) | C: federally_excluded_payments_received in CO-2343 |
| 416.1124(c)(1) | C: property_or_food_tax_refund_received |
| (c)(2) | C: general_or_emergency_assistance_received; AF grant not income |
| (c)(3) | C: educational_assistance_received (AF's G is broader) |
| (c)(4), (14), (16) | C: in-kind, stated in no income fact |
| (c)(5), (18) | C: federally_excluded_payments_received |
| (c)(6) | C: CO-3827 |
| (c)(7) | NA (Alaska residents only) |
| (c)(8) | C: foster_care_provider_payments_received |
| (c)(9), (15), (20), (22) | C: interest and dividends excluded (OQ-782) |
| (c)(10) | C: energy_assistance_received |
| (c)(11) | C: CO-4021, CO-4022 |
| (c)(12) | C: CO-3832 |
| (c)(13) | C: pass_set_aside_income |
| (c)(17) | C: crime_victim_compensation_received |
| (c)(19) | C: uniformed_services_special_pay_received CO-4014 |
| (c)(21) | C: CO-4018, CO-4023 |
| (c)(23) | C: americorps_payments_received CO-4016 |
| (c)(24) | C: state_veteran_annuity_received CO-4017 |
| 20 CFR 416.1856 | C: CO-4022 (CO-4019, CO-4020) |
| 20 CFR 416.405-415 | C: CO-235 |
| 20 CFR 416.1205 | C: ssi_resource_limit_* in CO-1229 |
| 20 CFR 416.2095-2099 | NA (MOE pass-along, not an entitlement) |
| 20 CFR 404 Subpart P App. 1 | C: CO-1728 (county finding) |
| POMS SI 00830.099 | C: CO-2343 |
| POMS SI 01120.200/.201 (trusts) | C: CO-4432 (POMS SI 01120.200/.201 served only by ssa.gov, not an allowed host) (F-9 fixed) |
| 45 CFR 1626.6; 1 CCR 204-30 Rule 16 | C: CO-1673, CO-1674 (OQ-315 resolved) |
| 42 U.S.C. 413 (40 quarters, via 3.520.69.B.2) | C: CO-4400 (F-2 fixed) |
| 26 U.S.C. 529A (ABLE) | C: CO-4415 (F-6 fixed) |
| Pub. L. 100-383 | C: B.21 income in other unearned income |
| USCIS I-864/I-864A | C: CO-1573 |

**Matrix size:** 574 rows over 9 CCR 2503-5 3.500-3.587, C.R.S. 26-2-111 and 26-2-111.8, and the incorporated texts. Counted by primary status:
- C (carried, derivation checked): 361 rows.
- C with a GAP or mismatch part: 22 rows.
- NA: 115 rows, 2 of them with a GAP part.
- GAP: 52 rows, plus one row that is part C and part GAP (3.520.785.B.13). Together the GAP rows carry P1 findings F-1 to F-15; F-16 is the OQ-553 row.
- OQ: 4 rows.
- P2: 16 rows.
- P3: 3 rows.
- Rows that cite an open question anywhere: 28.

## 4. Open-question confirmations

| OQ | class | confirmed? |
|---|---|---|
| OQ-138 (SSDI route) | needs Legal | **Yes.** 3.540 and 26-2-111(4)(a) conflict as quoted. The texts were checked again on 2026-11-22. |
| OQ-250 (HCA tier amounts) | blocked on a named document | **Yes.** The current SOS rule (3.570.11.D, 3.570.13.C-D) and C.R.S. 26-2-122.3 state no tier maximum. The schedule is administrative, and cdhs.colorado.gov is not an allowed host. As long as every tier maximum is under the $977 floor, the grant is $977 under either reading. |
| OQ-352 (PNA) | state policy choice | **(1) Yes.** 3.532.C-F, 3.543.D-F and 3.548.D-F say nothing of income. **(2) No:** its statement that 3.548.F's lag "is carried by that meaning" is stale, because CO-1510 is now derived. That is F-4. |
| OQ-355 (burial plot in F.1) | state policy choice | **Yes.** |
| OQ-550 (SAVE status list) | blocked on a named document | **Yes.** No allowed host serves the SAVE response codes (uscis.gov). |
| OQ-553 (sponsor's dependents) | state policy choice | **No: misclassified (F-16).** The archived SOS rule (ruleVersionId 10320) defines the cross-referenced 3.520.68.B.2.b.1. |
| OQ-591 (OAP status verification) | needs Legal | **Yes.** 26-2-111(2)(c) and 3.520.5.D/3.520.67.E conflict as stated. |
| OQ-661 (married $20 split) | state policy choice | **Yes.** |
| OQ-662 (below or at most the limit) | state policy choice | **Yes.** P3: also cite 3.510 "Eligible client" ("below the resource limit"). C.R.S. 26-2-111(2)(a)(I) and (4)(d) (SSI resource eligibility) support the reading taken. |

Resolved questions this pass relied on were re-read: OQ-111, OQ-112, OQ-114, OQ-119, OQ-120, OQ-139, OQ-151, OQ-315, OQ-351, OQ-357, OQ-375, OQ-391, OQ-392, OQ-430 and OQ-491. Only OQ-392's echo in CO-947's assumption is stale (F-15). Three state choices the volume makes have no open question: P2-1 (interest), P2-3 (AND minimum age), and F-3's alternative (spouse living apart).

## 5. Earlier P1s (docs/reviews/final-cash.md, final2-cash.md): spot-check

| finding | status | evidence |
|---|---|---|
| FC-4 / FC-5 (the $20 split; AND-SO has no rollover) | stays fixed | CO-120 gives 490 / oap / $542 each. CO-946-T2 and CO-946-T13 derivations were re-read. |
| FC-6 / N-5 (TWFC per month) | stays fixed | CO-131 p1: oap (two $1,000 transfers give 0 + 0). |
| FC-7 (substance abuse) | stays fixed | CO-3849 is in CO-1203. |
| FC-9 (other-State payment; benefit duty) | stays fixed | CO-3859 in CO-942; CO-3860 in CO-953 and CO-1203. |
| FC-10 (disaster) | stays fixed | CO-3878 is the minimum of the approved amount and 2,000 less amounts already paid. |
| N-1 (spouse's life insurance under the client's program) | stays fixed | CO-130 p1: countable 2,500, oap. |
| N-2 (spouse's resources verified) | stays fixed | CO-130 p1: af_pending_verification_count 1. |
| N-3 (parolees; trafficking for Colorado Works only) | stays fixed | The CO-905 derivation and statute_override were read. |
| N-4 (416.1124(c)(11)) | stays fixed | CO-131 p2: countable 680, AND-CS $314. |
| OQ-352 (2) and CO-952 precision | **regressed in text** | F-4. |


## Disposition (coverage round)

Fix round of 2026-11-22 on branch `worktree-agent-a224211f0d9315040`: commits 67cb58e (sponsor deeming: F-2, F-15, F-16) and c06ff74 (the rest). Every governing text was re-read in the Secretary of State's current 9 CCR 2503-5 (rule version 12428, re-fetched 2026-11-22) and quoted as S3201-S3220; the archived version 10320 is D-300 (S3200). The probe households were re-run with the engine (results below); five are now stored as CO-165 to CO-169 with hand derivations. The matrix rows above are updated ("GAP" to "C: ... (F-n fixed)").

| finding | disposition |
|---|---|
| F-1 | Fixed (c06ff74). af_is_presumed_nonresident_by_absence (CO-4401) applies 3.520.64.E.1-4 from temporarily_out_of_state_start_date and new neutral facts (out of the country CO-4402, days out of State in the calendar year CO-4403, caring for a family member injured in military duty CO-4404) and the county's rebuttal finding (CO-4405); figures CO-4406 to CO-4408. Read in af_meets_residency (CO-942). HCA's day thirty-one (3.570.17.C.8.b) is in CO-1217 (CO-4409). E.4 against E.2: OQ-780. Probe PR-ABS: none, $0 (was oap, $452); stored as CO-165. |
| F-2 | Fixed (67cb58e). af_sponsor_deeming_applies (CO-4400): 40 qualifying quarters, every sponsor dead, or adjusted from refugee or asylee status ends deeming (3.520.69.B.2, B.5, C.1); read by CO-2386 and CO-947. Probe PR-SPON: nothing deemed, oap $452 (was $3,006 deemed, none); stored as CO-169. |
| F-3 | Fixed (c06ff74). CO-2384 deems from the spouse wherever the spouse lives (3.534.A-B, 3.520.63.D, S3204); parents only from the AND-CS child's home. The text has no living-together condition, so no open question. Probe PR-APART (with the spouse's support and medical-payment facts stated): 1,968 deemed, none (was oap $442); stored as CO-167. |
| F-4 | Fixed (c06ff74). CO-952 pays an AND-CS client the PNA only from the month after the first full calendar month (entry on or before the first day of the previous month; 3.548.F, S1010); OQ-352 (2)'s statement is superseded by CO-952's precision. Probe PR-PNA: October $494 (was $0), November $0; stored as CO-168. |
| F-5 | Fixed (c06ff74). af_is_homeless (CO-4410) reads 3.510: shared housing is homeless only for a person moving among a succession of others (CO-4411). Probe PR-ISM: ISM 351, countable 931, oap. The grant is **$189**, not the review's $101: 1,032 - 931 = 101 is raised to the OAP payment floor of 3.530.C (af_oap_payment_floor). Stored as CO-166. |
| F-6 | Fixed (c06ff74). af_exempt_liquid_resources (CO-4412) subtracts from liquid resources the refunds (federal CO-4172, State and PTC CO-4413, 12 months), retroactive SSA benefits (CO-4414, 9 months), a loan in the month received, ABLE (CO-4415), business cash (CO-4416) and replacement proceeds for 3 or 6 months or an extension (CO-4417 to CO-4421); read by CO-4000. Probe PR-PTC: 1,700, oap. |
| F-7 | Fixed (c06ff74). af_self_support_property_countable_value (CO-4422): non-business income-producing property (CO-4423, CO-4424) over $6,000 when it returns 6% of the excluded equity or the shortfall is excused (CO-4428), all of it otherwise; home-use production property over $6,000 (CO-4425); figures CO-4426, CO-4427. Limit stated in CO-4422: several properties are stated together and tested together. The D.1.c/D.3.c continuation is the county's statement of the property as still in use. |
| F-8 | Fixed (c06ff74). CO-4000 counts retirement accounts less retirement_accounts_taxes_due (CO-4429), or less 20% (CO-4430) when unstated (3.520.73.B.1), and subtracts the property the county exempts as unsaleable at two-thirds, a co-owner's hardship or a legal impediment (CO-4431; 3.520.741.D, 3.520.742.C). Changed: CO-4000-T1 and CO-3400-T1 1,700 to 1,500 (700 + 1,000 x 0.8); CO-130 p1 resources 2,500 to 2,200 (1,000 + 1,500 x 0.8 + 0), still under $3,000, oap $542 unchanged. |
| F-9 | Fixed (c06ff74). Trust corpus that can be paid to or for the person (CO-4432; 3.520.72.B.13 - POMS SI 01120.200/.201 are on ssa.gov, not an allowed host, so the fact states the SSA reading's result); refused potential resources counted as available (CO-4433; 3.520.71.H.1); the proof of pursuit as a pending element in af_pending_verification_count (CO-4434 in CO-1436; H). B.12 (an incapacitated client's estate) is the client's own holding (CO-4000's precision). |
| F-10 | Fixed (c06ff74). in_kind_earned_income_value (CO-4437) and af_donated_work_income (CO-4443, over CO-4438 to CO-4442) in af_gross_earned_income (CO-3830), and for a spouse (CO-2384) and sponsor (CO-2386). Which minimum wage: OQ-781 (federal figure assumed; Colorado's is published only by CDLE). |
| F-11 | Fixed (c06ff74). unearned_income_offsetting_expenses (CO-4444: rental, workers' compensation, life and health insurance, lawsuit and G.I. Bill expenses, each up to its receipt) subtracted in CO-3831. Probe PR-RENT with the expenses stated: countable 880, oap; the grant is **$189** (floor), not the review's $152. |
| F-12 | Lottery and gambling prizes fixed (c06ff74): CO-3831 counts lottery_gambling_winnings_received (3.520.785.B.13). The inheritance part is **not P1**: lump_sum_received (CO-3367) is "Part of the person's gross unearned income for the month as the unearned income facts state it (other_unearned_income_taxable or _nontaxable), not added to it", and the probe stated the $5,000 there but left other_unearned_income_nontaxable at 0. Stated as the facts define it, PR-LUMP gives 5,580 and none, as the review expects (CO-3831-T5). The held remainder is F-6's CO-4414. |
| F-13 | Fixed (c06ff74). af_and_is_barred_as_institution_patient (CO-4446, statute_override on 3.520.61.B, 3.543.D and 3.548.D) bars AND-SO (CO-1203) and AND-CS (CO-953) for a patient in a psychiatric or TB hospital, an institution primarily for mental diseases, or a medical institution for TB or psychosis (CO-4445); OAP unaffected ((2)(a)(III)). Probe PR-IMD: none (was and_so $248). |
| F-14 | Fixed (c06ff74). af_is_serving_ipv_disqualification (CO-4447; 3.583.N), af_is_in_ebt_misuse_ineligibility_period (CO-4448; 3.581.I.3) in every CO-953 branch, CO-1203 and HCA (new status ineligible_sanction); af_im14_signed (CO-4449; 3.545.A.2, 3.520.4.C.5.a) in CO-1203. |
| F-15 | Fixed (67cb58e). CO-2390 counts each sponsor and non-signing spouse with af_person_countable_resources_other_than_life_insurance plus life insurance under the client's program (3.520.72.E, 3.520.75.D, E.4, F.4); CO-947's stale R-11 assumption deleted. |
| F-16 | Fixed (67cb58e). D-300 (rule version 10320) fetched from sos.state.co.us; OQ-553 resolved: a sponsor's dependents are the children the sponsor claims on income tax (S3200). CO-2386 counts sponsor_dependent_count (redefined, CO-2387) plus other sponsored persons of the case who are the sponsor's tax dependents. CO-94: 715 to **1,212** each (3,200 - (994 + 497 + 497)); CO-2386-T4 1,509 to 2,006 (3,000 - 994); new T5-T7. |
| P2-1 | Open question OQ-782 (state policy choice; CO-2343 linked). |
| P2-2 | Deferred: 3.520.783.C's farm averaging and $55/$22 day-care allowance need new facts (children cared for, the documented-cost choice) and parameters, and this round's item range (CO-4400 to CO-4449) is used up; recorded in docs/colorado-notes.md. |
| P2-3 | Open question OQ-783 (needs Legal; CO-950, CO-1203 linked). |
| P2-4 | Partly fixed (c06ff74): the 30-day hospital or facility stay of 3.570.17.C.4.b in CO-1217 (entry date, expected stay, CO-4409). Deferred: the 42 days of combined leave (C.7) and payment from the month after approval (3.570.13.F), for lack of item numbers; recorded in CO-1217's precision and colorado-notes. |
| P2-5 | Fixed (c06ff74): intends_to_return_home (CO-4435); CO-4000 counts home_equity for a client in a facility with no intent to return (3.520.77.C.3, C.5). |
| P2-6 | Fixed (c06ff74): the retained MMMNA is money the client receives, stated in other_unearned_income_nontaxable and counted by CO-3831 (both precisions now say so). |
| P2-7 | Fixed (c06ff74): the 90-day dating and the re-examination date are in af_and_so_medical_certification_received's meaning (CO-2824, S3220). |
| P2-8 | Fixed (c06ff74): af_burial_request_is_timely (CO-4436) in CO-1231 (3.570.43.C, S3219). |
| P3 | Fixed (c06ff74): (1) CO-952 and CO-949 no longer describe an Aid to the Blind branch; (2) OQ-662 cites 3.510 "Eligible client"; (3) life estate (CO-1512), joint-account allocation and first-of-month timing (CO-4000), original face value (CO-4001) stated in the precisions; (4) PARIS recorded in docs/colorado-notes.md as an interface with no element of its own; (5) see (3). |
