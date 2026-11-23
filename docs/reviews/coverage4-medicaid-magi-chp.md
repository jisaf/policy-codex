# Coverage review, fourth pass: MAGI Medicaid and CHP+ (family file `coverage4-medicaid-magi-chp`)

Reviewer pass: fourth exhaustive coverage matrix, 2026-11-23, on `704da6b` (branch `ccr-9d19bf4c-wmnwcl`, "Merge receipts harness classification"). Review only: nothing in the volume was changed.

Governing texts:
- 10 CCR 2505-10 § 8.100.1 to § 8.100.4 (D-65), rule version 12735, effective 11/14/2026; § 8.100.3.K (income) read in full, since the earnings records now cite it for MAGI.
- 10 CCR 2505-3 (D-66), rule version 12687, effective 08/30/2026: § 50, §§ 100-180, §§ 300-330, §§ 400-440.
- 42 CFR 435.603 (D-34) as § 8.100.4.C and E adopt it; 26 U.S.C. 112 (D-4340, on file). Fetched for this pass from Cornell LII (an allowed host), not yet on file: 26 U.S.C. 62(a)(4) ("Deductions attributable to rents and royalties") and 26 U.S.C. 223(f)(1) ("Any amount paid or distributed out of a health savings account which is used exclusively to pay qualified medical expenses of any account beneficiary shall not be includible in gross income").

Out of scope: §§ 8.100.5 to 8.100.7 (non-MAGI reviewer). Rows of § 8.100.1 to § 8.100.3 that only define or route to those groups are "NA (non-MAGI)".

**What changed since pass 3, and so got the closest reading.** Unearned income from receipt records through the MAGI counting table (receipts, CO-5000; ma_magi_receipt_treatment_table, CO-5500); earned income from earnings records through the MAGI earnings table (earnings, CO-5100; ma_magi_earnings_treatment_table, CO-5106; ma_magi_wage_earnings CO-5160, ma_magi_self_employment_earnings CO-5161 on `net_for_tax`, CO-5162, CO-5214); CHP+ adopting MAGI by its cited link (10 CCR 2505-3 150.1, S245, on CO-704, CO-1641, CO-2229; 130.1, S869, on CO-1642, CO-3634); decision 4 (missing information is "cannot determine" unless the rule says otherwise); the time contract `month-v1` (ma_age_on_first_day_of_month CO-4978, ma_age_on_last_day_of_month CO-5402, ma_age_before_month CO-4790); the Express Lane day-90 fix (CO-2445); the duplicate-paths audit (D-M9, D-M12, D-M15, D-C1 kept); OQ-1023, OQ-1024 (MAGI half) settled; OQ-1120 to OQ-1124, OQ-1180, OQ-1181 added.

