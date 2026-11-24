# Coverage review, seventh pass: CCCAP, LEAP and SUN Bucks (family `coverage7-care-energy`), b467f1c

Reviewer pass: seventh exhaustive coverage pass, the last before product-owner sign-off, 2026-11-24, on b467f1c (origin/ccr-9d19bf4c-wmnwcl), read in a detached scratch worktree. Review only: nothing was written to the branch. It follows coverage pass 6 (docs/reviews/coverage6-care-energy.md, whose section 7 dispositions were merged before this commit), the three-pattern sweep for SNAP, CCCAP, LEAP and SUN Bucks (docs/reviews/pattern-sweep-snap-ce.md), coverage pass 5 and its field sweep. The matrix in section 4 was built again from the fetched rule text, not from pass 6's list.

Governing text read from `volumes/co/documents/`:

- CCCAP: 8 CCR 1403-1, rule version 12658, effective 2026-08-14 (D-87): 3.103 (C, K, S, LLL, OOO, UU, YY, AAA, EEEEE), 3.111.A-K (G.1-4, H.1-5, I.1-33, J.1-29, K), 3.113.A, 3.116, 3.119.A, 3.124 (fee).
- LEAP: 9 CCR 2503-7 effective 2025-11-01 (D-86): 3.751.1 (every definition), 3.751.2, 3.751.21-22, 3.752.1, 3.752.2, 3.752.21 A-N, 3.752.211 A-K, 3.752.212, 3.752.22 A-E, 3.752.23 A-HH, 3.752.24, 3.752.25 A-D, 3.753.1-3.753.22, 3.755.21 (I.1-3, J, K); and the amendments effective 2026-11-01 (D-173).
- SUN Bucks: 7 CFR 292.2, 292.5-292.7, 292.12, 292.14, 292.15 (D-88, D-117), C.R.S. 22-33-104(1)(a) (D-141), C.R.S. 26-2-309 (D-142), 7 CFR 245.2 and 245.6 (D-250); no Colorado Summer EBT rule (D-143).

Method:

- Every CCCAP (100), LEAP (64) and SUN Bucks (20) derivation was printed as its tree and read against its paragraph, with the counting tables (CO-5001, CO-5102, CO-5105, CO-5720, CO-5730), the record schemas (receipts CO-5000, earnings CO-5100, field by field) and the facts the recent rounds added or changed (co_owner, rental_property, rental_property_expenses_paid, residence_setting_type, dwelling_id, is_emancipated_minor, child_welfare_payment_type, hours_worked).
- Which shared items these programs read changed since pass 6 (5db41ba..b467f1c) was computed by walking every derivation from the three programs' items (`scripts/cov7/reads.mjs` in the scratch copy): CO-181/182 (a 2024 poverty guideline version for MAGI, read by no LEAP, CCCAP or SUN Bucks date), CO-3350, CO-843, CO-2847, CO-3330, CO-4458 and the rest are declarations of defaults (pattern sweep D-5) or rule 17's text; none changes a reading of these programs beyond what the sweep recorded.
- `npx vite-node scripts/check.ts --no-conformance` at b467f1c in the scratch copy: `check: OK` (warnings only: the known missing figures CO-1272, CO-1276, CO-1277, CO-3004, CO-3932 and CO-875 outside its season).
- Probe households were written in the scratch copy (`scripts/cov7/p1.yaml` CCCAP, `p2.yaml` LEAP, `p3.yaml` mixed) and run with a small runner (`scripts/cov7/run.ts`, which evaluates a probe that extends a stored case or another probe). CCCAP probes build on CO-806 (mother and son aged 6, Denver, application 2026-11-15, thirty days 2026-10-16 to 2026-11-14, entry level 185% of the poverty guideline: $3,336.16 for two); LEAP probes on CO-712 (one adult, application 2026-11-10, income verification period 2026-10-10 to 2026-11-10, full month prior October 2026, limit $3,774 for one). Each P1 below has its rule answer computed by hand from the quoted text.

## 1. Verdict

