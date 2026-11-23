# Field sweep: the shared records against CCCAP, LEAP and SUN Bucks (coverage pass 5 fix round)

Fix round of coverage pass 5 (docs/reviews/coverage5-care-energy.md), 2026-11-23. Every pass has found the same class again: a field added to a shared record (receipts CO-5000, earnings CO-5100, holdings CO-5300) by one program's fix that another program's readers never read, though that program's own rule text gives it effect. This sweep closes the class for CCCAP, LEAP and SUN Bucks: each field of each record's `record_fields`, as the records stand after this round, against each program's rule text.

For each cell: **Effect** quotes the paragraph that gives the field an effect (from `volumes/co/documents/`) and names the items that read it; **Fixed** marks a field the text gives effect and no reader read before this round (with the finding or the sweep line, and the rule tests); **No effect** names the paragraphs checked that are silent on the field, or that count the money the field describes whole.

Texts (as in the review): CCCAP 8 CCR 1403-1, rule version 12658 (D-87): 3.103.K, LLL; 3.111.G, H.4-5, I, J, K; 3.116; 3.119. LEAP 9 CCR 2503-7 (D-86) with the amendments effective 2026-11-01 (D-173): 3.751.1, 3.751.2, 3.752.1, 3.752.2, 3.752.21-25, 3.755.21. SUN Bucks 7 CFR 292.2, 292.5-292.7, 292.12, 292.14 (D-88, D-117), C.R.S. 22-33-104(1)(a) (D-141), 7 CFR 245.2, 245.6 (D-250).

Shorthand for the paragraphs checked, used in the cells below:
- **[C-inc]** CCCAP's income paragraphs: 3.111.H.4 ("the income received in the prior thirty (30) day period"), H.5.a-b, I.1-I.33, J.1-J.29, K.1-2.
- **[L-inc]** LEAP's income paragraphs: 3.752.21 A-N ("Countable unearned income includes ... payments from any other source, which is considered to be a gain or benefit to the applicant or recipient"), 3.752.211 A-K, 3.752.212, 3.752.22 A-C ("the countable gross unearned income received in the income verification period"; "countable gross income"), 3.752.23 A-HH, 3.755.21.I-J.
- **[S-inc]** SUN Bucks: 7 CFR 292.5(a) tests income "based on the Income Eligibility Guidelines" from the household's reported income (school_meal_household_income), not the members' receipts or pay; 292.2 and 292.6 read receipt of "assistance under SNAP, TANF, or FDPIR" "at any time during the period of eligibility". SUN Bucks reads one thing of a receipt: whether Colorado Works cash assistance was received in a month (sebt_tanf_assistance_receipts, CO-5731); it reads no earnings and no holdings.
- **[C-res]** CCCAP's assets: 3.103.K ("'Assets' include ... Liquid resources ... Non-liquid resources") and 3.111.H.5.c ("Adult caretakers or teen parents shall self-declare that their liquid and non-liquid assets do not exceed one million dollars"): the test is the caretaker's declaration (cccap_declares_assets_within_limit; OQ-1200, OQ-1201 keep it), so no field of a holding is read.
- **[L-res]** LEAP 3.752.24: "There are no resource criteria for the Low-Income Energy Assistance Program. The value of the household's resources shall not be considered".
- **[S-res]** 7 CFR 292 has no resource test.

Result: **10 fields fixed** (CCCAP 6, LEAP 6, SUN Bucks 1; some fields in two programs), **3 fields added** to receipts (`early_withdrawal_penalty`, `ownership_share`, `property_income`; docs/conventions.md, "Receipt records"), and every other cell recorded as no effect with the paragraphs checked. One reading the text leaves open is recorded: OQ-1321 (`paid_to_former_spouse`).

