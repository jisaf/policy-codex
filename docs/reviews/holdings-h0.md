# Resource records, step H0: the foundation

Step H0 of docs/design-earned-and-resource-records.md (4.2, H0 row), by the integration owner, on the branch where unearned income is on receipt records (CO-5000) and earned income on earnings records (CO-5100) in every program, started from a3ffd86 while the earned tracks' follow-up ran (decision D11). Decisions D1-D11 (design section 7) are taken and are not reopened here. H0 builds the statement layer and the foundation the three H1 tracks start from: the `holdings` list, its three counting tables, P58 `largest`, the joint-holding check, the translator, the records harness for holdings with a registry entry per track, and the restatement of every stored household and rule test that states resources. **No rule reads `holdings` in H0, and H0 changes no eligibility or benefit answer**: the records harness compares every outcome of every program and each track's resource figures, on the ledger before H0 (a3ffd86) and after, with 0 differences (section 9).

## 1. Commits

| Commit | Step | What |
|---|---|---|
| 8320ea2 | 1 | `holdings` (CO-5300): 29 kinds, 51 fields, each required, defaulted by its rule (D3) or saying what absence means; `record_noun` (parse and render); excerpts S4500-S4503 (20 CFR 416.1201, 416.1202, 416.1207, 416.1208; D-4400); OQ-1200 (D7), OQ-1201 (D10) |
| 15cee6d | 2 | Three holdings counting tables (CO-5301 to CO-5303, 87 rows), every row today's reading, cited or marked; excerpts S4504-S4507 (D-65, D-80); OQ-1202 to OQ-1204 |
| 3ea1eda | 3 | P58 `largest` in the engine (evaluate, type check, parse, render, plain English), docs/operators.md entry, engine tests (test/engine/holdings.test.ts) |
| c3ab76a | 4 | Translator (scripts/records/translate-holdings.ts), apply script (`npm run records:translate-holdings`), `npm run records:harness -- --list holdings`, the joint-holding check in `npm run check`, generated households and metamorphic relations, the H1 registry entries and allowed files |
| b59f5b0 | 5 | 164 stored households and 189 rule tests restated with holdings by the translator |
| 88f3efd | 6 | docs/operators.md (P58, the record noun, holdings as the third input), conventions.md (Holdings records, P58), plan-colorado.md ("Resource records, H0"), this review |
| 9d6f93f | pins | UI count pins (figures +3, open questions +5), each with its reason |
| 4466fd0 | merge | origin ccr-9d19bf4c-wmnwcl at 704da6b (the receipts harness classification, CO-6250) merged before the gate; the translation still a fixed point (0 households, 0 tests re-translated) |
| cb7eac3 | 7 | volumes/co/changes/2026-11-23-holdings-h0.yaml (no flag raised); the last commit that changes the ledger (HOLDINGS_BASELINE) |
| 819c2c1 | baseline | HOLDINGS_BASELINE set to cb7eac3 |
| (last) | gate | harness results; section 9 |

## 2. The `holdings` list (CO-5300)

