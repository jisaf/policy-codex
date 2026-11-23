# Resource records, step H1: Health First Colorado (Medicaid), the SSI method

Track H1 Medicaid of docs/design-earned-and-resource-records.md (4.2, 4.3), started from the end of step H0 (docs/reviews/holdings-h0.md, section 10) on ccr-9d19bf4c-wmnwcl at 0224913. The SSI method's resources (the aged, blind and disabled groups, long-term care and the CSRA, the transfer penalty, parental deeming, the Medicare Savings Program and the buy-ins' screens, and Adult Financial burial and the Colorado Works death reimbursement by their cited links, decision D6) are read from the `holdings` list (CO-5300) through the SSI method's holdings counting table (ma_ssi_holding_treatment_table, CO-5303). The same round fixes the finding H0-F1 (a P1 candidate, OQ-1204 part 1), the couples' homes stated on each spouse, and the resource wrong answers the records made visible.

## 1. Commits

| Commit | Step | What |
|---|---|---|
| f7d9738 | 1 | The readers move to the holdings records: CO-800, CO-801, CO-4620 to CO-4623, CO-5204, CO-5205, CO-608, CO-4627, CO-647, CO-649, CO-659, CO-650, CO-1405, CO-1634, CO-1635 rewritten; new figures CO-5320 to CO-5323, CO-5325 to CO-5330; CO-888 derived (D8); P58 for the automobile, one per couple; dated transfers (D9) with a return in whole ending the penalty; CO-06 and CO-649-T1..T5, CO-659-T1..T4 restated with dated transfers; the twelve couples' homes as joint holdings; excerpts S4660 to S4672 (D-4440, D-4441, D-65); OQ-1241, OQ-1243, OQ-1244; harness classes H1-M1 to H1-M6 |
| 303c980 | 2 | H0-F1 fixed, OQ-1204 part (1) settled by the text: the five rows marked counted_text_excludes; CO-6500, CO-6501; tests CO-5320-T12..T19; OQ-1240, OQ-1242; classes H1-M7, H1-M8 |
| c3cdccd | (2b) | A retirement account counts net of the taxes due, or less 20% (8.100.5.N.5); CO-6502; class H1-M9 |
| 333446c | 3 | The counted_no_rule_excludes rows the text settles (education savings, other property: counted); the rest recorded for the owner (OQ-1204 part 2); excerpts S4673, S4674 |
| (last) | 4 | This review, docs/plan-colorado.md "H1 Medicaid", the change record volumes/co/changes/2026-11-23-holdings-medicaid.yaml, gate |

## 2. What reads the records

| Area | New | Rewritten |
|---|---|---|
| The SSI method's figure | CO-5320 ma_ssi_holdings_countable_in_month (person-month: every row of CO-5303 but Medicaid's findings and the home), CO-5321 ma_ssi_excluded_automobile_equity_in_month (P58), CO-5326 ma_ssi_retirement_accounts_counted_in_month (N.2, N.5) | CO-800 ssi_countable_resources_individual (shared; the CO-5320 figure at the determination month, by its adopted_method link, accepts_from S301), CO-801 (the couple's one automobile) |
| Medicaid's per-person figure | CO-5322 ma_ssi_countable_resources_in_month (person-month), CO-5323 ma_real_property_for_sale_excluded_in_month (M.2.b.vi), CO-5327 ma_home_equity_interest_in_month | CO-4623 (CO-5322 at the determination month), CO-4620 and CO-4621 (person-month now, from the records' fields and findings), CO-4622, CO-5204, CO-5205 (the home record) |
| Couple, LTC, deeming, MSP | | CO-608, CO-647 (the couple's one automobile; the spouse's retirement exemption is what the spouse's figure counted), CO-4627 (the parent's pension funds likewise), CO-5206 (unchanged; reads CO-608) |
| CSRA | | CO-888 ma_spousal_resources_at_snapshot: derived (was supplied), the couple's countable resources in the month of the application, for-sale property kept in (M.2.b.vi), one automobile |
| Home equity limit | | CO-650: the person's equity interest (share of the home record's equity) |
| Transfers | CO-5325 ma_uncompensated_transfers_in_lookback | CO-649, CO-659 (from CO-5325 for the person and the spouse) |
| Verification | CO-5328 ma_liquid_holdings_value_in_month, CO-5329 ma_holds_trust_interest_in_month, CO-5330 ma_holds_annuity_in_month | CO-1405, CO-1634, CO-1635 |