| Program | Fields fixed (finding, items, tests) |
|---|---|
| CCCAP | `start_date`, `end_date` (C5-1: CO-5721, CO-5725, CO-4463, CO-4076 by the thirty days; CO-5723 by month; CO-5721-T9, T12, T13, CO-5725-T3, CO-4463-T13, CO-4076-T8, CO-5723-T3); `job_start_date`, `job_end_date` (C5-1: CO-3915, CO-5152, CO-4464, CO-5156, CO-1709, CO-6404, CO-984 by the thirty days; CO-6150 by month; CO-3915-T19 to T21, CO-5152-T7, CO-4464-T8, CO-5156-T5 to T7, CO-1709-T8, CO-6404-T4, CO-984-T33, CO-6150-T5, T6); `early_withdrawal_penalty` (C5-2, new field: CO-5721, CO-5722, CO-4076, CO-5723; CO-5721-T10, T11, CO-5722-T10 (review households CP1, CP2), CO-5723-T4); `ownership_share`, `property_income` (X5-1, new fields: CO-5721, CO-5722, CO-4076, CO-5723, CO-4463; CO-5721-T14 to T16, CO-5722-T11, CO-4463-T14; household CO-806); `spent_on_covered_costs` on a recurring receipt (sweep: CO-5721; CO-5721-T17) |
| LEAP | `start_date`, `end_date` (L5-1: CO-5003 to CO-5008 by the income verification period, CO-4518 by month; CO-5003-T10 to T12, CO-5004-T4, CO-5005-T4, T5, CO-5006-T2, CO-5007-T2, CO-5008-T2, CO-4518-T8, T9; review households LS1 and LS2 as CO-5003-T10 and CO-5005-T4); `job_start_date`, `job_end_date` (L5-1: CO-5124 by the period, CO-5126, CO-1711, CO-1712 by month; CO-5124-T7, CO-5126-T5 to T7, CO-1711-T6, CO-1712-T6); `for_person_living_elsewhere` (L5-2: CO-5003, CO-5009; CO-5003-T13, T14, CO-5009-T14; households CO-801, CO-802); `ownership_share`, `property_income` (X5-1: CO-5003, CO-5009; CO-5003-T15; household CO-808); `spent_on_covered_costs` on a recurring receipt (sweep: CO-5003; CO-5003-T16); `pass_set_aside` on a one-time receipt and on a boarder's payment (sweep: CO-5009, CO-5124; CO-5009-T15, CO-5124-T8); `retroactive` narrowed to EE's kinds (L5-3: CO-5009; CO-5009-T10 to T12; household CO-800) |
| SUN Bucks | `start_date`, `end_date` (S5-1: CO-5731 by month; CO-5731-T5, T6, CO-2708-T16, review household SS1) |

## 1. Receipts (CO-5000)