A supplied fact of the records type (`list of receipts`, scope person, program All), read by the same operators (P55-P57) and by P58. Its records are named holdings (`record_noun: holding`: "for each holding in", "that holding's value", "that holding is valued in"); the noun is parse and render only, so the trees and every engine adapter are those of receipts. Its worth field is `value` (the schema check requires a list's measure: `amount` for receipts, `value` for holdings).

29 kinds, as design 3.1 lists them: `cash`, `bank_account`, `securities`, `retirement_account`, `education_savings_account`, `able_account`, `business_cash_and_assets`, `home`, `real_property`, `installment_contract`, `vehicle`, `personal_property`, `investment_personal_property`, `life_insurance`, `burial_fund`, `prepaid_burial_contract`, `burial_space`, `trust_interest`, `annuity`, `life_estate`, `loan_receivable`, and the traced money `held_income_tax_refund`, `held_eitc`, `held_retroactive_ssa_benefit`, `held_excluded_payment`, `held_loan_proceeds`, `held_replacement_proceeds`, `held_prorated_income`, `other_resource`.

51 fields (each states exactly one of required, a default, or what absence means):

| Field(s) | Declared | Restates |
|---|---|---|
| kind, value | required | the fact's identity and its equity figure (value with nothing owed: the old facts state equity) |
| month | when_absent: the same value in every month | the person-scope facts' one value for the case |
| date, amount_owed | required where read | |
| share | when_absent: owned alone | the outside owners' shares (CO-4340, CO-4343) as records of share 0 |
| holding_id | required where read | |
| co_owners (spouse, other_in_case, outside_case) | when_absent: no co-owner | CO-4340, CO-4343 (outside_case) |
| accessible | default true (each rule presumes availability: 10 CCR 2506-1 4.409.C, 7 CFR 273.8(d), 20 CFR 416.1201(a)) | liquid_resources_inaccessible_value (CO-4175) |
| source_date, paid_by, received_while_on_snap, replacement_property | required where read | CO-4640, CO-4419, CO-4418; federal and State refunds (CO-4172, CO-4413), the SNAP EITC (CO-4173) |
| used_for_transportation | required where read | transportation_vehicle_equity_value (CO-3395) |
| lives_in, intends_to_return, intent_in_writing, outside_colorado, held_in_trust_or_entity, beneficiary_deed | required where read | CO-3401 and CO-4610 (one field: the same fact stated twice), CO-4435, CO-4612 to CO-4615 |
| listed_for_sale, costs_of_sale, co_owner_lives_in_it, co_owner_would_lose_housing, lot_for_future_home, income_producing, used_in_trade_or_business, net_annual_return, produces_for_household_use, farm_ended_date | required where read | CO-4335, CO-4338, CO-4606, CO-2244, CO-4336, CO-4607 to CO-4609, CO-4423 to CO-4425, CO-4347 |
| taxes_on_withdrawal, self_funded | required where read (Adult Financial's reader applies 20% when not stated, 3.520.73.B.1.b) | CO-4429 |
| face_value, purchase_date, premiums_in_lookback | required where read | CO-3397, CO-3850, CO-3851 |
| irrevocable, accrued_interest, for_immediate_family | required where read | CO-4603, CO-3855, CO-3856, CO-4604, CO-3857 |
| revocable, annuitized, corpus_available_value | required where read | CO-4432 |
| disposed_date, returned_date | when_absent: still held; not returned in whole | resource_transfer_date, resource_transfer_returned_date (CO-3834, CO-4009) |
| compensation_received, transferee | required where read | resource_transfer_uncompensated_value (CO-3835) as value with nothing received |
| Program findings (D9): ma_found_available_value, ma_sale_efforts_unsuccessful, af_found_unsaleable, snap_transfer_to_qualify, af_found_not_twfc, ma_transfer_exempt | required where read | CO-4643, CO-2242, CO-4431, CO-4155, CO-3836, CO-825 |

Two fields of design 3.1 are not in the schema: `designated_for_burial` (no old fact states it; the burial_fund kind is money set aside for burial) and `insured_is_owner` (no old fact states it; a policy on another's life is the H1 tracks' to add as a request). Fields the design names but no old fact states (`transferee`, `revocable`, `annuitized`, `self_funded`) are in the schema, required where read, for the H1 tracks.

## 3. The three holdings counting tables

| Table | Program | Rows | Marked for sign-off | Of them findings |
|---|---|---|---|---|
| CO-5301 snap_holding_treatment_table | SNAP | 29 | 11 | 1 |
| CO-5302 af_holding_treatment_table | Adult Financial | 29 | 9 | 1 |
| CO-5303 ma_ssi_holding_treatment_table | Medicaid, SSI method (MSP, AF burial and the CW death reimbursement by their cited links, D6) | 29 | 10 | 5 |
| **3 tables** | | **87** | **30** | **7** |

Every row is today's reading: what the program's items do now with the scalar fact the kind restates (a part of liquid resources a program does not subtract is counted; a fact a program does not read is not counted), so the table changes no answer when the program's H1 track moves its readers onto it. Options are the program's own words: `counted` and `excluded` with the paragraph; named rules (`counted_less_real_property_exclusions`, `counted_above_funeral_agreement_exclusion`, `excluded_federal_within_twelve_months`, `excluded_while_participating`, `excluded_while_prorated`; `counted_less_taxes`, `counted_less_self_support_and_unsaleable`, `counted_less_highest_transportation_vehicle`, `counted_life_insurance_rules`, `counted_above_burial_exemption`, `counted_beyond_family_needs`, `counted_corpus_available`, `excluded_home_rules`, `excluded_within_twelve_months`, `excluded_within_nine_months`, `excluded_in_month_received`, `excluded_three_or_six_months`; `counted_less_one_transportation_vehicle`, `counted_cash_value_if_face_over_limit`, `counted_value_found_available`, `home_rules`, `burial_exclusion`, `excluded_nine_months`); and the marked rows: `counted_no_rule_excludes`, `not_counted_no_rule_found`, `counted_with_real_property` (SNAP's notes and mortgages), `excluded_household_goods` (household goods and effects excluded by a cited rule; the rest of personal property, which no fact states, for sign-off), and the findings `not_counted_text_counts` and `counted_text_excludes`. Each table's meaning cites each row; its precision names, kind by kind, the fact the row's reading came from. New excerpts, each from a document on file: S4500-S4503 (20 CFR 416.1201(a), (c)(2); 416.1207(a); 416.1208(c)(1); 416.1202(a); D-4400, fetched 2026-11-23), S4504 (10 CCR 2505-10 8.100.5.M.2.c-e, h; D-65), S4505 (M.3.a-d, i, k; D-65), S4506 (8.100.5.F.6.a, f, k, r, u, x; D-65), S4507 (9 CCR 2503-5 3.520.77.B; D-80).

A property of a holding (share, accessible, listed for sale, income producing, used for transportation, a held_ record's dates, disposed_date) is a field the program's items read beside the row; a record with a disposed_date is read by the transfer rules, not counted as held. One field-level reading is for sign-off with the rows: SNAP counts no home-use production property (CO-4425 is read by Adult Financial only; 4.410.E.1 exempts property producing income, and no text on file names property producing goods for the household).

## 4. Rows for the owner's signature (30 of 87)

| Table | Kind | Row | Why it is marked |
|---|---|---|---|
| CO-5301 snap | personal_property | excluded_household_goods | household goods and effects excluded (273.8(e)(2)); other personal property (equipment) no fact states and no text on file places |
| CO-5301 snap | investment_personal_property | not_counted_no_rule_found | no SNAP item reads CO-4642; no text on file names it |
| CO-5301 snap | burial_fund | not_counted_no_rule_found | a revocable burial trust is not a funeral agreement (D.4); an irrevocable one is inaccessible (F.1, F.3) |
| CO-5301 snap | burial_space | not_counted_text_counts | FINDING: spaces beyond one plot per member are counted by the text and read by no SNAP item (OQ-1202) |
| CO-5301 snap | trust_interest | not_counted_no_rule_found | F.3 makes most trusts inaccessible; a revocable trust is not named |
| CO-5301 snap | annuity | not_counted_no_rule_found | not read; no text on file |
| CO-5301 snap | life_estate | not_counted_no_rule_found | not read; no text on file |
| CO-5301 snap | loan_receivable | counted_with_real_property | the notes and mortgages the person holds are inside CO-3393 and pass its tests; no text on file places them |
| CO-5301 snap | held_loan_proceeds | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5301 snap | held_replacement_proceeds | counted_no_rule_excludes | counted because no rule excludes it (4.409, 4.410 name no exclusion) |
| CO-5301 snap | other_resource | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5302 af | education_savings_account | counted_no_rule_excludes | counted under 3.520.72.A; no exclusion found |
| CO-5302 af | personal_property | excluded_household_goods | 3.520.77.B excludes household goods and effects; 72.B.3-4 counts other personal property not exempt, which no fact states |
| CO-5302 af | investment_personal_property | not_counted_text_counts | FINDING: 3.520.77.B counts effects held as an investment; no AF item reads CO-4642 (OQ-1203) |
| CO-5302 af | annuity | not_counted_no_rule_found | not read; no text on file |
| CO-5302 af | life_estate | not_counted_no_rule_found | not read; no text on file |
| CO-5302 af | held_eitc | counted_no_rule_excludes | 77.K names refunds and the PTC rebate, not a credit paid apart |
| CO-5302 af | held_excluded_payment | counted_no_rule_excludes | counted because no rule on file excludes it |
| CO-5302 af | held_prorated_income | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5302 af | other_resource | counted_no_rule_excludes | counted under 3.520.72.A |
| CO-5303 ma_ssi | education_savings_account | counted_no_rule_excludes | counted under 416.1201(a); no exclusion found |
| CO-5303 ma_ssi | business_cash_and_assets | counted_no_rule_excludes | 8.100.5.J.3 may cover business property essential to self-support; owner's |
| CO-5303 ma_ssi | personal_property | excluded_household_goods | M.2.d-e exclude household goods and effects; M.3.i counts a mobile home or trailer, which no fact states |
| CO-5303 ma_ssi | held_income_tax_refund | counted_text_excludes | FINDING: the EITC within a federal refund is exempt as a resource for its month and the next (F.6.u) (OQ-1204) |
| CO-5303 ma_ssi | held_eitc | counted_text_excludes | FINDING: F.6.u, as above (OQ-1204) |
| CO-5303 ma_ssi | held_excluded_payment | counted_text_excludes | FINDING: F.6.f, k, r, x exempt relocation, disaster, Civil Liberties Act and Nazi persecution payments (OQ-1204) |
| CO-5303 ma_ssi | held_loan_proceeds | counted_text_excludes | FINDING: F.6.a exempts "A bona fide loan" (OQ-1204) |
| CO-5303 ma_ssi | held_replacement_proceeds | counted_text_excludes | FINDING, in part: F.6.f exempts relocation payments toward a replacement dwelling for 6 months; insurance proceeds are not named (OQ-1204) |
| CO-5303 ma_ssi | held_prorated_income | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5303 ma_ssi | other_resource | counted_no_rule_excludes | counted under 416.1201(a) |

## 5. P58 `largest`

`["largest", list, condition, value]`: the largest value over the records whose condition holds, 0 when none, unknown under P55's rules (src/engine/evaluate.ts; docs/operators.md "Receipt records", the P58 row and its engine-team note). The rule text that needs it: 20 CFR 416.1218(b)(1) ("One automobile is totally excluded regardless of value if it is used for transportation", S2215) and 9 CCR 2503-5 3.520.77.A ("The vehicle with the highest value is exempt if it is used for the transportation of the client", S2214): the countable vehicles are the vehicles' equity less the largest transportation vehicle's, where today a household states which vehicle is excluded (CO-3395). Engine tests (test/engine/holdings.test.ts): unknown and empty lists, the largest of the records whose condition holds, two vehicles less the larger (design family H7), order invariance, an unknown condition or counted value, a false condition never reading its value, the type check, and the English of both nouns read back. **For the fact-graph reviewer before H0 merges (D5):** whether Direct File's fact graph has a collection maximum beside `CollectionSum`, or the adapter writes the maximum of the filtered values it already loads; the fallback is a stated `excluded_vehicle` field. No rule reads P58 in H0.

## 6. The translator (scripts/records/translate-holdings.ts)

The parts of liquid_resources_value are carved out of it, in a fixed order, each capped at what is left (an overlap the old facts allow is noted, never stated twice): an ABLE account, education savings, business cash, federal and State refunds held (paid_by), a SNAP-participant's EITC, the retroactive SSI or Social Security payment held (CO-4414 for Adult Financial and CO-4639 for the SSI method state the same payment; the larger is it, with CO-4640's date), excluded government payments, replacement proceeds (with their property type and date), prorated income, and the inaccessible part (accessible false). What is left is one bank_account record (the old fact does not tell cash, accounts and securities apart; every table reads the three alike). The parts of real_property_other_than_home_equity are carved the same way (an installment contract, property for sale, a lot for a future home, former farm property with CO-4347's date, property a co-owner lives in, property Adult Financial exempts as unsaleable), with the costs of sale and Medicaid's two findings (CO-2242, CO-2244, at the determination month) on the records they reach; what is left is one real_property record. Beside them: retirement accounts (with the taxes), income-producing property (CO-4607 and CO-4423 stating one non-business property for Medicaid and Adult Financial are one record), home-use production property, investment personal property, vehicles (the transportation vehicle, and the rest as one vehicle not used for transportation, which every rule that excludes one vehicle reads as it read the facts), the home (lives_in from CO-4610, else CO-3401, and the home facts), life insurance (the person's policies as one record: the facts state totals and the newest purchase date), burial funds, contracts and spaces (the accrued interest on the revocable records), trusts, annuities and life estates (CO-4643, the finding, on the trust or annuity, else a life estate), and one record per month's transfer (kind other_resource: the facts do not say what was transferred). Equity figures are stated as value with nothing owed. The joint owners' shares outside the case (CO-4340, CO-4343) are records of share 0, co_owners outside_case: no old fact counts them as the person's own (SNAP adds them as accessible joint holdings, 4.409.C). Liquid resources a person does not state stay unknown (a bank_account record with no value), as the fact was; a person who states any restated resource fact gets a list; one who states none keeps the list unstated.

Not restated, by design (the person facts they are): has_income_trust (CO-823; an income arrangement), the penalty start (CO-886; design 3.4), the couple's resources at the snapshot (CO-888; derived in H1 from dated holdings where stated, D8), the CSRA figures and findings (CO-1948, CO-1950, CO-4636, CO-4637), and Medicaid's look-back total and its exemption (CO-824, CO-825) where no dated transfer of that total is stated: the total has no date, and a holding with no disposed_date is still held. One stored household (CO-06) and nine rule tests (CO-649-T1 to T5, CO-659-T1 to T4) state such a total; 42 rule tests state only facts that are not restated (21 has_income_trust, 9 the look-back total, 4 the penalty start, 6 the CSRA figures and the snapshot, 2 the CSRA findings) and state no holdings. Other notes (each in scripts/records/results/holdings.txt): a refund or credit held with no date of receipt (CO-300, CO-343-T6, CO-4176-T1, CO-4176-T3, CO-1740-T3, CO-4412-T1, CO-4412-T6) and a retroactive payment with none (CO-4412-T2) have no source_date (the facts say only that it came within the window); a vehicle total with no transportation vehicle (CO-074-T1) is one vehicle, used_for_transportation not stated; two parts exceed what is left (CO-4620-T4, CO-4412-T6) and are capped; a value found available with no trust or annuity (CO-4623-T3) is a life estate.

**A couple's home stated on each spouse.** Twelve stored households (CO-01, CO-02, CO-06, CO-112, CO-152 to CO-154, CO-188, CO-213, CO-388, CO-395, CO-481) state the same home equity on both spouses, so each spouse has a home record of that value. The translator keeps the two statements (it cannot tell one joint home from two), and no answer turns on it today: in every one the home is not a countable resource (ma_home_is_countable_resource false for both spouses), so no couple figure counts it twice. The Medicaid track restates each as one joint home (holding_id, co_owners spouse, shares) before a couple figure reads the home from holdings.

`npm run records:translate-holdings` (scripts/records/apply-holdings.ts, the model apply-earnings.ts) writes the translation and checks that every household and test reads back as its fixed point.

## 7. The harness and the joint-holding check

`npm run records:harness -- --list holdings` (scripts/records/harness.ts):

1. **Translation**: every stored household's and rule test's holdings are the translation of its resource facts. Result: 164 of 329 stored households (336 persons) and 189 rule tests state holdings; 0 are not the translation.
2. **Joint-holding consistency**: across the persons of a household or test, the records of one holding_id agree on kind and value and their shares add to at most 1. The same check is in `npm run check` (src/engine/records.ts `jointRecordErrors`, called from src/tools/check.ts `recordInputErrors`), so a case that breaks it blocks. Result: 0 findings (no stored household states a joint holding of two persons of the case yet). Every metamorphic relation, applied to every stored household, gives a statement the schema and the check accept (a relation that produced an invalid household would test nothing).
3. **Old against new**: every program's outcomes and each track's resource figures, on the ledger before H0 and after, for the stored households and the generated households (scripts/records/generate-holdings.ts: each track's bases varied one resource fact at a time, the design 4.4 families H1-H7 among them). Results in section 9.
4. **Metamorphic relations** MH-1 split, MH-2 order, MH-3 joint (couple and household figures only, `coupleFigures`), MH-4 encumbrance, MH-5 trace expiry (scripts/records/metamorphic-holdings.ts): run on the figures each track registers as reading the records, none yet.

The registry is split per design 4.3, rule 3: each H1 track's `holdings` entry is in its own file, scripts/records/programs/snap.ts, af.ts and medicaid.ts (its table, its figures set in H0 to today's resource figures, `metamorphic` and `coupleFigures` empty, its bases), and its allowed differences in scripts/records/allowed/h1-<track>.yaml (empty), beside h0.yaml (empty: H0 changes no answer) and joint.yaml (known joint findings, none). The harness loads the e* files for earnings and the h* files for holdings. The baseline each H1 track measures itself against is HOLDINGS_BASELINE in scripts/records/harness.ts, the end of H0 (re-pointed at each merge wave, rule 5); `--base a3ffd86` measures H0 itself.

## 8. Findings (today's answers the text on file does not support)

H0 changes no answer, so each is kept as today's reading and named here, for the H1 track to fix as a cited difference. None changes an answer for a stored household today: no stored household states the holding in a program that reads it wrongly.

- **H0-F1 (Medicaid SSI method; OQ-1204).** 10 CCR 2505-10 8.100.5.F.6 (S4506) exempts as income or resources a bona fide loan (a), relocation payments (f, toward a replacement dwelling for up to 6 months), disaster assistance (k), Civil Liberties Act payments (r), the EITC for its month and the next (u) and Nazi persecution payments (x). No SSI-method item subtracts such money still held inside liquid_resources_value, so an aged, blind or disabled applicant, or a long-term care applicant, holding it has it counted against the $2,000 or $3,000 limit: a P1 candidate.
- **H0-F2 (Adult Financial; OQ-1203).** 9 CCR 2503-5 3.520.77.B (S4507) counts personal effects held "because of the value or as an investment"; no Adult Financial item reads investment_personal_property_value (CO-4642), so an OAP or AND client's collectibles are not counted.
- **H0-F3 (SNAP; OQ-1202).** 7 CFR 273.8(e)(2) and 10 CCR 2506-1 4.410.D.4 exclude one burial plot per member; burial spaces beyond the family's needs (CO-3857, read by Adult Financial only) are not counted by SNAP. Smaller: SNAP counts no home-use production property and no revocable burial trust, and leaves out trusts, annuities and life estates, with no text on file either way (the rows marked not_counted_no_rule_found).
- **Not a finding, a risk the H1 Medicaid track removes:** the twelve couples' homes stated on each spouse (section 6).

## 9. Gates

On 819c2c1 (origin ccr-9d19bf4c-wmnwcl at 704da6b merged):

| Gate | Result |
|---|---|
| `node scripts/sync-manifest.mjs co` | written; 4 items added by H0 (CO-5300 to CO-5303) |
| `npm run typecheck` | passes |
| `npx vitest run` | 1,144 tests pass (102 files), after the UI pins moved by the three tables and five questions were re-pinned with their reasons |
| `npm run receipts:harness -- --all-programs` | OK: 0 unexplained (319 stored households, 975 allowed differences; 1,626 generated households, 5,619 allowed; the classes of the receipts phases and of the merged classification only, none from H0) |
| `npm run records:harness -- --list earnings --all-programs` | OK: translation 0 stale (319 households, 746 rule tests), boundary 0 findings, 0 unexplained (1,204 and 2,623 allowed differences, all the E1 wave's classes) |
| `npm run records:harness -- --list holdings` | OK: translation 0 stale (164 households, 336 persons; 189 rule tests), 0 joint-holding findings, every relation's output accepted; against HOLDINGS_BASELINE (cb7eac3): 329 stored households, 111,450 values, 0 differences; 360 generated households, 97,200 values, 0 differences |
| `npm run records:harness -- --list holdings --all-programs --base 704da6b` (H0 itself: the ledger just before H0, with the merged classification) | OK: 329 stored households, 160,236 values, **0 differences**; 360 generated households (each track's bases varied one resource fact at a time), 141,120 values, **0 differences**; metamorphic relations run on no figure (none reads the records yet) |
| `CHECK_BASE=origin/main npm run check` | OK, conformance self-check OK (5,270 cases, 8,806 checked); rule tests 4,781 of 4,781; households 3,864 of 3,865 (CO-387's CHP+ copayment band, a known failure in conformance/known-failures.json before H0); 0 change-impact flags open, none raised by H0 (volumes/co/changes/2026-11-23-holdings-h0.yaml, `impact: []`) |

## 10. What each H1 track starts from

Every track has: its holdings table with every row today's reading (it changes only its own table's cells, design 4.3 rule 2; a new kind or field is a request to the integration owner in the track's review doc); every stored household and rule test already stating holdings beside the scalar facts; its `holdings` entry in scripts/records/programs/<track>.ts with today's resource figures and its bases, to which it adds the figures that read the records (`metamorphic`, and `coupleFigures` for MH-3); scripts/records/allowed/h1-<track>.yaml for its cited differences; its pre-allocated items (design 4.3 rule 4: CO-5310 SNAP, CO-5320 Medicaid, CO-5340 Adult Financial); its own review doc docs/reviews/records-holdings-<track>.md and change record volumes/co/changes/<date>-records-holdings-<track>.yaml. H0 used no household number of its block (CO-700 to CO-709) and OQ-1200 to OQ-1204 of its block (OQ-1200 to OQ-1219); the integration owner allots the rest to the tracks (households: design 4.3's 15 per track need numbers beyond CO-709). Its gate: `npm run records:harness -- --list holdings --track <track>` against HOLDINGS_BASELINE, with each difference allowed by a cited class.

- **Medicaid** (CO-5303; one track, sequential sub-commits: SSI method, MSP, LTC and CSRA, transfers, trusts): ma_ssi_countable_resources_individual (CO-4623) and the shared ssi_countable_resources_individual (CO-800, which Adult Financial burial and the CW death reimbursement read by link; H2 retires CO-800, CO-801, CO-2861), ma_excluded_real_property_value (CO-4620), CO-4621, CO-4622, CO-5204, CO-5205, ma_ssi_countable_resources (CO-608; the spouse's self-funded retirement account by `self_funded`), the parental deeming (CO-4627), MSP (CO-5206; OQ-1200), the CSRA and the institutionalized spouse's resources (CO-646, CO-647, CO-648; CO-888 derived from dated holdings where stated, else cannot determine, D8), the transfer penalty (CO-649, CO-659, CO-660; restate CO-06 and CO-649-T1 to T5, CO-659-T1 to T4 with dated transfers and ma_transfer_exempt), the home equity limit (CO-650), resource verification (CO-1405, CO-1634, CO-1635); the twelve couples' homes as joint holdings; H0-F1 (OQ-1204).
- **Adult Financial** (CO-5302): af_person_countable_resources_other_than_life_insurance (CO-4000), af_exempt_liquid_resources (CO-4412; date the held refunds and the retroactive payment of CO-300, CO-4412-T1, T2, T6), af_self_support_property_countable_value (CO-4422), the client and spouse and the sponsor (CO-2389, CO-2390), life insurance (CO-4722, CO-3854, CO-4001, CO-4002), the TWFC transfer rules (CO-3840, CO-4008; af_found_not_twfc), the vehicle by P58, CO-1512 (owns_and_lives_in_home, the home's lives_in); H0-F2 (OQ-1203).
- **SNAP** (CO-5301): snap_countable_liquid_resources (CO-4176; date the held refunds and credits of CO-343-T6, CO-4176-T1, T3, CO-1740-T3), snap_countable_nonliquid_resources (CO-074; the vehicle total of CO-074-T1), the household's resources (CO-343), the sponsor's (CO-3702), the transfer rules (CO-4158, CO-4159, CO-4160; snap_transfer_to_qualify); H0-F3 (OQ-1202).

## 11. Change impact

Adding CO-5300 to CO-5303 flags nothing (no rule reads them). Rule tests whose `given` gained `holdings` change the fingerprints of no decision. The engine change (P58, the record noun) changes no item's derivation. Each flag the check raised against origin/main is dispositioned in volumes/co/changes/2026-11-23-holdings-h0.yaml.
