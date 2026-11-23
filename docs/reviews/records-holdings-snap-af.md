# Resource records, step H1: SNAP and Adult Financial

Tracks H1 SNAP and H1 Adult Financial of docs/design-earned-and-resource-records.md (4.2, 4.3), from the end of step H0 (docs/reviews/holdings-h0.md, section 10), on branch ccr-9d19bf4c-wmnwcl at 0224913. SNAP's and Adult Financial's resource readers move from the scalar resource facts to the holdings records (CO-5300) through each program's own counting table (snap_holding_treatment_table CO-5301, af_holding_treatment_table CO-5302); the tracks fix the findings handed to them (H0-F3 for SNAP, H0-F2 for Adult Financial), write the Adult Financial vehicle exclusion with P58 over equity floored at 0 (OQ-1205, assumption A), date the held refunds and retroactive payments the translator could not date, and set the table rows the cited paragraphs settle. Every changed rule has rule tests computed by hand from the rule text on file (the arithmetic in each test's title); no text or figure was written from memory: every excerpt added (S4690 to S4693) quotes the documents on file (D-82, 10 CCR 2506-1 rule version 12718; D-80, 9 CCR 2503-5 rule version 12428), as fetched from the Secretary of State.

## 1. Commits

| Commit | What |
|---|---|
| ed46546 | H1 SNAP: SNAP reads resources from the holdings records (section 2); CO-5310 to CO-5315; H0-F3; held refunds dated in CO-343-T6, CO-4176-T1, T3, CO-1740-T3; row held_loan_proceeds counted; S4690, S4691; OQ-1250 to OQ-1252; classes H1S-D4-1 to H1S-D4-3 |
| e7f5dd1 | H1 Adult Financial: Adult Financial reads resources from the holdings records (section 3); CO-5340 to CO-5350; H0-F2; the vehicle by P58; CO-300 restated in holdings alone with its refund dated; the CO-4412 tests dated; row education_savings_account counted; S4692, S4693; OQ-1203 resolved in part, OQ-1253, OQ-1254; the receipts harness states its generated households' holdings; classes H1A-D4-1 to H1A-3, H1A-R, H1S-R |
| 56b0cd0 | Change record volumes/co/changes/2026-11-23-holdings-snap-af.yaml; UI count pins; OQ-1254's owner |
| 3be854b | Merge origin ccr-9d19bf4c-wmnwcl (coverage pass 4, care and energy) before the gate |
| (last) | This review; docs/plan-colorado.md "H1 SNAP and Adult Financial"; households CO-740 to CO-743 (and the UI reach pin they move); Adult Financial's burial spaces at equity (MH-4); the not-this-track entry for CO-345 |

## 2. What SNAP reads now