No Medicaid item reads a scalar resource fact any more. Still stated, read by no Medicaid item, for H2: liquid_resources_value and its parts, the real property, vehicle, home, life insurance and burial facts, has_trust_interest, owns_annuity, uncompensated_transfer_value_in_lookback, transfer_was_exempt (CO-06 still states them, so the translator restates the transfer with its exemption). has_income_trust (CO-823), transfer_penalty_period_start_date (CO-886) and the CSRA findings (CO-1948, CO-1950, CO-4636, CO-4637) stay person facts. ma_excess_real_property_is_for_sale (CO-2242) and ma_claims_co_owner_hardship_for_real_property (CO-2244) are still read by the verification items CO-2246 and CO-2248 (the documents a claimed exclusion needs); the resource figures read the records' findings.

Every reader of a held holding reads it in the month it is valued in (P57) and leaves out a record with a disposed_date (a transfer, read only by CO-5325). A person-scope reader reads the determination month; the person-month figures read any month, which the spousal assessment needs (`at` the application month).

## 3. The table after H1 (CO-5303)

| Row | Kinds | Text |
|---|---|---|
| counted | cash, bank_account, securities, installment_contract, loan_receivable (at equity), investment_personal_property; education_savings_account and other_resource (step 3) | M.3.a-d, j; 416.1201(a)-(c); M.1 and E.3 settle education savings and other property |
| counted_less_taxes (new) | retirement_account | N.2, N.5.a-b: gross value less the taxes due, or less 20% (CO-6502) |
| excluded | able_account, burial_space; held_excluded_payment, held_loan_proceeds (step 2) | M.2.k, M.2.h; F.6.a, f, k, r, s, v, x |
| excluded_federal_within_twelve_months (new) | held_income_tax_refund | 26 U.S.C. 6409 for a federal refund (CO-6500); a State or local refund counted |
| excluded_in_month_received_and_next (new) | held_eitc | F.6.u (a State or local credit: OQ-1242) |
| excluded_three_months_toward_real_property (new) | held_replacement_proceeds | P.4 (CO-6501); F.6.f's six months and insurance need the source (OQ-1240) |
| excluded_nine_months | held_retroactive_ssa_benefit | F.6.c |
| counted_no_rule_excludes (owner signs, OQ-1204 part 2) | business_cash_and_assets, held_prorated_income | J.3 names "Property used in a trade or business", M.1 names cash apart; E.1 prorates income, no text on the held part |
| unchanged | home (home_rules), real_property, vehicle, personal_property (excluded_household_goods, owner signs), life_insurance, burial_fund, prepaid_burial_contract, trust_interest, annuity, life_estate | as H0 |

The option counted_text_excludes is gone (no row reads it).

## 4. Answers that change, and why