**Not clean. 3 P1 (0 common, 3 rare), 2 P2, 1 P3.** Pass 6's fixes are right on the households they were written for (section 3). All three P1 follow from the R6-4 fix for rental property (the twenty-hour line of 8 CCR 1403-1 3.111.H.4.e): it was made in the business-income readers, but three neighbours of the same fact were not carried with it: the hours of other businesses, the hours the person states as worked, and where the property's costs are stated (which LEAP's own statement rule for the same property contradicts).

- **R7-1 (P1, rare)** CCCAP pools the hours of every business the caretaker runs against the rental property's twenty hours. A landlord who manages her rental five hours a week and runs a cleaning business thirty hours a week is read as actively managing the property; the rule ("actively manage the property") makes the rent unearned income, net of its expenses. Answer: ineligible_income where the rule gives eligible_low_income. OQ-1366 records the pooling as an assumption, but "the property" admits no reading in which a cleaning business's hours manage it.
- **R7-2 (P1, rare)** CCCAP's employment minimum-wage test (G.1.b) divides wages by hours_worked, which by its meaning includes self-employment hours; R6-4 takes a small rental out of the self-employment hours but leaves its management hours in hours_worked, so they dilute the wage. A caretaker earning $9.20 an hour for 87 hours who manages a rental ten hours a week fails the test: ineligible_activity where the rule gives eligible_low_income.
- **R7-3 (P1, rare)** One rental property cannot be stated so that both CCCAP and LEAP answer right. CCCAP (CO-7251 precision) takes a small rental's costs only from rental_property_expenses_paid and ignores business cost records; LEAP (CO-1711 precision, coverage 2 N-9) takes them only from business cost records and expects the case to state maintenance alone. Stated the CCCAP way, LEAP counts the rent gross; stated the LEAP way, CCCAP counts it gross; stated neutrally (the mortgage interest as business_cost_interest), LEAP deducts what 9 CCR 2503-7 3.755.21.I.2.D does not allow, though rental_property now identifies the property.

## 2. Findings

| id | sev | common/rare | paragraph | items | quoted text | repro (engine vs rule by hand) | proposed fix |
|---|---|---|---|---|---|---|---|
| R7-1 | **P1** | **rare**: a caretaker who both rents out property and runs another business; the answer changes only when the rental's net and gross differ across the income line. | 8 CCR 1403-1 3.111.H.4.e; I.12, I.17 | cccap_business_receipts_hours CO-7254, read by cccap_rental_property_receipts_as_unearned CO-7251, cccap_self_employment_gross_receipts CO-5156, cccap_self_employment_hours CO-6404; OQ-1366 | H.4.e: "For income from rental property to be considered as self-employment income, the adult caretaker(s) or teen parent(s) shall actively manage the property at least an average of twenty (20) hours per week. Income from rental property will be considered as unearned income if the adult caretaker(s) or teen parent(s) are not actively managing the property an average of at least twenty (20) hours per week." I.12: "Net rental income". | CO-7254 sums `hours` over every self_employment_receipts record of the person, rental or not, and CO-7251/CO-5156/CO-6404 compare that total with twenty a week. **CR3** (CO-806's mother): a cleaning business (receipts $3,000, 120 hours, rental_property false; a $500 cost record, receipts for costs received) and a rental house (rent $1,000, 20 hours in November, rental_property true; rental_property_expenses_paid $400). Engine: 140 / (30/7) = 32.7 hours a week, so the rent is self-employment: $4,000 - $500 = **$3,500 > $3,336.16, ineligible_income**; the $400 is read against no rent. Rule: the property is managed 20 / 4.29 = 4.7 hours a week, so its rent is unearned, net: $1,000 - $400 = $600; the business nets $2,500 ($20.83 an hour); **$3,100, eligible_low_income**. CR3b (the same rental beside $2,500 of wages, no other business): engine $3,100, eligible_low_income, so the defect is the pooling only. | Sum only the hours of records whose rental_property is true in CO-7254 (and read rental_property on every business record where CO-7254 is read, required there); keep OQ-1366 for the averaging period and for two rental properties read together, and remove "a caretaker whose rental property and another business together reach the line is read as actively managing" from its assumption. Add CR3 as a stored household. |
| R7-2 | **P1** | **rare**: a caretaker with a low-wage job who also manages a small rental; the engine's answer flips only when the rental's hours bring wages per hour under the federal minimum wage. | 8 CCR 1403-1 3.111.G.1.b, H.4.e; 3.111.B.1 | cccap_caretaker_in_eligible_activity CO-984 (reads hours_worked and cccap_self_employment_hours CO-6404); hours_worked (meaning: "the hours the person worked for pay in the month, including hours of self-employment"); earnings `hours` ("For self-employment, the hours the person worked in the business in the month"), `rental_property` ("the record's hours are the hours the person spent managing it") | G.1.b: "Adult caretaker(s) or teen parent(s) must verify that his/her gross income divided by the number of hours worked equals at least the current federal minimum wage." H.4.e as above: under twenty hours a week, rental income "will be considered as unearned income". | CO-984 tests wages / hours_worked, or wages / (hours_worked - cccap_self_employment_hours). R6-4 takes a rental under the line out of cccap_self_employment_hours, so its management hours, which a faithful statement of hours_worked includes (they are stated as a business's hours), stay in both denominators. **CR4** (CO-806's mother): wages $800 for 87 hours ($9.20 an hour), a rental (rent $1,800, 43 hours, rental_property true, rental_property_expenses_paid $300), hours_worked 130. Engine: 800 / 130 = $6.15 and 800 / (130 - 0) = $6.15, both under $7.25: activity **false, ineligible_activity**. Rule: the rent is unearned income, not work, so the hours worked for the wage are 87: 800 / 87 = $9.20 >= $7.25, activity met; income $800 + ($1,800 - $300) = $2,300 <= $3,336.16: **eligible_low_income**. CR4b (hours_worked stated as 87): engine eligible_low_income, so the answer turns on whether the case puts the rental's hours in hours_worked, which its meaning says to. | In CO-984, take the hours of a business record read as unearned rent (cccap_business_receipts_hours of rental records under the line) out of hours_worked before dividing the wages, as CO-6404's hours are already taken out; or state in hours_worked's meaning that a rental property's management hours are not hours worked for pay (they are then not available to any program that reads them as self-employment hours, so the first is preferred). Add CR4. |
| R7-3 | **P1** | **rare**: a household with rental property it manages under twenty hours a week that applies for CCCAP and LEAP (one PEAK application), or a LEAP landlord stated as a business whose costs include mortgage interest, taxes or insurance. | 8 CCR 1403-1 3.111.H.4.e, I.12, I.17; 9 CCR 2503-7 3.755.21.I.1, I.2.D; docs/conventions.md rule 13 (a supplied fact states what happened, never a program's classification) | CCCAP: cccap_rental_property_receipts_as_unearned CO-7251 (precision: "The property's costs are stated as rental_property_expenses_paid (CO-4458) ... a business cost record is a cost of a business CCCAP counts as self-employment"), cccap_excluded_unearned_receipts CO-4463, cccap_self_employment_business_expenses CO-1709. LEAP: leap_self_employment_allowable_costs CO-1711 (precision: "for self-employment from rental property a case states its maintenance costs as business_cost_operating and no interest or vehicle costs"), leap_earnings_treatment_table CO-5102 (business_cost_interest, business_cost_vehicle `deducted`); rental_property_expenses_paid CO-4458 (meaning: expenses "for rental property the person does not actively manage", taxes, insurance, interest, repairs, utilities, fees) | LEAP I.2.D: "Rental property allowable expenses shall be limited to the costs of maintenance of the property." CCCAP I.12: "Net rental income"; I.17: "Net income from rental of a house, store, or other property to others". | One property, managed about ten hours a week, rent $1,500 (October, LEAP's full month prior) or $1,800 (CCCAP's month), maintenance $100 or $300, and (LRB1) mortgage interest $600. **Stated the LEAP way** (maintenance as a business_cost_operating record, nothing else), CCCAP loses the cost: **CR2** (wages $1,600, 87 hours; rental 43 hours, cost record $300): engine $1,600 + $1,800 = **$3,400 > $3,336.16, ineligible_income**; rule $1,600 + $1,500 = **$3,100, eligible_low_income** (CR2b, the cost stated as rental_property_expenses_paid: engine $3,100, eligible). **Stated the CCCAP way** (rental_property_expenses_paid $100, no cost record), LEAP loses it: **LRB3** (wages $2,300): engine $2,300 + $1,500 = **$3,800 > $3,774, ineligible**; rule $2,300 + ($1,500 - $100) = **$3,700, eligible** (LRB4, the LEAP way: engine $3,700, eligible). **Stated neutrally** (business_cost_interest $600 and business_cost_operating $100): **LRB1** (wages $2,500): engine $1,500 - $700 = $800, $3,300, **eligible**; rule (I.2.D) $1,500 - $100 = $1,400, **$3,900 > $3,774, ineligible**. No statement of the one household gives both programs' answers. | State a rental property's costs once, neutrally: as cost records of the rental business (each cost record naming its business, `job`, as a dated pay does), with a neutral field or kind that says which are maintenance and repairs. CCCAP reads a rental under the line net of those records (and keeps rental_property_expenses_paid for a `rental_income` receipt); LEAP reads `rental_property` on the business and deducts only the maintenance records against it (I.2.D), so neither program's statement rule is needed. Until then, record in OQ-1365 and OQ-1366 that a household evaluated for both programs cannot be stated for both, with CR2, LRB1 and LRB3. |
| R7-4 | P2 | — | 9 CCR 2503-7 3.752.211.E, 3.752.212 | leap_counted_recurring_receipts CO-5003; receipts fields `for_dependent` with `for_person`, `for_person_living_elsewhere` | E: "Any portion of a VA pension that is paid to a veteran for support of a dependent shall be considered countable unearned income to the dependent rather than the veteran." | The two fields' meanings overlap for a dependent of the case who lives elsewhere ("The part received for a person who does not live with the person"; "The part of a veterans benefit that the Department of Veterans Affairs pays the person because of a dependent"), and CO-5003 subtracts both. **LVA** (CO-712's adult, wages $2,000, a $1,200 pension with $300 for a child p2 of the case in another dwelling, stated in both fields): engine 1,200 - 300 - 300 = $600, income $2,600; rule $900, $2,900. Same eligibility answer here; a case must name a child who lives elsewhere as a person of the case for it to arise. LVA2 (an adult son in the same dwelling, a separate LEAP household) gives $1,200 to the veteran and $300 to the son, as R6-6 intended. | Say in for_person_living_elsewhere's meaning that a veterans benefit's dependent part is stated in for_dependent alone, or subtract the larger of the two in CO-5003. |
| R7-5 | P2 | — | 8 CCR 1403-1 3.111.H.4, H.5.a.1 | cccap_person_earned_income CO-3915, cccap_person_gross_wages CO-5152; OQ-680; cccap_county_determined_monthly_income CO-3914 | H.4: "Generally, the expected monthly income amount is based on the income received in the prior thirty (30) day period; except that, when the prior thirty (30) day period does not provide an accurate indication of anticipated income ... a different period of time may be applicable". H.5.a.1: the caretaker "may also provide verification of up to twelve (12) of the most recent months of income". | A weekly earner has five paydays in the thirty days for two of every seven application dates, a biweekly earner three for one in seven; the engine counts every pay dated in them, as H.4's general rule says. **CW5** ($500 a week, paydays 10/16 to 11/13): $2,500 (four paydays: $2,000; 52/12 weeks: $2,166.67). A $700-a-week earner is $3,500, ineligible, on one date and $2,800, eligible, a week later. The text's exception routes this to the county's figure (CO-3914), which OQ-680 names, but OQ-680 gives the program owner no worked consequence. No answer is wrong under the recorded reading. | Add the five-payday consequence and CW5 to OQ-680 so the owner signs it knowingly (and the county figure's role in it). |
| R7-6 | P3 | — | 9 CCR 2503-7 3.752.25.B; docs/conventions.md rule 12 | leap_living_arrangement CO-1283, read with `otherwise traditional_dwelling` by CO-1000, CO-1004, CO-1009, CO-2593; residence_setting_type CO-3330; OQ-158 | B: "Households in the following living arrangements shall not be considered to be vulnerable". | The pattern sweep judged the default right (D-EXC: B lists exceptions, read when shown), and it is; but rule 12's declaration is missing: CO-3330's precision declares only LEAP's hotel test (CO-2815) and not that an unstated setting is read as an ordinary dwelling for membership and vulnerability, and OQ-158 (marked resolved) still calls it "the same case-coverage default the chapter uses for its other late-added facts", the reading decision 4 removed elsewhere. | Add "If not stated, LEAP reads the setting as a private dwelling (3.752.25.B lists the arrangements a case shows)" to CO-3330's precision, and restate OQ-158's resolution on 3.752.25.B rather than case coverage. |

