# Coverage pass 4: the integration of the non-MAGI Medicaid, SNAP ages and cash rounds

The integration owner's round for the coverage pass 4 merge wave, on ccr-9d19bf4c-wmnwcl from 8519814, where three fix rounds, each passing every harness alone, had been merged: non-MAGI Medicaid (docs/reviews/coverage4-medicaid-nonmagi.md, merged in d9c4af2), SNAP ages and household composition by month (docs/reviews/coverage4-snap.md, S4-11 and S4-19, merged in d6db76d) and Adult Financial and Colorado Works (docs/reviews/coverage4-cash.md, merged in 286d8f7), with the change-impact dispositions re-keyed (8788b85, 8519814). Together they did not pass. This round classifies every unexplained difference of the three harnesses' whole-phase runs in the way the records integrations did (docs/reviews/records-holdings-h1-integration.md, records-earnings-e1-integration.md), states child support on the child's list in the stored households whose story names the child (N4-11, CA4-5), and records the gates. No harness's acceptance logic changed and no blanket allowance was added: every entry names its cases, person, figure, month and both values. Rule text is from the documents on file; no host was fetched.

## 1. Commits

| Commit | What |
|---|---|
| d4cced5 | The classification (sections 3 and 4): scripts/records/allowed/coverage4-integration.yaml (earnings, new), scripts/records/allowed/h4-coverage4-integration.yaml (holdings, new), the integration section of scripts/receipts/allowed-differences.yaml; the cash section's fourteen SSI-method entries for CO-311 and CO-313, written on a ledger without N4-4 and matching nothing now, removed; CO-580's two N4-3 entries moved from allowed/c4-nonmagi.yaml to the integration file (its baseline values moved with the restatement). Child support on the child's list in CO-133, CO-456, CO-562 and CO-580 (section 5); CO-133's and CO-456's retired child_support_received moved to the child with it (scripts/receipts/retired-facts.yaml); CO-580's Colorado Works person expectations |
| da04219 | Merge origin ccr-9d19bf4c-wmnwcl at 534d7e4 (the coverage pass 5 review of CCCAP, LEAP and SUN Bucks; docs only) |
| b3e8870 | The change record volumes/co/changes/2026-11-23-coverage4-integration.yaml, docs/plan-colorado.md "Coverage pass 4 integration", this review |
| 97b7df4 | Merge origin ccr-9d19bf4c-wmnwcl at 44a4dac (the coverage pass 5 review of MAGI Medicaid and CHP+; docs only) |
| 82f79b8 | Gate figures on 97b7df4; harness results |
| df9e65b | Merge origin ccr-9d19bf4c-wmnwcl at e647703 (coverage pass 4 fixes for SNAP's resource test), which had classified the same merge-wave differences (section 3, note): one entry per difference, so this round's duplicates are dropped (allowed/h4-coverage4-integration.yaml removed; fourteen entries of allowed/coverage4-integration.yaml and the receipts integration section's sixteen CO-311 and CO-313 entries); the child support placement entries (I4-5) stay |
| (last) | This review brought to the merged state; gate figures (section 8); harness results |

## 2. What the merged head reported

On 8519814, before any change of this round:

| Run | Unexplained | Of which |
|---|---|---|
| `npm run records:harness -- --list earnings --all-programs` | 20 (stored) | CO-311 and CO-313, 10 each |
| `npm run records:harness -- --list holdings --all-programs` | 74 (stored 42, generated 32) | CO-159 28, CO-311 6, CO-313 6, CO-100 2; generated 32 |
| `npm run receipts:harness -- --all-programs` | 22 (stored) | CO-311 and CO-313, 11 each |

The brief listed the receipts harness as OK; run with `--all-programs` on the merged head it reported these 22, all of class I4-1 below (the SSI-method figures are compared there too). Metamorphic relations: 0 violations in all three.

**Method.** Each unexplained value was evaluated with the household's text as it stands, on the ledger before the wave (bbc76ec) and on the head of each round alone (non-MAGI 136d90e, SNAP ages 92dc02b, cash b21eba5), and for generated households with today's generators and translators. A value is a round's class when the merged head gives what that round's ledger alone gives and the old value what the others give; then the household's statement was read to see whose restatement made the round's change visible to a harness that round did not run whole-phase. Every value of the 116 fell to exactly one round: the 54 SSI-method values of CO-311 and CO-313 and the 32 generated values to non-MAGI (136d90e alone gives the new value, the others the old), CO-159's 28 to the cash round (b21eba5 alone); CO-100's 2 are cannot determine on every one of these ledgers, and it is the non-MAGI round's statement of facts in CO-100's text that moved the baseline's value (section 4.3). SNAP ages by month moved none (its own review found none: "the converted items themselves leave the comparisons", since a per-month key is a different key).

## 3. Classification

**Note after merging e647703.** The SNAP resources round, merged and pushed while this round was running, met the same 116 differences at its merge bases and allowed each precisely with its traced cause (scripts/records/allowed/h1-coverage4-snap-resources.yaml, e1-coverage4-snap-resources.yaml and its section of scripts/receipts/allowed-differences.yaml). Every one of this round's entries for I4-1 to I4-4 matched a difference one of those entries already matched (checked tuple by tuple: case, person, figure, month, both values), so they were dropped; the tables below remain the trace this round made, and agree with that round's classes, with one addition on CO-100 (section 4.3). The entries this round keeps are I4-5's, the differences its own restatement brought (section 5): 2 in allowed/coverage4-integration.yaml, 2 in the receipts file's integration section (5 values).

| Class | Kind | Values (earnings / holdings / receipts) | What |
|---|---|---|---|
| I4-1 | (b) | 20 / 12 / 22 | Non-MAGI N4-4 on the households the cash round restated for CA4-1 (section 4.1) |
| I4-2 | (b) | 0 / 28 / 0 | Cash CA4-15 on CO-159, seen by the holdings harness, which the cash round ran with `--track af` only (section 4.2) |
| I4-3 | (b) | 0 / 2 / 0 | Non-MAGI N4-13's stated facts on CO-100 meeting the SNAP track's H1S-D4-1 (section 4.3) |
| I4-4 | (b) | 0 / 32 / 0 | Non-MAGI N4-13's required holdings fields on the Adult Financial and SNAP tracks' generated bases (section 4.4) |
| I4-5 | (b) | 2 / 0 / 3 | This round's restatement of child support on the child's list (section 5) |
| **Total** | | **22 / 74 / 25 = 121** | (a) a real defect of two rounds interacting: none; (b) 121; (c) a translator or harness-input artefact: none |

Before the merge of e647703, the 116 of section 2 and the 5 the restatement of section 5 brought (CO-580's two N4-3 values in the earnings harness took new baseline values, and three of CO-133's and CO-456's values moved off an earlier class's exact value) are each in one entry: allowed/coverage4-integration.yaml (16 entries), allowed/h4-coverage4-integration.yaml (50), scripts/receipts/allowed-differences.yaml's integration section (18).

## 4. The classes

### 4.1 I4-1: claim expenses (N4-4) on CO-311 and CO-313

CO-311 (probe QZ-2) and CO-313 (QZ-2K) of docs/reviews/coverage3-adult-financial.md were restated by the cash round for CA4-1: the $2,000 of workers' compensation and the $1,500 of medical and legal expenses on the claim are one receipt, `{kind: workers_compensation, amount: 2000, claim_expense: 1500}` (CO-311 p2, CO-313 p1). The non-MAGI round's N4-4 made the SSI method take a receipt's claim_expense off (ma_ssi_unearned_receipts CO-5511, ma_ssi_gross_unearned_receipts CO-5514; 20 CFR 416.1123(b)(3), S4755). Neither round's harness saw both: the non-MAGI round's ledger never met the restated receipts and the cash round's ledger has no N4-4. Hand values, October 2026 (individual standard 994, couple 1,491):

| Figure | CO-311 | CO-313 |
|---|---|---|
| ma_ssi_countable_income (p1, p2; couple) | 600 + (2,000 - 1,500) - 20 = **1,080** (was 2,580) | (2,000 - 1,500) + 1,000 - 20 = **1,480** (was 2,980) |
| ma_ssi_countable_unearned_income, ma_meets_ssi_income_standard (receipts harness) | 1,080; true (1,080 <= 1,491) | 1,480; true |
| ma_ltc_gross_income (the claimant) | **500** (was 2,000) | **500** (was 2,000) |
| ma_wawd_countable_income (the claimant) | 500 - 20 = **480** (was 1,980) | **480** (was 1,980) |
| ma_ssi_related_category (both) | **aged** (both 65 or older, resources 1,000 <= 3,000, income met; the baseline could not determine it on the other paths it tries when the income test fails, e.g. adult_financial_program_received, not stated) | **aged** |
| ma_family_planning_status (both) | **full_coverage** (follows the category) | **full_coverage** |
| ma_msp_category (both) | none to **cannot determine** | none to **cannot determine** |

The MSP category was the one value the brief singled out. Before, the gross income was above every MSP limit, so QMB, SLMB and QI were each false whatever else was stated and the category was none. At 1,080 the couple is under the QMB limit, and the category turns on two facts the household does not state: Medicare Part A entitlement (medicare_part_a_entitled, CO-803; 42 U.S.C. 1396d(p)(1)(A), required by ma_qmb_eligible CO-613) and, when entitled, whether QMB coverage can be in effect in October (ma_qmb_is_in_effect, CO-3623, which needs the Medicaid application date or the eligibility history; 8.100.6.L.10-11). Stated false for both, the category is none; stated true, it is still cannot determine without the application date. The probes' story (QZ-2: an OAP client with $600 of Social Security, her husband with workers' compensation; QZ-2K the same with the receipt on her) says nothing of Medicare or of a Medicaid application: they are Adult Financial probes. So the household was not given facts its story does not state (decision 4), and no rule is wrong: CO-312 (QZ-2C, the same couple with the net $500 stated directly) reads cannot determine on both ledgers. The receipts harness's cash-section entries that expected 2,580, 2,980, 1,980, "none" and false were written on a ledger without N4-4; they match nothing now and are replaced by the I4-1 entries.

### 4.2 I4-2: CO-159's verifications (CA4-15) in the holdings harness

CO-159's student turns 18 after the first of the month; CA4-15 made the dependent child of a month the age in that month (cw_is_dependent_child_in_month, CO-6807; 9 CCR 2503-6 3.601, 3.605.1.A.1), so her Colorado Works verifications are read: in February and March 2027 cw_verification_status past_due for p1 and p2, cw_pending_verification_count 5, p1's lawful presence, citizenship and residency verifications pending (person count 3, status count 2), p2's earned income and residency pending (2, 0), cw_person_participation_status ineligible_member_verification (p1) and eligible_member (p2); the baseline could not determine them. These are exactly the values the receipts harness allows under CA4-15 (the cash section of allowed-differences.yaml). The cash round ran the holdings harness with `--track af`, which compares no Colorado Works figure, so the class was never entered in a holdings file; b21eba5 alone gives every one of the 28 values.

### 4.3 I4-3: CO-100's SNAP transfer finding

The non-MAGI round stated, for N4-13, the facts its readers now require on every stored household that reached them, each with the value the reader gave it unstated; on CO-100 (a Colorado Works application, a mother and son) residence_setting_type private_dwelling among them. That fact also settles the baseline's SNAP household, so the baseline (0224913, reading the scalar resource facts) now answers snap_is_disqualified_for_resource_transfer for November 2026: false, for p1 and p2. The ledger on disk reads it from holdings, which CO-100 does not state: cannot determine, the SNAP track's class H1S-D4-1 (decision 4), which the SNAP track's file allows for every stored household that states no holdings and showed a difference then. CO-100 was not in that list only because its baseline was also cannot determine before N4-13's statement (checked: the baseline ledger with CO-100's text less the stated residence_setting_type gives cannot determine again). The SNAP resources round's entry for these two values names the new side's other unstated facts (the November household's dwelling_id and categorical eligibility read per month, S4-11 and S4-19, besides H1S-D4-1); both readings are true of the new value, and the old value's move is N4-13's. Its story says nothing of resources ("Applicant mother, no income"), so holdings are not invented.

### 4.4 I4-4: N4-13's holdings fields on the other tracks' generated bases

N4-13 (OQ-1243) made outside_colorado, held_in_trust_or_entity, beneficiary_deed and accrued_interest required where read and ma_found_available_value read as stated. The non-MAGI round's harness run (`--track medicaid`) compared its own bases and allowed the same variants there (allowed/h4-c4-nonmagi.yaml); the whole-phase run also builds them on the Adult Financial and SNAP tracks' bases (GH-AFclientresources, GH-AFspouseresources, GH-SNAPresources, GH-SNAPmember) and compares every program's figures on the Medicaid bases:

| Variant | Values | Figures |
|---|---|---|
| prepaid_burial_contract_2500 (accrued interest not stated; 8.100.5.M.2.j) | 23 | ssi_countable_resources_individual and _couple, ma_ssi_countable_resources_individual, ma_institutionalized_spouse_countable_resources: 1,000 to cannot determine; af_burial_responsible_person_resources 1,000 to cannot determine on the AF, SNAP and Medicaid bases (Adult Financial's burial assistance reads a responsible person's resources by the SSI method, 3.570.43.D.3.b, CO-1225) |
| trust_corpus_payable_3000 (no finding of the value available; 8.100.7.E) | 5 | ma_ssi_countable_resources_individual, ma_institutionalized_spouse_countable_resources: 0 to cannot determine |
| home_150000_lives_in_it, home_150000_left_it_intends_to_return_in_writing (trust or entity, beneficiary deed not stated; 8.100.5.M.2.a.xiii-xiv) | 4 | ma_ssi_countable_resources_individual: 0 to cannot determine |

The generated variants state the scalar fact the translator restates; no old fact says the interest, the finding or the deed, so the translator cannot write them (the same answer as H1 integration's request R-5). Not an artefact: the variant genuinely does not state what the rule now requires.

## 5. Child support on the child's list

N4-11 defined child_support and child_support_arrears as stated on the list of the child they are paid for, whoever receives them (CO-5000's kind meanings; docs/conventions.md "Whose list a receipt is on"), and listed nine stored households that stated support on the payee. Each was read:

| Household | Story | Done |
|---|---|---|
| CO-133 | "She also receives $600 of child support a month ... p3 (Kai, 6) is the child" | Restated on p3; the retired child_support_received moved with it (p1 0, p3 600) |
| CO-456 | a Colorado Works household "whose only child is 15" (p3); the mother receives $600 of support | Restated on p3; retired facts moved likewise |
| CO-562 | "400 of child support for p2" | Restated on p2 |
| CO-580 | "p1 receives $250 of current child support for p2 every month, a $100 payment toward arrears" (her only child) | Both restated on p2; the person expectations of Colorado Works move to p2 |
| CO-198, CO-305 | a single adult of 46 with SSI; no child, no support in the story | Kept: the record is the translation of an unstated scalar fact (kind, no amount); there is no child's list to put it on |
| CO-225, CO-458, CO-459 | one adult applying for LEAP (a relative lives elsewhere); the story names no child the support is for | Kept: the story does not say whom it is for; LEAP sums the household's members either way |

**What moved** (the household's text before and after, on the merged ledger; every program outcome, every harness figure and every expectation):

- Household totals and outcomes: none. CCCAP, LEAP and SNAP sum their members (CO-133's CCCAP income 2,600 and fee 47; CO-580's Colorado Works unit income 250, eligible, grant 320; CO-562's MAGI income 3,066, 170%, CHP+ eligible_child: MAGI excludes support on either list, 8.100.4.C.1.d.iii).
- Person figures move from the payee to the child: SNAP, LEAP, CCCAP and Colorado Works unearned income (CO-133 p1 600 to 0, p3 0 to 600, and likewise); Adult Financial deems the child's support less one-third for an SSI-age child (600 x 2/3 = 400; CO-5016 row counted_less_one_third_for_ssi_child, 3.520.786.K); the SSI method reads it as the child's (8.100.5.H.4.c; 20 CFR 416.1124(c)(11)): CO-580 p2 (250 + 100) x 2/3 - 20 = 213.33 (CO-5510 reads arrears as child_support), and a parent's long-term care gross income no longer holds the child's support (CO-562 p1 3,616 to 3,216), which is what N4-11 meant to settle.
- The children's needs Adult Financial allocates for the payee's children read the child's own income (af_spouse_dependent_children_needs, CA4-17, 3.534.B.3): CO-133 and CO-456 497 to 0, CO-562 497 to 97, CO-580 497 to 147; the SSI method's ineligible child allocation likewise (ma_ssi_ineligible_child_allocation; 20 CFR 416.1163(b)): CO-562 497 to 97, CO-580 497 to 147.
- The unearned-income verification items of each program follow the receipt to the person whose list holds it: cannot determine on the child (no verification fact stated for the child), false on the payee, as decision 4 reads an unstated document fact.
- CO-580's expectations: p1 cw_countable_unearned_income, cw_counted_child_support 250 to 0, cw_has_countable_unearned_income true to false (her list holds only the crime victim compensation, exempt, 3.605.4.A.8); p2 gains 250, 250, 0 (cw_payment_countable_unearned_income: support is excluded from the grant, 3.605.5.B) and true (3.605.5.A counts current support against the need standard; D exempts the arrears). Unit figures as before.

**Harness differences this brought** (I4-5): earnings, CO-580 p2 ma_ssi_countable_income 2,052.33 to 213.33 and ma_ssi_parental_income_deemed 1,839 to 0 (both ledgers count p2's support as hers, 213.33; the difference is N4-3, the mother's $3,000 crime victim compensation exempt, 416.1124(c)(17), which the baseline deemed: 3,000 - 20 - 147 = 2,833 countable, less the 994 parent allocation, 1,839); the two N4-3 entries of allowed/c4-nonmagi.yaml for the old baseline values (1,469, 1,489) are moved to the integration file. Receipts, CO-133 p1 snap_person_gross_income unknown to 2,150 and cw_budgetary_member_deemed_income unknown to 1,910 (2,510 - 600), CO-456 p1 snap_person_gross_income unknown to 2,150: her earned income alone (records E1 integration, I-1) with the support now on p3; the earlier EI-1 entries expected 2,750 and 2,510. The holdings harness met nothing new. The translation checks stay clean (receipts: no stored household whose receipts are not the translation of its old facts).

**CA4-5 agrees.** Adult Financial reads only the person's own list (af_counted_unearned_receipts CO-5017; CO-5017-T14, the grandchild's support on the grandchild: 600; T15, support for the client herself on her own list: 900), and the kind's meaning in CO-5000 says "on the list of the child it is paid for, whoever receives it", the placement the cash review asked the second round to confirm. On the restated households Adult Financial counts the support for the child (CO-133 p3 400) and none for the mother (0).

## 6. Real defects

None. No unexplained difference was a defect of two rounds' changes interacting or a translator or generator artefact; each is a round's cited change seen where that round's own runs did not look. No item changed, so no rule test was added and no item ID of CO-6950 to CO-6969 was used.

Noted, not this round's: ma_community_spouse_income (CO-2467) reads ma_spousal_unearned_receipts gross, so CO-311's community spouse income is 2,600 with or without N4-4 (unchanged across the wave, so not a difference here); whether the spousal impoverishment figure takes a claim's expenses off as the SSI method now does is for the Medicaid owner. Two older broad entries (E1-M6's Disabled Adult Child income and M7's long-term care gross income, neither bound to values) also match the restated households' new values; they were left as their rounds wrote them.

## 7. Answer changes

Stored expectations: CO-580's Colorado Works person figures, as in section 5 (unit figures unchanged); no other expectation changes. Stored values: those of section 5 on CO-133, CO-456, CO-562 and CO-580. Generated households: none. No change-impact flag (no item changes; the change record states it).

## 8. Gates

On 3824107 (origin ccr-9d19bf4c-wmnwcl merged at e647703, the latest; the harnesses run on df9e65b, whose ledger and allowed files are the same), the final gate:

| Gate | Result |
|---|---|
| `node scripts/sync-manifest.mjs co` | written, no change (snap 241, medicaid 362, cash 246 items) |
| `npm run typecheck` | passes |
| `npx vitest run` | 1,150 tests pass (102 files); no pin moved by this round |
| `npm run records:harness -- --list earnings --all-programs` | OK: stored 327, 175,200 values, 2,078 differ, all allowed; generated 476, 200,872 values, 5,264 differ, all allowed; **0 unexplained**; translation 0 stale (382 households, 895 rule tests); boundary lint 0; metamorphic **0 violations** |
| `npm run records:harness -- --list holdings --all-programs` | OK: stored 329, 144,151 values, 2,452 differ, all allowed; generated 368, 128,064 values, 1,750 differ, all allowed; **0 unexplained**; translation 0 stale (209 households, 448 rule tests); joint lint 0; metamorphic **0 violations** |
| `npm run receipts:harness -- --all-programs` | OK: stored 319, 168,442 values, 1,669 differ, all allowed; generated 1,626, 689,931 values, 18,647 differ, all allowed; **0 unexplained**; translation clean; MA-1 to MA-6 **0 violations** |
| `CHECK_BASE=origin/main npm run check` | OK on the committed tree: co rule tests 5,338 of 5,338, household expectations 4,129 of 4,129; change impact 405 decisions changed, 30 flags, 30 dispositioned, 0 open; conformance self-check OK (co 5,890 cases, 9,627 checked, 0 failed; mwr 150 cases, 197 checked). The 102 stale-disposition notices (earlier rounds' records whose flags' fingerprints moved when the holdings record gained fields, as the SNAP resources review says) do not block and are not this round's: it changes no item |

## 9. Left open

- The MSP category of CO-311 and CO-313 stays cannot determine until a story states Medicare Part A and the Medicaid application date; they are Adult Financial probes and need neither.
- Whether the community spouse income takes a claim's expenses off (section 6), for the Medicaid owner.
- HOLDINGS_BASELINE and EARNINGS_BASELINE still measure from before this wave; H2 and E2 re-point them, which removes the integration files' entries with them.