| Item | Reads | Before |
|---|---|---|
| snap_countable_liquid_resources (CO-4176) | each holding valued in the determination month and still held whose row is counted or counted_no_rule_excludes; a held federal refund only from twelve months after its date of receipt (4.410.J.17), a state or local one always; a held EITC only when neither J.12 exclusion applies (twelve months from receipt while participating; a federal credit in the month of receipt and the next); each at its value times the person's share, or all of it when held with someone outside the case (4.409.C); never a holding the person cannot reach | liquid_resources_value less seven parts, each `otherwise 0`, plus joint_liquid_resources_other_owners_share_value |
| snap_real_property_not_exempt (CO-5310, new) | real property and the notes and mortgages the person holds, at equity times share (or all of it, 4.409.C), less property for sale (F.1), a lot for a future home (B), income-producing property (E.1), farm property within a year (E.4) | parts of real_property_other_than_home_equity, each `otherwise 0` |
| snap_countable_real_property (CO-5311, new) | CO-5310, or 0 when it would return $1,500 or less, before or after the costs of sale (F.2, G); nothing else read when all the person's real property is $1,500 or less | the same test, costs `otherwise 0` |
| snap_countable_funeral_agreements (CO-5312, new) | revocable prepaid burial contracts less the lesser of $1,500 and the largest of them (4.410.D.4; P58) | one total less one $1,500 (CO-074's assumption, retired) |
| snap_countable_burial_spaces (CO-5313, new) | burial spaces not for the immediate family, at equity, when over $1,500 (273.8(e)(2), 4.410.D.1, F.2) | nothing (H0-F3) |
| snap_countable_nonliquid_resources (CO-074) | CO-5311 + CO-5312 + CO-5313 | one derivation over the parts |
| snap_disqualifying_transfer_value (CO-5314, new), snap_disqualifying_transfer_value_before_application (CO-5315, new) | holdings records disposed of on or after the same day three months before the date of application, through the determination month, with the county's finding, not returned, not of a kind SNAP excludes (4.408.2.A.1), at the uncompensated value | the month-scoped transfer facts and the person's one finding |
| snap_resource_transfer_is_disqualifying (CO-4159), snap_resource_transfer_disqualification_months (CO-4158), snap_is_disqualified_for_resource_transfer (CO-4160) | CO-5314, CO-5315 | sum_months over the transfer facts |
| snap_household_countable_resources (CO-343), snap_sponsor_deemed_resources (CO-3702), snap_household_liquid_resources (CO-1740) | unchanged derivations over CO-4176 and CO-074; tests restated in holdings alone | |

## 3. What Adult Financial reads now

| Item | Reads | Before |
|---|---|---|
| af_cash_and_convertible_holdings (CO-5340, new) | every cash row (counted, counted_no_rule_excludes, excluded, the four excluded-for-a-time rows), value times share (3.520.73.A.2); notes and installment contracts at equity | liquid_resources_value |
| af_exempt_liquid_resources (CO-4412) | ABLE and business cash (row excluded), a refund until twelve months after its date of receipt (K), a retroactive benefit through the ninth month after the month received (J), a loan still held in the month received (L), replacement proceeds within three or six months or extended (E, F) | parts of liquid_resources_value `otherwise 0`; the loan receipt of the month |
| af_countable_retirement_accounts (CO-5341, new) | each account less its taxes, or 20% when not given (73.B.1) | the person's total |
| af_countable_real_property (CO-5342, new) | real property not found unsaleable and not self-support property, at equity floored at 0 times share | real_property_other_than_home_equity less the unsaleable part |
| af_self_support_property_countable_value (CO-4422) | non-business income-producing property: D.4.a's 6% test per property, a combined $6,000 exemption; home-use production property over $6,000 | one figure each |
| af_countable_vehicles (CO-5343, new) | the vehicles' equities floored at 0, less the largest equity of one used for transportation (P58; 3.520.77.A; OQ-1205 A) | vehicles_equity_value less the household's transportation_vehicle_equity_value |
| af_countable_burial_holdings (CO-5344, new) | each revocable trust and contract over $1,500, each on its own (G.3, H.2); spaces beyond the family's needs (I) at their value less what is owed (742.A.3) | trust total and contract total, one exemption each; spaces at their value |
| af_countable_personal_property (CO-5345, new) | personal property held as an investment at appraised value less liabilities (77.B, 742.B) | nothing (H0-F2) |
| af_countable_home_equity (CO-5346, new) | a home the client does not live in and does not intend to return to (C, C.5), unless OAP-C (C.4) | home_equity when in a facility, intent `otherwise true` |
| af_person_countable_resources_other_than_life_insurance (CO-4000) | CO-5340 less CO-4412, plus CO-5341 to CO-5346, CO-4422, the trust corpus, potential resources refused | one derivation over the scalar facts |
| af_life_insurance_cash_value (CO-4722), af_life_insurance_face_value (CO-5347, new), af_life_insurance_bought_within_lookback (CO-5348, new), af_life_insurance_premiums_in_lookback (CO-5349, new), CO-3854, CO-4001, CO-4002 | each policy's cash value, or its face value times the 75.H chart by its own purchase date; the face values, purchase dates and premiums of the person's and spouse's policies | the person's totals and newest purchase date |
| af_twfc_transfer_is_counted (CO-4008), af_twfc_penalty_months (CO-3840) | the holdings records disposed of in the month, at the uncompensated value (D.1), the county's finding read as no when not stated (A.4.a's presumption); the first month of the thirty-six by the latest day of the month's transfers (P58) | the month-scoped transfer facts |
| af_in_kind_support_and_maintenance (CO-1512) | B.1 from a home record the client lives in | owns_and_lives_in_home `otherwise false` |
| af_resources_known_lower_bound (CO-5350, new), af_meets_resource_limit (CO-948) | the limit is not met when the parts known already exceed it | |
| af_client_and_spouse_countable_resources (CO-2389), af_sponsor_countable_resources (CO-2390), af_person_countable_resources (CO-3400) | unchanged derivations; tests restated in holdings alone | |

## 4. The counting tables, row by row