P1: R7-1, R7-2, R7-3 = **3** (common 0; rare 3). P2: R7-4, R7-5 = **2**. P3: R7-6 = **1**.

### Probe results (scratch copy, b467f1c)

| Probe | Engine | Rule (by hand) |
|---|---|---|
| C0 / CR0 / L0: CO-806, CO-870, CO-712 as stored | $3,000 eligible_low_income / $1,500 ineligible_activity / $3,000 eligible | same |
| CR2: rental 10 h/week, cost $300 as a business cost record, wages $1,600 | $3,400, ineligible_income | $3,100, eligible_low_income (R7-3) |
| CR2b: the same cost as rental_property_expenses_paid | $3,100, eligible_low_income | same |
| CR3: rental 4.7 h/week beside a 28 h/week cleaning business | hours pooled 32.7; $3,500, ineligible_income | $3,100, eligible_low_income (R7-1) |
| CR3b: the same rental beside wages | $3,100, eligible_low_income | same |
| CR4: wages $800 for 87 h, rental 43 h, hours_worked 130 | activity false, ineligible_activity | activity met, $2,300, eligible_low_income (R7-2) |
| CR4b: hours_worked 87 | eligible_low_income | same |
| CW5: CCCAP weekly $500, five paydays in the thirty days | $2,500 | $2,500 under H.4's general rule (R7-5, P2) |
| LRB1: LEAP rental business, interest $600 and repairs $100 as cost records, wages $2,500 | SE $800, $3,300, eligible | SE $1,400, $3,900, ineligible (R7-3) |
| LRB3 / LRB4: repairs $100 as rental_property_expenses_paid / as business_cost_operating, wages $2,300 | $3,800 ineligible / $3,700 eligible | $3,700, eligible (R7-3) |
| LSS: two Social Security streams $500.60 and $300.70 | $800 | $800 (R6-7 holds) |
| LJ2J: two jobs, biweekly $1,000 x 3 and weekly $200 x 3 dated in the eight weeks | $2,800 | $2,000 + $800 = $2,800 |
| LVA: $300 for a child elsewhere stated in for_dependent and for_person_living_elsewhere | $600 counted | $900 (R7-4, P2) |
| LVA2: $300 for an adult son in the dwelling, a separate household | veteran $1,200, son $300 | same (R6-6 holds) |

