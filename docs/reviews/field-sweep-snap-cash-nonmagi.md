# Field sweep: SNAP, Adult Financial, Colorado Works, non-MAGI Medicaid

Report only; nothing in the ledger is changed. Branch `ccr-9d19bf4c-wmnwcl` at `44a4dac` (docs: coverage pass 5, MAGI Medicaid and CHP+). CCCAP, LEAP, SUN Bucks, MAGI Medicaid and CHP+ are swept elsewhere and are left out here; a Medicaid item counts as non-MAGI unless its identifier starts `ma_magi_` (and `ma_has_annualizable_earnings`, CO-6451, MAGI's 8.100.4.C.4.a). The items shared by both methods (CO-1703, CO-5163, CO-5164) are counted in the non-MAGI column.

## Why

Each verification pass has found the same class of defect: a field added to a shared record (receipts CO-5000, earnings CO-5100, holdings CO-5300) by one program's fix, which another program's readers never read although that program's own rule text gives it effect. This sweep checks every field of the three records against every in-scope program, so the class is closed at once rather than found one field at a time.

## Method

1. **Fields.** Every key of `record_fields` of CO-5000 (27 fields), CO-5100 (33) and CO-5300 (53): 113 fields, meanings per docs/conventions.md ("Receipt records", "Earnings records", "Holdings records").
2. **Readers.** `scripts/probes/field-reads.mjs` walks every derived expression and lists, for each `sum_receipts` or `largest` over `receipts`, `earnings` or `holdings`, the fields read as `["receipt", <field>]` inside it; `received_in` (P57) counts as reading the record's month and date. A field read only by an item of another program is not a reader for this program.
3. **Text.** The program's own text on file: SNAP 10 CCR 2506-1 (D-82, effective 2026-10-01) with 7 CFR 273 where cited; Adult Financial 9 CCR 2503-5 (D-80, effective 2026-03-02); Colorado Works 9 CCR 2503-6 (D-81, effective 2025-07-01); non-MAGI Medicaid 10 CCR 2505-10 8.100.5-8.100.7 (D-65) and 20 CFR 416 subparts K and L (D-53, D-54) as 42 CFR 435.601(b)(2) applies them.
4. **Verdicts.** *read-and-right*: a reader reads it as the text says. *read-but-wrong*: read, but not as the text says. *MISSING*: the text gives it effect and no reader in the program reads it. *no-effect*: the paragraphs named (or the program's whole income or resource chapter, when none is named) give it none. *open*: the text arguably gives it effect but the reading is a policy decision, so no probe can have a by-hand answer yet; each is listed as P2 or P3 below.
5. **Probes.** Every MISSING and read-but-wrong cell has a probe in `scripts/probes/field-sweep-snap-cash-nonmagi.yaml`: a rule-test spec on the item that should read the field, with the value computed by hand from the quoted text. `npx vite-node scripts/probes/run-probes.ts scripts/probes/field-sweep-snap-cash-nonmagi.yaml` prints the engine's value beside it (and any missing supplied fact). All 28 probes differ from the hand value at `44a4dac`.

## Summary

| Program | Fields checked | read-and-right | read-but-wrong | MISSING | open | no-effect | P1 |
|---|---|---|---|---|---|---|---|
| SNAP | 113 | 61 | 2 | 5 | 2 | 43 | 6 |
| Adult Financial | 113 | 50 | 1 | 5 | 2 | 55 | 5 |
| Colorado Works | 60 (+53 holdings: no resource test) | 20 | 1 | 5 | 1 | 33 | 5 |
| Non-MAGI Medicaid | 113 | 48 | 2 | 9 | 7 | 47 | 9 |

(A P1 can cover two cells: start_date and end_date are one P1 per program, as are SNAP's lives_in and intends_to_return, and Medicaid's job_start_date and job_end_date.)

The largest single gap: **the source dates of a stream** (`start_date`/`end_date` on receipts, `job_start_date`/`job_end_date` on earnings) were added by SNAP's coverage pass 4 (S4-1, S4-3) and are read only by SNAP's readers, and by Adult Financial's and Colorado Works' earnings readers. The engine's P57 places a stream in every month whatever its dates, so a pension that ended, or a job that has not started, is counted in every month by Adult Financial's and Colorado Works' receipts and by every non-MAGI Medicaid income reader. Every program in scope counts income in the month it is received, so this overstates income (and can deny) wherever a case states a stream with an end.

## P1 list

Each line: id, program, field, the text, the probe (engine against hand), the proposed fix. Probe specs are in `scripts/probes/field-sweep-snap-cash-nonmagi.yaml`.

### Streams counted outside their dates

- **FS-AF-1 (Adult Financial, receipts start_date/end_date, MISSING).** 9 CCR 2503-5 3.520.781.G: "All income shall be countable in the month it is actually received or legally becomes available, whichever comes first". Probe: a pension stream of $500 with `end_date: 2026-12-31`, read for February 2027 by `af_counted_unearned_receipts` (CO-5017): engine **500**, hand **0**. Fix: add to the condition of every Adult Financial receipts reader (CO-5017, CO-5018, CO-5019, CO-5020, CO-5023, CO-2392, CO-2872, CO-3827, CO-4011, CO-4023, CO-6800, CO-6801) the stream clause SNAP's CO-5011 uses: a record with no month and no date is in the month only from the month of its `start_date` through the month of its `end_date`. Better: one shared condition (or a P57 variant, `received_in` honouring the source dates for a stream) so no reader can leave it out; a P57 change is the engine owner's.
- **FS-CW-1 (Colorado Works, receipts start_date/end_date, MISSING).** 9 CCR 2503-6 3.605.1.A.2: "income shall be countable when actually available ... Income, in general, is the receipt by a client of a gain or benefit in cash or in-kind during a calendar month"; 3.605.1.B: "income received, or unearned income an assistance unit expects to receive in the application month and any month following". Probe: the same stream, `cw_counted_unearned_receipts` (CO-5651): engine **500**, hand **0**. Fix: as FS-AF-1, for CO-5651 to CO-5654, CO-2842, CO-4363, CO-4369.
- **FS-MA-1 (non-MAGI Medicaid, receipts end_date and start_date, MISSING).** 10 CCR 2505-10 8.100.5.F.5: "Unearned income is countable as income in the month received"; 20 CFR 416.1123(a): "We count unearned income at the earliest of the following points: when you receive it or when it is credited to your account". Probes: `ma_ssi_unearned_receipts` (CO-5511), the ended stream: engine **500**, hand **0**; a stream with `start_date: 2027-04-01` read for February (FS-MA-1b): engine **500**, hand **0**. Fix: as FS-AF-1, for CO-5511 to CO-5515, CO-5520, CO-5530, CO-5531, CO-6250, CO-6730.
- **FS-MA-2 (non-MAGI Medicaid, earnings job_start_date/job_end_date, MISSING).** 8.100.5.F.4: "Earned income is countable as income in the month received"; 20 CFR 416.1111(a). Probes: wages stream of $1,500 with `job_end_date: 2026-12-15`, `ma_ssi_wage_earnings` (CO-5170) in February 2027: engine **1500**, hand **0**; a business stream with `job_start_date: 2027-05-01`, `ma_ssi_self_employment_receipts` (CO-5175) in February (FS-MA-2b): engine **2000**, hand **0**. Fix: add the job-date clause Adult Financial's and Colorado Works' earnings readers already carry (CO-5130, CO-5140) to CO-1703, CO-5163, CO-5164, CO-5170, CO-5172, CO-5173, CO-5175 to CO-5178 (and the MAGI readers, for the MAGI sweep to confirm).

### Veterans benefits for a dependent

- **FS-AF-2 (Adult Financial, receipts for_dependent, MISSING).** 3.520.785.B.4: "Any portion of a VA pension paid to a veteran for support of a dependent shall be considered countable unearned income to the dependent rather than to the veteran." Probe: VA benefit $1,500 of which $300 for a dependent, `af_counted_unearned_receipts`: engine **1500**, hand **1200** for the veteran. Fix: subtract `for_dependent` in CO-5017 as CO-5511 does, and count it on the dependent (see FS-MA-3 for the shape).
- **FS-CW-2 (Colorado Works, receipts for_dependent, MISSING).** 3.605.3.B.5, the same sentence. Probe: `cw_counted_unearned_receipts`: engine **1500**, hand **1200**. Fix: as FS-AF-2 in CO-5651; for a stepparent or a non-participant parent the difference also changes what 3.605.1.A.4 deems.
- **FS-MA-3 (non-MAGI Medicaid, receipts for_dependent, read-but-wrong).** 20 CFR 416.1123(e)(2): "If you are a dependent of an individual who receives a veterans benefit and a portion of the benefit is attributable to you as a dependent, we count the amount attributable to you as your unearned cash income if (i) You reside with the individual who receives the veterans benefit". The veteran's side, (e)(1), is read (CO-5511); the dependent's is not, so $300 leaves the veteran and reaches no one. Probe: p1 the veteran's spouse with no receipts, p2 the veteran ($1,500, $300 for the dependent): `ma_ssi_unearned_receipts` for p1: engine **0**, hand **300**. Recorded already (CO-5511 precision, N4-3); listed because it is the same field. Fix (all three programs): a dependent's figure adds the `for_dependent` of the receipts of a person it lives with who names it; this needs the record to say whom the amount is for (a `for_person` field, or one `for_dependent` record per dependent), which no field states today (P2 schema request).

### Earmarks and exceptions read too narrowly or too widely

- **FS-CW-3 (Colorado Works, receipts pass_set_aside, read-but-wrong).** 3.605.4.B.15 exempts "Social Security benefit payments and the accrued amount thereof paid to a client when an individual plan for self-care and/or self-support has been developed". CO-5651 subtracts `pass_set_aside` from every counted kind. Probe: a pension of $1,000 with $200 set aside: engine **800**, hand **1000**. Fix: subtract it only for `social_security` records. (Adult Financial 3.520.786.I and Medicaid via 416.1124(c)(9) cover all income, so their readings stand.)
- **FS-SNAP-1 (SNAP, earnings pass_set_aside, MISSING).** 10 CCR 2506-1 4.405.2.A.22: "Amounts necessary for the fulfillment of a Plan for Achieving Self-Support (PASS) under Title XVI ... This money may be spent in accordance with an approved PASS or deposited into a PASS savings account". Not limited to unearned income; SNAP reads the receipts' field (CO-5011) and not the earnings'. Probe: wages $2,000 with $300 set aside, `snap_person_counted_wages` (CO-5113): engine **2000**, hand **1700**. Fix: subtract earnings `pass_set_aside` in CO-5113 (and its siblings CO-4324, CO-6600; CO-5114/CO-5115 for business receipts).
- **FS-SNAP-2 (SNAP, receipts retroactive, MISSING).** 4.405.E: "Money received in the form of non-recurring lump sum payments, includes ... retroactive lump-sum Social Security, SSI, public assistance, railroad retirement benefits or other payments". SNAP tests only `frequency: once`; a record stated `retroactive: true` with its month and no frequency (frequency defaults to monthly on a receipt with no date) is counted as recurring. Probe: `{kind: social_security, amount: 4000, month: 2027-02, retroactive: true}`, `snap_counted_recurring_receipts` (CO-5011): engine **4000**, hand **0**. Adult Financial and Medicaid read `retroactive` on the same record. Fix: exclude `retroactive` records in CO-5011 (and CO-4322, CO-4930, CO-5013 to CO-5015) as nonrecurring lump sums, or make `frequency` required on a retroactive record.

### Irregular self-employment, held wages

- **FS-CW-5 (Colorado Works, earnings irregular, MISSING).** 3.605.2.E.3: "If receipt of self-employment income is irregular or varies significantly from month to month, it shall be averaged over a twelve-month period." No Colorado Works reader reads `irregular`. Probe: $2,400 of business receipts in February marked irregular, `cw_self_employment_net_profit` (CO-1706): engine **2400**, hand **200**. Fix: average irregular business records over the twelve months (the month and the eleven before, or the tax year), as LEAP and CCCAP average dated records; the period is a policy choice (3.605.2.E.3 does not name it; Adult Financial's 3.520.783.F does).
- **FS-AF-3 (Adult Financial, earnings irregular, read-but-wrong).** 3.520.783.F: "If receipt of self-employment income is irregular, it shall be averaged over a twelve-month period. The twelve-month period can either be the previous tax year (January to December) or the most recent twelve-months prior to the application date." `irregular` is read for the $60 exclusion (3.520.786.O, CO-4011, CO-4012) but not here. Probe: `af_self_employment_net_profit` (CO-1708): engine **2400**, hand **200**. Fix: as FS-CW-5 in CO-1707/CO-1708, with 783.F's two periods.
- **FS-CW-4 (Colorado Works, earnings regular_date, MISSING).** 3.605.2.B: "wages that are paid to an employee for a period for which services were rendered are considered available when paid rather than when earned, except that wages held at the request of the employee are considered income in the month they would otherwise have been paid." Probe: a monthly pay due 2027-02-26, held at the employee's request and paid 2027-03-03 (`regular_date: 2027-02-26`), `cw_earned_pay` (CO-5140) for February: engine **0**, hand **1200**. Fix: place a pay by `regular_date` when it was held at the person's request. The field does not say why the pay moved (a holiday, a changed pay date, the person's request), and Colorado Works counts only the last by its regular date; so the record needs the reason (a `regular_date_reason` option, or a yes/no `held_at_request`) before the reader can be right (schema request, with the fix).

### Holdings

- **FS-SNAP-3 (SNAP, holdings lives_in and intends_to_return, MISSING).** 4.410.B: "The home and surrounding property ... will be an exempt resource. ... The home and surrounding property shall remain exempt when temporarily unoccupied for reasons of employment, training for future employment, illness, or not habitable as a result of casualty or natural disaster, if the household intends to return." The table excludes every `home` record. Probe: a home worth $100,000 the person no longer lives in and does not intend to return to, `snap_countable_nonliquid_resources` (CO-074): engine **0**, hand **100000**. Fix: row `home` to a named rule (excluded while lived in, or temporarily unoccupied for a 4.410.B reason with intent to return; otherwise real property). The 4.410.B reasons are not a field; `intends_to_return` alone overstates the exemption (P2 schema note). Applies only to households not categorically eligible (4.408.A).
- **FS-SNAP-4 (SNAP, holdings revocable, MISSING).** 4.410.F.3: funds in a trust "shall be considered inaccessible to the household if: a. The trust arrangement will not likely cease during the certification period, and no household member has the power to revoke the trust arrangement ..." (7 CFR 273.8(e)(8) joins the conditions with "and"). The row `trust_interest` is `not_counted_no_rule_found`. Probe: a revocable trust of $10,000, `snap_countable_liquid_resources` (CO-4176): engine **0**, hand **10000**. Fix: row `trust_interest` to a rule: counted unless 4.410.F.3's conditions hold (not revocable, and the trustee and use conditions, which need fields or a finding).
- **FS-SNAP-5 (SNAP, holdings amount_owed, read-but-wrong).** 4.408.1.A: "The value of liquid resources is the current redemption rate less encumbrances." CO-4176 counts value x share; only the non-liquid readers subtract `amount_owed`. Probe: securities of $5,000 pledged for a $3,000 loan: engine **5000**, hand **2000**. Fix: value less amount_owed (not below 0) in CO-4176.
- **FS-SNAP-6 (SNAP, holdings for_immediate_family, read-but-wrong).** 4.410.D.1: "Household goods, personal effects, including one burial plot per household member, ... are exempt resources"; 4.410.D.4 the same for a plot in a funeral agreement. CO-5313 excludes any burial space `for_immediate_family`, a wider class (the field includes a brother or sister and their spouses, living anywhere). Probe: a $3,000 plot for the person's brother who is not a household member: engine **0**, hand **3000**. Fix: count burial spaces beyond one per household member (the record needs the person the space is for: `for_person`, also asked by FS-MA-3).
- **FS-MA-4 (non-MAGI Medicaid, holdings accessible, MISSING).** 8.100.5.E.3: resources "shall be considered available when actually available; or, shall be deemed available when all of the following apply ... c. is not legally restricted from using the resource or income for his or her support and maintenance"; 20 CFR 416.1201(a)(1): "If the individual has the right, authority or power to liquidate the property ... it is considered a resource. If a property right cannot be liquidated, the property will not be considered a resource". No Medicaid holdings reader reads `accessible`. Probe: a $5,000 account held in probate (`accessible: false`), `ma_ssi_holdings_countable_in_month` (CO-5320): engine **5000**, hand **0**. Fix: add `accessible` to the condition of CO-5320, CO-5322, CO-5327, CO-5328 and the home and property readers, as SNAP's do. 8.100.5.E.4 ("shall not be considered unavailable merely because the individual ... may need to initiate legal proceedings") and E.9 (unknown assets) bound it; `accessible`'s meaning includes a co-owner's refusal, which E.4 and 416.1201 do not accept for Medicaid, so the field's meaning needs splitting (legal restriction against a co-owner's refusal; P2 schema note).
- **FS-MA-5 (non-MAGI Medicaid, holdings for_immediate_family, MISSING).** 8.100.5.M.2.h: "The total value of burial spaces for the applicant/recipient, his/her spouse and any other members of his/her immediate family is exempt as a resource." The row `burial_space` is `excluded` whatever the space is for. Probe: a $4,000 burial space not for the immediate family, CO-5320: engine **0**, hand **4000**. Fix: row to a rule reading `for_immediate_family` (as Adult Financial's CO-5344 does).
- **FS-MA-6 (non-MAGI Medicaid, holdings household_goods_or_personal_effects, MISSING).** 8.100.5.M.3.i counts "Personal property such as a mobile home or trailer or the like, that is not exempt as a principal place of residence or that is not income producing"; M.2.d-e exempt household goods and personal effects only. Row `personal_property` excludes the whole kind (the conventions' note that the SSI table "needs no new row" for this field is the defect). Probe: an $8,000 trailer the person does not live in (`household_goods_or_personal_effects: false`), CO-5320: engine **0**, hand **8000**. Fix: row to `counted_unless_household_goods` as Adult Financial's, reading the field and `income_producing`.
- **FS-MA-7 (non-MAGI Medicaid, holdings share on a joint account, read-but-wrong).** 8.100.5.M.3.d: "All funds in a joint account are presumed to be a resource of the applicant or client. If there is more than one applicant or client account holder, it is presumed that the funds in the account belong to those individuals in equal shares. To rebut this presumption, evidence must be furnished"; 20 CFR 416.1208(c). The liquid readers count value x share. Probe: a $4,000 account held jointly with someone outside the case, `share: 0.5`: CO-5320 engine **2000**, hand **4000** (presumption not rebutted). Fix: for `bank_account` records with `co_owners`, count the whole value unless a finding (a new `ma_joint_account_rebutted` field, D9 style) says the presumption is rebutted; equal shares between applicants.
- **FS-MA-8 (non-MAGI Medicaid, receipts designated_for_lump_sum_costs, MISSING).** 20 CFR 416.1123(b)(3): "We include less than you actually receive if part of the payment is for an expense you had in getting the payment. ... If you receive a retroactive check from a benefit program other than SSI, legal fees connected with the claim are subtracted. We do not subtract from any taxable unearned income the part you have to use to pay personal income taxes." Probe: retroactive unemployment of $3,000 paid once with $600 of legal fees designated, CO-5511: engine **3000**, hand **2400**. Fix: subtract the legal-fee part; the field lumps legal fees, medical bills, funeral costs and income taxes, and Medicaid subtracts only the first (and medical expenses of an award, already `claim_expense`), so the field needs its parts split (P2 schema request) before the reader can be exact.
- **FS-MA-9 (non-MAGI Medicaid, holdings proceeds_source, MISSING; recorded as OQ-1240).** 20 CFR 416.1232(a): cash "received from any source ... to repair or replace an excluded resource ... that is lost, damaged, or stolen is excluded ... for 9 months"; 8.100.5.F.6.f: relocation payments toward a replacement dwelling, six months; 8.100.5.P.4: home sale proceeds, three months. The row reads `replacement_property` only (three months toward real property). Probe: insurance proceeds of $5,000 received 2026-10-20 to replace a stolen car, read in February 2027: CO-5320 engine **5000**, hand **0**. Fix: OQ-1240's decision, then read `proceeds_source` with the periods.
- **FS-AF-4 (Adult Financial, holdings intent_in_writing, MISSING).** 3.520.77.C.3: "When a client requires care in a long-term care facility, the home continues to be exempt so long as there is intent for the client to return to the home. a. ... Such intent is documented by the following: 1) A written statement from the client ...; or, 2) A written statement from the client's spouse, legal fiduciary, doctor, or authorized representative". Probe: a home the client left for a nursing facility, intent to return stated but not in writing, `af_countable_home_equity` (CO-5346): engine **0**, hand **100000**. Fix: read `intent_in_writing` for C.3 (a long-term care facility), not for C.2 (medical care outside the county); which applies needs the setting (residence_setting_type) beside the record.
- **FS-AF-5 (Adult Financial, holdings accrued_interest, MISSING).** 3.520.77.G.3: "A revocable burial trust is exempt if the value of the trust does not exceed one thousand five hundred dollars ($1,500). Any interest on the exempt $1,500 is also exempt."; H.2.b the same for a revocable prepaid contract. Probe: a revocable burial fund of $1,550 of which $50 is interest, `af_countable_burial_holdings` (CO-5344): engine **50**, hand **0**. Fix: subtract `accrued_interest` (the interest on the exempt part) before the $1,500 test.

## Open cells (P2, P3)

A policy reading is needed before these have a by-hand answer; none is counted as MISSING.

- **P2, Adult Financial `accessible` (FS-AF-6).** 3.520.73.A.1 values an account at its "available balance"; real property's legal restrictions are inside `af_found_unsaleable` (3.520.741.D.1, D.4). A $5,000 account held in probate: `af_cash_and_convertible_holdings` (CO-5340) gives 5000; 0 if "available balance" excludes funds legally frozen. Decide, then read `accessible` as SNAP does.
- **P2, non-MAGI Medicaid `frequency`/`per_payment` (receipts and earnings).** 8.100.5.E.1: "Income, which includes earned and unearned income, shall be calculated on a monthly basis regardless of whether it is received annually, semi-annually, quarterly or weekly." Against F.4-F.5 and 416.1111(a)/1123(a) (counted in the month received). If E.1 means conversion, a quarterly payment is a third in each month; today it is whole in its month.
- **P2, non-MAGI Medicaid earnings `combat_zone`.** 416.1124(c)(19) excludes 37 U.S.C. 310 pay; 416.1161(a)(28) excludes other combat-zone increments only from a deeming spouse's or parent's income. The earnings kind joins both and the row exempts it for everyone.
- **P2, non-MAGI Medicaid earnings `net_for_tax`, and 416.1111(b)'s taxable-year averaging.** 416.1110(b) takes net earnings from self-employment as the federal return figures them and 416.1111(b) divides the year's figure over its months; Colorado's 8.100.3.K.9 lists allowable costs and the readers sum month by month.
- **P2, non-MAGI Medicaid holdings `self_funded`.** 8.100.5.N governs self-funded accounts; a defined-benefit pension the person cannot withdraw is not a resource under 416.1201(a). CO-5326 reads every retirement_account record at N.5 (its precision records the choice).
- **P2, Adult Financial earnings `seasonal_or_commission`.** 3.520.781.G.2.d averages income "expected to fluctuate" over twelve months.
- **P2, Colorado Works earnings `annual_contract_pay`.** 3.605.2.B excepts "contract employment" from "available when paid" but states no treatment.
- **P2, SNAP holdings `net_annual_return`.** 4.410.E.1 exempts property "producing an annual income consistent with its fair market value"; SNAP reads `income_producing` only.
- **P2 schema requests raised by the P1s.** A person the amount or holding is for (`for_dependent`, burial spaces: FS-MA-3, FS-SNAP-6); the reason a pay moved off its regular date (FS-CW-4); the parts of `designated_for_lump_sum_costs` (FS-MA-8); the 4.410.B reasons a home is unoccupied (FS-SNAP-3); a legal restriction apart from a co-owner's refusal in `accessible` (FS-MA-4); a veterans-benefit kind, since `for_dependent` applies to "a veterans benefit" spread over `pension` and `other_nontaxable`; a `recouped` field on earnings (SNAP 4.405.D.1 covers "earned income").
- **P3.** SNAP earnings `retroactive` (whether employer back pay is a 4.405.E "other payment"); SNAP earnings `hours` (the hour tests read the person fact `hours_worked`, CO-022, a second statement beside the record's `hours`); SNAP `household_goods_or_personal_effects` (4.409.B counts real property only as non-liquid, 7 CFR 273.8(c) counts other personal property); Adult Financial `co_owners` (a fiduciary co-owner makes the account 100% the client's, 3.520.73.A.2.a, no option); Adult Financial `farm_ended_date` (77.D.1.c runs from when use stopped); Adult Financial and Colorado Works `transferred_to_child_support_agency`, `paid_to_former_spouse`, `for_person_living_elsewhere` (no paragraph found); Medicaid `recouped` (416.1123(b)(1)'s exception has no field); Medicaid earnings `capital_gain`.

## Matrices

Readers are item ids (the first six, then a count). "via P57" means the field is read through `received_in`.

### SNAP (10 CCR 2506-1, 7 CFR 273)

**receipts** (CO-5000)

| Field | Readers in the program | Text | Verdict |
|---|---|---|---|
| kind | CO-3701, CO-4322, CO-4930, CO-5011, CO-5012, CO-5013 (+2) | snap_receipt_treatment_table (CO-5010), one row per kind | read-and-right |
| amount | CO-3701, CO-4322, CO-4930, CO-5011, CO-5012, CO-5013 (+2) | gross, less the 4.405.D-B parts | read-and-right |
| month | CO-4322, CO-4930, CO-5011, CO-5013, CO-5014, CO-5015 | 4.402.1 prospective; placed by P57 and the stream rule | read-and-right |
| date | CO-4322, CO-4930, CO-5011, CO-5012, CO-5014, CO-5015 | 4.402.B; the application-date rule for destitute migrants | read-and-right |
| frequency | CO-4322, CO-4930, CO-5011, CO-5013, CO-5014, CO-5015 | 4.402.A.2 conversion | read-and-right |
| per_payment | CO-4322, CO-4930, CO-5011, CO-5015 | 4.402.A.2 | read-and-right |
| retroactive | - | 4.405.E "retroactive lump-sum Social Security, SSI, public assistance ... or other payments" are excluded; SNAP reads only frequency once. P1 FS-SNAP-2 | **MISSING** |
| irregular | CO-4322, CO-4930, CO-5011, CO-5013, CO-5014, CO-5015 | 4.405.A ($30 in three months) | read-and-right |
| hours_served | - | the DVSA minimum-wage test is the kind (dvsa_title_i_*); 4.405.2 VISTA exclusion turns on SNAP/PA receipt at joining, not hours | no-effect |
| pass_set_aside | CO-5011 | 4.405.2.A.22 | read-and-right |
| claim_expense | - | 4.404 counts workers' compensation; no SNAP paragraph deducts claim expenses (4.405.I reimbursements are their own kind) | no-effect |
| spent_on_covered_costs | - | settlements and death benefits paid once are 4.405.E lump sums, excluded whole | no-effect |
| designated_for_lump_sum_costs | - | 4.405.E excludes the lump sum whole | no-effect |
| used_for_uncovered_medical_care | - | no SNAP paragraph excludes VA Aid and Attendance used for care (row counted) | no-effect |
| transferred_to_child_support_agency | CO-5011 | 4.405.D.2 | read-and-right |
| paid_to_former_spouse | CO-5011 | CO-5011 (former spouse's share of military retirement) | read-and-right |
| recouped | CO-5011 | 4.405.D.1 "Only the net income received ... shall be considered countable" | read-and-right |
| recouped_for_intentional_violation | CO-5011 | 4.405.D.1 second sentence | read-and-right |
| for_person_living_elsewhere | CO-5011 | 4.405.B | read-and-right |
| for_dependent | - | household income; a dependent living elsewhere is 4.405.B (for_person_living_elsewhere) | no-effect |
| regular_date | CO-4322, CO-4930, CO-5011, CO-5013, CO-5014, CO-5015 | 4.402.B.2-3 | read-and-right |
| start_date | CO-4322, CO-4930, CO-5011, CO-5013, CO-5014, CO-5015 | 4.402.1.B, 4.402.A.2 (S4-1, S4-3) | read-and-right |
| end_date | CO-4322, CO-4930, CO-5011, CO-5013, CO-5014, CO-5015 | 4.402.1.B (S4-3) | read-and-right |
| covers_from | CO-5011 | 4.405.E second paragraph, 4.402.2 | read-and-right |
| covers_through | CO-5011 | 4.405.E, 4.402.2 | read-and-right |
| recurs_within_twelve_months | CO-5011 | 4.405.E | read-and-right |
| taxable_amount | - | SNAP does not count by tax status | no-effect |

**earnings** (CO-5100)

| Field | Readers in the program | Text | Verdict |
|---|---|---|---|
| kind | CO-1376, CO-1701, CO-2569, CO-3722, CO-407, CO-4165 (+16) | snap_earnings_treatment_table (CO-5101) | read-and-right |
| amount | CO-1376, CO-1701, CO-2569, CO-407, CO-4165, CO-4324 (+10) |  | read-and-right |
| month | CO-1376, CO-1701, CO-2569, CO-407, CO-4165, CO-4324 (+13) |  | read-and-right |
| date | CO-1376, CO-4324, CO-5113, CO-5114, CO-5115, CO-5119 (+1) | 4.402.B, 4.403.A.3 | read-and-right |
| frequency | CO-1376, CO-4324, CO-5113, CO-6600 | 4.402.A.2 | read-and-right |
| job | - | each dated pay is converted by itself (CO-4324); no SNAP paragraph averages per job | no-effect |
| per_payment | CO-1376, CO-4324, CO-5113, CO-6600 | 4.402.A.2 | read-and-right |
| irregular | CO-1376, CO-4324, CO-5110, CO-5111, CO-5113, CO-5114 (+2) | 4.405.A | read-and-right |
| retroactive | - | 4.405.E names "retroactive lump-sum ... other payments"; whether back pay from an employer is one is not settled (P3) | open (P2/P3) |
| job_start_date | CO-1376, CO-1701, CO-2569, CO-407, CO-4165, CO-4324 (+15) | 4.402.1.B (S4-3) | read-and-right |
| job_end_date | CO-1376, CO-1701, CO-2569, CO-407, CO-4165, CO-4324 (+13) | 4.402.1.B (S4-3, S4-4) | read-and-right |
| temporary_job | - | no SNAP paragraph on short-term jobs | no-effect |
| ended_through_own_fault | - | voluntary quit is a work rule (4.310), not a field of pay | no-effect |
| annual_contract_pay | CO-1376, CO-4324, CO-5113, CO-6600 | 4.403.3, 4.402.2.A.2 | read-and-right |
| paid_as_business_owner | CO-1376 | verification (CO-1376) | read-and-right |
| combat_zone | CO-5110, CO-5111, CO-5113 | 4.405.2 item 12 | read-and-right |
| combat_zone_compensation | - | federal tax fact; SNAP reads combat_zone | no-effect |
| seasonal_or_commission | - | 4.402.2.A.4 averaging is the household's election, not this fact (P3) | no-effect |
| employer_convenience_meals_or_lodging | - | in-kind pay is excluded whole (4.405.G, H.4) | no-effect |
| pass_set_aside | - | 4.405.2.A.22 "Amounts necessary for the fulfillment of a Plan for Achieving Self-Support" is not limited to unearned income; SNAP reads the receipts' field only. P1 FS-SNAP-1 | **MISSING** |
| education_deduction | CO-5113 | 4.405.2.A.13 | read-and-right |
| net_for_tax | - | 4.403.11 is SNAP's own computation | no-effect |
| hours | - | SNAP's hour tests read the person fact hours_worked (CO-022) instead (CO-6604): a second statement of the same hours (P3) | no-effect |
| farm | CO-1701, CO-5116 | 4.403.11-12 farm loss | read-and-right |
| annual_support | CO-4329 | 4.403.12 | read-and-right |
| changed_substantially | CO-4329 | 4.403.12 | read-and-right |
| boarders | CO-5118 | 4.403.2 | read-and-right |
| provides | CO-4165, CO-5117, CO-5118 | 4.403.2 | read-and-right |
| foster_care | CO-4165, CO-5110, CO-5111, CO-5113, CO-5117, CO-5118 | 7 CFR 273.9(c)(15) | read-and-right |
| regular_date | CO-1376, CO-1701, CO-2569, CO-407, CO-4165, CO-4324 (+13) | 4.402.B.1, 4.403.A.3 | read-and-right |
| leave_or_bonus_pay | CO-1376, CO-4324, CO-5113, CO-5119, CO-6600 | 4.404.F (S4-4) | read-and-right |
| wioa_funded | CO-5110, CO-5111, CO-5113 | S4-8 | read-and-right |
| capital_gain | CO-6605 | 4.403.11.D | read-and-right |

**holdings** (CO-5300)

| Field | Readers in the program | Text | Verdict |
|---|---|---|---|
| kind | CO-4176, CO-5310, CO-5311, CO-5312, CO-5313, CO-5314 (+1) | snap_holding_treatment_table (CO-5301); but see revocable (trust_interest row not_counted_no_rule_found although 4.410.F.3 is the rule) | read-and-right |
| value | CO-4176, CO-5310, CO-5311, CO-5312, CO-5313, CO-5314 (+1) |  | read-and-right |
| month | via P57 received_in (5 items) | det_month | read-and-right |
| date | via P57 received_in (5 items) | SNAP values at the month (4.408.B) | no-effect |
| amount_owed | CO-5310, CO-5311, CO-5313, CO-5314, CO-5315 | read for real property and burial spaces, not for liquid resources: 4.408.1.A "The value of liquid resources is the current redemption rate less encumbrances." P1 FS-SNAP-5 | **read-but-wrong** |
| share | CO-4176, CO-5310, CO-5311, CO-5314, CO-5315 | 4.409.C | read-and-right |
| holding_id | - | a check key | no-effect |
| co_owners | CO-4176, CO-5310, CO-5311 | 4.409.C (outside_case: entire value) | read-and-right |
| accessible | CO-4176, CO-5310, CO-5311, CO-5312, CO-5313 | 4.409.C, 4.410.F.1, H | read-and-right |
| source_date | CO-4176 | 4.410.J.12 | read-and-right |
| paid_by | CO-4176 | 4.410.J.12 | read-and-right |
| received_while_on_snap | CO-4176 | 4.410.J.12 | read-and-right |
| replacement_property | - | 4.410 has no replacement-proceeds exclusion (4.410.J.3-4 are kinds of payment) | no-effect |
| proceeds_source | - | as replacement_property | no-effect |
| used_for_transportation | - | 4.410.A: all vehicles exempt | no-effect |
| lives_in | - | 4.410.B exempts "The home" and keeps it exempt "when temporarily unoccupied ... if the household intends to return"; the table excludes every home record. P1 FS-SNAP-3 | **MISSING** |
| intends_to_return | - | 4.410.B, as lives_in. P1 FS-SNAP-3 | **MISSING** |
| intent_in_writing | - | 4.410.B asks intent only | no-effect |
| outside_colorado | - |  | no-effect |
| held_in_trust_or_entity | - |  | no-effect |
| beneficiary_deed | - |  | no-effect |
| listed_for_sale | CO-5310, CO-5311 | 4.410.F.1 | read-and-right |
| costs_of_sale | CO-5311 | 4.410.G | read-and-right |
| co_owner_lives_in_it | - | no SNAP co-owner hardship rule | no-effect |
| co_owner_would_lose_housing | - |  | no-effect |
| lot_for_future_home | CO-5310, CO-5311 | 4.410.B last sentence | read-and-right |
| income_producing | CO-5310, CO-5311 | 4.410.E.1 | read-and-right |
| used_in_trade_or_business | - | 4.410.E.1 covers both uses | no-effect |
| net_annual_return | - | 4.410.E.1 "producing an annual income consistent with its fair market value": income_producing alone does not state the return; the test needs net_annual_return against value (P2, interpretation of "consistent") | open (P2/P3) |
| produces_for_household_use | - | no SNAP paragraph | no-effect |
| household_goods_or_personal_effects | - | 4.409.A-B count liquid resources and real property only; 4.410.D.1 exempts household goods (P3: 7 CFR 273.8(c) also counts other nonliquid personal property) | no-effect |
| farm_ended_date | CO-5310, CO-5311 | 4.410.E.4 | read-and-right |
| taxes_on_withdrawal | - | 4.410.D.2 retirement accounts exempt | no-effect |
| self_funded | - | 4.410.D.2 | no-effect |
| face_value | - | 4.410.D.1 cash value exempt | no-effect |
| purchase_date | - |  | no-effect |
| premiums_in_lookback | - |  | no-effect |
| irrevocable | CO-5312 | 4.410.F.1 (irrevocable funds inaccessible), D.4 | read-and-right |
| accrued_interest | - |  | no-effect |
| for_immediate_family | CO-5313 | read as the plot exclusion, but 4.410.D.1 exempts "one burial plot per household member", not spaces for the immediate family (siblings and their spouses outside the household included). P1 FS-SNAP-6 | **read-but-wrong** |
| revocable | - | 4.410.F.3.a: trust funds are inaccessible only if "no household member has the power to revoke the trust" (7 CFR 273.8(e)(8): all conditions); row trust_interest is not_counted_no_rule_found. P1 FS-SNAP-4 | **MISSING** |
| annuitized | - | no SNAP annuity paragraph (row not_counted_no_rule_found, P3) | no-effect |
| corpus_available_value | - | 4.410.F.3 tests the trust, not a corpus figure | no-effect |
| ma_found_available_value | - | Medicaid's finding | no-effect |
| ma_sale_efforts_unsuccessful | - | Medicaid's finding | no-effect |
| af_found_unsaleable | - | AF's finding | no-effect |
| disposed_date | CO-4176, CO-5310, CO-5311, CO-5312, CO-5313, CO-5314 (+1) | 4.408.2 | read-and-right |
| compensation_received | CO-5314, CO-5315 | 4.408.2.A.2 | read-and-right |
| transferee | - | 4.408.2.A.3 same-household transfers are inside the finding snap_transfer_to_qualify | no-effect |
| returned_date | CO-5314, CO-5315 |  | read-and-right |
| snap_transfer_to_qualify | CO-5314, CO-5315 | 4.408.2.B | read-and-right |
| af_found_not_twfc | - | AF's finding | no-effect |
| ma_transfer_exempt | - | Medicaid's finding | no-effect |

### Adult Financial (9 CCR 2503-5)

**receipts** (CO-5000)

| Field | Readers in the program | Text | Verdict |
|---|---|---|---|
| kind | CO-2392, CO-2872, CO-3827, CO-4011, CO-4023, CO-5017 (+6) | af_receipt_treatment_table (CO-5016) | read-and-right |
| amount | CO-2392, CO-2872, CO-3827, CO-4011, CO-4023, CO-5017 (+6) |  | read-and-right |
| month | via P57 received_in (12 items) | 3.520.781.G month received (P57) | read-and-right |
| date | via P57 received_in (12 items) | P57 | read-and-right |
| frequency | - | 3.520.781.G counts income in the month received; no conversion paragraph | no-effect |
| per_payment | - |  | no-effect |
| retroactive | CO-2872, CO-5017, CO-5018, CO-5019, CO-5023 | 3.520.785.B.1.a lump sums in the month received | read-and-right |
| irregular | CO-3827, CO-4011 | 3.520.786.O | read-and-right |
| hours_served | - | DVSA kinds | no-effect |
| pass_set_aside | CO-5017 | 3.520.786.I | read-and-right |
| claim_expense | CO-5017 | 3.520.785.B.9 | read-and-right |
| spent_on_covered_costs | CO-5017 | 3.520.785.B.14-15 | read-and-right |
| designated_for_lump_sum_costs | - | no AF paragraph; 3.520.785.B.1.a counts lump sums | no-effect |
| used_for_uncovered_medical_care | CO-5017 | 3.520.786.F | read-and-right |
| transferred_to_child_support_agency | - | no AF paragraph (P3) | no-effect |
| paid_to_former_spouse | - | 3.520.785.B.8 counts amounts withheld by garnishment; no paragraph (P3) | no-effect |
| recouped | - | 3.520.785.B.1.b "calculated based on the gross payment" | no-effect |
| recouped_for_intentional_violation | - |  | no-effect |
| for_person_living_elsewhere | - | 3.520.786.N covers child support for another person, which is stated on that person's list; no general paragraph (P3) | no-effect |
| for_dependent | - | 3.520.785.B.4 "Any portion of a VA pension paid to a veteran for support of a dependent shall be considered countable unearned income to the dependent rather than to the veteran." P1 FS-AF-2 | **MISSING** |
| regular_date | - | 3.520.781.G "in the month it is actually received" | no-effect |
| start_date | - | 3.520.781.G: a stream is income only in months it is received. P1 FS-AF-1 | **MISSING** |
| end_date | - | 3.520.781.G. P1 FS-AF-1 | **MISSING** |
| covers_from | - |  | no-effect |
| covers_through | - |  | no-effect |
| recurs_within_twelve_months | - |  | no-effect |
| taxable_amount | CO-5017 | savings_account_distribution (CA4-3) | read-and-right |

**earnings** (CO-5100)

| Field | Readers in the program | Text | Verdict |
|---|---|---|---|
| kind | CO-1707, CO-1708, CO-2342, CO-2392, CO-3882, CO-4011 (+3) | af_earnings_treatment_table (CO-5103) | read-and-right |
| amount | CO-1707, CO-1708, CO-2392, CO-3882, CO-4011, CO-4012 (+2) |  | read-and-right |
| month | CO-1707, CO-1708, CO-2342, CO-2392, CO-4011, CO-4012 (+2) |  | read-and-right |
| date | via P57 received_in (9 items) | counted by month (3.520.781.G, 783.F) | no-effect |
| frequency | - |  | no-effect |
| job | - |  | no-effect |
| per_payment | - |  | no-effect |
| irregular | CO-4011, CO-4012 | read for 3.520.786.O ($60 a quarter) but not for 3.520.783.F "If receipt of self-employment income is irregular, it shall be averaged over a twelve-month period." P1 FS-AF-3 | **read-but-wrong** |
| retroactive | - |  | no-effect |
| job_start_date | CO-1707, CO-1708, CO-2342, CO-2392, CO-4011, CO-4012 (+2) | 3.520.781.G | read-and-right |
| job_end_date | CO-1707, CO-1708, CO-2342, CO-2392, CO-4011, CO-4012 (+2) | 3.520.781.G, 783.C.1 | read-and-right |
| temporary_job | - |  | no-effect |
| ended_through_own_fault | - |  | no-effect |
| annual_contract_pay | CO-5130 | 3.520.781.G.2.b | read-and-right |
| paid_as_business_owner | - |  | no-effect |
| combat_zone | CO-2342, CO-4012, CO-5130 | row excluded_except_combat_zone (OQ-1140 open) | read-and-right |
| combat_zone_compensation | - |  | no-effect |
| seasonal_or_commission | - | 3.520.781.G.2.d: income "expected to fluctuate" is averaged over twelve months; whether seasonal or commission pay is that case is a reading (P2) | open (P2/P3) |
| employer_convenience_meals_or_lodging | - | 3.520.782.B counts in-kind earned income | no-effect |
| pass_set_aside | CO-2342, CO-4012 | 3.520.786.I | read-and-right |
| education_deduction | - |  | no-effect |
| net_for_tax | - | 3.520.783.B own computation | no-effect |
| hours | - | 3.520.784 donated hours are a person fact | no-effect |
| farm | CO-1707, CO-1708 | 3.520.783.C.1 | read-and-right |
| annual_support | - |  | no-effect |
| changed_substantially | - |  | no-effect |
| boarders | - | 3.520.783.C.2.b-d per-boarder expenses are cost records | no-effect |
| provides | CO-5131 | 3.520.783.C.2.b-d | read-and-right |
| foster_care | CO-2342, CO-4012, CO-5130, CO-5131 | 3.520.786.M | read-and-right |
| regular_date | - | month received | no-effect |
| leave_or_bonus_pay | - |  | no-effect |
| wioa_funded | - | no AF WIOA paragraph | no-effect |
| capital_gain | - | 3.520.783.B gross income (P3) | no-effect |

**holdings** (CO-5300)

| Field | Readers in the program | Text | Verdict |
|---|---|---|---|
| kind | CO-1512, CO-4000, CO-4412, CO-4422, CO-4722, CO-5340 (+11) | af_holding_treatment_table (CO-5302) | read-and-right |
| value | CO-3840, CO-4008, CO-4412, CO-4422, CO-4722, CO-5340 (+7) |  | read-and-right |
| month | via P57 received_in (17 items) |  | read-and-right |
| date | via P57 received_in (17 items) |  | no-effect |
| amount_owed | CO-3840, CO-4008, CO-4422, CO-5340, CO-5342, CO-5343 (+4) | 3.520.741.B.1, 742.A.3 | read-and-right |
| share | CO-3840, CO-4008, CO-4412, CO-4422, CO-5340, CO-5341 (+6) | 3.520.73.A.2, 741.C.2 | read-and-right |
| holding_id | - |  | no-effect |
| co_owners | - | 3.520.73.A.2 counts by persons on the account (share); a co-owner who is the client's fiduciary (A.2.a, 100%) has no option (P3) | no-effect |
| accessible | - | 3.520.73.A.1 values an account at its "available balance"; 741.D.1/D.4 legal restrictions on real property are the finding af_found_unsaleable. A frozen or probate-held account: P2, FS-AF-6 | open (P2/P3) |
| source_date | CO-4412 | 3.520.77.J-L | read-and-right |
| paid_by | - | 3.520.77.K any income tax refund | no-effect |
| received_while_on_snap | - |  | no-effect |
| replacement_property | CO-4412 | 3.520.77.E-F | read-and-right |
| proceeds_source | - | 77.E-F periods follow the property: personal 3, real 6 months; home sale, relocation, condemnation are real | no-effect |
| used_for_transportation | CO-6803 | 3.520.77.A | read-and-right |
| lives_in | CO-1512, CO-5346 | 3.520.77.C | read-and-right |
| intends_to_return | CO-5346 | 3.520.77.C.2-3 | read-and-right |
| intent_in_writing | - | 3.520.77.C.3.a "Such intent is documented by ... A written statement". P1 FS-AF-4 | **MISSING** |
| outside_colorado | - |  | no-effect |
| held_in_trust_or_entity | - | 3.520.72.B.13.c | no-effect |
| beneficiary_deed | - |  | no-effect |
| listed_for_sale | - | finding af_found_unsaleable (741.D.3) | no-effect |
| costs_of_sale | - | 741.B.1 actual value less encumbrances | no-effect |
| co_owner_lives_in_it | - | finding (741.D.2) | no-effect |
| co_owner_would_lose_housing | - | finding (741.D.2) | no-effect |
| lot_for_future_home | - |  | no-effect |
| income_producing | CO-4422, CO-5342, CO-5345 | 3.520.77.D | read-and-right |
| used_in_trade_or_business | CO-4422 | 3.520.77.D.1 | read-and-right |
| net_annual_return | CO-4422 | 3.520.77.D.4 (6%) | read-and-right |
| produces_for_household_use | CO-4422, CO-5342, CO-5345 | 3.520.77.D.3 | read-and-right |
| household_goods_or_personal_effects | CO-5345 | 3.520.77.B, 742 | read-and-right |
| farm_ended_date | - | 77.D.1.c (twelve months after use stops) needs a different date (P3) | no-effect |
| taxes_on_withdrawal | CO-5341 | 3.520.73.B.1.a-b (20% when not provided) | read-and-right |
| self_funded | - | 3.520.72.B.5 counts pensions and accounts alike | no-effect |
| face_value | CO-4722, CO-5347 | 3.520.75 | read-and-right |
| purchase_date | CO-4722, CO-5348 | 3.520.75 | read-and-right |
| premiums_in_lookback | CO-5349 | 3.520.75 | read-and-right |
| irrevocable | CO-5344 | 3.520.77.G-H | read-and-right |
| accrued_interest | - | 3.520.77.G.3 "Any interest on the exempt $1,500 is also exempt", H.2.b the same. P1 FS-AF-5 | **MISSING** |
| for_immediate_family | CO-5344 | 3.520.77.I | read-and-right |
| revocable | CO-5340 | annuity row counted_if_revocable | read-and-right |
| annuitized | - |  | no-effect |
| corpus_available_value | CO-4000, CO-5350 | 3.520.72.B.13 | read-and-right |
| ma_found_available_value | - |  | no-effect |
| ma_sale_efforts_unsuccessful | - |  | no-effect |
| af_found_unsaleable | CO-4422, CO-5342, CO-5345 | 3.520.741.D.2-4, 742.C | read-and-right |
| disposed_date | CO-1512, CO-3840, CO-4000, CO-4008, CO-4412, CO-4422 (+13) | 3.520.76 | read-and-right |
| compensation_received | CO-3840, CO-4008 | 3.520.76 | read-and-right |
| transferee | - | inside the finding af_found_not_twfc | no-effect |
| returned_date | CO-3840 |  | read-and-right |
| snap_transfer_to_qualify | - |  | no-effect |
| af_found_not_twfc | CO-3840, CO-4008 | 3.520.76.A.4.a presumption | read-and-right |
| ma_transfer_exempt | - |  | no-effect |

### Colorado Works (9 CCR 2503-6)

**receipts** (CO-5000)

| Field | Readers in the program | Text | Verdict |
|---|---|---|---|
| kind | CO-2842, CO-4363, CO-4369, CO-5651, CO-5652, CO-5653 (+1) | cw_receipt_treatment_table (CO-5650) | read-and-right |
| amount | CO-2842, CO-4363, CO-4369, CO-5651, CO-5652, CO-5653 (+1) |  | read-and-right |
| month | via P57 received_in (7 items) | 3.605.1.A.2 | read-and-right |
| date | via P57 received_in (7 items) |  | read-and-right |
| frequency | - | 3.605.1.A.2 income of the calendar month; no conversion paragraph | no-effect |
| per_payment | - |  | no-effect |
| retroactive | CO-5653 | colorado_works_cash | read-and-right |
| irregular | - | no CW infrequent-income paragraph | no-effect |
| hours_served | - | 3.605.4.B.12 is the DVSA kinds | no-effect |
| pass_set_aside | CO-5651 | 3.605.4.B.15 exempts "Social Security benefit payments" under a plan; CO-5651 subtracts it from every counted kind. P1 FS-CW-3 | **read-but-wrong** |
| claim_expense | CO-5651 | 3.605.3.B.4 | read-and-right |
| spent_on_covered_costs | CO-5651 | 3.605.3.A.5-6 | read-and-right |
| designated_for_lump_sum_costs | CO-5651 | 3.605.4.B.33 | read-and-right |
| used_for_uncovered_medical_care | CO-5651 | 3.605.4.A.6 | read-and-right |
| transferred_to_child_support_agency | - | 3.605.5 counts support "received" (P3) | no-effect |
| paid_to_former_spouse | - |  | no-effect |
| recouped | - | 3.605.3.A.12 (CO-5651 precision) | no-effect |
| recouped_for_intentional_violation | - |  | no-effect |
| for_person_living_elsewhere | CO-4369 | 3.605.3.B.10 (military allotment) | read-and-right |
| for_dependent | - | 3.605.3.B.5 "Any portion of a VA pension that is paid to a veteran for support of a dependent shall be considered countable unearned income to the dependent rather than the veteran." P1 FS-CW-2 | **MISSING** |
| regular_date | - | receipts: counted when received (3.601 "Received") | no-effect |
| start_date | - | 3.605.1.A.2, 3.605.1.B: income the unit receives or expects to receive in the month. P1 FS-CW-1 | **MISSING** |
| end_date | - | as start_date. P1 FS-CW-1 | **MISSING** |
| covers_from | - |  | no-effect |
| covers_through | - |  | no-effect |
| recurs_within_twelve_months | - |  | no-effect |
| taxable_amount | - |  | no-effect |

**earnings** (CO-5100)

| Field | Readers in the program | Text | Verdict |
|---|---|---|---|
| kind | CO-1705, CO-1706, CO-2340, CO-3879, CO-4361, CO-5140 (+1) | cw_earnings_treatment_table (CO-5104) | read-and-right |
| amount | CO-1705, CO-1706, CO-2340, CO-3879, CO-4361, CO-5140 (+1) |  | read-and-right |
| month | CO-1705, CO-1706, CO-2340, CO-4361, CO-5140, CO-5141 |  | read-and-right |
| date | via P57 received_in (7 items) | 3.605.2.B: available when paid | no-effect |
| frequency | - |  | no-effect |
| job | - |  | no-effect |
| per_payment | - |  | no-effect |
| irregular | - | 3.605.2.E.3 "If receipt of self-employment income is irregular or varies significantly from month to month, it shall be averaged over a twelve-month period." P1 FS-CW-5 | **MISSING** |
| retroactive | - |  | no-effect |
| job_start_date | CO-1705, CO-1706, CO-2340, CO-4361, CO-5140, CO-5141 | 3.605.1.A.2 | read-and-right |
| job_end_date | CO-1705, CO-1706, CO-2340, CO-4361, CO-5140, CO-5141 | 3.605.1.A.2 | read-and-right |
| temporary_job | CO-2340 | 3.605.2.C | read-and-right |
| ended_through_own_fault | CO-2340 | 3.605.2.C | read-and-right |
| annual_contract_pay | - | 3.605.2.B "With the exception of contract employment, wages ... are considered available when paid": the exception is named but its treatment is not stated (P2) | open (P2/P3) |
| paid_as_business_owner | - |  | no-effect |
| combat_zone | - | no CW paragraph (row counted_no_rule_excludes) | no-effect |
| combat_zone_compensation | - |  | no-effect |
| seasonal_or_commission | - |  | no-effect |
| employer_convenience_meals_or_lodging | - | 3.605.2.G in-kind counted | no-effect |
| pass_set_aside | - | 3.605.4.B.15 Social Security only | no-effect |
| education_deduction | - |  | no-effect |
| net_for_tax | - | 3.605.2.E.1 | no-effect |
| hours | - |  | no-effect |
| farm | - | 3.605.2.E.4.a farm income in the month received; costs as any business | no-effect |
| annual_support | - |  | no-effect |
| changed_substantially | - |  | no-effect |
| boarders | CO-4361 | 3.605.2.E.4.c-e per boarder | read-and-right |
| provides | CO-4361 | 3.605.2.E.4.c-e | read-and-right |
| foster_care | CO-2340, CO-4361, CO-5140, CO-5141 | 3.605.4.B.11 | read-and-right |
| regular_date | - | 3.605.2.B "wages held at the request of the employee are considered income in the month they would otherwise have been paid." P1 FS-CW-4 | **MISSING** |
| leave_or_bonus_pay | - |  | no-effect |
| wioa_funded | - | subsidized_employment row excluded (3.605.4.B.16, B.35) | no-effect |
| capital_gain | - |  | no-effect |

**holdings** (CO-5300): no resource test for the assistance unit (9 CCR 2503-6 has none); the death reimbursement's legally responsible person (3.606.7.c) is tested against the SSI resource limit by the SSI method's link (D6), so the non-MAGI Medicaid holdings column applies there. All 53 fields: no-effect for the Colorado Works items themselves.

### Non-MAGI Medicaid (10 CCR 2505-10 8.100.5-8.100.7; 20 CFR 416 K, L)

**receipts** (CO-5000)

| Field | Readers in the program | Text | Verdict |
|---|---|---|---|
| kind | CO-5511, CO-5512, CO-5513, CO-5514, CO-5515, CO-5520 (+4) | ma_ssi_receipt_treatment_table (CO-5510) | read-and-right |
| amount | CO-5511, CO-5512, CO-5513, CO-5514, CO-5515, CO-5520 (+4) |  | read-and-right |
| month | via P57 received_in (10 items) | 8.100.5.F.5; 416.1123(a) | read-and-right |
| date | via P57 received_in (10 items) |  | read-and-right |
| frequency | - | 8.100.5.E.1 "Income ... shall be calculated on a monthly basis regardless of whether it is received annually, semi-annually, quarterly or weekly" against F.5 and 416.1123(a) (month received): P2 | open (P2/P3) |
| per_payment | - | as frequency (P2) | open (P2/P3) |
| retroactive | CO-5511, CO-5514, CO-5515, CO-5531, CO-6250, CO-6730 | 8.100.5.F.6.c | read-and-right |
| irregular | CO-6730 | 416.1124(c)(6) | read-and-right |
| hours_served | - | 8.100.5.F.6.m is the DVSA kinds | no-effect |
| pass_set_aside | CO-5511, CO-6250, CO-6730 | 8.100.5.F.6.q; 416.1124(c)(9) by 435.601(b)(2) | read-and-right |
| claim_expense | CO-5511, CO-5514, CO-6730 | 416.1123(b)(3) | read-and-right |
| spent_on_covered_costs | CO-5511, CO-5514, CO-6730 | 8.100.5.F.5.a | read-and-right |
| designated_for_lump_sum_costs | - | 416.1123(b)(3) "If you receive a retroactive check from a benefit program other than SSI, legal fees connected with the claim are subtracted"; income taxes are not. P1 FS-MA-8 | **MISSING** |
| used_for_uncovered_medical_care | - | 8.100.5.K excludes Aid and Attendance whole | no-effect |
| transferred_to_child_support_agency | - | no paragraph on file (P3) | no-effect |
| paid_to_former_spouse | - | 416.1123(b)(2): withheld for a legal obligation is counted | no-effect |
| recouped | - | 416.1123(b)(1) gross; its exception (both benefits when overpaid) has no field (P3) | no-effect |
| recouped_for_intentional_violation | - |  | no-effect |
| for_person_living_elsewhere | - | no paragraph | no-effect |
| for_dependent | CO-5511, CO-5514, CO-6730 | 416.1123(e)(1) read on the veteran; (e)(2) "we count the amount attributable to you as your unearned cash income if ... You reside with the individual" is not read for the dependent (recorded N4-3). P1 FS-MA-3 | **read-but-wrong** |
| regular_date | - | 416.1123(a) when received | no-effect |
| start_date | - | 8.100.5.F.5 "countable as income in the month received". P1 FS-MA-1b | **MISSING** |
| end_date | - | 8.100.5.F.5. P1 FS-MA-1 | **MISSING** |
| covers_from | - |  | no-effect |
| covers_through | - |  | no-effect |
| recurs_within_twelve_months | - |  | no-effect |
| taxable_amount | - | MAGI's field | no-effect |

**earnings** (CO-5100)

| Field | Readers in the program | Text | Verdict |
|---|---|---|---|
| kind | CO-1703, CO-5163, CO-5164, CO-5170, CO-5172, CO-5173 (+3) | ma_ssi_earnings_treatment_table (CO-5107) | read-and-right |
| amount | CO-1703, CO-5163, CO-5164, CO-5170, CO-5172, CO-5173 (+3) |  | read-and-right |
| month | via P57 received_in (10 items) | P57 | read-and-right |
| date | via P57 received_in (10 items) | P57 | read-and-right |
| frequency | - | 8.100.5.E.1 (P2) | open (P2/P3) |
| job | - |  | no-effect |
| per_payment | - | 8.100.5.E.1 (P2) | open (P2/P3) |
| irregular | CO-5173 | 416.1112(c)(2) via 8.100.5.H.4.e | read-and-right |
| retroactive | - | 416.1111(a) when received | no-effect |
| job_start_date | - | 8.100.5.F.4 "Earned income is countable as income in the month received". P1 FS-MA-2b | **MISSING** |
| job_end_date | - | 8.100.5.F.4. P1 FS-MA-2 | **MISSING** |
| temporary_job | - |  | no-effect |
| ended_through_own_fault | - |  | no-effect |
| annual_contract_pay | - | 416.1111(a) when received | no-effect |
| paid_as_business_owner | - |  | no-effect |
| combat_zone | - | 416.1124(c)(19) excludes 37 U.S.C. 310 pay; 416.1161(a)(28) excludes other combat-zone increments only from a deemor's income; the row exempts the kind for everyone (P2) | open (P2/P3) |
| combat_zone_compensation | - | MAGI's | no-effect |
| seasonal_or_commission | - | MAGI's | no-effect |
| employer_convenience_meals_or_lodging | - | 416.1110(a)(3) in-kind wages counted | no-effect |
| pass_set_aside | CO-5176 | 416.1112(c)(9) | read-and-right |
| education_deduction | - | 416.1110: withheld amounts are counted | no-effect |
| net_for_tax | - | 416.1110(b) NESE "that you would report on your Federal income tax return" against 8.100.3.K.9's own costs (P2) | open (P2/P3) |
| hours | - |  | no-effect |
| farm | - |  | no-effect |
| annual_support | - | 416.1111(b) averages NESE over the taxable year: a placement rule no field states (P2) | no-effect |
| changed_substantially | - |  | no-effect |
| boarders | CO-5177 |  | read-and-right |
| provides | CO-5177 |  | read-and-right |
| foster_care | CO-5172, CO-5173, CO-5177 | 8.100.5.F.6.l | read-and-right |
| regular_date | - | 416.1111(a) when received | no-effect |
| leave_or_bonus_pay | - | 8.100.5.F.4.a wages include bonuses | no-effect |
| wioa_funded | - | kind rows | no-effect |
| capital_gain | - | P3: NESE excludes capital gains (26 U.S.C. 1402(a)(3)) if 416.1110(b) governs | no-effect |

**holdings** (CO-5300)

| Field | Readers in the program | Text | Verdict |
|---|---|---|---|
| kind | CO-4620, CO-4621, CO-4622, CO-5204, CO-5320, CO-5321 (+8) | ma_ssi_holding_treatment_table (CO-5303) | read-and-right |
| value | CO-4620, CO-4621, CO-4622, CO-5204, CO-5320, CO-5321 (+6) |  | read-and-right |
| month | via P57 received_in (14 items) | 416.1207(a) | read-and-right |
| date | via P57 received_in (14 items) |  | no-effect |
| amount_owed | CO-4620, CO-4621, CO-4622, CO-5204, CO-5320, CO-5321 (+4) | 416.1201(c) | read-and-right |
| share | CO-4620, CO-4621, CO-4622, CO-5204, CO-5320, CO-5321 (+6) | 8.100.5.M.3.d "All funds in a joint account are presumed to be a resource of the applicant"; the liquid readers count value x share. P1 FS-MA-7 | **read-but-wrong** |
| holding_id | - |  | no-effect |
| co_owners | CO-6733 | couple's car (CO-6733); not read for joint accounts (FS-MA-7) | read-and-right |
| accessible | - | 8.100.5.E.3 available when the person "is not legally restricted from using the resource"; 416.1201(a)(1). P1 FS-MA-4 | **MISSING** |
| source_date | CO-5320 |  | read-and-right |
| paid_by | CO-5320 | 416.1235 | read-and-right |
| received_while_on_snap | - |  | no-effect |
| replacement_property | CO-5320 | 8.100.5.P.4 | read-and-right |
| proceeds_source | - | 416.1232 (nine months for cash replacing a lost, damaged or stolen excluded resource), 8.100.5.F.6.f (relocation, six months); OQ-1240 recorded. P1 FS-MA-9 | **MISSING** |
| used_for_transportation | CO-5321, CO-6733 | 8.100.5.M.2.c | read-and-right |
| lives_in | CO-5204 | M.2.a | read-and-right |
| intends_to_return | CO-5204 | M.2.a.iii-viii | read-and-right |
| intent_in_writing | CO-5204 | M.2.a.v.2 | read-and-right |
| outside_colorado | CO-5204 | M.2.a.iii-iv | read-and-right |
| held_in_trust_or_entity | CO-5204 | M.2.a.xiii | read-and-right |
| beneficiary_deed | CO-4622 | M.2.a.xiv | read-and-right |
| listed_for_sale | - | finding ma_sale_efforts_unsuccessful (M.2.b) | no-effect |
| costs_of_sale | - | 8.100.5.P.2 applies to sale proceeds | no-effect |
| co_owner_lives_in_it | - | inside co_owner_would_lose_housing (M.3.h) | no-effect |
| co_owner_would_lose_housing | CO-4620, CO-5323 | M.3.h | read-and-right |
| lot_for_future_home | - |  | no-effect |
| income_producing | CO-4620, CO-4621, CO-5320, CO-5323 | 8.100.5.J | read-and-right |
| used_in_trade_or_business | CO-4621 | J.3 | read-and-right |
| net_annual_return | CO-4621 | J.3 (6%) | read-and-right |
| produces_for_household_use | CO-4620, CO-4621, CO-5320, CO-5323 | J.2 | read-and-right |
| household_goods_or_personal_effects | - | 8.100.5.M.3.i "Personal property such as a mobile home or trailer ... that is not exempt as a principal place of residence or that is not income producing" is countable; M.2.d-e exempt only household goods and personal effects; the row excludes the whole kind. P1 FS-MA-6 | **MISSING** |
| farm_ended_date | - |  | no-effect |
| taxes_on_withdrawal | CO-5326 | N.5.a-b | read-and-right |
| self_funded | - | 8.100.5.N.1 governs self-funded accounts; an employer pension the person cannot withdraw is 416.1201(a) (P2; CO-5326 precision) | open (P2/P3) |
| face_value | CO-5320 | M.2.f, M.2.j.ii | read-and-right |
| purchase_date | - |  | no-effect |
| premiums_in_lookback | - |  | no-effect |
| irrevocable | CO-5320 | M.2.i | read-and-right |
| accrued_interest | CO-5320 | M.2.h, M.2.j | read-and-right |
| for_immediate_family | - | 8.100.5.M.2.h "The total value of burial spaces for the applicant/recipient, his/her spouse and any other members of his/her immediate family is exempt"; the row excludes every burial space. P1 FS-MA-5 | **MISSING** |
| revocable | - | inside the finding ma_found_available_value (8.100.7.E) | no-effect |
| annuitized | - | finding (8.100.7.H) | no-effect |
| corpus_available_value | - | finding | no-effect |
| ma_found_available_value | CO-5322 | 8.100.7.E, H.2, I | read-and-right |
| ma_sale_efforts_unsuccessful | CO-4620, CO-5323 | M.2.b | read-and-right |
| af_found_unsaleable | - |  | no-effect |
| disposed_date | CO-4620, CO-4621, CO-4622, CO-5204, CO-5320, CO-5321 (+9) | 416.1207(a), 8.100.7.F | read-and-right |
| compensation_received | CO-5325 | 8.100.7.F | read-and-right |
| transferee | - | inside the finding ma_transfer_exempt | no-effect |
| returned_date | CO-5325 |  | read-and-right |
| snap_transfer_to_qualify | - |  | no-effect |
| af_found_not_twfc | - |  | no-effect |
| ma_transfer_exempt | CO-5325 | 8.100.7 | read-and-right |

## Probe results at 44a4dac

```
FS-AF-1 af_counted_unearned_receipts: engine=500 by_hand=0 DIFFER
FS-CW-1 cw_counted_unearned_receipts: engine=500 by_hand=0 DIFFER
FS-MA-1 ma_ssi_unearned_receipts: engine=500 by_hand=0 DIFFER
FS-MA-1b ma_ssi_unearned_receipts: engine=500 by_hand=0 DIFFER
FS-MA-2 ma_ssi_wage_earnings: engine=1500 by_hand=0 DIFFER
FS-MA-2b ma_ssi_self_employment_receipts: engine=2000 by_hand=0 DIFFER
FS-AF-2 af_counted_unearned_receipts: engine=1500 by_hand=1200 DIFFER
FS-CW-2 cw_counted_unearned_receipts: engine=1500 by_hand=1200 DIFFER
FS-MA-3 ma_ssi_unearned_receipts: engine=0 by_hand=300 DIFFER
FS-CW-3 cw_counted_unearned_receipts: engine=800 by_hand=1000 DIFFER
FS-CW-4 cw_earned_pay: engine=0 by_hand=1200 DIFFER
FS-CW-5 cw_self_employment_net_profit: engine=2400 by_hand=200 DIFFER
FS-AF-3 af_self_employment_net_profit: engine=2400 by_hand=200 DIFFER
FS-SNAP-1 snap_person_counted_wages: engine=2000 by_hand=1700 DIFFER missing=is_destitute_migrant_or_seasonal_farmworker
FS-SNAP-2 snap_counted_recurring_receipts: engine=4000 by_hand=0 DIFFER missing=is_destitute_migrant_or_seasonal_farmworker
FS-SNAP-3 snap_countable_nonliquid_resources: engine=0 by_hand=100000 DIFFER
FS-SNAP-4 snap_countable_liquid_resources: engine=0 by_hand=10000 DIFFER
FS-SNAP-5 snap_countable_liquid_resources: engine=5000 by_hand=2000 DIFFER
FS-MA-4 ma_ssi_holdings_countable_in_month: engine=5000 by_hand=0 DIFFER
FS-MA-5 ma_ssi_holdings_countable_in_month: engine=0 by_hand=4000 DIFFER
FS-MA-6 ma_ssi_holdings_countable_in_month: engine=0 by_hand=8000 DIFFER
FS-MA-7 ma_ssi_holdings_countable_in_month: engine=2000 by_hand=4000 DIFFER
FS-MA-8 ma_ssi_unearned_receipts: engine=3000 by_hand=2400 DIFFER
FS-MA-9 ma_ssi_holdings_countable_in_month: engine=5000 by_hand=0 DIFFER
FS-AF-4 af_countable_home_equity: engine=0 by_hand=100000 DIFFER missing=adult_financial_program_received
FS-AF-5 af_countable_burial_holdings: engine=50 by_hand=0 DIFFER
FS-AF-6 af_cash_and_convertible_holdings: engine=5000 by_hand=0 DIFFER
FS-SNAP-6 snap_countable_burial_spaces: engine=0 by_hand=3000 DIFFER
```

## Record fields with a default

Decision 4 (2026-11-23): missing information is "cannot determine" unless the rule says otherwise; design decision D3 gives an exception of a pay or a holding the default "none". The question for each `default` is whether a rule of a program that reads the field gives it. "Readers in scope" counts only SNAP, Adult Financial, Colorado Works and non-MAGI Medicaid items.

### Receipts (CO-5000)

| Field | Default | Readers in scope | Does a rule give it? | Recommendation |
|---|---|---|---|---|
| frequency | monthly (undated record; required on a dated one) | SNAP | Not a rule's default but the record's own definition: an undated record's amount is the month's (decision 4, L4-3). | Keep, but declare it as `when_absent` (what absence means), not `default`. It is what lets FS-SNAP-2's retroactive record read as recurring: a record with `retroactive: true` should require `frequency`. |
| retroactive | false | AF (CO-2872, CO-5017 to CO-5019, CO-5023), CW (CO-5653), MA (CO-5511, CO-5514, CO-5515, CO-5531, CO-6250, CO-6730) | No. 8.100.5.F.6.c, 3.520.785.B.1.a and 4.405.E turn on a fact the record must state; none presumes "not retroactive". An unmarked retroactive Social Security payment is counted as current income by Medicaid (F.6.c exempts it nine months). | Required where read: for `social_security`, `ssi`, `colorado_works_cash`, `adult_financial_cash`, `home_care_allowance` records paid once (and for SNAP once FS-SNAP-2 is fixed). |
| irregular | false | SNAP (CO-4322, CO-4930, CO-5011, CO-5013 to CO-5015), AF (CO-3827, CO-4011), MA (CO-6730) | No. 4.405.A, 3.520.786.O and 416.1124(c)(6) exclude income "received too infrequently or irregularly"; none presumes regular. | "Infrequent" (once in a quarter from one source, not in the month before or after) is computable from the list itself; derive it. Keep a field only for "could not reasonably expect it", required where read for receipts under the $30/$60 limits. |
| pass_set_aside | 0 | SNAP, AF, CW, MA | No. A set-aside exists only under an SSA-approved plan (4.405.2.A.22, 3.520.786.I, 3.605.4.B.15, 8.100.5.F.6.q). | A person fact, "has a PASS the SSA approved", required where read (rarely yes); the earmark required only when it is yes. |
| claim_expense | 0 | AF (CO-5017), CW (CO-5651), MA (CO-5511, CO-5514, CO-6730) | No. 3.520.785.B.9, 3.605.3.B.4, 416.1123(b)(3): the award's expenses "are deducted"; nothing presumes none. | Required where read, on `workers_compensation` records (and, for Medicaid, any damages award). |
| spent_on_covered_costs | 0 | AF, CW, MA | No. "to the extent they exceed the amount expended" (3.520.785.B.14-15, 3.605.3.A.5-6), "reduced by the cost of last illness and burial" (8.100.5.F.5.a). | Required where read; the kinds that carry it (insurance proceeds, death benefits) are inside `other_nontaxable`, so a kind for insurance or settlement proceeds is needed to make it required only there. |
| designated_for_lump_sum_costs | 0 | CW (CO-5651) | No (3.605.4.B.33). | Required where read on records paid once; split its parts (FS-MA-8). |
| used_for_uncovered_medical_care | 0 | AF (CO-5017), CW (CO-5651) | No (3.520.786.F, 3.605.4.A.6: exempt "if used for"). | Required where read, on `va_aid_and_attendance` records. |
| transferred_to_child_support_agency | 0 | SNAP (CO-5011) | No (4.405.D.2 applies to support a Title IV-A participant "must transfer"). | Required where read: `child_support` records of a Colorado Works participant. |
| paid_to_former_spouse | 0 | SNAP (CO-5011) | No. | Required where read: `pension` records (military retirement). |
| recouped, recouped_for_intentional_violation | 0 | SNAP (CO-5011) | No. 4.405.D.1 counts "Only the net income received"; nothing presumes no withholding. | Required where read; or define `amount` for SNAP's purpose as gross with the withheld part required. |
| for_person_living_elsewhere | 0 | SNAP (CO-5011), CW (CO-4369) | No (4.405.B, 3.605.3.B.10). | Required where read: the kinds paid for others (`military_allotment`, `social_security` paid to a representative payee, `child_support` of a child outside the home). |
| for_dependent | 0 | MA (CO-5511, CO-5514, CO-6730); AF and CW once FS-AF-2/FS-CW-2 are fixed | No (416.1123(e), 3.520.785.B.4, 3.605.3.B.5). | Required where read on veterans benefits; needs a veterans-benefit kind to say where. |

### Earnings (CO-5100)

| Field | Default | Readers in scope | Does a rule give it? | Recommendation |
|---|---|---|---|---|
| frequency | monthly (undated) | SNAP | As receipts. | As receipts. |
| irregular | false | SNAP, AF (CO-4011, CO-4012), MA (CO-5173); CW once FS-CW-5 is fixed | No (4.405.A, 3.520.786.O and 783.F, 416.1112(c)(2), 3.605.2.E.3). | As receipts; for self-employment the averaging test (783.F, 3.605.2.E.3) is "irregular or varies significantly", required where read on business records. |
| retroactive | false | none in scope | n/a | No reader in scope reads it. |
| temporary_job | false | CW (CO-2340) | No. 3.605.2.C exempts short-term employment; nothing presumes a job is not short-term. | Required where read (wages and subsidized employment, Colorado Works). |
| paid_as_business_owner | false | SNAP (CO-1376, verification) | No. | Required where read, or derived from a business record of the same person. |
| combat_zone | false | SNAP (CO-5110, CO-5111, CO-5113), AF (CO-2342, CO-4012, CO-5130) | No (4.405.2 item 12; OQ-1140 for AF). | Required where read on `uniformed_services_special_pay` records. |
| combat_zone_compensation, seasonal_or_commission, employer_convenience_meals_or_lodging | false | none in scope (MAGI) | Left to the MAGI sweep. | |
| pass_set_aside | 0 | AF, MA (CO-5176); SNAP once FS-SNAP-1 is fixed | No. | As receipts. |
| education_deduction | 0 | SNAP (CO-5113) | No (4.405.2.A.13). | Required where read on a uniformed service member's basic pay; no kind or field says the wages are military pay (schema note). |
| farm | false | SNAP (CO-1701, CO-5116), AF (CO-1707, CO-1708) | No. A cost record of a person who runs only a farm reads as non-farm, so Adult Financial's yearly farm averaging (3.520.783.C.1) and SNAP's farm loss offset miss it. | Required where read when the person states farm receipts. |
| foster_care | false | SNAP, AF, CW, MA | No (7 CFR 273.9(c)(15), 3.520.786.M, 3.605.4.B.11, 8.100.5.F.6.l). | Required where read on `boarder_payments` and `difficulty_of_care_payment` records. |
| leave_or_bonus_pay | false | SNAP | No (4.404.F). | Required where read on dated pays after the job ended. |
| wioa_funded | false | SNAP | No. | Required where read on `subsidized_employment`. |
| capital_gain | 0 | SNAP (CO-6605) | No (4.403.11.D). | An earmark of the receipts; required where read on business receipts in a month the person states a sale of business property; otherwise a stated 0. |

### Holdings (CO-5300)

| Field | Default | Readers in scope | Does a rule give it? | Recommendation |
|---|---|---|---|---|
| accessible | true | SNAP (CO-4176, CO-5310 to CO-5313); MA and AF once FS-MA-4/FS-AF-6 are settled | Yes. SNAP 4.409.C ("considered available in their entirety ... unless it can be demonstrated ... that it does not have access"); Medicaid 8.100.5.E.3-4 and 416.1201(a); Adult Financial 3.520.72.A ("Unless otherwise specified, a resource is countable"). | Keep. |
| intends_to_return, intent_in_writing | false | AF (CO-5346), MA (CO-5204) | Yes for both: Medicaid 8.100.5.E.3, M.2.a.v ("documented in writing"); Adult Financial 3.520.72.A and 3.520.77.C.3.a (the intent "is documented by" a written statement). The schema cites only Medicaid's text. | Keep; add Adult Financial's citation. |
| co_owner_would_lose_housing | false | MA (CO-4620, CO-5323) | Yes: 8.100.5.M.3.h requires the statements. | Keep. |
| income_producing, used_in_trade_or_business, produces_for_household_use | false | SNAP (CO-5310, CO-5311: income_producing), AF (CO-4422, CO-5342, CO-5345), MA (CO-4620, CO-4621, CO-5320, CO-5323) | Medicaid (8.100.5.E.3) and Adult Financial (3.520.72.A; 3.520.77.D: the county "shall obtain a copy of the most recent tax returns") yes. SNAP: no SNAP paragraph presumes property is not income-producing; 4.410.E lists exempt property without a burden sentence. | Keep for AF and MA; for SNAP cite a SNAP basis (4.408.1 values "nonexempt household resources" from "applicant statements, documents ...") or make it required where SNAP reads it. |
| ma_sale_efforts_unsuccessful | false | MA | Yes: 8.100.5.M.2.b requires quarterly verification of efforts. | Keep. |

### Required fields that readers default anyway

Readers carry no default of their own (conventions, "Receipt records"), yet these required fields are read with `otherwise`. In each case a rule does give the default, so the fix is in the schema, not the reader:

| Field (schema: required) | Reader default | Rule | Recommendation |
|---|---|---|---|
| af_found_not_twfc | false, CO-3840, CO-4008 | 3.520.76.A.4.a: "The county department shall make a rebuttable presumption that the transaction was made for the purpose of becoming or remaining eligible" | Declare `default: false` with that citation. |
| snap_transfer_to_qualify | false, CO-5314, CO-5315 | 4.408.2.B: disqualification "In the event the local office establishes that an applicant household knowingly transferred resources" | Declare `default: false` with that citation. |
| af_found_unsaleable | false, CO-4422, CO-5342, CO-5345 | 3.520.741.D.3 and 742.C.3: the exemption holds only while the county verifies reasonable efforts quarterly; 3.520.72.A | Declare `default: false` with those citations. |
| taxes_on_withdrawal | 20% of value, AF CO-5341, MA CO-5326 | 3.520.73.B.1.b and 8.100.5.N.5.b: "If the ... applicant is not able to provide the amount of taxes that are due, the value shall be determined by deducting 20% from the gross value of the account." | Declare `when_absent: "20% of value"` (af_ and ma_retirement_account_default_tax_rate), not `required`. |

## Fields named in the brief that are not record fields at 44a4dac

`burial_for`/`for_person`, `eitc_share`, an early-withdrawal penalty and `temporary_absence` are not fields of CO-5000, CO-5100 or CO-5300 at this head (`temporary_absence_reason` and its dates are person facts, CO-3354, CO-3805, CO-4401). On the text: a person a burial space or a VA amount is for is needed by FS-SNAP-6 and FS-MA-3 (requested above); no in-scope text gives an early-withdrawal penalty effect (Adult Financial 3.520.73.B.1.a and Medicaid 8.100.5.N.5.a subtract "any taxes due" only; SNAP exempts retirement accounts, 4.410.D.2); the EITC is the holdings kind `held_eitc`, read by SNAP (4.410.J.12, "for the individual and that individual's spouse") and Medicaid (8.100.5.F.6.u), and no in-scope text splits it by share.

## Reproducing

```
git worktree add --detach <dir> 44a4dac && ln -s <repo>/node_modules <dir>/node_modules
node scripts/probes/field-reads.mjs volumes/co > reads.json     # the reader inventory
npx vite-node scripts/probes/run-probes.ts scripts/probes/field-sweep-snap-cash-nonmagi.yaml
```