| Class | Rule text | Old | New |
|---|---|---|---|
| H1-M1 (decision 4) | missing information is "cannot determine" | the home of a person with no holdings stated read as no home (home_equity otherwise 0) | the home's countability cannot be determined; figures only (that person's resources were and are unknown) |
| H1-M2 (design 2.2, 3.1) | a stated list is the whole statement | no annuity, trust, home or transfer fact stated: unknown | a stated holdings list with no such record: none (no documents owed, no equity over the limit, no penalty) |
| H1-M3 (D8; 8.100.7.L, M.1; M.2.b.vi) | the couple's resources "as of the time of Medical Assistance application" | the snapshot supplied (24 statements in 12 households) | derived from the couple's holdings at the application month; every stored expectation passes. Two statements did not match the couple's holdings: the community spouse of CO-112, CO-188, CO-213, CO-388 stated 180,000 against a couple total of 60,000 (only the institutionalized spouse's CSRA is read), and CO-395 stated 0 against 1,000 (the attributed resources are 0 either way) |
| H1-M4 (D6; M.2.k, M.3.j) | the table's rows | CO-800 counted an ABLE account and left investment property out (CO-4623 corrected both) | CO-800 by the table: Adult Financial burial's SSI figure moves (CO-422: 6,000 to 4,000); Medicaid's figures do not |
| H1-M5 (J.2; one statement) | "Non-business property that is necessary to produce goods or services essential to self-support is excluded up to $6,000" | property producing goods for the household's use and non-business income property stated for Adult Financial (CO-4425, CO-4423) were not read by Medicaid | J.2 property: counted above 6,000 (7,000 - 6,000 = 1,000) |
| H1-M6 (decision 4; F.6.c) | the nine months following receipt | a retroactive payment held stated without a date (CO-4414) was counted inside liquid resources | cannot be placed in the nine months: cannot determine |
| H1-M7 (H0-F1; F.6, P.4) | exempt "as either income or resources" | the F.6 payments and replacement proceeds counted | left out while held (CO-223's 2,000 of excluded payments; the generated aged base with 800 of 2,500: 1,700 is within 2,000, so aged-eligible where it was refused) |
| H1-M8 (decision 4; 6409, F.6.u) | twelve months from receipt; the month of receipt and the next | a refund or credit held, never read by the SSI method, counted | with no date of receipt, cannot be placed: cannot determine (CO-300 is Adult Financial's to date, holdings-h0.md 10) |
| H1-M9 (N.5) | "The gross value of the account, less any taxes due"; 20% when not provided | the account counted in full | net of the taxes (CO-130 p2: 1,500 to 1,200; CO-189 p2: 40,000 to 32,000); figures only |
| (rule tests) the couple's one automobile | 416.1218(b): "In determining the resources of an individual (and spouse, if any)... One automobile" | each spouse excluded a car (CO-608-T5: 1,200) | the couple excludes the larger only (5,200); no stored couple states two cars |
| (rule tests) a joint home | M.2.a.ii: "The individual's ownership interest in the home"; 1396p(f) "equity interest" | the home's whole equity on each spouse | each spouse's share (CO-650-T5: a 900,000 home half each, 450,000 < 752,000: not disqualified) |
| (rule tests) D9 | an exemption is about one transfer | one finding for all of a person's transfers | per record (CO-649-T6: an exempt 45,000 and a 54,000 transfer: 6 months) |
| (rule tests) G.12.c | "All of the resources transferred ... have been returned" | not read | a transfer returned in whole adds nothing (CO-5325-T8) |

The twelve couples' homes are one joint holding on each spouse's list (holding_id `<case>-home`, co_owners spouse, share 0.5): in none is the home countable, so no answer moves; a couple's home can no longer be counted twice. CO-06's transfer is dated (June 2025, the day illustrative): its penalty (6 months) does not move, and SNAP's and Adult Financial's look-backs, which read the same record, do not reach it (0 differences in every program, `--all-programs`).

## 5. OQ-1204 and the other questions

- **OQ-1204 part (1), settled by the text** (finding H0-F1; P1 candidate fixed): F.6.a (a bona fide loan), F.6.f, k, r, s, v, x (relocation, disaster and emergency assistance, Civil Liberties Act, Agent Orange, Radiation Exposure, Nazi persecution payments): excluded while held, with no time limit; a federal refund, the EITC paid with it included: not a resource for 12 months from receipt (26 U.S.C. 6409, "Notwithstanding any other provision of law", D-4441; longer than F.6.u's two months and 20 CFR 416.1235's nine); a State or local credit: its month and the next (F.6.u); proceeds toward replacing a home: three months (P.4).
- **OQ-1204 part (2)**, partly settled (step 3): an education savings account and other property are counted (M.1: "Resources are defined as cash or other assets or any real or personal property that an individual or spouse owns"; E.3; no exemption of M.2 or F.6 names them). Open for the owner: business cash (J.3, M.1), prorated income held (E.1), personal property other than household goods (M.3.i).
- New: OQ-1240 (replacement proceeds by source: relocation six months, insurance under 416.1232 nine months; a source field), OQ-1241 (two deeming parents: one automobile between them?), OQ-1242 (F.6.u and a State or local credit), OQ-1243 (the record fields read as "not so" when unstated: defaults to declare or a decision-4 round), OQ-1244 (the look-back by month, F.1.d, or by day, F.2.a).

## 6. Requests to the integration owner (design 4.3, rule 1)

- **R-1, done by the track and to be reviewed.** scripts/records/translate-holdings.ts: `keepJointHome` keeps the holding_id, co_owners and share a case states on a home record of the same equity (no scalar fact states joint ownership), and the twelve-couples note skips a home stated as joint. Without it the restatement H0 assigned to this track (holdings-h0.md 6) fails the translation check; the change touches no other record and no other household (0 re-translated). The integration owner may prefer a case-level statement.
- **R-2** src/engine/evaluate.ts `receiptField` reports a `when_absent` field (share, co_owners, disposed_date, returned_date) as a missing supplied fact when a record leaves it out, though leaving it out is a statement (the declared absence meaning); `month` is special-cased. Every holdings reader reads share and disposed_date, so a trace lists them as missing ("holdings[0 bank_account].share"). Report a when_absent field only when the reader has no absence meaning for it.
- **R-3** Declare on CO-5300 the default the rule gives each exclusion field this track reads as "not so" (OQ-1243), or decide the decision-4 round for them.
- **R-4** A field for the source of held_replacement_proceeds (insurance, relocation, home sale, condemnation; OQ-1240).
- **R-5** The translator states amount_owed 0 for the equity facts it restates as real property, vehicles and the home, but not for investment_personal_property_value (CO-4642), whose record this track reads at its value for that reason.
- **R-7** scripts/receipts/harness.ts translates its generated households' receipts and earnings on the new side (product owner, 2026-11-23) but not their resource facts, so they state no holdings and every SSI-method outcome there is "cannot determine" (HM-R1 in scripts/receipts/allowed-differences.yaml). Translate them with translate-holdings.ts as the earned facts are; then remove HM-R1.
- **R-8** The earnings harness reads every allowed file but h1-*.yaml, so the H1 differences it sees against EARNINGS_BASELINE are repeated in scripts/records/allowed/eh1-medicaid.yaml; re-pointing EARNINGS_BASELINE past H1 (or loading h1-*.yaml for both lists) removes it.
- **R-6** MH-3 compares a figure for every person of a pair; ma_institutionalized_spouse_countable_resources (CO-647) is the couple's figure only for an LTC couple, the person's own otherwise, so it is not registered as a couple figure. A per-figure person filter would let MH-3 run on it.

## 7. Seen elsewhere (not this track's to change)

- The SSI method counts liquid resources a person cannot get at (the record's accessible false, from liquid_resources_inaccessible_value, CO-4175, SNAP's fact) as before: 8.100.5.E.3-4 (S4670) presume availability and "Resources and income shall not be considered unavailable merely because the individual ... may need to initiate legal proceedings"; whether CO-4175's cases (a joint owner refuses, probate, a lien or court order) are unavailable for Medicaid is the owner's.
- M.3.d presumes all the funds of a joint account the applicant's; the outside owners' share of a joint account stated for SNAP (CO-4340, restated as a share-0 record) is not counted by the SSI method, as before and as NM-27 accepted (the share is a finding stated).
- ssi_countable_resources_couple (CO-801) and ssi_countable_resources_of_couple (CO-2861) have no reader; H2 retires them.
- Adult Financial burial (CO-1225) reads CO-800 by its link and now gets the table's rows (H1-M4, H1-M7 to H1-M9): af_burial_responsible_person_resources moves in the generated households of the Adult Financial bases; no Adult Financial outcome moves.

## 8. Harness results

`npm run records:harness -- --list holdings --track medicaid` against HOLDINGS_BASELINE (cb7eac3): translation 0 stale (164 households, 336 persons; 269 rule tests), 0 joint-holding findings (the twelve couples' joint homes accepted), every relation's output accepted; stored households 329 (49,540 values, 1,244 differ, all allowed), generated 180 (17,640 values, 1,318 differ, all allowed), 0 unexplained. By class: H1-M1 702, H1-M2 751, H1-M3 828, H1-M4 22, H1-M5 28, H1-M6 33, H1-M7 69, H1-M8 73, H1-M9 56 (scripts/records/allowed/h1-medicaid.yaml). With `--all-programs`: no SNAP, Adult Financial, Colorado Works, CCCAP, LEAP or SUN Bucks outcome moves (Adult Financial burial's SSI figure, af_burial_responsible_person_resources, moves by H1-M4, H1-M6 to H1-M9 in the Adult Financial bases).

Metamorphic relations on the track's figures (scripts/records/programs/medicaid.ts): MH-1 split, MH-2 order and MH-4 encumbrance 0 violations (334 households, 6,400 values each); MH-3 joint 0 violations (64 households, 336 values) on the couple's figures (ssi_countable_resources_couple, ma_spousal_resources_at_snapshot); MH-5 expiry not run: F.6 exempts loans and the payments it names with no time limit, so merging them into an account after two years changes the figure (`notInvariant`).

`npm run records:harness -- --list earnings --all-programs` against EARNINGS_BASELINE (9650b0c): the same classes on the earned-income harness's households, explained by scripts/records/allowed/eh1-medicaid.yaml (that harness loads every allowed file but h1-*.yaml; each entry names its H1 class); stored 327 (176,260 values, 1,435 differ, all allowed), generated 476 (201,824 values, 3,140 differ, all allowed), 0 unexplained; translation 0 stale, boundary 0 findings.

`npm run receipts:harness -- --all-programs` against c29d326: the stored households' differences are the H1 classes (appended to scripts/receipts/allowed-differences.yaml); the generated households (G-) of that harness state no holdings list (it translates their receipts and earnings, not their resource facts), so Medicaid's SSI-method outcomes there cannot be determined: class HM-R1, a transition entry per base, person, outcome and month, removed once that harness translates the generated households' resource facts (request R-7).

## 9. Gate

origin ccr-9d19bf4c-wmnwcl fetched before the gate: still at 0224913 (nothing to merge).

| Gate | Result |
|---|---|
| `node scripts/sync-manifest.mjs co` | written (CO-888 moved to medicaid/; CO-5320 to CO-5323, CO-5325 to CO-5330, CO-6500 to CO-6502 added) |
| `npm run typecheck` | passes |
| `npx vitest run` | 1,145 tests pass (102 files), after the UI pins moved by the track were re-pinned with their reasons (figures 471; the question queue 182, 21 partly settled; the Medicaid policy owner 63 and 5; the HCPF persona 71 and 7, 78; rule lines over the limit 52) |
| `npm run records:harness -- --list holdings --track medicaid` | OK: 0 unexplained (section 8) |
| `npm run records:harness -- --list earnings --all-programs` | OK: 0 unexplained |
| `npm run receipts:harness -- --all-programs` | RECEIPTS-RESULT |
| `CHECK_BASE=origin/main npm run check` | CHECK-RESULT |