| Field | CCCAP | LEAP | SUN Bucks |
|---|---|---|---|
| kind | Effect: I, J name the sources; read by every reader through cccap_receipt_treatment_table (CO-5720). | Effect: 3.752.21-23 name the sources; read through leap_receipt_treatment_table (CO-5001). | Effect: 292.2 "assistance under ... TANF": colorado_works_cash is tanf_assistance (CO-5730), read by CO-5731. |
| amount | Effect: H.4 income received; read (CO-5721, CO-5722, CO-5725, CO-3915, CO-4463, CO-4076, CO-5723). | Effect: 3.752.22.A "countable gross unearned income received"; read (CO-5003 to CO-5009, CO-4518). | Effect: a payment received (CO-5731, more than 0). |
| month | Effect: H.4-5 (OQ-680 (2): a month's record stands for the thirty days); read through `received_in` and the placement. | Effect: 3.752.21.G-I "in the month received" (OQ-681 (4)); read. | Effect: 292.6 "at any time during the period"; read through `received_in`. |
| date | Effect: H.5.b "received during the prior thirty (30) day period"; read (C4-2). | Effect: 3.752.22.A "received in the income verification period"; read (L4-3). | Effect: as month (its month); read through `received_in`. |
| frequency | Effect: H.4.i non-recurring lump sums; read (CO-5721 recurring, CO-5722 once). | Effect: 3.752.22.A, EE "non-recurring lump sum"; read (CO-5003 recurring, CO-5009 once). | No effect: [S-inc]; a once-paid grant in a month is received in it either way (CO-5731 reads the month only). |
| per_payment | No effect: [C-inc]; H.4 counts what was received, and a stream's amount is the month's. | No effect: [L-inc]; 3.752.22.C converts pay "paid less than monthly", and a receipt's stream amount is already the month's (OQ-681's other readings record the conversion alternative). | No effect: [S-inc]. |
| retroactive | No effect: [C-inc]; no paragraph treats a retroactive payment apart (J.2 and J.26 exclude SSI and cash assistance whole; a retroactive Social Security lump sum is a lump sum, H.4.i, CO-5722). | Effect: 3.752.23.EE "retroactive lump-sum social security, SSI, and public assistance payments"; read by CO-5009 (narrowed to those kinds, L5-3, OQ-1320) and CO-5007, CO-4518. | Effect: a retroactive lump sum is paid for earlier months, not assistance received in the month it comes in (CO-5731 precision); read. |
| irregular | Effect: J.28 "Irregular income ... less than ninety dollars ($90) in any calendar quarter"; read (CO-4076, CO-5723, CO-3915). | No effect: [L-inc]; LEAP has no irregular-income exclusion. | No effect: [S-inc]. |
| hours_served | No effect: J.11 tests the hours of Title I (VISTA), II and III payments, which the dvsa_title_i kinds state pre-split; I.32 counts AmeriCorps whole. | Effect: 3.752.23.F "AmeriCorps ... when the value ... adjusted to reflect the number of hours ... is not equivalent to or greater than the minimum wage"; read (CO-5004). | No effect: [S-inc]. |
| pass_set_aside | Effect: J.13 Social Security under "an individual plan for self-care and/or self-support"; read (CO-5721, CO-5722, CO-4076, CO-5723). | Effect: 3.752.23.DD "Income that is deemed necessary for the fulfillment of a Plan for Achieving Self-Support"; read (CO-5008 recurring; **fixed** for a one-time receipt, CO-5009). | No effect: [S-inc]. |
| claim_expense | No effect: I.27 "Worker's compensation received for injuries incurred at work", no deduction. | Effect: 3.752.211.D "amounts included in such awards for medical, legal, or related expenses ... are deducted"; read (CO-5008, CO-5009). | No effect: [S-inc]. |
| spent_on_covered_costs | Effect: I.21 "minus the amount expended ... for the purpose of the insured individual's last illness and burial", I.22 "to the extent that they exceed the amount ... for medical care"; read by CO-5722 (once); **fixed** for a recurring receipt (CO-5721, CO-4076, CO-5723). | Effect: 3.752.21.C-D, the same words; read by CO-5009 (once); **fixed** for a recurring receipt (CO-5003). | No effect: [S-inc]. |
| designated_for_lump_sum_costs | No effect: I.21-22 name only the last illness, burial and medical care (spent_on_covered_costs); J.27 "Reimbursements for expenses paid related to a settlement or lawsuit" is its own kind. | No effect: 3.752.21.C-D as for CCCAP; 3.752.23.S reimbursements are their own kind. | No effect: [S-inc]. |
| used_for_uncovered_medical_care | No effect: I.7.b counts VA pension payments with no deduction. | No effect: 3.752.211.E counts veterans' compensation and pension; S is a reimbursement, which Aid and Attendance is not. | No effect: [S-inc]. |
| transferred_to_child_support_agency | No effect: H.4.h, I.29 "Child support payments", no paragraph for support turned over. | No effect: 3.752.21.N "Income received from child support". | No effect: [S-inc]. |
| paid_to_former_spouse | No effect on the text on file, recorded: I.7.a "paid by ... DFAS to retired members" against I.1's gross reading (OQ-1321). | No effect on the text on file, recorded: 3.752.211.B "payments to an applicant" against K's countable garnishments (OQ-1321). | No effect: [S-inc]. |
| recouped | No effect: I.25 "made prior to deductions"; I.1 counts gross before deductions; nothing excludes an overpayment's recovery. | No effect: 3.752.21.K "Amounts withheld from unearned income because of a garnishment are countable"; A counts gross. | No effect: [S-inc]. |
| recouped_for_intentional_violation | No effect: as recouped. | No effect: as recouped. | No effect: [S-inc]. |
| for_person_living_elsewhere | No effect: I.30 "Military allotments" and the other paragraphs count the payment received with no budget-unit qualifier. | Effect: 3.752.212 "for those individuals included in the budget unit"; 3.752.211.E "countable unearned income to the dependent rather than the veteran"; **fixed** (L5-2: CO-5003, CO-5009, CO-4526). Social Security, SSI and cash assistance (CO-5005 to CO-5007): 3.752.211.H, 3.752.21.I, L name no qualifier, and a benefit for another person is that person's (docs/conventions.md, "Whose list a receipt is on"). | No effect: [S-inc]. |
| for_dependent | No effect: I.7.b counts VA pension payments whole. | Effect through membership: 3.752.211.E makes the dependent's part "countable unearned income to the dependent"; a dependent living elsewhere is the for_person_living_elsewhere part (read, L5-2), and a dependent living with the veteran is in the veteran's household (3.751.1 "Household", 3.751.2.D), whose income is the same either way; not read (CO-5003 precision). | No effect: [S-inc]. |
| regular_date | No effect: H.5 counts by the day received (`date`). | No effect: 3.752.22.A counts by the day received. | No effect: 292.6 reads any time in the period; a payment early or late by days stays in the period. |
| start_date | **Fixed** (C5-1): H.4, H.5.b count income "received" in the thirty days, which a source that began after them does not give. | **Fixed** (L5-1): 3.752.22.C.3.c "has not received his/her first check ... do not count any income from this source"; C.3.a-b actual income of the period. | **Fixed** (S5-1): 292.6 "at any time during the period of eligibility". |
| end_date | **Fixed** (C5-1): as start_date. | **Fixed** (L5-1): 3.752.22.C.3.a "If a household member's income is terminated as of the application date, use actual income received in the income verification period". | **Fixed** (S5-1): as start_date. |
| covers_from, covers_through | No effect: H.4.i averages a lump sum over twelve months, whatever period it covers. | No effect: 3.752.22.A counts a one-time receipt in the period received. | No effect: [S-inc]. |
| recurs_within_twelve_months | No effect: H.4.i as above. | No effect: [L-inc]. | No effect: [S-inc]. |
| taxable_amount | No effect: I.2-3 "taxable gross income" is self-employment's, computed from the business's records; I.8 counts 401(k) and IRA payments whole. | No effect: [L-inc]; gross income. | No effect: [S-inc]. |
| early_withdrawal_penalty (new) | Effect: I.8 "Pensions and annuities (minus the amount deducted for penalties, if early payouts are received from these accounts)"; read (C5-2: CO-5721, CO-5722, CO-4076, CO-5723), replacing retirement_early_withdrawal_penalty (CO-4459). | No effect: 3.752.211.A-B count annuities and pension payments, "countable gross unearned income" (3.752.22.A); no penalty deduction. | No effect: [S-inc]. |
| ownership_share, property_income (new) | Effect: H.4.e "Income from jointly owned property shall be considered as a percentage at least equal to the percentage of ownership or, if receiving more than percentage of ownership, the actual amount received"; read (X5-1: CO-5721, CO-5722, CO-4076, CO-5723, CO-4463; OQ-1316). | Effect: 3.752.21.F, the same words; read (X5-1: CO-5003, CO-5009, CO-4526; OQ-1316). | No effect: [S-inc]. |

## 2. Earnings (CO-5100)

SUN Bucks reads no earnings ([S-inc]): every cell of its column is **No effect** for that reason, and the column is left out.

| Field | CCCAP | LEAP |
|---|---|---|
| kind | Effect: I.1-5, I.18, I.31, J.1, J.16; read through cccap_earnings_treatment_table (CO-5105). | Effect: 3.752.22.B-C, 3.752.23.P, Q, T, CC, HH, 3.755.21.I; read through leap_earnings_treatment_table (CO-5102). |
| amount | Effect: I.1 gross earnings; read. | Effect: 3.752.22.B; read. |
| month | Effect: H.4-5 (OQ-680 (2)); read. | Effect: 3.755.21.I.1 "the full month prior"; read. |
| date | Effect: H.5.a.1; read. | Effect: 3.752.22.B "any four (4) weeks of the eight (8) weeks prior", C.3; read. |
| frequency | No effect: [C-inc]; H.4 sums the pays received, without conversion. | Effect: 3.752.22.C.1-2 "Adding four gross weekly income amounts"; read (CO-5120 to CO-5122). |
| job | No effect: [C-inc]; the pays of all jobs are summed. | Effect: 3.752.22.B-C each job's four weeks (L4-1); read (CO-5121, CO-5122). |
| per_payment | No effect: [C-inc]. | Effect: 3.752.22.C; read (CO-5120, CO-5122). |
| irregular | Effect: J.28; read (CO-3915, CO-4464, CO-6150). | No effect: [L-inc]. |
| retroactive | No effect: H.4 counts back pay received in the thirty days as received; no paragraph treats it apart. | No effect: [L-inc]; back pay received in the period is counted as received. |
| job_start_date, job_end_date | **Fixed** (C5-1): H.4, H.5.a.1 "income received during the prior thirty (30) day period"; G (an activity in the thirty days). | Effect: 3.752.22.C.3.a-b, read by CO-3912, CO-5120 to CO-5122 before; **fixed** (L5-1) for boarders' payments (CO-5124) and a business (3.755.21.I.1 "received in the full month prior": CO-5126, CO-1711, CO-1712). |
| temporary_job, ended_through_own_fault | No effect: [C-inc]. | No effect: [L-inc]. |
| annual_contract_pay | Effect: H.4.b "prorated over the term of the contract"; read (C4-4: CO-3915, CO-5152; OQ-1221). | No effect: [L-inc]; no proration paragraph. |
| paid_as_business_owner | No effect: G.1.c "Owners of Limited Liability Corporations (LLC) and S-Corporations are considered employees": their pay is stated as wages, so the kind settles it. | No effect: 3.755.21.J counts an owner's draws as gross earned income, stated as wages (CO-1712 precision). |
| combat_zone, combat_zone_compensation | No effect: I.1 counts "armed forces pay (including ... hazard duty pay)". | No effect: [L-inc]; gross earned income. |
| seasonal_or_commission | No effect: H.4.d lets the county average up to twelve months, the county's figure (cccap_county_determined_monthly_income, CO-3914). | No effect: [L-inc]. |
| employer_convenience_meals_or_lodging | No effect: I.4 counts in-kind compensation at cost or fair market value whatever its tax treatment. | No effect: 3.752.22.C.4 in-kind income at its declared value. |
| pass_set_aside | No effect: J.13 sets aside Social Security only. | Effect: 3.752.23.DD; read (CO-3912, CO-5120 to CO-5122, CO-1712; **fixed** for boarders' payments, CO-5124). |
| education_deduction | No effect: I.1 counts earnings "before deductions are made for taxes, bonds, pensions, union dues and similar deductions". | No effect: [L-inc]; gross. |
| net_for_tax | No effect: I.2-3 compute "taxable gross income" as declared gross less verified expenses, from the cost records (CO-1709, CO-1710). | No effect: 3.755.21.I.1-2 declared gross less receipted expenses (CO-1711, CO-1712). |
| hours | Effect: G.1.b, G.2.d minimum wage per hour, G.2.e launch period; read (CO-6404, CO-984, CO-1710; C5-5). | No effect: [L-inc]; no hours test. |
| farm | Effect: I.3 a farm's operating expenses (interest on farm mortgages); read (CO-1709). | No effect: [L-inc]; no farm paragraph. |
| annual_support, changed_substantially | No effect: H.4.c-d, H.5.a.3 leave a twelve-month average to the county (CO-3914). | No effect: [L-inc]. |
| boarders, provides | No effect: I.18 "Receipts from boarders or lodgers", whatever they receive. | No effect: 3.752.21 counts the payments gross (CO-5124). |
| foster_care | Effect: J.10 foster care payments; read (CO-3915, CO-6150, CO-5152). | Effect: 3.752.23.U "Payment received as foster care/kinship income"; read (CO-3912, CO-5120, CO-5121). |
| regular_date | No effect: H.5.a.1 counts by the day received. | No effect: 3.752.22.B-C count by the day received. |
| leave_or_bonus_pay | No effect: I.1 counts "cash bonuses" and gross earnings. | No effect: [L-inc]. |
| wioa_funded | No effect: I.31 counts "WIOA wages earned in work experience or on the-job training"; J.17 excludes WIA training allowances, a receipt kind. | No effect: [L-inc]. |
| capital_gain | No effect: I.2-3 count gross receipts (I.3.a.4 "Incidental receipts from the sale of wood, sand, gravel"). | No effect: 3.755.21.I.1 total gross income. |

## 3. Holdings (CO-5300)

No program of the three reads holdings, and no cell has effect: CCCAP's assets are the caretaker's declaration [C-res]; LEAP has no resource criteria [L-res]; SUN Bucks has no resource test [S-res]. Income a holding produces is a receipt (interest, dividends, rent, a distribution), read there; the owner's share of a jointly owned property's income is the receipt's `ownership_share` (X5-1), since a receipt cannot be joined to the holding it came from.

| Field | CCCAP | LEAP | SUN Bucks |
|---|---|---|---|
| kind, value, month, date, amount_owed, accessible | No effect: [C-res] | No effect: [L-res] | No effect: [S-res] |
| share, holding_id, co_owners | No effect: [C-res]; H.4.e's share of ownership is read from the receipt (ownership_share) | No effect: [L-res]; 3.752.21.F likewise | No effect: [S-res] |
| source_date, paid_by, received_while_on_snap, replacement_property, proceeds_source | No effect: [C-res]; the money's receipt is read from receipts (H.4.i) | No effect: [L-res]; 3.752.23.GG reads the money obtained, a receipt | No effect: [S-res] |
| used_for_transportation, lives_in, intends_to_return, intent_in_writing, outside_colorado | No effect: [C-res]; 3.103.K.2 "Primary home and automobile of the primary caretakers are excluded" is part of the declaration | No effect: [L-res] | No effect: [S-res] |
| held_in_trust_or_entity, beneficiary_deed, listed_for_sale, costs_of_sale, co_owner_lives_in_it, co_owner_would_lose_housing, lot_for_future_home | No effect: [C-res] | No effect: [L-res] | No effect: [S-res] |
| income_producing, used_in_trade_or_business, net_annual_return, produces_for_household_use | No effect: [C-res]; the income is a receipt or a business record | No effect: [L-res]; likewise | No effect: [S-res] |
| household_goods_or_personal_effects, farm_ended_date | No effect: [C-res] | No effect: [L-res] | No effect: [S-res] |
| taxes_on_withdrawal, self_funded, face_value, purchase_date, premiums_in_lookback, irrevocable, accrued_interest, for_immediate_family, revocable, annuitized, corpus_available_value | No effect: [C-res] | No effect: [L-res] | No effect: [S-res] |
| ma_found_available_value, ma_sale_efforts_unsuccessful, af_found_unsaleable, snap_transfer_to_qualify, af_found_not_twfc, ma_transfer_exempt | No effect: another program's finding (docs/conventions.md, "Holdings records", D9) | No effect: likewise | No effect: likewise |
| disposed_date, compensation_received, transferee, returned_date | No effect: [C-res]; no transfer rule | No effect: [L-res]; no transfer rule | No effect: [S-res] |

## 4. How the sweep was run

Every derivation of the three programs that reads `receipts`, `earnings` or `holdings` was listed with the record fields it reads (a script over `volumes/co/{childcare,energy,sunbucks}`; 32 readers), and each field of the three schemas was read against the paragraphs above. The readers and their fields after this round are in the precision of each item; the cells above name them. The repro households of the review that test a field are rule tests or stored households (CO-800 to CO-809) with expectations computed by hand from the quoted text.