| Table | Kind | H0 row | H1 row | Why |
|---|---|---|---|---|
| CO-5301 | burial_space | not_counted_text_counts | counted_beyond_one_plot_per_member | H0-F3: 273.8(e)(2), 4.410.D.1 (S2216, S4690); a family space is read as a member's plot (OQ-1250) |
| CO-5301 | held_loan_proceeds | counted_no_rule_excludes | counted | 4.409.A counts cash on hand and money in accounts (S4690); 4.405.F.1 excludes loans from income only (S4691) |
| CO-5302 | investment_personal_property | not_counted_text_counts | counted | H0-F2: 3.520.77.B (S4507), 742.B (S4692) |
| CO-5302 | education_savings_account | counted_no_rule_excludes | counted | 3.520.72.B.5 (S2213): "other retirement or investment accounts and investment vehicles" |

Each table loses the option not_counted_text_counts (no row uses it) and CO-5301 gains counted_beyond_one_plot_per_member. Rows still for the owners' signature: SNAP held_replacement_proceeds (insurance settlements are lump sums counted, 4.405.E, S4691; home-sale proceeds are not named; relocation reimbursements are excluded, 4.410.J.4, and stated as held_excluded_payment) and other_resource (counted_no_rule_excludes), investment_personal_property, burial_fund, trust_interest, annuity, life_estate (not_counted_no_rule_found), loan_receivable (counted_with_real_property), personal_property (excluded_household_goods); Adult Financial held_eitc, held_excluded_payment, held_prorated_income, other_resource (counted_no_rule_excludes), annuity, life_estate (not_counted_no_rule_found), personal_property (excluded_household_goods). OQ-1202 and OQ-1203 record what is settled and what stays open.

## 5. Decision 4, and the defaults the rules give

Every new read is without a reader default (decision 4 of 2026-11-23): a person whose holdings are not stated is cannot determine; a field the schema declares required where read is read as stated. The defaults kept are the rules' own (design decision D3), each cited in the item that reads it: SNAP's finding that a transfer was to qualify, not stated, is no (4.408.2.B: "In the event the local office establishes"); Adult Financial's finding that a transfer is not a TWFC, not stated, is no (3.520.76.A.4.a: a rebuttable presumption); Adult Financial's self-support exemptions (income_producing, used_in_trade_or_business, produces_for_household_use) and the unsaleable finding are the county's to establish, so not stated they are not applied (3.520.72.A: "Unless otherwise specified, a resource is countable"; 77.D: the county obtains the tax returns; 741.D.3), as before; a retirement account whose taxes are not given is taken at 80% (73.B.1.b); a share not stated is 1 and co-owners not stated are none (the schema's when_absent). SNAP's real property fields (for sale, a lot for a home, income-producing, the costs of sale) have no such text and are required: a parcel over $1,500 that does not state them is cannot determine. A record not disposed of (disposed_date not stated) is held; one with no farm_ended_date is not farm property.

## 6. Answer changes and their classes

`npm run records:harness -- --list holdings --track snap` and `--track af` against HOLDINGS_BASELINE (cb7eac3). scripts/records/allowed/h1-snap.yaml and h1-af.yaml name every case.