**Method.**
- Scratch copy: `git worktree add --detach <scratch>/wt 704da6b`; `npm run export -- --volume co` (2,266 items). I built the matrix from the D-65 and D-66 text: § 8.100.4 and D-66 §§ 50-180 and 300-440 line by line; § 8.100.3.K, Q and R line by line; the rest of § 8.100.1 to § 8.100.3 paragraph by paragraph. I did not copy earlier rows.
- I walked every item reachable from the MAGI and CHP+ outcomes (ma_magi_eligibility_status, ma_family_planning_status, ma_express_lane_status, the presumptive items, chp_eligibility_status, chp_express_lane_status, chp_verification_status, chp_copayment): 1,006 items, the non-MAGI routes of emergency Medicaid included. I read the derivation of every MAGI and CHP+ item on the path and listed every `otherwise` default in it (decision 4 sweep).
- I read every row of CO-5500 (58 receipt kinds) and CO-5106 (22 earnings kinds) against § 8.100.4.C.1, § 8.100.3.K and the Code sections C.1 and C.1.e incorporate (26 U.S.C. 61, 62).
- Probes: a small runner (`scratch4/run.ts` in the scratch copy) applies a patch to a stored case (CO-226, a single adult; CO-228, a filer and a child) and evaluates identifiers per month with the engine. Determination date 2026-11-10 unless stated. 2026 guidelines: $1,330.00 a month for one, $1,803.33 for two, $2,276.67 for three, $2,750.00 for four.
- `npm run check` at `704da6b`: OK; household expectations 3,864/3,865 (the one failure is CO-387's CHP+ copayment band, known-failures.json, OQ-810); conformance self-check 8,806/8,806.
- Each finding is labeled **common case**, **rare edge combination** or **decision 4**.

## 1. Verdict

**8 P1 found. The family does not meet the stopping rule.**

None is a regression of the pass-3 fixes (section 5: every earlier P1 still holds, and every stored probe passes). Five of the eight come from the changes since pass 3:
- **The counting tables (C4-01 to C4-04).** Four rows of the two MAGI tables give a different figure from the tax figure that § 8.100.4.C.1 and 42 CFR 435.603(e) count. Two of those rows say "no rule" where the text on file names the money: § 8.100.3.K.3-4 and C.1.a.v count pay in kind, and § 8.100.3.K.10.c-e nets boarders' payments. Two open questions, OQ-1121 and OQ-1123, record wrong answers as "state policy choice" although the text on file (or on an allowed host) settles them.
- **Decision 4 (C4-05, C4-06).** Two non-rule defaults give a definite answer where the rule needs a fact. The § 8.100.4.C.4.a annualization reads "not self-employed" for a person whose earnings records state a business, and the custodial parent defaults to the claiming parent even when the stated home says otherwise.
- **The time contract (C4-07, C4-08).** CHP+'s newborn guarantee, and MAGI household composition, still read the age on the determination date in every month.

There are also 6 P2 findings (C4-09 to C4-14) and 3 P3 findings (C4-15 to C4-17). Open-question classes are in section 4: OQ-1121, OQ-1123, OQ-970 and OQ-1124 fail the class check.

## 2. Findings

P1: a wrong eligibility or benefit answer, a missing pathway or program, or an element a rule reads that is undefined. P2: a gap that does not change an answer today, or a citation or definition gap. P3: wording.

| ID | Pri | Label | Paragraph | Item(s) | Governing text | What is wrong (repro) | Proposed fix |
|---|---|---|---|---|---|---|---|
| C4-01 | **P1** | common case | 8.100.4.C.1 (26 U.S.C. 61 incorporated); 42 CFR 435.603(e) | CO-5500 row `savings_account_distribution: counted_no_rule_excludes`; CO-5501; CO-502 | C.1: "pursuant to 26 U.S.C. § 61 gross income means all income from all derived sources"; 26 U.S.C. 223(f)(1): an HSA distribution "used exclusively to pay qualified medical expenses ... shall not be includible in gross income" (likewise 529(c)(3)(B), 530(d)(2), 408A(d)(1) for 529, Coverdell and qualified Roth distributions) | The kind (CO-5000) covers "a withdrawal or distribution from an account the person owns ... for retirement ..., for health costs (a health savings account), for education ... or under an individual development account". The row counts all of it. Its reason, "taxable income under the Code that no paragraph of 8.100.4.C.1.d excludes", holds only for a taxable IRA or 401(k) distribution. The record has no field for the taxable part. **B-HSA:** a single adult with wages of $1,500 takes a $500 HSA distribution in November to pay a hospital bill. Engine: MAGI $2,000, 150.4%, `ineligible_income`. By hand: the HSA money is not gross income, so MAGI is $1,500, 112.8% ≤ 133%: `adult`, `eligible`. | Split the kind into a taxable retirement distribution (counted) and a tax-free distribution (HSA or 529 for qualified expenses, Roth or Coverdell qualified, IDA): not MAGI income. Or add a `taxable_amount` field that MAGI reads. Re-read the SSI and other programs' rows for the split (OQ-995 is the SSI half). |
| C4-02 | **P1** | rare edge combination; text on file decides | 8.100.4.C.1.a.i; 42 CFR 435.603(e); 26 U.S.C. 112(a)-(b) (D-4340, S4340) | CO-5106 row `wages: counted`; CO-5160; CO-5100 (no field); OQ-1123 | 112(a): "Gross income does not include compensation received for active service as a member below the grade of commissioned officer for any month during any part of which such member served in a combat zone"; (b) for an officer, up to the maximum enlisted amount | OQ-1123's own body says the text excludes basic pay for a combat-zone month. Its assumption counts that pay, because the wages record has no field (request R-3, docs/reviews/records-earnings-medicaid.md). The answer is wrong for every such household, and the question is not a policy choice. **COMBAT-FAM:** an enlisted member deployed to a designated combat zone in November earns basic pay of $3,800 and hostile fire pay of $225 (combat_zone). His spouse is at home with their two children; they file jointly; household of 4. Engine (spouse p2): MAGI $3,800, 138.2% > 133% + 5, `ineligible_income`. By hand: neither pay is gross income, so MAGI is $0 and the spouse is `parent_caretaker`, `eligible`. Single-person mechanism, **B-COMBAT:** $2,800 basic pay counted. | Add the R-3 field to the wages record (`combat_zone_month`, the month served in a combat zone; for an officer, the excluded amount up to the 112(b) cap). Have CO-5160 leave it out. Mark OQ-1123 settled by 26 U.S.C. 112 rather than a state policy choice. |
| C4-03 | **P1** | common case among households with boarders; text on file decides | 8.100.3.K.10.c-e (S4107); 8.100.4.C.1.b.ii, C.1.e (26 U.S.C. 62 incorporated) | CO-5106 rows `boarder_payments: counted`, `business_cost_boarder_provision: not_deducted_open_question`; CO-5160; OQ-1121 | K.10.e: room and board payments are earned income "to the extent that the payment for room and board exceeds ... documentable expenses directly related to the provision of room and board" (c and d alike); 26 U.S.C. 62(a)(4), incorporated by C.1.e: the deductions "attributable to property held for the production of rents or royalties" come off in AGI | MAGI counts boarders' payments at their gross amount. OQ-1121 says "Neither says whether the costs ... are deducted; the Code's rules on rental expenses are not on file". But § 8.100.3.K.10.c-e (D-65, already cited for the SSI method) nets them, and so does 26 U.S.C. 62(a)(4), served by Cornell LII. § 8.100.3.K applies to MAGI unless § 8.100.4 says otherwise: K.7 and K.11.a.i.1 carve out MAGI by name, so K.10 is not carved out. **B-BOARD:** a single adult with wages of $1,100 and two boarders paying $900 a month for room and board, with $250 of costs stated as a `business_cost_boarder_provision` record. Engine: MAGI $2,000, 150.4%, `ineligible_income`. By hand: 1,100 + (900 - 250) = $1,750, 131.6%: `adult`, `eligible`. | MAGI deducts the boarder provision cost records from the boarder payments (the tax net; the per-boarder SNAP allotment of K.10.c and e is a disregard that 42 U.S.C. 1396a(e)(14)(B) bars for MAGI, so only the actual costs). Settle OQ-1121 by the text and record 26 U.S.C. 62 as a document. |
| C4-04 | **P1** | common case (in-kind housing, an employer paying rent from pay) | 8.100.4.C.1.a.v; 8.100.3.K.3-4 (S4107); 26 U.S.C. 61(a)(1) | CO-5106 rows `in_kind_pay`, `employer_vendor_payment: not_counted_no_rule_found`; CO-5160 | C.1.a.v: "Compensation for services, including fees, commissions, fringe benefits and similar items"; K.3: "Earned income is payment in cash or in kind for services performed as an employee or from self-employment"; K.4: "compensated in shelter or other items in lieu of wages" | The rows say "no text on file names it". C.1.a.v and K.3-4 name pay in kind, and pay an employer sends to a third party "from funds the employer would otherwise pay the person" (CO-5100) is wages under 26 U.S.C. 61(a)(1) (SNAP settled the same money as counted, OQ-1021). MAGI is understated and the household is wrongly found eligible. **B-INKIND:** a single adult with $1,200 of cash wages and an $800 house the employer provides in place of wages. Engine: MAGI $1,200, 90.2%, `adult`, `eligible`. By hand: $2,000, 150.4% > 138%: `ineligible_income` for full coverage (limited Family Planning on size 2, 110.9%). **B-VENDOR** ($800 of rent paid from pay): the same. | Count both kinds in MAGI. If the owner wants the 26 U.S.C. 119 exclusion (meals and lodging on the employer's premises for the employer's convenience), add it as a field of the in-kind record, not by leaving the kind out. |
| C4-05 | **P1** | decision 4; common among self-employed applicants | 8.100.4.C.4.a (S3356) | CO-4557 `has_self_employment_seasonal_or_commission_earnings` ("Read as false where not stated"); CO-4559 (`expected_annual_income` ... `otherwise 0`); CO-4975, CO-4567, CO-504 | C.4.a: "Applicants who are found financially ineligible based on current or previous monthly household income ..., and whose household has earned income from self-employment, seasonal employment, and/or commission-based employment, shall have their financial eligibility determined using annualized ... income" | Two defaults, neither given by a rule, make C.4.a silently not apply. (1) The flag reads false when not stated, even when the person's own earnings records state a business (a `self_employment_receipts` record). The self-employment half is now stated twice, and the two statements can disagree. (2) CO-4559 reads an unstated expected annual income as "no change from the month". So a self-employed applicant over the monthly standard is `ineligible_income` where the rule needs the annual figure. **B-SE-noflag:** a single adult with a business record (net for tax $3,000 in November), expected annual income $20,000 and the flag not stated. Engine: 225.6%, `ineligible_income`. By hand: self-employed, so annualized $20,000 / 12 = $1,667, 125.3%: `adult`, `eligible`. **B-SE-noannual** (flag true, annual income not stated): engine `ineligible_income`; rule: cannot determine. | Derive the self-employment part of CO-4557 from the earnings records (a self-employment or farm receipts record). Keep a supplied fact only for seasonal or commission earnings, with no default. Remove CO-4559's `otherwise 0`. Test the monthly figure first (CO-4975), so that an applicant eligible on the month does not become unknown when the annual figure is unstated. |
| C4-06 | **P1** | decision 4; common where custody is not stated | 8.100.4.E.1.c.iii; 42 CFR 435.603(f)(2)(iii) | CO-1946 `ma_custodial_parent` ("If not stated, Medicaid reads the parent who claims the child as the custodial parent"); CO-1976; CO-500 | E.1.c.iii: "The applicant is a child under 19 and who expects to be claimed as a tax dependent by a non-custodial parent", then E.1.d's non-filer rules | The default is not given by a rule, and it ignores the home the case states (lives_with, from dwelling_id). The meaning of CO-1946 itself names "the parent with whom the child spends most nights". **H3:** the father p1 (dwelling h2, wages $4,000) claims p3 (16), who lives with her mother p2 (dwelling h1, non-filer, wages $1,000); custody is not stated. Engine: p3's household {p1, p3}, $4,000, 221.8%; Medicaid `ineligible_income`, CHP+ `eligible_child` (copayments). By hand: claimed by a non-custodial parent, so non-filer rules give {p2, p3}, $1,000, 55.5%: Medicaid `child`, `eligible`; CHP+ `ineligible_medicaid_eligible`. **H3-cust** (ma_custodial_parent p2): matches the rule. | Where custody is not stated, read the custodial parent from the stated home: the one parent the child lives with, if exactly one parent does; otherwise cannot determine. State the default on CO-1946 as that reading. |
| C4-07 | **P1** | rare edge combination (late-reported or late-determined newborn); month-v1 | 10 CCR 2505-3 § 430.5, 430.5.A; § 430.1 | CO-2410 `chp_is_guaranteed_newborn` (person scope, reads `age` on the determination date); CO-4565, CO-707 | 430.5: "A child born to a mother who is enrolled in the Children's Basic Health Plan at the time of the child's birth is guaranteed coverage for one year"; 430.5.A: "A newborn can be reported at any time by any person" | The time contract has a month-scoped rule measure an age in the month it evaluates (docs/operators.md, "Ages in a month"). CO-2410 is per person, so every month of the case uses the determination-date age. The time audit lists it as "the determination date, yes" (time-audit-generated.md) and accepts it under "as recorded". **NB-CHP-late:** born 2025-10-20 to a mother enrolled in CHP+; the birth is reported in October 2026; application 2026-10-05; determination 2026-10-25; family income 300%. Engine: August and September 2026 `ineligible_before_coverage_period`, October `ineligible_income`. By hand: the child is under 1 on every day of August and September, so the guarantee covers them (`eligible_newborn`; CO-4565 itself says the guarantee "runs from birth without an application"), and October 1-19. Converse **NB-CHP-early** (determined 2026-09-25): November and December 2026 `eligible_newborn`, after the first birthday. | Make the newborn test per month on the month's age (under 1 on the first day of the month, CO-4978, or record CHP+'s reading for the birthday month, since § 430.1 makes coverage effective from the first of a month). Add NB-CHP-late as a stored case. |
| C4-08 | **P1** | rare edge combination (retroactive month, birthday before the determination) | 8.100.4.E.1.d.iii-iv; 8.100.3.E.1; 42 CFR 435.915(a)(2) (S218) | CO-500 `ma_magi_household_members` (person scope, `age` < 19); CO-1976; CO-4558; CO-501 | E.1.d.iii: "The applicant's natural, adopted, and step children under the age of 19, who live in the household"; 435.915(a)(2): eligible in the retroactive month if the person "would have been eligible ... at the time" | The household is built once, on the determination date's ages, and every month reads it, the retroactive months included. The time audit (T-1) records the scope ("household membership ... stay on the determination date by their scope"), but not the wrong answer it gives, and no open question carries it. **RETRO19:** a non-filer mother with wages of $2,000; her son was born 2007-10-15 and turns 19 on 2026-10-15; application 2026-11-02 with retroactive coverage requested; determination 2026-11-10. Engine, September 2026: the mother's household is {mother}, 150.4%, `ineligible_income`. By hand: in September the son is under 19 and lives with her, so the household is {mother, son}, $2,000 / $1,803.33 = 110.9%: `adult`, `eligible` (the son has minimum essential coverage). | Evaluate the household's age tests in the month (a per-month household, or month-scoped age tests inside CO-500, CO-1976 and CO-4558). Or open a question that states this effect for the owner. Add RETRO19 as a stored case. |
| C4-09 | P2 | rare edge combination | 8.100.4.C.1.b.vi-vii; 26 U.S.C. 72, 104(a)(4), 111 | CO-5500 rows `pension: counted`, `insurance_cash_value`, `income_tax_refund: not_taxable_income` | b.vi "Pensions and annuities"; b.vii "Income from life insurance and endowment contracts" | Each kind mixes taxable and non-taxable money, and MAGI reads the gross. A pension's recovery of after-tax contributions and military disability retirement pay excluded under 104(a)(4) are counted (overstated). Cash value taken above the policy's basis is taxable, and b.vii names it, but it is not counted (understated). A state refund is taxable to someone who itemized (111) but is not counted. | The same `taxable_amount` field as C4-01, read by MAGI wherever it is stated. Otherwise record the gross reading in the rows' precision, with an open question for the owner. |
| C4-10 | P2 | decision 4 | 8.100.3.K.1 | CO-4551 `ma_sponsor_deemed_income` (`is_sponsored_non_citizen` `otherwise no`; "A person whose sponsorship is not stated is read as not sponsored") | K.1: "Income or resources of an alien sponsor ... shall be countable to the sponsored alien" | A default made up by the reader: CO-1573 states none. A non-citizen adult whose sponsorship is not stated is read as not sponsored, so the sponsor's income is not deemed and the outcome is eligible rather than cannot determine. The sponsor relationship (CO-2713) and the fact can also disagree. A sponsor declared in the case with the fact unstated deems nothing. | Read sponsorship from the `sponsor` edge where one is stated. Otherwise leave it unknown for a non-citizen adult with fewer than 40 qualifying quarters, the only person the deeming can reach. |
| C4-11 | P2 | n/a (classification) | 8.100.4.C.1 | OQ-970; CO-5500 | (OQ-970's checked line) | OQ-970 still lists uniformed services special pay, which OQ-1024 settled for MAGI (the receipt row is `in_earnings`, the earnings row `excluded_in_combat_zone`). It also says "the Code sections that would decide them (26 U.S.C. 61, 112, 3121) are not on file": 112 is on file (D-4340), and 61 and 3121 are served by Cornell LII, an allowed host. So the question is neither a recorded state choice nor blocked on an unfetchable document. | Drop special pay from OQ-970. Fetch 26 U.S.C. 61 (and any Code section that settles a training allowance or AmeriCorps payment). Then settle the question, or state why the text leaves it to the State. |
| C4-12 | P2 | n/a (classification) | 8.100.4.H.2.a | OQ-1124; CO-549 | H.2.a: "on their 18th, 19th, 20th or up to their 21st birthday" | OQ-1124 says the age at which Colorado's title IV-E foster care assistance ends "is in the Colorado Department of Human Services' rules, not on file". Those rules are in the Code of Colorado Regulations (12 CCR 2509), served by sos.state.co.us, and the extension is in C.R.S. title 19, served by leg.colorado.gov. Both hosts are allowed (docs/plan-colorado.md, "Network"). The question records no attempt to fetch them. | Fetch the CDHS rule or the statute and settle the question. Or record the failed fetch and class the question blocked on a named document. |
| C4-13 | P2 | rare edge combination (cents at a limit) | 8.100.4.C, D | CO-502, CO-503 (rounded to the whole dollar), CO-4559 | C.1 and D state no rounding | MAGI income is rounded half up, per person and again per household, "following this volume's snap_household_gross_income convention". No text and no open question supports it. At 138%, $1,835.45 for one person (138.004%) is read as $1,835 (137.97%): `eligible` where the unrounded figure is `ineligible_income`. | Do not round MAGI income, or record the rounding as an open question (state policy choice; HCPF's CBMS practice). |
| C4-14 | P2 | common case (a working teenager below the filing threshold) | 8.100.4.C.1.f.i, C.2.a | CO-1344 `ma_electronic_data_source_household_income_pct_fpl`; CO-1402; CO-1403 | C.2: compare the "self-attested income" with the "electronic data source results" | The data figure sums every household member's data-source income, including a member whose income C.1.f leaves out (a child under the filing threshold). The attested figure, CO-504, leaves that member out. Reasonable compatibility therefore compares unlike figures. Example: a parent attests $2,000, and the 16-year-old earns $600 (not counted), household of 2. The attested figure is 110.9%; the data figure is 144.2% (above 133% + 5, and 1.30 times the attested figure). The pair is not compatible, so earned income documentation is asked for, although the counted income agrees. Verification only: no eligibility answer moves until the document is not returned. | Sum the data figure over ma_magi_household_income_members (CO-4558), the members whose income counts, as the attested figure does. |
| C4-15 | P3 | rare edge combination | 10 CCR 2505-3 § 50.19, 110.1.A.2, 330.4, 430.3 | CO-706, CO-1990, CO-2407 | 50.19: "'Woman' shall mean a female who is 19 years in age or older" | A pregnant 17-year-old in the CHP+ income band is `eligible_child` (CO-707 tests the child first), but CO-706 has no age test, so she is also read as a Prenatal Care Program client (exempt from cost sharing, with the § 430.3 postpartum span). By § 50.19 she is a child. Federal CHIP cost-sharing rules for pregnancy services may support the reading, but nothing records it. | State the reading in CO-706's precision (or test age 19 or older, per § 50.19). |
| C4-16 | P3 | n/a | 8.100.3.K.8.a-c | CO-5106 row `wioa_on_the_job_training: counted_no_rule_excludes` | K.8.c: WIA wages "paid to any dependent child ... are exempt ... for a period not to exceed six months in each calendar year" | The row says no rule excludes the pay. K.8.c does, for a dependent child (the SSI table applies it, CO-5179, CO-5180). For MAGI it is displaced by 42 U.S.C. 1396a(e)(14)(A)-(B), which bars other disregards; C.1.f.i reaches most such children. The row should say so. | Cite K.8.c and the displacement in the row's reason. |
| C4-17 | P3 | n/a | 8.100.4.C.1.a.ii | CO-5100 field `net_for_tax`; CO-5161 | (meaning) | The field says "its net earnings from self-employment as the person's federal income tax return reports them". It does not say that the amount is the month's share, which the retired CO-024 said ("monthly share"). CO-5161 sums it month by month, so stating the return's annual figure would count it every month. | Add "for the month (the year's net divided over its months, or the month's net)" to the field. |

Checked and not a finding:
- The five pass-3 fixes and their controls (CO-226 to CO-228, RV3-FPA, FPM, FPRCB, STEPN, NB1) hold. C3-08 (CO-387) is recorded in OQ-810 and is the household's one known failure.
- The income limits at their boundaries, on the engine (CH*, PG*, B-138*): Adults 138% ($1,835 eligible, $1,836 ineligible, for one person); Children 147% ($2,650 Medicaid, $2,651 CHP+, for two); CHP+ 265% ($4,778 eligible, $4,779 ineligible); Pregnant Women 200% ($3,606 Medicaid, $3,607 CHP+ prenatal, cost sharing exempt); CHP+ prenatal 265%.
- Household composition probes H1 (a married couple filing separately, each claiming their own child: each spouse's household is the spouse pair plus their own dependents), H2 (unmarried parents living with their child, one claiming: the child takes non-filer rules under E.1.c.ii; the other parent is her own household), H4 (a 20-year-old claimed by her parents: her income is under the threshold, so it is left out under 435.603(d)(2)(i)) and H6 (a grandmother claiming a grandchild who lives with his non-filer mother: E.1.c.i, non-filer rules) match 42 CFR 435.603(f) and E.1-E.6.
- Ages under month-v1: the 19th birthday on the first of the month (child through November, none in December), the needy newborn born 2025-11-01 (not in November 2026), the 26th birthday month of former foster care (FFC26: October and November, not December), the 65th (RV-65 stored).
- The 12-month postpartum span (PP: in coverage through March 2027, not April, for a pregnancy that ended 2026-03-15).
- The Express Lane 90 days end on the enrollment date plus 89 (CO-2445): enrollment on August 1 gives October 29, the 90th day.
- Decision 4 on the records: an unstated receipts or earnings list makes MAGI income, and the outcome, cannot determine (B-NOREC, B-NOEARN). The remaining MAGI defaults are rule-given absences (no hardship exemption granted, no Express Lane referral, no recorded CE period), except those in C4-05, C4-06 and C4-10.
- The other CO-5500 rows (child support, workers' compensation, SSI, veterans' benefits, scholarships, TANF and Adult Financial cash, loans, gifts, refunds, energy assistance, foster care and adoption subsidies, G.I. Bill benefits) and the other CO-5106 rows (wages, work-study, SCSEP, Census, subsidized employment, Difficulty of Care, combat-zone special pay, net for tax for business and farm receipts) agree with § 8.100.4.C.1 and the tax figure.
- The duplicate paths the audit kept for this family (D-M9, D-M12, D-M15, D-C1): the copies agree today. D-M12 carries C4-14.

## 3. Coverage matrix

Key: **C** = carried by (the derivation was read; correct unless a finding is named). **NA** = not applicable, with the reason. **OQ** = open question. **GAP** = no item and no recorded reason. Rows marked † changed since pass 3 and were re-read against the new items.

### 3.1 § 8.100.1 Definitions

| Definition | Disposition |
|---|---|
| Adult (19 through the end of the 65th-birthday month; no Medicare) | C: CO-548 (CO-5402 ≥ 19, CO-4550 through the 65th month)†, CO-539, CO-552 |
| Children (through the end of the 19th-birthday month) | C: CO-564 (CO-4790)†, CO-545 |
| Parent and Caretaker Relative; Caretaker Relative | C: CO-547, CO-2606 (state plan S25). OQ-540 (the CCCAP half only) |
| Pregnant Women (12 months postpartum) | C: CO-546, CO-3601, CO-566, CO-560 (PP probe) |
| MAGI; Tax-Filer; Tax Dependent; Non-Filer | C: CO-500, CO-075, CO-076 (derived from the tax_filer edge) |
| Adjusted Gross Income | C: CO-502, CO-080. C4-03 (26 U.S.C. 62(a)(4) for boarders) |
| Dependent Child (under 18, or 18 and a full-time secondary student finishing by 19) | C: CO-4791 (CO-4978, first day of the month)†, CO-1720 |
| Medical Assistance Required Household | C: CO-4204, CO-2201; J.2 statute_override on CO-500 (C3-05) |
| Application Date; Effective Date | C: CO-088, CO-4100, CO-4101 |
| Earned, Unearned and In-Kind Income | C through C.1 and § 8.100.3.K† (CO-5100, CO-5000). C4-04 (in kind) |
| Difficulty of Care Payments | C: CO-5162, CO-5214† (F-18 fixed) |
| Electronic Data Source; Reasonable Compatibility; Reasonable Explanation | C: CO-1344, CO-1402, CO-1641. C4-14 |
| FPL | C: CO-181, CO-182. OQ-515 |
| Inpatient; Institution; Public Institution; Good Cause; Employed | C: CO-1105, CO-1104, CO-2220, CO-6200†. OQ-1180 |
| Alien; Citizen; Legal Immigrant; Legal Immigrant Prenatal | C: CO-002, CO-509, CO-5219 (F-16 fixed in CO-566) |
| Minimal Verification; Questionable | C: CO-1403 to CO-1412 |
| Minimum Essential Coverage | C: CO-085 (a record, not this volume's determination: recorded in its precision) |
| Resident; Secondary School; TMA | C: CO-505, CO-2250; CO-1720; CO-2430, CO-4205 |
| Administrative and descriptive terms (SSAp, PEAK, CBMS, CMS, CHP+, EPSDT, FFP, ex parte, complete application, eligibility site, common law marriage and the rest) | NA: no condition |
| Non-MAGI terms (ABD, LTC, MSP, SSI, OAP, PACE and the rest) | NA (non-MAGI) |

### 3.2 § 8.100.2 and § 8.100.3.A-J

| Para | Disposition |
|---|---|
| § 8.100.2 authority | NA: no condition |
| 3.A.1 (consider all categories) | C: CO-551 order, CO-1176, CO-707 |
| 3.A.2-A.11, B.1 county, C (transfers), D.1, D.3-D.7 (processing, procedure) | NA: procedure or administration |
| 3.B.2-B.5 (residency, incapable of intent, temporary absence) | C: CO-505, CO-2250 to CO-2257. OQ-472, OQ-612 |
| 3.D.2 (extension to verify) | C: CO-1414, CO-2220 |
| 3.E.1-E.2 (three retroactive months; request) | C: CO-4100, CO-4101, CO-2472 (Pub. L. 119-21 from 2027). C4-08 (household in a retroactive month) |
| 3.F.1.a, F.1.k (MAGI groups; emergency only) | C: CO-551, CO-1154, CO-1151, CO-510. OQ-200 |
| 3.F.1 other groups; F.1.n | NA (non-MAGI); NA (expired) |
| 3.G.1.a-d, f (residency, inmates, IMD, financial) | C: CO-2250, CO-1105, CO-554 (`incarceration_limited`), CO-1179, CO-562 |
| 3.G.1.g.i-viii (citizenship and immigration status) | C: CO-509, CO-1172, CO-2700 to CO-2705. OQ-213, OQ-510, OQ-517, OQ-518, OQ-550 |
| 3.G.1.g.ix (Cover All Coloradans) | C: CO-1173, CO-562, CO-2430, CO-2431. OQ-214 |
| 3.G.2-G.3 (VLP; reasonable opportunity) | C: CO-1413, CO-1415, CO-2221 |
| 3.H.1-H.10 (citizenship and identity documentation) | C: CO-1395 to CO-1399, CO-1306, CO-2211 to CO-2214. H.5-H.8: NA (procedure) |
| 3.I.1 (SSN) | C: CO-1401, CO-2215 |
| 3.I.2-I.4 | NA: no MAGI condition |
| 3.J.1 (choice of methodology) | NA: both are determined |
| 3.J.2, J.2.a, J.3 | C: CO-500 statute_override (42 CFR 435.603(f)); CO-5500 `ssi: excluded`† |

### 3.3 § 8.100.3.K Consideration of income (read in full this pass)

| Para | Disposition |
|---|---|
| K.1, K.1.a (sponsor income; pregnant women and children excepted) | C: CO-4551 to CO-4555, CO-503. OQ-812. C4-10 |
| K.2 (income in general) | C through C.1 for MAGI (CO-502) |
| K.3-K.4 (earned income in cash or in kind)† | MAGI: **C4-04** (CO-5106 does not count in-kind pay). SSI method: NA (non-MAGI) |
| K.5 (when received) | C: the records' month and date (CO-5000, CO-5100), read by CO-5501 and CO-5160 |
| K.6 (Home Care Allowance paid to a provider is earned income)† | C: stated as `wages` in earnings (CO-5160); the client's own allowance is `home_care_allowance`, not MAGI income (CO-5500) |
| K.7 (Difficulty of Care, MAGI exclusion)† | C: CO-5162, CO-5214 (F-18 fixed) |
| K.8.a-c (WIA wages and allowances)† | C: wages counted (CO-5106); training allowances not MAGI income (CO-5500 `workforce_program_payment`, `vocational_training_allowance`; OQ-970). K.8.c: C4-16 |
| K.9 (self-employment net profit; depreciation for MAGI)† | C: CO-5161 reads `net_for_tax` (the return's figure, depreciation included). C4-17 |
| K.10.a-b (farm; rental as self-employment) | C: net for tax (CO-5161); rental receipts (CO-5500) with rental expenses in pretax_deductions (CO-080, 26 U.S.C. 62) |
| K.10.c-e (board, room, room and board)† | **C4-03** (MAGI counts them gross). OQ-1121 misclassified |
| K.11 (unearned income) | C through CO-5500 for MAGI. C4-01, C4-09 |
| K.12-K.14 (stimulus, FPUC, tax refunds and credits) | C: CO-5500 `income_tax_refund: not_taxable_income`; stimulus and FPUC expired. C4-09 (state refunds) |

### 3.4 § 8.100.3.L-R

| Para | Disposition |
|---|---|
| L (resources) | NA: no resource test for MAGI |
| M, N, O | NA: funding, confidentiality, non-discrimination |
| P.1-P.4 (redetermination, ex parte) | NA: procedure |
| P.5 (reconsideration period) | C: CO-088 precision |
| Q.1, Q.1.a (12-month continuous eligibility, children) | C: CO-561, CO-555, CO-556 |
| Q.1.b.i-viii (exceptions; the incarceration benefit) | C: CO-2205, CO-2200 to CO-2204, CO-554 |
| Q.2, Q.2.a-g (start; programs; transition from CHP+) | C: CO-556, CO-2446, CO-2448 |
| Q.3 (foster care exit) | C: CO-561 (`foster_care_exit`) |
| R.1, R.1.a-d (hospital presumptive eligibility: who) | C: CO-2432, CO-2433, CO-2438, CO-3154 |
| R.2.a-f (declared income and status by group) | C: CO-2439, CO-3151 to CO-3153, CO-2434. OQ-590, OQ-204 |
| R.3, R.4, R.6, R.7 | NA: procedure |
| R.5 (period) | C: date-scoped outcome |
| R.8, R.9 (not while enrolled; once a year or a pregnancy) | C: CO-2435 to CO-2437 |

### 3.5 § 8.100.4.A-D

| Para | Disposition |
|---|---|
| A.1-A.3 (SSAp; sites; EPSDT referral) | NA: procedure |
| B.1.a, a.i, a.i.1 (SSN; emergency only when status is not met) | C: CO-1401, CO-1151, CO-554 |
| B.1.b (citizenship and identity) | C: CO-1395 family |
| B.1.c (earned income: attested, verified electronically, documents)† | C: CO-1403 with CO-5163, CO-5164; CHP+ CO-1642 (S869). Wage stub rules: NA (evidence handling) |
| B.1.d (unearned income self-attested)† | C: CO-1404, CO-2870 (reads CO-5501); CHP+ CO-3634 |
| B.1.e (VLP) | C: CO-1412, CO-1413 |
| B.2-B.6 (questionable; age, relationship, living in the home) | C: the `*_attestation_is_questionable` facts, CO-1406 to CO-1409. B.3, B.4: NA |
| C.1 (26 U.S.C. 61)† | C: CO-502 = CO-5160 + CO-5161 + CO-079 + CO-5501 + CO-082 + CO-5502 + CO-1190 - CO-080 - CO-5214. **C4-01, C4-02, C4-03, C4-04**; C4-13 |
| C.1.a.i-vi (earned income)† | C: CO-5106 rows wages, work-study, SCSEP, Census, subsidized employment (counted), business and farm (net for tax), private disability (CO-5500 `other_taxable`). C4-02 (wages in a combat-zone month), C4-03, C4-04 |
| C.1.b.i-xiii (unearned income)† | C: CO-5500 rows social_security, pension, tax_exempt_interest, interest_and_dividends, rental_income, other_taxable (pre-2019 alimony, trusts), unemployment; CO-079 (capital gains, discharge, decedent, partnership). C4-01, C4-09 |
| C.1.b.xiv.1-4 (winnings) | C: CO-5502, CO-1185, CO-1187, CO-503. OQ-592 |
| C.1.b.xiv.5 (hardship exemption) | C: CO-2222 (absence read as not granted: no request) |
| C.1.b.xv (discharged student loans) | C: CO-1188 to CO-1190 |
| C.1.c.i-iii (tax-exempt interest, foreign wages, Title II) | C: CO-5500, CO-082 |
| C.1.d.i-ix (exclusions)† | C: CO-5500 `excluded` and `not_taxable_income` rows; lump sums by month received |
| C.1.e.i-xv (deductions; 26 U.S.C. 62) | C: CO-080. C4-03 (the boarder cost records are not read) |
| C.1.f.i, f.i.1, f.ii, f.ii.1, f.iii (children's and dependents' income) | C: CO-4558 (child and stepchild roles), CO-4568, CO-563 (H4, H6 probes) |
| C.2, C.2.a.i-iii, C.2.b (reasonable compatibility, explanation, documents) | C: CO-1402, CO-1403, CO-1641, CO-1642. OQ-302, OQ-813. C4-14 |
| C.3 (self-employment ledger) | C: CO-1403 arm c with CO-5164 |
| C.4 (monthly budget) | C: CO-503, CO-504 |
| C.4.a (annualized income) | C: CO-4556, CO-4557, CO-4559, CO-4975, CO-4567. OQ-810 (C3-08, CO-387). **C4-05** |
| C.5 (premium tax credit income below 100%) | C: CO-4560 to CO-4564, CO-504. OQ-811 |
| D.1, D.1.a-b (the 5-point disregard) | C: CO-183, CO-539, CO-545 to CO-548 (435.603(d)(4) statute_override), CO-704, CO-1155, CO-1402, CO-1641, CO-3156, CO-4792 (boundary probes) |

### 3.6 § 8.100.4.E-F

| Para | Disposition |
|---|---|
| E.1, E.1.a.i-iii (filer household) | C: CO-500 filer arm (H1) |
| E.1.b.i-iv (claimed dependent) | C: CO-500 dependent arm (H4) |
| E.1.c.i (claimed by someone other than a spouse or parent) | C: CO-563, CO-1976 (H6) |
| E.1.c.ii (both parents, not filing jointly) | C: CO-1976 (H2) |
| E.1.c.iii (non-custodial parent) | C: CO-1976, CO-1946. **C4-06** |
| E.1.d.i-iv (non-filer household) | C: CO-500 non-filer arm. **C4-08** (ages on the determination date in every month) |
| E.2 (pregnant woman as herself plus expected children) | C: CO-501 (every pregnant member) |
| E.3 (Family Planning counted as two in addition) | C: CO-4976, CO-1153. OQ-204 |
| E.4 (married couples living together) | C: CO-500 (H1) |
| E.5 (separated parents filing jointly) | C: CO-1976, CO-1947 |
| E.6 (dependent and filer: dependent) | C: CO-500 (the filer arm requires not claimed) |
| F.1, F.2.a-c (presumptive: pregnant, child, Family Planning) | C: CO-558, CO-559, CO-3155, CO-3151. OQ-590 |
| F.3, F.4, F.6, F.7 | NA: procedure |
| F.5 | C: date-scoped outcomes |
| F.8, F.9 | C: CO-558, CO-559, CO-3155, CO-2435 to CO-2437 |

### 3.7 § 8.100.4.G-J

| Para | Disposition |
|---|---|
| G.1 (eligible any day: the whole month)† | C: CO-4978, CO-5402, CO-4790 and their readers (month-v1). C4-07 (CHP+), C4-08 (household) |
| G.2, G.2.a (children 142%; through the 19th-birthday month) | C: CO-545, CO-564, CO-191 (CH2650 and CH2651; AGE19) |
| G.3, G.3.a.i-vi (parents and caretakers 68%; child in the home) | C: CO-547, CO-2606, CO-4791. OQ-612 |
| G.4, G.4.a (adults 133%; the dependent child's minimum essential coverage) | C: CO-548, CO-539, CO-552, CO-085 (B-138a and b) |
| G.4.b (COVID testing) | NA: expired |
| G.5, G.5.a.i (pregnant 195%; through the 12th month after; first verification) | C: CO-546, CO-565, CO-566, CO-560, CO-1624, CO-1625 (PG200, PG201, PP) |
| G.6, G.6.a.i-viii (Legal Immigrant Prenatal) | C: CO-509, CO-5219, CO-566 (F-16 fixed) |
| G.7, G.7.a (Eligible Needy Newborn) | C: CO-550 (CO-4978), CO-087, CO-3322 (NB-MA) |
| G.8 (limited Family Planning) | C: CO-1153 to CO-1155, CO-1176. OQ-204 |
| H.1.a-g (needy persons under 21) | C: CO-2419, CO-2414 to CO-2418. OQ-512 |
| H.2.a, a.i-iii, b, c (former foster care to the 26th-birthday month) | C: CO-549, CO-095 (FFC26). OQ-1124 (C4-12) |
| I.1, I.1.a-b, b.i (TMA) | C: CO-4205, CO-2430, CO-2425 with CO-6200†. OQ-1180 |
| I.2, I.2.a-b, I.3, I.4 | C: CO-2430, CO-4204, CO-4791, CO-551 order |
| I.5, I.5.a (four-month extension) | C: CO-2431 |
| J preamble; J.1.a.i-vi; J.2.a.i-vii (Express Lane)† | C: CO-2440 to CO-2445 (day 90 fixed), CO-3156, CO-2442 |
| J.1.b.i-ii | C: CO-2440 (no referral: `none`) |

### 3.8 10 CCR 2505-3 (CHP+)

| Para | Disposition |
|---|---|
| 50.1-50.2, 50.4-50.5, 50.8-50.12, 50.15, 50.17 | NA: administrative definitions |
| 50.3 Child (under 19) | C: CO-564 (through the birthday month; recorded on CO-705) |
| 50.6 Dependent child | C: CO-4791 |
| 50.7 Effective date | C: CO-4565 |
| 50.13 Household (per § 8.100.4.E) | C: CO-500 by its adopted-method link |
| 50.14 Income (per § 8.100.4.C)† | C: CO-504 read by CO-704 (S245). C4-01 to C4-05 reach CHP+ through it |
| 50.16 Presumptive Eligibility | C: CO-708 |
| 50.18 Unearned income | C: CO-5500 through CO-504 |
| 50.19 Woman | C: CO-706. C4-15 |
| 110.1.A.1-2 | C: CO-705, CO-706 |
| 110.1.B.1-5, B.5.o | C: CO-2706, CO-2707, CO-1173 |
| 110.1.C.1-3 | C: CO-1416, CO-2219. OQ-813 |
| 110.1.D | C: CO-505. OQ-612 |
| 110.1.E (children over 142% to 260%) | C: CO-704 with the disregard (CH2651, CH4778, CH4779) |
| 110.1.F (pregnant over 195% to 260%) | C: CO-704 (PG201, PG265, PG266) |
| 110.1.G (incomplete application) | C: CO-1416 to CO-1418 |
| 120.1.A-C (other coverage; Title XIX; inmates and IMD; reentry) | C: CO-090, CO-1176, CO-1105, CO-1104, CO-1749 |
| 120.2 | C: no waiting period item |
| 130.1 (minimal verification per § 8.100.4.B)† | C: CO-1416, CO-1641, CO-1642, CO-3634 (S869). C4-14 reaches CO-1641 |
| 140.1, A.1-6, B.1-2 | NA: procedure; B.2 through CO-088 |
| 150.1, 150.2 (income and disregard per § 8.100.4.C and D)† | C: CO-704, CO-1641, CO-2229 (S245) |
| 170.1.A-C, 170.5, 170.6 (presumptive) | C: CO-708, CO-3151, CO-2435 to CO-2437 |
| 170.2-170.4 | NA: procedure; 170.3 date-scoped |
| 180, 180.1.A.1-6, 180.1.B.1-2, 180.2.A.1-6 (Express Lane)† | C: CO-4792, CO-4793, CO-2445 |
| 200, 210 (benefits) | NA: benefit package |
| 300, 310 | C: no fee (repealed) |
| 320.1.A-D, C.3, D.3 (copayments by band) | C: CO-2228, CO-2230, CO-3009 to CO-3012. OQ-470; OQ-810 (CO-387) |
| 330.1-330.4 (AI/AN; 5% cap; preventive; prenatal) | C: CO-1989, CO-1990, CO-2229, CO-2231, CO-2230. C4-15 |
| 400.1, 410, 420 | NA: enrollment and plan administration |
| 430.1 | C: CO-4565, CO-707 |
| 430.2, A, A.i, B.i-viii | C: CO-2404, CO-2205, CO-707 |
| 430.3, 430.3.A.i | C: CO-2406, CO-2407. OQ-813 |
| 430.4 | NA: plan enrollment timing |
| 430.5, 430.5.A (newborn guaranteed one year) | C: CO-2408, CO-2410, CO-4565. **C4-07** |
| 440.1-440.3, 440.5 | NA: plan administration |
| 440.4.A-F | C: B, C, D (CO-090, CO-707). A, E, F: NA (conduct, copayment compliance, plan availability) |

Every numbered paragraph and subparagraph of the in-scope text has a row or sits in a grouped row; grouped rows are runs of procedure paragraphs or document lists with one disposition. No GAP row: each P1 sits in a carried row whose derivation was read and found wrong.

## 4. Open-question classification check

The stopping rule (docs/plan-colorado.md) accepts an open question classed as a genuine state policy choice, with the text checked recorded, or as blocked on a named document that no allowed host serves (allowed hosts: docs/plan-colorado.md, "Network"; hcpf.colorado.gov returned 403 again this pass).

| OQ | Class | Check |
|---|---|---|
| OQ-200 emergency "otherwise eligible" | state policy choice | Confirmed |
| OQ-204 Family Planning household of two and the disregard | needs Legal | Confirmed (rule against approved S59). "Needs Legal" is not one of the stopping rule's two classes; the owner should confirm that it counts as a state choice with Legal as owner (also OQ-213, OQ-214, OQ-472, OQ-510, OQ-518) |
| OQ-213, OQ-214, OQ-472, OQ-510, OQ-518 | needs Legal | Confirmed, with the class note above |
| OQ-302 reasonable compatibility base | state policy choice | Confirmed |
| OQ-303 period for other documents | state policy choice | Confirmed |
| OQ-410, OQ-411, OQ-412, OQ-593 community engagement | state policy choice | Confirmed (version 12735 has no community engagement text) |
| OQ-470 CHP+ copayment band gaps | state policy choice | Confirmed |
| OQ-512 MAGI needs standard | state policy choice | Confirmed |
| OQ-515 poverty guideline adoption date | blocked on a named document | Confirmed (hcpf.colorado.gov 403) |
| OQ-517, OQ-550 | blocked on a named document | Confirmed |
| OQ-540 caretaker (CCCAP half) | state policy choice | Confirmed |
| OQ-590 Family Planning presumptive household of two | state policy choice | Confirmed |
| OQ-592 two winnings in a month | state policy choice | Confirmed |
| OQ-612 temporary absence | state policy choice | Confirmed |
| OQ-810 annualization period and scope | state policy choice | Confirmed. The S10 state plan page is still not found. CO-387's failing band is this question's C3-08 reading. It is not the CHP+ fee schedule: the copayment amounts are § 320.1's own text (D-66) |
| OQ-811 C.5 through 435.603(i) | state policy choice | Confirmed |
| OQ-812 sponsor income measure | state policy choice | Confirmed. C4-10 is a separate default |
| OQ-813 CHP+ income reasonable opportunity period | state policy choice | Confirmed (§ 130.1 against § 430.3.A.i) |
| OQ-970 AmeriCorps, training allowances, special pay | state policy choice | **Fails (C4-11).** The special pay part is settled (OQ-1024), and the Code sections said to be "not on file" are on file (112) or served by an allowed host (61, 3121) |
| OQ-1020 special pay and room-only and meals-only payments as earnings | state policy choice | Confirmed for MAGI: the MAGI rows are `in_earnings` and read from CO-5106 |
| OQ-1024 (MAGI half) | resolved | Confirmed (26 U.S.C. 112) |
| OQ-1121 boarder payments gross or net | state policy choice | **Fails (C4-03).** § 8.100.3.K.10.c-e (on file) and 26 U.S.C. 62(a)(4) (Cornell LII) net the costs |
| OQ-1123 basic pay for a combat-zone month | state policy choice | **Fails (C4-02).** 26 U.S.C. 112 (on file) decides; the block is a missing record field, which is not a policy choice |
| OQ-1124 foster care on the 21st birthday | state policy choice | **Fails (C4-12).** The deciding text is in 12 CCR 2509 or C.R.S. title 19, served by allowed hosts; no fetch attempt is recorded |
| OQ-1180 boarder's payments as employment | state policy choice | Confirmed (no paragraph defines "employed") |
| OQ-1181 a dated pay with no frequency | state policy choice | Confirmed; MAGI reads the month's amount, so no MAGI answer turns on it |

## 5. Earlier P1s

| ID | Status | Evidence (engine at 704da6b) |
|---|---|---|
| C3-01 Family Planning floor | holds | CO-226 matches; B-138b (138.05%): `limited_family_planning` |
| C3-02 Family Planning annualized | holds | RV3-FPA and RV3-FPM stored cases match |
| C3-03 Family Planning compatibility | holds | CO-227 and RV3-FPRCB match |
| C3-04 stepchild income | holds | CO-228 and RV3-STEPN match; CO-4558 reads child and stepchild |
| N-01 to N-05 | hold | CO-202 to CO-205 and RV2-ELE match; Express Lane now ends on day 90 (CO-2445) |
| F-01 to F-09 | hold | CO-180 to CO-184, RV-65, RV-INM, RV-CHPB and RV-C5 match |
| C3-05 to C3-09, F-16, F-18 | fixed | J.2 statute_override on CO-500; C3-08 recorded in OQ-810 (CO-387 the known failure); CO-1642 member arm; CO-4978; S678 on CO-183; F-16 in CO-566; F-18 in CO-5214 |

`npm run check` at 704da6b: OK; 3,864 of 3,865 household expectations pass (CO-387, OQ-810).

## 6. Probe households (scratch only)

Built by patching stored cases with `scratch4/run.ts` (scratch copy, not committed). Determination 2026-11-10 unless stated.

| Probe | Shape | Engine | Rule |
|---|---|---|---|
| B-HSA | single adult, wages $1,500, HSA distribution $500 for medical bills | MAGI $2,000, 150.4%, `ineligible_income` | $1,500, 112.8%, `adult` `eligible` (C4-01) |
| B-COMBAT | single enlisted member, basic pay $2,800 and special pay $225 in a combat zone | MAGI $2,800, `ineligible_income` | $0 (C4-02) |
| COMBAT-FAM | spouse at home, two children, the member's combat-zone basic pay $3,800 | spouse 138.2%, `ineligible_income` | $0, `parent_caretaker` `eligible` (C4-02) |
| B-BOARD | wages $1,100; two boarders pay $900 for room and board; costs $250 | MAGI $2,000, `ineligible_income` | $1,750, 131.6%, `eligible` (C4-03) |
| B-INKIND, B-VENDOR | wages $1,200 and $800 in kind (or rent the employer pays from pay) | MAGI $1,200, 90.2%, `eligible` | $2,000, 150.4%, `ineligible_income`; limited Family Planning (C4-04) |
| B-SE-noflag | business net $3,000 this month; expected annual $20,000; flag not stated | 225.6%, `ineligible_income` | annualized $1,667, 125.3%, `eligible` (C4-05) |
| B-SE-noannual | flag true; expected annual income not stated | `ineligible_income` | cannot determine (C4-05) |
| H3 / H3-cust | father in another home ($4,000) claims a child living with her non-filer mother ($1,000) | child {father, child} 221.8%, Medicaid `ineligible_income`, CHP+ `eligible_child`; with custody stated: {mother, child} 55.5%, Medicaid `child` | Medicaid `child` (C4-06) |
| NB-CHP-late | CHP+ newborn born 2025-10-20, determined 2026-10-25 | August, September 2026 `ineligible_before_coverage_period`; October `ineligible_income` | August, September `eligible_newborn` (C4-07) |
| NB-CHP-early | the same, determined 2026-09-25 | November, December 2026 `eligible_newborn` | the guarantee ended on 2026-10-19 (C4-07) |
| RETRO19 | non-filer mother $2,000; son 19 on 2026-10-15; retroactive request | September 2026 household {mother}, 150.4%, `ineligible_income` | {mother, son}, 110.9%, `adult` `eligible` (C4-08) |
| B-138a, B-138b | single adult $1,835 and $1,836 | `eligible`; `ineligible_income` and limited Family Planning | the same (control) |
| CH2650, CH2651, CH4778, CH4779, CH2705, CH3615 | filer parent and child at 146.95%, 147.01%, 264.95%, 265.01%, 150.0%, 200.5% | Medicaid; CHP+ band B; CHP+ band D; ineligible; band B; band D | the same (control; OQ-470 for 200.5%) |
| PG200, PG201, PG265, PG266 | pregnant, size 2, at 199.96%, 200.02%, 264.96%, 265.01% | Medicaid; CHP+ prenatal (exempt); CHP+ prenatal; ineligible | the same (control) |
| PP | applied pregnant 2026-02-02, delivered 2026-03-15 | covered through March 2027, not April | the same (control) |
| H1, H2, H4, H6 | married filing separately; unmarried parents; 20-year-old dependent; grandparent claimer | households as 435.603(f) gives | the same (control) |
| AGE19, NB-MA, FFC26 | 19th birthday on the 1st; newborn born 2025-11-01; 26th birthday month | child through November; not a newborn in November 2026; former foster care through November | the same (control) |
| B-NOREC, B-NOEARN | receipts or earnings not stated | MAGI income and status cannot determine | the same (control, decision 4) |

## 7. Dispositions (fix round, 2026-11-23)

Fix round on `ccr-9d19bf4c-wmnwcl` from `6cbeb12`, merged with origin at `7c56f14` (coverage pass 4 care and energy, holdings H0). Commits: 0bff9be (C4-01 to C4-04, C4-16), 407ca57 (C4-05 to C4-08, CO-387), 3f6ce3a (C4-05 on the earnings record), 2dfc4c8 and 60c9638 (harness entries; combat-zone compensation as a yes/no), 1d7f1f0 (C4-09 to C4-17, the open questions, CO-720 to CO-727), bebd22f (merge), 37b03f0 (change record), d98d1a8 (UI pins), 25d9d45 (merge of H1 Medicaid; pins combined, flags re-keyed). Documents fetched and stored: D-4430 (26 U.S.C. 61(a)), D-4431 (62(a)(1), (a)(4)), D-4432 (223(f), 408A(d)(1), 529(c)(3)), D-4433 (12 CCR 2509-3 7.203.4-7.203.41, Secretary of State), D-4435 (119(a)), D-4436 (72(b)(1)), D-4437 (104(a)(4)), D-4438 (111(a)), D-4439 (42 U.S.C. 12637(d), 29 U.S.C. 3241(a)(2)); excerpts S4630 to S4641 (S4630 quotes 42 U.S.C. 1396a(e)(14)(A)-(B) from D-26). D-4434 is unused (folded into D-4432).

| ID | Disposition | What changed | Rule tests and households (hand values) |
|---|---|---|---|
| C4-01 | **Fixed** | Receipts gain a neutral field `taxable_amount` (CO-5000; required where read; documented in docs/conventions.md, "A fact of the federal return on the record"). The MAGI receipt table (CO-5500) counts `savings_account_distribution` and `insurance_cash_value` at it (new treatment `counted_taxable_amount`, read by CO-5501); a record of either kind with no taxable amount is cannot determine (decision 4). The kind is not split, so no other program's table changes (each reads the kind as before). | CO-5501-T8 to T11, CO-502-T9; CO-725 (B-HSA): 1,500 / 1,330 = 112.8%, adult, eligible |
| C4-02 | **Fixed; OQ-1123 settled** | Earnings gain `combat_zone_compensation` (CO-5100; yes/no, default false under D3; R-3): the pay is compensation for a month served in a combat zone (26 U.S.C. 112, D-4340); an officer states the part up to the maximum enlisted amount as its own record (records are disjoint; a money field would not split with the pay, which the records harness's ME-1 caught). CO-5160 leaves it out. | CO-5160-T9, T10; CO-720 (COMBAT-FAM): MAGI 0, the spouse parent_caretaker, eligible |
| C4-03 | **Fixed; OQ-1121 settled** | New ma_magi_boarder_earnings (CO-6450): the month's boarder payments less the month's `business_cost_boarder_provision` records, at least 0 (8.100.3.K.10.c-e; 26 U.S.C. 62(a)(4), D-4431); no allotment per boarder (42 U.S.C. 1396a(e)(14)(B)). CO-5106 rows `counted_net_of_provision_costs`, `deducted_from_boarder_payments`; CO-502 adds CO-6450. | CO-6450-T1 to T5, CO-502-T8, CO-5160-T14; CO-724 (B-BOARD): 1,100 + 900 - 250 = 1,750, 131.6%, eligible |
| C4-04 | **Fixed** | CO-5106: `in_kind_pay` counted unless the new field `employer_convenience_meals_or_lodging` says it is meals or lodging 26 U.S.C. 119(a) excludes (D-4435); `employer_vendor_payment` counted (C.1.a.v; 61(a)(1)). | CO-5160-T8 (2,050), T11 to T13; CO-727 (B-INKIND): 2,000, 150.4%, ineligible_income, limited Family Planning |
| C4-05 | **Fixed** | ma_has_annualizable_earnings (CO-6451) reads the earnings records: a business or farm record, or pay stated `seasonal_or_commission` (new earnings field, default false under D3), in place of the person-level fact CO-4557, which is no longer read (kept for the final cleanup). CO-4559 has no `otherwise`: an unstated annual income for such a member is cannot determine. CO-4975 takes the month's income where no member has such earnings. Each MAGI and CHP+ income test reads the month's figure first (ma_magi_monthly_household_income_pct_fpl, CO-6452; Family Planning CO-6453), so an applicant eligible on the month stays determined: CO-545 to CO-548, CO-2419, CO-704, CO-1155. | CO-6451-T1 to T6, CO-4559-T4 (now unknown), T5, CO-4975-T3, T4, CO-6452-T1, T2, CO-6453-T1; CO-726 (B-SE-noflag): 20,000 / 12 = 1,666.67, 125.3%, eligible |
| C4-06 | **Fixed** | CO-1976 reads an unstated custodial parent from the stated home: a claiming parent the child lives with is custodial; one the child does not live with, while another parent does, is not; a child living with neither parent is cannot determine. CO-1946's meaning states the reading. | CO-1976-T7 to T10; CO-723 (H3): {p2, p3}, 1,000, child, eligible; CHP+ ineligible_medicaid_eligible |
| C4-07 | **Fixed; OQ-1231 added** | chp_is_guaranteed_newborn (CO-2410) is per month, under one on the month's first day; the birthday month is covered (OQ-1231, state policy choice: § 430.1 makes coverage monthly, no paragraph says how a guarantee ending mid-month applies). CO-76's expectation re-keyed by month. | CO-2410-T1 to T6; CO-721 (NB-CHP-late): August to October 2026 eligible_newborn, November ineligible_income |
| C4-08 | **Fixed** | The MAGI household and its readers are per month (CO-500, CO-1976, CO-4558, CO-501, CO-3633, CO-4204, CO-4976, CO-4979 to person-month), the age tests on the month's first day (CO-4978's reading); 62 stored expectations re-keyed by the determination month. | the items' rule tests with their month; CO-722 (RETRO19): September and October {mother, son}, 2,000 / 1,803.33 = 110.9%, adult, eligible; November {mother}, 150.4% |
| CO-387 / OQ-810 | **Fixed; off known-failures.json** | § 320.1's copayment band is set by "income, at the time of eligibility determination" and C.4.a annualizes only for an applicant ineligible on the month: chp_copayment_income_band (CO-2228) reads the month's figure where it is within the CHP+ limit, else the budget figure. OQ-810 no longer covers the band. | CO-2228-T6 (band_d), T7 (band_c); CO-387 passes (band_d) |
| C4-09 | **Partly fixed; rest recorded (OQ-1230)** | Insurance cash value is counted at its taxable amount (C4-01's field; was not counted). Pensions (72(b)(1), 104(a)(4)) and income tax refunds (111(a)) keep the gross and none readings: making the field required on every pension and refund record is a change to every program's statement of them, recorded for the owner as OQ-1230 with the Code text fetched. | CO-5501-T11 |
| C4-10 | **Fixed** | CO-4551: sponsorship read from the sponsor edge or the fact; a non-citizen the deeming can reach with neither stated is cannot determine; a known non-sponsored person is 0 before the exemptions are read. 25 stored non-citizens with neither state `is_sponsored_non_citizen: false` (each commented). | CO-4551-T9 to T11 |
| C4-11 | **Fixed; OQ-970 partly resolved** | Special pay dropped (earnings, OQ-1024). AmeriCorps counted for MAGI (26 U.S.C. 61(a); 42 U.S.C. 12637(d) does not reach a Social Security Act program; D-4439). Training allowances stay open as a state choice: K.8.b exempts WIA allowances for the persons it names against 61(a) and 1396a(e)(14)(B); IRS Publication 525 (irs.gov, fetched) is silent. | generated AmeriCorps variants (harness class C4-11) |
| C4-12 | **Fixed; OQ-1124 settled** | 12 CCR 2509-3 7.203.41.A (D-4433, fetched from the Secretary of State): the Foster Youth in Transition Program serves youth "less than twenty-one years of age"; foster care ends at 21, so CO-549's reading stands (no item change). | CO-549-T95 retitled |
| C4-13 | **Fixed** | MAGI income is no longer rounded (CO-502, CO-503, CO-4559; conventions P41). | CO-502-T10, CO-503-T7 (1,835.45); CO-4559-T1 and CO-182 re-keyed to 999.83 |
| C4-14 | **Fixed** | The data-source figure sums ma_magi_household_income_members (CO-1344, and CO-4977, its D-M12 copy). CO-91, CO-219, CO-222, CO-423 state the incomeless child's filing requirement. | CO-1344-T2: 110.9% (was 144.2%) |
| C4-15 | **Recorded (OQ-1232)** | CO-706's precision states the reading against § 50.19; OQ-1232 (CHP+ owner). | |
| C4-16 | **Fixed** | CO-5106's WIOA row cites K.8.a, K.8.c and 1396a(e)(14)(B). | |
| C4-17 | **Fixed** | `net_for_tax` is the month's net (CO-5100 field meaning). | |

**Open-question classes (section 4).** OQ-970: narrowed as above, class state policy choice for training allowances only. OQ-1121, OQ-1123, OQ-1124: resolved by the text. OQ-204, OQ-213, OQ-214, OQ-472, OQ-510, OQ-518: reclassified from "needs Legal" to state policy choice, each with its reason on the Class line (every reading rests on text on file; no unfetched document would decide it; the State settles it, Legal advising). New: OQ-1230 (pension and refund taxable part), OQ-1231 (CHP+ newborn birthday month), OQ-1232 (pregnant minor as a prenatal client), each a state policy choice with the text checked.

**Answer changes** (each a cited entry; scripts/receipts/allowed-differences.yaml and scripts/records/allowed/c4-magi.yaml): CO-387's copayment band band_c to band_d (C4-CPB); the two generated variants stating a savings distribution or cash value without a taxable amount, MAGI cannot determine (C4-01, decision 4); the AmeriCorps variants, 300 more MAGI income and the MAGI parent base over 68% (C4-11); unrounded MAGI figures in CO-182, CO-387, CO-535 (C4-13); two generated SNAP households' child CHP+ verification cannot determine (C4-14). No stored household's expected outcome changed except CO-387 (now passing) and the per-month re-keying. The harness scripts' acceptance logic and translators are unchanged.

**Gate (after merging origin at 5d25652: holdings H1 Medicaid and the coverage 4 SNAP review).** `node scripts/sync-manifest.mjs co`: written. `npm run typecheck`: passes. `npx vitest run`: 1,146 tests pass (102 files), with the pins re-pinned in d98d1a8 and combined with H1's in the merge, each with its reason. `npm run receipts:harness -- --all-programs`: OK, 0 unexplained (stored 1,490 values differ, all allowed; generated 8,428, all allowed); metamorphic 0 violations. `npm run records:harness -- --list earnings --all-programs`: OK, 0 unexplained (stored 1,970, generated 3,850, all allowed); translation 0 stale; metamorphic 0 violations. `CHECK_BASE=origin/main npm run check`: OK; 4,940 rule tests and 3,941 household expectations pass, none known to fail (CO-387 is off conformance/known-failures.json); change impact 28 flags, all dispositioned (2026-11-23-coverage4-magi.yaml re-keys those the round's schema fields and the merges reopened); conformance self-check OK.