## 3. Status of recent fixes

| Fix | Right? | Evidence at b467f1c |
|---|---|---|
| R6-1 LEAP wage streams outside the period | **Yes** | CO-3912 and CO-5122's first sum skip a stream whose job_end_date is before leap_income_verification_period_start or whose job_start_date is after leap_application_date; a stream of a job that began or ended inside the period still needs dated pays (CO-3912-T11); a last paycheck dated in the period counts (T12). CO-5120 and CO-5121 read only jobs that neither began nor ended. Stored CO-865, CO-866, CO-867 pass. OQ-681 (1) restated. |
| R6-2 co-owners in one household | **Yes**, residual recorded | Every share reader (CO-5721, CO-5722, CO-5723, CO-4076, CO-4463; CO-5003, CO-5009, CO-4526) counts the amount received when the record's co_owner is in the owner's household (P60), the share only against owners outside. CO-868 and CO-869 pass. OQ-1316 records the three-owner case; class confirmed. The share test does not reach a jointly owned rental stated as a business under CCCAP's line (no ownership_share on earnings): no case states one; noted for the R7-3 restatement. |
| R6-3 LEAP rent stated as unearned | **Recorded (OQ-1365)** | Class confirmed (I.2.D sits in the self-employment verification paragraph; 3.752.22.A counts gross). Its assumption ("the maintenance limit applies to rental property stated as a business") is met only by the CO-1711 statement rule, which conflicts with CCCAP's: R7-3. |
| R6-4 CCCAP twenty-hour line | **Yes for a single rental property; three neighbours missed** | CO-7251, CO-5156, CO-6404 and CO-4463 read the line; CO-870 (CR1) and CR3b give the rule's answer. Missed: other businesses' hours pooled (R7-1), the rental's hours left in hours_worked (R7-2), the cost statement conflicting with LEAP's (R7-3). |
| R6-5 LEAP verification date | **Yes** (time contract) | docs/conventions.md, Scopes, and CO-1462's precision: verification status is a separate evaluation as of the day the county looks. |
| R6-6 VA dependent in a separate household | **Yes** | CO-5003 subtracts the part, CO-7253 counts it to the dependent (LVA2). Overlap of two fields: R7-4 (P2). |
| R6-7 cents per benefit | **Yes** | CO-5005, CO-5006 floor each record (LSS: $800). |
| Pattern sweep T-8 (deaths before the LEAP application or CCCAP determination) | Yes | CO-1000, CO-1009 read date_of_death against leap_application_date, CO-982 against det_date; tests CO-1000-T20, CO-1009-T20, CO-982-T20. |
| Pattern sweep T-9 (SUN Bucks verification ages) | Yes | CO-1699 takes another member's age on the first day of the month. |
| Pattern sweep D-1 (lives_with required) | Yes | CO-982, CO-2607, CO-1000, CO-1009 read lives_with as stated; CO-7253 compares dwelling_id, the same fact lives_with (CO-1925) is derived from. Stored households state one home. |
| Pattern sweep D-5 (defaults declared on the fact) | **Yes, one declaration missing** | The thirteen facts carry their declaration; LEAP's ordinary-dwelling reading of an unstated setting is not declared on CO-3330 (R7-6, P3). |
| Pattern sweep month timing for these programs | Yes | LEAP reads every factor on its application date (CO-7000, CO-6400; the season table as of the program year's first day, CO-1003); CCCAP's thirty days, quarters and months as pass 5 C5-1 and OQ-680 say; SUN Bucks' months from the instructional year's first month (CO-2708, CO-5731, CO-4527, CO-4528). Parameters read under month-v1: LEAP's benefit parameters are read in the month evaluated but have no version (OQ-532); CCCAP's fee rates are fixed at the determination by `as_of` (the base rate has a single value). |
| Coverage pass 5 and field sweep | Yes | Stored repro households CO-800 to CO-809 and earlier passes' households pass (`check: OK`). |

## 4. Coverage matrix

Legend: **C** carried by the items listed (derivation read against the paragraph; a mismatch is a finding); **NA** not applicable, with the reason; **OQ** an open question records the choice; **GAP** no item and no recorded reason.

### 4.1 CCCAP, 8 CCR 1403-1

| ¶ | disposition |
|---|---|
| 3.103.C adult caretaker; EEEEE teen parent | C: CO-992, CO-981, CO-2607 (lives_with as stated); OQ-540, OQ-163 |
| 3.103.K, 3.111.H.5.c assets declared | C: CO-987 |
| 3.103.S cash assistance; diversions | C: CO-5720, CO-4463; OQ-873 |
| 3.103.LLL household | C: CO-982 (deaths before det_date out, T-8), CO-983, CO-4064; OQ-1315, OQ-163, OQ-872 |
| 3.103.OOO income eligibility | C: as H.4-5 |
| 3.103.UU, 3.111.F eligible child; F.1, F.2 | C: CO-980, CO-4056, CO-998, CO-4060; OQ-710, OQ-1163, OQ-562 |
| 3.103.YY, AAA; 3.111.H.1-3 entry and exit levels, tables | C: CO-870, CO-986, CO-993, CO-2103, CO-2104, CO-3007, SMI tables; OQ-121 |
| 3.111.A county residence | C: CO-2107, CO-987 |
| B.1-3 activity, income, custody | C: CO-991, CO-984, CO-2104 |
| C, D, E application, verification, eligibility period | C: CO-1440 to CO-1451, CO-1676 to CO-1688, CO-4467, CO-5154, CO-5155, CO-991, CO-4064, CO-4070, CO-2396; OQ-871, OQ-872, OQ-850 |
| G.1.a-c employment, minimum wage, LLC owners | C: CO-984, CO-5152. Rental hours in the denominator: **R7-2** |
| G.2.a-e self-employment, launch | C: CO-1709, CO-1710, CO-6404, CO-984, CO-5154 |
| G.3, G.4 job search, education, SUD treatment | C: CO-984, CO-1722, CO-1518, CO-4074, CO-3905; OQ-162, OQ-790 |
| H.4 prior thirty days; a, d, f | C: CO-5150, CO-5151, CO-3915, CO-5152, CO-5721, CO-4463, CO-3914; OQ-680 (five paydays: R7-5, P2) |
| H.4.b contract employment | C: CO-5152, CO-3915; OQ-1221 |
| H.4.c self-employment | C: CO-5156, CO-1709, CO-1710; OQ-680 (3) |
| H.4.e twenty hours of active management | C: CO-7251, CO-7252, CO-7254, CO-5156, CO-6404; OQ-1366. Another business's hours pooled: **R7-1**. Costs' statement: **R7-3** |
| H.4.e jointly owned property | C: CO-5721, CO-5722, CO-5723, CO-4076, CO-4463 (co_owner); OQ-1316 |
| H.4.g-i inclusions, irregular support, lump sums | C: CO-5720, CO-5105, CO-5725, CO-5722; OQ-680 (4) |
| H.5.a-b verification at application and redetermination | C: as H.4; CO-1450, CO-1451, CO-3914 |
| I.1 gross earnings; I.2-3 self-employment and farm | C: CO-5105, CO-1709, CO-1710 |
| I.4-5 in-kind, vendor payments | C: CO-4464 |
| I.6-8 railroad, veterans, pensions less penalties | C: CO-5720, CO-5721, CO-5722; OQ-1321 |
| I.9-19 including I.12, I.17 net rents, I.18 boarders | C: CO-5720, CO-4463 (rent net), CO-7251, CO-4464. Net of a small rental's costs stated as business cost records: **R7-3** |
| I.20-22 inheritance, gifts, prizes, insurance and lawsuit proceeds | C: CO-5722, CO-5721 |
| I.23-30, I.33 | C: CO-5720, CO-5721, CO-5725 |
| I.31 WIOA; I.32 AmeriCorps and VISTA | C: CO-5105, CO-3915; OQ-1222 |
| J.1 child's earnings; J.2-27, J.29 | C: CO-3915, CO-4464, CO-5720; OQ-990, OQ-991, OQ-992, OQ-1318 |
| J.28 irregular under $90 a quarter | C: CO-4076, CO-5723, CO-5724, CO-6150, CO-6151, CO-6401 to CO-6403; OQ-713 |
| K.1-2 child support paid | C: CO-3902, CO-985, CO-1446, CO-1683 |
| 3.113.A redetermination income | C: as H.4-5 (cccap_determination_type) |
| 3.116 Colorado Works Child Care; C earned income only | C: CO-988, CO-2578; OQ-682, OQ-536 |
| 3.119.A protective services | C: CO-994, CO-995 |
| 3.124 parent fee (bands, additional child, part time, quality rating, cap, waivers) | C: CO-1288, CO-1289, CO-1290, CO-3508, CO-4052; OQ-254, OQ-712 |

### 4.2 LEAP, 9 CCR 2503-7

| ¶ | disposition |
|---|---|
| 3.751.1 Completed Application B (SSN; income still counted) | C: CO-1694, CO-1000, CO-1009 |
| 3.751.1 Date of Application; 3.752.1 period, postmark, public assistance households | C: CO-4514 to CO-4518, CO-1007; OQ-800 |
| 3.751.1 Eligibility Period, Program Year | C: CO-1006, CO-1008, CO-1007 |
| 3.751.1 Household; 3.751.2.A-E; 3.751.21-22 | C: CO-1000, CO-1009, CO-4520 (deaths before the application out, T-8; lives_with as stated, D-1); OQ-801, OQ-163. 2.C: NA (administrative ceiling; CO-875 keyed to fifteen) |
| 3.751.1 Income Verification Period | C: CO-5002; OQ-886, OQ-681 (1) |
| 3.751.1 Point in Time; 3.752.2 | C: CO-7000, CO-1007, CO-6400; verification as of the day the county looks (R6-5) |
| 3.751.1 Public Assistance Income; 3.752.21.L | C: CO-4518, CO-5007; OQ-800 |
| 3.751.1 dwelling definitions | C: CO-2815, CO-1283, CO-1280; OQ-561. Unstated setting: R7-6 (P3) |
| 3.752.21 A-E, G-N | C: CO-5001, CO-5003 (spent_on_covered_costs), CO-5005 to CO-5009 |
| 3.752.21.F jointly owned property | C: CO-5003, CO-5009, CO-4526 (co_owner); OQ-1316 |
| 3.752.211 A-D, F-K | C: CO-5001, CO-5003, CO-5005, CO-5006, CO-5008 (claim_expense), CO-5009 |
| 3.752.211.E VA dependent's part | C: CO-5003, CO-7253 (R6-6). Field overlap: R7-4 (P2) |
| 3.752.212 military allotment | C: CO-5001, CO-5003 (for_person_living_elsewhere) |
| 3.752.22.A unearned in the period, one month | C: CO-5003 to CO-5009, CO-5124; OQ-681 (4) |
| 3.752.22.B, C.1-2 four of eight weeks | C: CO-5120, CO-5121 (per job; LJ2J), CO-5122; OQ-681 (2), OQ-1160 |
| 3.752.22.C.3.a-c terminated, new, first check | C: CO-3912, CO-5122 (R6-1), CO-5003 to CO-5008 |
| 3.752.22.C.4 in-kind | C: CO-5102 `counted_at_value` |
| 3.752.22.D 60% SMI (D-173) | C: CO-1003, CO-875; OQ-532 |
| 3.752.22.E reapplication | NA (a new application) |
| 3.752.23.A-HH | C: CO-5001, CO-5102 rows; Q CO-5123; CC CO-5122; DD pass_set_aside; F CO-5004; EE CO-5009 (OQ-1317, OQ-1320); GG, BB; U in CO-1000/CO-1009 and the foster rows; V read as a non-member's receipt; OQ-863, OQ-885, OQ-1162, OQ-1319 |
| 3.752.24 no resources | NA |
| 3.752.25.A-D vulnerability | C: CO-876, CO-1004, CO-1283, CO-2815, CO-1280; OQ-610, OQ-561 |
| 3.753.1-3.753.18 citizenship, qualified alien, non-member income | C: CO-1010, CO-1694, CO-1009, CO-1691, CO-1457; OQ-550 |
| 3.753.21-22 residency | C: is_colorado_resident read by CO-1007 |
| 3.754.1 denial factors | C: CO-1007; OQ-714 |
| 3.755.21.A-H verification | C: CO-1455, CO-2591, CO-4526, CO-1689 to CO-1693, CO-1462 |
| 3.755.21.I.1 (2026-11-01) self-employment, full month prior | C: CO-1002, CO-1712, CO-5126; OQ-681 (3) |
| 3.755.21.I.2.a-c receipted expenses, mileage | C: CO-1711, CO-5102; OQ-614 |
| 3.755.21.I.2.D rental maintenance | C only through CO-1711's statement rule; LEAP does not read rental_property: **R7-3**. A `rental_income` receipt: OQ-1365 |
| 3.755.21.J LLC and S-corporation owners; K gifts | C: CO-1712 precision; CO-4526 |
| 3.758.47 Steps A-G benefit | C: CO-1280, CO-1278, CO-1279, CO-1281; OQ-253, OQ-532 (figures blocked) |

### 4.3 SUN Bucks

| ¶ | disposition |
|---|---|
| 292.2 Categorically eligible; 292.6 "at any time during the period of eligibility" | C: CO-2708, CO-5731, CO-1296, CO-4527, CO-4528, CO-4072; OQ-255, OQ-993 |
| 292.2 Household | C: CO-2708, CO-4523 |
| 292.2 Instructional year, Period of eligibility, Summer operational period; 292.7 | C: CO-2581, CO-2708; OQ-535 (blocked; see section 5) |
| 292.2 School aged; C.R.S. 22-33-104(1)(a) | C: CO-1292 |
| 292.5(a)-(b) reduced-price guideline on the date of application | C: CO-1297 |
| 292.6(a)-(c) | C: CO-1298 |
| 292.12(b), (d)(1)-(4), (e) | C: CO-4522, CO-1633, CO-1696, CO-4521, CO-1298 |
| 292.14(a)-(f) verification | C: CO-1699 (ages in the month, T-9), CO-1695, CO-1698, CO-4073, CO-4854; OQ-377 |
| 292.15(c)-(f) benefit | C: CO-1299, CO-3013; OQ-1220 (blocked) |
| 245.2 foster, homeless, migrant, runaway, Head Start; 245.6 | C: CO-2813, CO-4527, CO-1296 |
| Receipt table CO-5730; no earnings read | C: colorado_works_cash as TANF assistance; every other kind `not_read` |

Rows: CCCAP 33, LEAP 31, SUN Bucks 11. No row is a GAP: every paragraph has items; the three P1 sit in C rows whose items mis-read a paragraph (H.4.e, G.1.b, I.12/I.17 with LEAP's I.2.D).

## 5. Open-question classification check

Every open question an item of the three programs carries (57) was read for its class, its "Checked" or "Blocked on" text and its body against the engine.

| OQ | Class recorded | Confirmed? | Note |
|---|---|---|---|
| OQ-121, OQ-162, OQ-255, OQ-377, OQ-532, OQ-550, OQ-562, OQ-614, OQ-682, OQ-1220 | blocked on a named document | Yes | Each names the document and why it cannot be fetched (CDEC's county levels and plans, Colorado's Summer EBT Plan for Operations and Management, CDHS's program-year notice, the SAVE status list, CDE's definition, county mileage rates and diversion elections, the FNS 2027 benefit levels). |
| OQ-535 | blocked on a named document | Yes, **with a known limit** | Blocked on Colorado's Summer EBT Plan for Operations and Management. Its assumption reads a July or August application as for the next summer; an application in those months for the current summer (292.13(g)) is then read under the wrong summer's period, guideline and benefit level. Program owners should see this on the known-limits list. |
| OQ-163, OQ-253, OQ-254, OQ-536, OQ-540, OQ-561, OQ-610, OQ-680, OQ-681, OQ-710 to OQ-714, OQ-716, OQ-790, OQ-800, OQ-801, OQ-850, OQ-863, OQ-871 to OQ-873, OQ-885, OQ-886, OQ-990 to OQ-993, OQ-1020, OQ-1160, OQ-1162, OQ-1163, OQ-1221, OQ-1222, OQ-1315 to OQ-1321, OQ-1365 | state policy choice | Yes | Each turns on words the State's text leaves open, quoted in its body, with the text checked. OQ-680 lacks the five-payday consequence (R7-5, P2). OQ-1365 should record that its assumption depends on a statement rule that conflicts with CCCAP's (R7-3). |
| OQ-1366 | state policy choice | **Partly** | The averaging period (the month, thirty days, 4.33 weeks, twelve months) and two rental properties read together are genuine choices. Pooling the hours of a business that is not rental property is not: H.4.e asks whether the caretaker manages "the property" twenty hours a week, and no reading makes a cleaning business's hours management of it (R7-1). |
| OQ-134, OQ-394 | resolved | Yes | |
| OQ-158 (resolved; carried by no item's `open`) | resolved | Wording | Still calls LEAP's ordinary-dwelling reading a case-coverage default (R7-6, P3). |

No open question is misclassified except the pooled-hours part of OQ-1366. Two need their text widened (OQ-680, OQ-1365) and OQ-158's resolution restated.

## 6. Notes for the fix round

- R7-1, R7-2 and R7-3 are one fact's neighbours: the rental business record now says what it is (`rental_property`) and how long it is managed (`hours`), so every CCCAP reader of business hours and hours worked, and LEAP's reader of business costs, can read it. One restatement (rental costs as cost records of the rental business, with a maintenance marker; CO-7254 over rental records only; CO-984 net of the rental's hours) carries all three and retires both programs' statement rules.
- Promote CR2, CR3, CR4, LRB1 and LRB3 to stored households with the rule answer as the expectation.
- The known-limits list for program owners should carry, besides any of R7-1 to R7-3 left open: OQ-535 (July and August SUN Bucks applications), OQ-680's five paydays (R7-5), and the blocked figures (OQ-532 LEAP benefit parameters, OQ-1220 SUN Bucks 2027 level, OQ-121 county entry levels, OQ-682 diversion elections).

## 7. Dispositions (fix round, 2026-11-24)

Every finding has a disposition; the change record is volumes/co/changes/2026-11-24-coverage7-fixes.yaml, and the findings recorded rather than fixed are in docs/reviews/known-limits.md.

| ID | Disposition | Items | Evidence |
|---|---|---|---|
| R7-1 | **Fixed.** CO-7254 sums only the hours of records whose rental_property is true (its identifier is now cccap_rental_property_management_hours), and CO-5156, CO-6404 and CO-7251 read the record's rental_property first, then the rental hours against the line. rental_property is required on every business receipts record CCCAP reads (decision 4); the earnings translator keeps it on the translated business record (KEPT_BUSINESS_FIELDS, as seasonal_or_commission is kept on pay), and CO-322 and CO-1710-T4 state it. OQ-1366 no longer records the pooling (H.4.e's "the property" settles it); the averaging period and two properties together stay open. | CO-7254, CO-5156, CO-6404, CO-7251; OQ-1366; scripts/records/translate-earnings.ts | CR3, stored CO-1080: management hours 20, rent unearned $1,000 net of $400, income $3,100, eligible_low_income (engine before: $3,500, ineligible_income). Rule tests CO-7254-T1 to T4. |
| R7-2 | **Fixed.** cccap_rental_property_unearned_hours (CO-7680, new): a rental's management hours when they average under twenty a week. CO-984 takes them out of hours_worked before dividing the wages and the self-employment income (G.1.b), the stated hours tested first. hours_worked's precision (CO-022) says a rental stated as a business holds its hours there. | CO-7680, CO-984, CO-022 | CR4, stored CO-1081: 800 / (130 - 43) = $9.20, activity met, $2,300, eligible_low_income (before: $6.15, ineligible_activity). Rule tests CO-7680-T1 to T3, CO-984-T34. |
| R7-3 | **Known limit** (KL-CE-1). The restatement (cost records naming their business, a neutral maintenance marker, CCCAP netting a small rental against its own cost records, LEAP reading rental_property and deducting maintenance only) touches the earnings schema, every program's cost readers and the records harness's split relation: a larger design change than a fix round. Recorded precisely in OQ-1365 and OQ-1366 (each with the probes) and in docs/reviews/known-limits.md. | OQ-1365, OQ-1366 | Stored CO-1082 (the CCCAP statement; CCCAP's answer right, $3,100) and CO-1083 (the LEAP statement; LEAP's answer right, $3,700); probes CR2 ($3,400 for CCCAP), LRB3 ($3,800 for LEAP) and LRB1 ($3,300 for LEAP) re-run after the fix round with the same results as above. |
| R7-4 | **Fixed** in the field's meaning: for_person_living_elsewhere (receipts, CO-5000) says a veterans benefit's dependent part is stated in for_dependent alone, wherever the dependent lives, so CO-5003 cannot subtract it twice. | CO-5000 | — (no answer changes under a statement that follows the meaning) |
| R7-5 | **Fixed** as proposed: OQ-680 carries the five-payday consequence with CW5's worked figures and the county figure's role (CO-3914). Also listed as KL-CE-3. | OQ-680 | — |
| R7-6 | **Fixed.** CO-3330's precision declares LEAP's reading of an unstated setting as a private dwelling (3.752.25.B's exceptions) and names its readers (CO-1000, CO-1004, CO-1009, CO-2593, CO-2815); OQ-158's resolution is restated on 3.752.25.B. | CO-3330, OQ-158 | — |

The notes' list for the known-limits document is carried there: OQ-535 (KL-CE-2), OQ-680's five paydays (KL-CE-3) and the blocked figures OQ-532, OQ-1220, OQ-121 and OQ-682 (KL-CE-4).