| Class | What | Households | Rule |
|---|---|---|---|
| H1S-D4-1 | a person who states no holdings: SNAP's non-liquid resources and transfer findings were 0 and no, now cannot determine; the person's liquid resources already were, so no outcome changes | 173 stored households (persons named per id); generated: liquid not stated | decision 4 |
| H1S-D4-2 | a held federal refund or EITC with no date of receipt: SNAP's liquid resources cannot determine (before: excluded in full) | generated refund and credit variants | 4.410.J.12, J.17; decision 4 |
| H1S-D4-3 | real property over $1,500 that does not state the SNAP fields: cannot determine (before: not for sale, no costs) | generated real property variants | 4.410.B, E.1, F.1, F.2, G; decision 4, D3 |
| H1S-R, H1A-R | CO-300 restated in holdings alone with its refund dated: the ledger before H1 cannot read it; 1,700 and oap on the ledger on disk, as the review computed | CO-300 | 3.520.77.K, 4.410.J.17 |
| H1A-D4-1 | a person who states no holdings (or whose spouse states none): Adult Financial's life insurance, self-support and transfer figures were 0 and no, now cannot determine; no outcome changes | 173 stored households; CO-141, CO-448 to CO-450 p1 (spouse p3); generated: liquid not stated | decision 4 |
| H1A-D4-2 | a home that does not say whether the client lives in it or intends to return: the person's and couple's resources cannot determine; af_meets_resource_limit unchanged wherever the known parts exceed the limit (CO-5350); no Adult Financial outcome changes | CO-01, CO-02, CO-06, CO-112, CO-114, CO-152 to CO-154, CO-188, CO-213, CO-388, CO-395, CO-481 | 3.520.77.C; decision 4 |
| H1A-D4-3 | a held refund or retroactive payment with no date, or investment property or a burial space with no amount owed: cannot determine (outcomes of the generated variants included) | generated | 3.520.77.J, K, B, 72.B.9, 742; decision 4 |
| H1A-1 (fix) | a retroactive SSI payment stated for the SSI method (CO-4639) is the record Adult Financial exempts for nine months: 2,500 -> 1,700 | generated variant | 3.520.77.J |
| H1A-2 | the loan exempt is the loan money still held, not the month's loan receipt: CO-485's 1,200 account counts (was 600); no outcome changes | CO-485 | 3.520.77.L |
| H1A-3 | a transfer is read in the month of its disposed_date (CO-434's transfer facts, stated with no month, were read in every month): October 4 -> 0 months; the penalty period and the expectation are unchanged | CO-434 | 3.520.76.D.5 |
| not this track's | coverage pass 4 X4-1 (CCCAP, a diversion's length), merged after HOLDINGS_BASELINE; no holdings figure | CO-345 | |

Fixes with no difference in a stored or generated household, each shown by its rule tests: H0-F3 (CO-5313-T1, T4; CO-074-T11; household CO-743); H0-F2 (CO-5345-T1, T2; CO-4000-T21; household CO-740); the vehicle by P58 (CO-5343-T1 to T4, CO-4000-T22; households CO-741, CO-742 (OQ-1205's worked example: reading A, oap at the $2,000 limit; B would count 7,000)); one funeral agreement excluded (CO-5312-T2, T3); each burial trust its own exemption (CO-5344-T2); D.4.a per property (CO-4422-T6, T7); excluded personal property transferred (CO-5314-T3); land producing food for the household counted by SNAP (CO-074-T13).

Metamorphic relations: MH-1 split, MH-2 order, MH-4 encumbrance and MH-5 expiry run on 8 SNAP and 12 Adult Financial figures with 0 violations; MH-3 joint runs on Adult Financial's couple figure with 0 violations. MH-3 is not run for SNAP: SNAP's household is not the couple, and a spouse who is not a member (in an institution, an ineligible student) is outside it, so a joint account's half on that spouse's list is not counted (the long-term care couples CO-01, CO-02 and others; OQ-1252, recorded in scripts/records/programs/snap.ts).

## 7. Households and tests restated

Stored households: CO-300 (probe PR-PTC) states its savings in the holdings records alone, the federal refund dated 2026-08-14 (the probe's "received in August"); liquid_resources_value and federal_tax_refunds_held_value are no longer stated (section 9.1). New households, each a copy of a stored probe with its resources in holdings alone and the rule's answer computed by hand in its comment: CO-740 (H0-F2: 800 + 2,000 = 2,800, none), CO-741 (two vehicles: 1,000 + 3,000 = 4,000, none), CO-742 (OQ-1205's example: 2,000, oap), CO-743 (H0-F3: non-liquid 2,000, household 3,000). Rule tests of the moved items state holdings alone (the scalar resource facts they no longer read are dropped, so the translator leaves them as stated); dated: CO-343-T6, CO-4176-T1, T3, CO-1740-T3 (2026-07-01, 2026-04-15), CO-4412-T1, T6 (2026-08-14), T2 (2026-06-05), T5 (the loan, 2026-10-01). Tests whose expectation changed by decision 4: CO-074-T2, CO-4422-T5, CO-4722-T5 (now cannot determine), CO-4412-T7 (the loan is no longer read from the receipts: 0). Tests of other SNAP and Adult Financial items that state a resource figure directly now state what the transfer rules read: CO-385-T1 (snap_resource_transfer_disqualification_months 0), CO-3841-T1 to T8 (holdings []), CO-953-T3 to T5, T17, CO-1203-T1, T12, T13, T15 (af_is_in_twfc_penalty_period false).

## 8. Open questions

Added: OQ-1250 (SNAP: a burial space for the immediate family read as a member's excluded plot), OQ-1251 (SNAP: exempt money commingled, 4.409.D), OQ-1252 (SNAP: a holding shared with a spouse outside the SNAP household, 4.409.C), OQ-1253 (Adult Financial: the interest on a burial trust's exempt $1,500), OQ-1254 (Adult Financial: several transfers in one month, and the first month of the thirty-six). Resolved in part: OQ-1202, OQ-1203. OQ-1205: the assumption is implemented (note added).

## 9. Requests to the integration owner, and things seen elsewhere

1. **CO-300 in the receipts and earnings harnesses.** Dating CO-300's refund (the instruction, and H0's handover) needs the household stated in holdings alone: the translator cannot write a date the old facts do not state, and a household that states the old facts must state their translation. Both older harnesses then compare the household on ledgers that read the facts it no longer states: 4 values each (af_category, af_oap_grant, af_and_grant, af_client_and_spouse_countable_resources: old unknown, new the review's oap, 452, 0, 1,700). They are not answer changes of the rules; they need a disposition in scripts/receipts/allowed-differences.yaml and scripts/records/allowed/e1-*.yaml, which this track may not edit, or the holdings analogue of "written in receipts alone" (a household that states no old resource fact is checked by its expectations). Proposed entry: `{case: CO-300, person: p1, old: unknown, class: "H1A-R CO-300 restated in holdings alone (its refund dated); the ledger before H1 does not read it"}`.
2. **The receipts harness's generated households** state no holdings (generated from the baseline's households, before H0), so once Adult Financial read the records its outcomes for them were cannot determine (649 values of each outcome). This track added the holdings translation to their new side in scripts/receipts/harness.ts (one line, beside the earnings translation step E1 added; no acceptance logic changed): please confirm, and the Medicaid H1 track will need it too.
3. **Operators**: a sum over records cannot read a fact of the person, so Adult Financial cannot round each resource transferred in one month by the grant standard, nor tell which transfers of the first month of the thirty-six fall on or after the application's day (OQ-1254); a case-scope application date and grant standard, or a per-record penalty, would let it.
4. **Field defaults the rules give** (design D3, declared once on the field): SNAP's and Adult Financial's transfer findings (no), Adult Financial's self-support fields (not established), af_found_unsaleable (no). They are declared required where read on CO-5300, shared by programs whose rules differ, so each reader states its program's default with the citation; if the schema can carry a per-program default, they belong there.
5. **amount_owed on a liquid holding**: SNAP values liquid resources "less encumbrances" (4.408.1.A) and Adult Financial reads an account's balance; neither reads amount_owed on an account (the translator writes none, and making it required would make every account cannot determine). A default of 0 for liquid kinds, or the owners' decision, is needed.
6. **Joint holdings stated as two records**: the translator states a joint owner's share outside the case as a second record of share 0, so SNAP's $1,500 test is kept on the person's real property as one resource (CO-5311) rather than per holding; one record with its share would let the test run per holding.
7. **SNAP's household and a spouse outside it** (OQ-1252): co_owners spouse cannot say whether the spouse is in the SNAP household.
8. **A burial space's beneficiary** (OQ-1250) and **commingling** (OQ-1251): fields the owners may ask for.
9. **open-questions.md (fixed in the merge)**: coverage pass 4 appended OQ-1181's resolution paragraph at the end of the file, where it read as the last question's (OQ-1205, Adult Financial vehicles); it is moved under OQ-1181. HOLDINGS_BASELINE predates coverage pass 4, so the holdings harness shows its X4-1 change to CO-345's CCCAP outcomes; the track's file names it as not this track's until the baseline is re-pointed.
10. **Medicaid H1 track**: the twelve couples' homes (section 6, H1A-D4-2) state no lives_in; when the Medicaid track restates them as joint homes, stating lives_in and intends_to_return gives Adult Financial their answers back.

## 10. Gates

On the last commit (origin ccr-9d19bf4c-wmnwcl at 7c56f14 merged):

| Gate | Result |
|---|---|
| `node scripts/sync-manifest.mjs co` | written (snap 234, cash 241) |
| `npm run typecheck` | passes |
| `npx vitest run` | GATE_VITEST |
| `npm run records:harness -- --list holdings --track snap` | GATE_SNAP |
| `npm run records:harness -- --list holdings --track af` | GATE_AF |
| `npm run records:harness -- --list earnings --all-programs` | GATE_EARN |
| `npm run receipts:harness -- --all-programs` | GATE_REC |
| `CHECK_BASE=origin/main npm run check` | GATE_CHECK |
