# Resource records, step H1: the integration of the tracks

The integration owner's round for H1 (docs/design-earned-and-resource-records.md 4.3, 4.4), on ccr-9d19bf4c-wmnwcl from e628bb4, where the H1 tracks (Medicaid; SNAP and Adult Financial), each built from 0224913 and each passing its own harness, had been merged, together with the coverage pass 4 fixes for CCCAP, LEAP and SUN Bucks (7c56f14) and for MAGI Medicaid and CHP+ (fa59e3b). Together they did not pass: `npm run records:harness -- --list holdings --all-programs` reported 719 unexplained differences (stored households 221, generated 498) and 4 metamorphic violations, and `--track medicaid` 8 unexplained and the same 4 violations. This round re-points the baseline to the wave's, classifies every unexplained difference of the whole-phase run, fixes the one real defect the tracks' meeting showed (with rule tests computed by hand from the text on file), makes the run accept the cited classes precisely, corrects the one metamorphic relation that was wrong, and answers the translator, schema and engine requests of the two track reviews. No harness's acceptance logic changed and no blanket allowance was added. Rule text is from the documents on file (D-65, D-80, D-82, D-208, D-4400, D-4440, D-4441); no host was fetched.

## 1. Commits

| Commit | What |
|---|---|
| b4c213c | The SSI method counts personal property held as an investment at its equity (ma_ssi_holdings_countable_in_month, CO-5320; section 4); rule tests CO-5320-T21 to T23; CO-5320-T5 and CO-4623-T3 state nothing owed; the change record; dispositions of CO-613, CO-616, CO-654, CO-659 re-keyed in place |
| 24ca451 | Engine: a `when_absent` record field read with its declared meaning is not reported missing (request R-2); tests; docs/operators.md |
| f3d2c2a | HOLDINGS_BASELINE re-pointed to 0224913 (section 2); scripts/records/allowed/h1-integration.yaml; CO-300's SSI-method expectation (section 5) |
| 6873306 | `proceeds_source` on held replacement proceeds (R-4); keepJointHome reviewed and applied to rule tests (R-1); CO-300's new expectation allowed precisely in the earnings and receipts harnesses; dispositions re-keyed after the schema change |
| 5e142cf | Merge origin ccr-9d19bf4c-wmnwcl at 05cd48c (coverage pass 4 review of Adult Financial and Colorado Works; docs only) |
| 43eb7f4 | MH-5 merges only refunds and retroactive benefits and runs for Medicaid (section 6); a generated retroactive payment thirty months old; harness results; docs/plan-colorado.md "H1 integration" |
| e0eadc6 | This review |
| 260c0cc | Merge origin ccr-9d19bf4c-wmnwcl at 10b6312 (coverage pass 4 fixes for SNAP, 24c5d36; the handoff) before the final gate: docs/plan-colorado.md and scripts/receipts/allowed-differences.yaml keep both sections |
| 137a74d | Change-impact dispositions re-keyed to the merged ledger's fingerprints (relations unchanged) |
| (last) | Gate figures in this review; harness results |

## 2. The baseline (design 4.3 rule 5)

HOLDINGS_BASELINE was cb7eac3, the last ledger commit of step H0 itself. H0 was merged into the branch at 0224913 (with the coverage pass 4 review documents and the P58 follow-up fe36e2e, an engine change that the harness, which evaluates both ledgers with today's engine, does not see), and both H1 tracks started from 0224913. Rule 5 makes the baseline the merge wave's: the constant is now 0224913 (scripts/records/harness.ts, with its reasons). The two ledgers read alike (0224913 adds only open-question text to the volume), so re-pointing moved nothing: 719 unexplained before and after, and no track's class matches differently. H2 re-points it to the end of this integration; `--base 704da6b` still measures H0.

What landed after 0224913 that is not H1 is measured as what it is: coverage pass 4 for CCCAP, LEAP and SUN Bucks (7c56f14) and for MAGI Medicaid and CHP+ (fa59e3b) moved 305 values, each now allowed under that round's own class (I-3 to I-6 below), named as merged after the baseline and not H1's. The attribution of every value was checked on intermediate ledgers: 7f7c37f (0224913 with both coverage pass 4 rounds and no H1), 92bc5d4 (0224913 with H1 Medicaid alone), 56b0cd0 and 63ce12e (0224913 with H1 SNAP and Adult Financial alone, before and after the track's burial-space commit); L4-4 by 3069a4d against its parent and X4-1 by 67c2962 against its parent.

## 3. Classification of the whole-phase run

After the fix of section 4 the run had 769 unexplained differences (stored 221, generated 548: the 498 of the merged head, 48 from the fix and 2 from the generated variant of section 6). Every one is in scripts/records/allowed/h1-integration.yaml, 113 entries, each with the exact list of cases it was checked on (an alternation of case ids, no wider pattern), the person, the figure and both values.

| Class | Kind | Values | What |
|---|---|---|---|
| I-1 | (a) fix CO-5320 | 48 (generated) | Personal property held as an investment counted at its equity by the SSI method (section 4); the generated `investment_jewelry_2000` variants state its market value (investment_personal_property_value, CO-4642) and nothing of what is owed, so on every base the SSI method's resources cannot be determined (decision 4), as Adult Financial's already were (H1A-D4-3): ma_ssi_countable_resources_individual, ma_ssi_countable_resources, ma_msp_countable_resources, ma_institutionalized_spouse_countable_resources 2,000 to cannot determine; ma_ssi_parental_resources_deemed 0 to cannot determine; on the MA aged base ma_ssi_related_category "aged", ma_family_planning_status "full_coverage" and ma_msp_category "none" to cannot determine |
| I-2 | (b) CO-300 | 8 (stored) | CO-300, restated in holdings alone by the Adult Financial track with its federal refund dated (H1A-R), is read by the SSI method: 1,700 counted, the refund left out for twelve months (section 5). ssi_countable_resources_individual, ssi_countable_resources_couple, ma_ssi_countable_resources_individual, ma_ssi_countable_resources, ma_msp_countable_resources, ma_institutionalized_spouse_countable_resources: unknown to 1,700; ma_ssi_related_category unknown to "aged"; ma_family_planning_status unknown to "full_coverage" (October 2026). The Medicaid track's file named CO-300 under H1-M8 as cannot determine, the reading before the Adult Financial track dated the refund |
| I-3 | (c) coverage pass 4 L4-4 | 299 (stored 207, generated 92) | leap_zero_income_verification_is_pending false to cannot determine: LEAP reads each age on the application date (CO-6400), not stated (decision 4); the class of allowed/coverage4-care-energy.yaml, which the earnings harness already holds for the same stored households |
| I-4 | (c) coverage pass 4 X4-1 | 2 (stored) | CO-345 cccap_parent_fee 66 to cannot determine (the diversion's length not stated); the SNAP track's file had already named CO-345's eligibility and income as "not this track's" |
| I-5 | (c) coverage pass 4 C4-13 | 2 (stored) | CO-182 ma_annualized_household_income 1,000 to 999.83 (MAGI income not rounded; allowed/c4-magi.yaml) |
| I-6 | (c) coverage pass 4 C4-CPB | 2 (stored) | CO-387 chp_copayment_income_band band_c to band_d (allowed/c4-magi.yaml) |
| I-7 | (c) H1S-D4-1 | 30 (generated) | SNAP's non-liquid resources and transfer findings (0 and no to cannot determine) on the Medicaid and Adult Financial bases' "liquid not stated" variants |
| I-8 | (c) H1S-D4-2 | 48 (generated) | SNAP's liquid resources (1,700 to cannot determine) on those bases' undated federal refund and EITC variants |
| I-9 | (c) H1S-D4-3 | 120 (generated) | SNAP's non-liquid and household resources on those bases' real property variants (5,000, 3,000, 4,000 or 0 to cannot determine): the SNAP fields (for sale, a lot for a home, income-producing, costs of sale) not stated |
| I-10 | (c) H1A-D4-1 | 42 (generated) | Adult Financial's life insurance, self-support and transfer figures (0 and no to cannot determine) on the Medicaid and SNAP bases' "liquid not stated" variants |
| I-11 | (c) H1A-D4-3 | 138 (generated) | Adult Financial on those bases' undated refund and retroactive-payment variants and its investment-jewelry and burial-space variants (no amount owed): cannot determine |
| I-12 | (c) H1A-1 | 30 (generated) | A retroactive SSI payment stated for the SSI method is exempt for Adult Financial for nine months (2,500 to 1,700, the limit met); on the Medicaid bases, which state no Adult Financial application facts, af_category "none", af_oap_grant and af_and_grant 0 become cannot determine (decision 4: the resources no longer settle them) |
| **Total** | | **769** | (a) 48; (b) 8; (c) 713 (305 coverage pass 4, 408 the tracks' classes on each other's bases) |

The tracks' classes met here only because each track's harness compares its own programs on its own generated bases: SNAP's figures on the Medicaid and Adult Financial bases (I-7 to I-9), Adult Financial's on the Medicaid and SNAP bases (I-10 to I-12). Each value was checked to be its class: the value on the ledger of the track alone equals the merged head's (56b0cd0, or 63ce12e for the 24 burial-space values of the track's later commit), on a variant the class names. None is a defect of the tracks interacting.

**Fixed by the non-MAGI round:** none. No unexplained difference is one of the findings of docs/reviews/coverage4-medicaid-nonmagi.md (N4-6, the couples' vehicle exclusion, and N4-8, holdings in a disposal month, change no value of this run; their items were not edited here). No difference is a SNAP income finding (docs/reviews/coverage4-snap.md) or one of docs/reviews/coverage4-cash.md's.

Per track, `--track medicaid|snap|af`: each OK with 0 unexplained (section 9). `--track medicaid`'s 8 unexplained were I-2.

## 4. Real defect fixed (classification a): investment property counted at its value (CO-5320)

ma_ssi_holdings_countable_in_month (CO-5320, the Medicaid track's) read each `counted` row at its value, except installment contracts, notes and other property, which it read at equity. Personal property held as an investment (M.3.j, S3421: "Personal effects acquired or held for their value or as an investment") is a nonliquid resource, and 20 CFR 416.1201(c)(1) (S2420) says "Nonliquid resources are evaluated according to their equity value", the equity being the price it could sell for "minus ... Any encumbrances" ((c)(2), S4500); the item's own precision says property is read at its equity. The Adult Financial track's household CO-740 (H0-F2: a $2,000 coin collection, amount_owed 0) and the Adult Financial reader (af_countable_personal_property, CO-5345: "the appraised value less liabilities", 3.520.742.B) state and read what is owed, so the metamorphic relation MH-4 (value v owed d against value v - d owed 0) found the SSI method's figure moving with what is owed: CO-740 p1, 2,800 against 2,900 in ssi_countable_resources_individual, ma_ssi_countable_resources_individual, ma_ssi_holdings_countable_in_month and ma_ssi_countable_resources_in_month (the 4 violations). The relation was right and the rule wrong.

CO-5320 now reads investment_personal_property with the equity kinds, value less amount_owed, which is required where read. Rule tests by hand: CO-5320-T21 (800 in the bank and a coin collection appraised at 2,000 with 300 owed: 800 + 1,700 = 2,500), T22 (a painting worth 6,000 with a 1,000 loan, held half with a sister: (6,000 - 1,000) x 0.5 = 2,500), T23 (jewelry 2,000 with nothing said of what is owed: cannot determine); CO-5320-T5 and CO-4623-T3 state the collectibles' amount_owed 0 (their expectations unchanged: 6,700 and 13,500). The consequence on generated households is I-1; no stored household states investment property other than CO-740, whose figures do not move (2,800).

## 5. A household one track restated that another program needs (classification b): CO-300

CO-300 (probe PR-PTC) states its savings in holdings alone since the Adult Financial track dated its federal refund (received 2026-08-14). The SSI method reads the same records: the 1,700 in the bank counted, the 500 federal refund left out for twelve months from receipt (26 U.S.C. 6409, S4664; CO-6500), 1,700 within the $2,000 limit; p1, 70, single, with $600 of Social Security, is in the aged group with full coverage. The household needed no further restatement (every program reads the dated records); its expectations gain ma_ssi_countable_resources_individual: 1,700, computed above. The earnings and receipts harnesses then compare that figure on ledgers that read the scalar facts CO-300 no longer states (old unknown): one entry each, by case, person, figure and both values (scripts/records/allowed/eh1-integration.yaml, new, to be removed when E2 re-points EARNINGS_BASELINE past H1; scripts/receipts/allowed-differences.yaml, after H1A-R1).

## 6. The metamorphic relations

| Relation | Track | Before | After | Finding |
|---|---|---|---|---|
| MH-4 encumbrance | Medicaid | 4 violations (CO-740) | 0 | The rule was wrong (section 4) |
| MH-5 expiry | Medicaid | not run (`notInvariant`: F.6's exclusions have no time limit) | 0 violations, 518 households | The relation was wrong for every track: it merged every held_ record dated more than two years back into the account, which is the same statement only for kinds whose every row ends within two years. SNAP excludes held excluded payments and prorated income with no time limit (4.410.J) and an EITC while the household participates (J.12); the SSI method excludes loans and the F.6 payments with no time limit; Adult Financial extends the replacement-proceeds window on the county's grant (3.520.77.E, F). SNAP's and Adult Financial's 0 violations were vacuous: no household stated such a record dated two years back. MH-5 now merges only held refunds (twelve months: 6409, 4.410.J.17, 3.520.77.K; a State refund counted) and retroactive benefits (nine months: F.6.c, 3.520.77.J; SNAP counts them); with that, Medicaid's reason no longer applies and it runs MH-5. A generated variant on each of the eight holdings bases, a retroactive payment received thirty months before the determination date, gives the relation a record to merge (its other differences are H1-M2, H1-M3 and I-3) |
| MH-3 joint | SNAP | not run (`notInvariant`) | not run | Checked by running it: 78 violations in 17 stored households, each a couple not both in one SNAP household: the long-term care couples (CO-01, CO-02, CO-06, CO-112, CO-152 to CO-154, CO-188, CO-213, CO-388, CO-395, CO-481), spouses living apart (CO-167, CO-197), a client who died (CO-306), a sponsor-spouse (CO-307) and an ineligible student (CO-446). The track's reason holds (SNAP's household is not the couple; OQ-1252) |
| MH-1, MH-2, MH-4 | every track; MH-3 Adult Financial and Medicaid | 0 | 0 | |

## 7. Requests to the integration owner

| Review | Request | Done |
|---|---|---|
| Medicaid R-1 | keepJointHome in translate-holdings.ts | Reviewed and kept: a home is matched by kind and equity (the one thing the facts state of it) and only holding_id, co_owners and share are kept; every other field stays the translation, so a spouse's own lives_in and intent still come from that spouse's facts. Applied to rule tests as to households (it was households only); 0 households and 0 tests re-translated |
| Medicaid R-2 | a `when_absent` field reported as a missing fact | Fixed in src/engine/evaluate.ts: a `when_absent` field read as `["otherwise", that, x]` or `["unknown", that]` (share "owned alone", disposed_date "still held", returned_date, co_owners) is not reported missing; read any other way, or a required field read under a reader's own `otherwise`, it is reported as before. Trace only: no value changes. Tests in test/engine/holdings.test.ts (four), docs/operators.md "Receipt records" |
| Medicaid R-3, SNAP/AF 9.4 | defaults the rules give per program for record fields (OQ-1243) | Recorded: a field's default is declared once on CO-5300, shared by programs whose rules differ (SNAP's and Adult Financial's transfer findings, the self-support fields, af_found_unsaleable); the schema carries no per-program default, so each reader states its program's reading with its citation, as the tracks did. A per-program default is an engine and schema decision for the owners (OQ-1243) |
| Medicaid R-4 | the source of held replacement proceeds | Done: `proceeds_source` on CO-5300 (insurance, relocation, home_sale, condemnation, other), required where read, read by no rule until OQ-1240 says which windows each program applies (F.6.f's six months, 416.1232(a)'s nine). The translator writes none (no old fact states it). Its fingerprint moved every decision below the holdings list; the dispositions so moved are re-keyed in place, relations unchanged |
| Medicaid R-5 | amount_owed 0 on investment property | Declined, with the reason: investment_personal_property_value (CO-4642) is "the current market value", not an equity figure, so the translator cannot say nothing is owed (it states amount_owed 0 only on the equity facts it restates: real property, vehicles, the home). The SSI method now reads the property at its equity like Adult Financial (section 4), so a household that states the property by the scalar fact is cannot determine in both until H2 restates it with what is owed (I-1, H1A-D4-3) |
| Medicaid R-6 | a per-figure person filter for MH-3 | Recorded: it changes which values the relation compares, which is the harness's; ma_institutionalized_spouse_countable_resources stays unregistered as a couple figure |
| Medicaid R-7 | the receipts harness's generated households state holdings | Done by the tracks before the merge (b0d789e); HM-R1 removed |
| Medicaid R-8 | the earnings harness and h1-*.yaml | Recorded for E2: re-pointing EARNINGS_BASELINE past H1 removes eh1-medicaid.yaml, eh1-snap-af.yaml and eh1-integration.yaml |
| SNAP/AF 9.1 | CO-300 in the receipts and earnings harnesses | Done before this round (b1e0da9); CO-300's new expectation added here (section 5) |
| SNAP/AF 9.2 | the receipts harness's generated households | Done (as R-7) |
| SNAP/AF 9.3 | operators for several transfers in one month (OQ-1254) | Recorded: an engine question (a sum over records reading a fact of the person), for the owners with OQ-1254 |
| SNAP/AF 9.5 | amount_owed on a liquid holding | Recorded, no change needed: no reader reads amount_owed on an account, and the field is required only where read, so an account that does not state it is not cannot determine. A default for liquid kinds would be a field default per kind, which the schema does not carry; SNAP's "less encumbrances" (4.408.1.A) on an account is for the owners if a household ever states one |
| SNAP/AF 9.6 | a joint holding as one record with its share | Recorded: the old facts state the person's real property and the outside owners' share of a joint property separately, without saying which of the person's property is the joint one, so the translator cannot write one record of the whole; a household stated in records can (CO-5311 then tests each record's equity) |
| SNAP/AF 9.7 | a spouse outside the SNAP household | Recorded with OQ-1252: `co_owners: spouse` cannot say whether the spouse is in the SNAP household; a field or option for it is the owners' (section 6 lists the 17 stored couples it concerns) |
| SNAP/AF 9.8 | a burial space's beneficiary, commingling | Recorded with OQ-1250, OQ-1251 |
| SNAP/AF 9.10 | lives_in on the twelve couples' homes | Recorded: the households state the home's equity on each spouse and no lives_in or intent to return; the nursing-facility spouse's intent to return is not in any of their texts, so stating lives_in alone would not give Adult Financial its answer (its couple figure would still be cannot determine), and H1A-D4-2 stays the reading |

## 8. Answer changes

Stored households: no expectation changes (`npm run check`: every household expectation passes); no stored value changes (CO-740's SSI-method resources stay 2,800; no other stored household states investment property). CO-300 gains an expectation, the value the merged head already gave. Rule tests: CO-5320-T21 to T23 new; CO-5320-T5 and CO-4623-T3 state amount_owed 0 on the collectibles (expectations unchanged). Generated households: the investment-property variants' SSI-method resources become cannot determine (I-1), on the MA aged base its category too. No change in the engine changes a value (R-2 is trace only).

## 9. Gates

On the merged head (origin ccr-9d19bf4c-wmnwcl at 10b6312 merged, 260c0cc; dispositions re-keyed, 137a74d). The SNAP coverage round merged last moved no value this round classifies: the whole-phase run is 0 unexplained with its own file (allowed/h1-coverage4-snap.yaml) beside this one, and its stored households CO-750 to CO-759 are checked by their expectations.

| Gate | Result |
|---|---|
| `node scripts/sync-manifest.mjs co` | written (snap 240, medicaid 359 items) |
| `npm run typecheck` | passes |
| `npx vitest run` | 1,150 tests pass (102 files); no pin moved |
| `npm run records:harness -- --list holdings --all-programs` | OK: translation 0 stale (178 households, 363 persons; 368 rule tests), 0 joint-holding findings, every relation's output accepted; stored 329 households, 160,844 values, 5,400 differ, all allowed; generated 368, 144,992 values, 2,765 differ, all allowed; **0 unexplained**; metamorphic **0 violations** |
| `--track medicaid` | OK: stored 49,447 values, 1,255 differ, all allowed; generated 184, 18,032 values, 1,353 differ, all allowed; 0 unexplained |
| `--track snap` | OK: stored 35,220 values, 1,454 differ, all allowed; generated 92, 8,740 values, 89 differ, all allowed; 0 unexplained |
| `--track af` | OK: stored 38,231 values, 2,582 differ, all allowed; generated 92, 7,728 values, 158 differ, all allowed; 0 unexplained |
| `npm run records:harness -- --list earnings --all-programs` | OK: stored 327, 176,168 values, 1,998 differ, all allowed; generated 476, 201,824 values, 3,907 differ, all allowed; 0 unexplained; translation 0 stale (351 households, 868 rule tests); boundary 0 findings |
| `npm run receipts:harness -- --all-programs` | OK: stored 319, 170,096 values, 1,522 differ, all allowed; generated 1,626, 696,597 values, 8,658 differ, all allowed; 0 unexplained; MA-1 to MA-6 0 violations |
| `CHECK_BASE=origin/main npm run check` | see section 10 |

Metamorphic relations (whole phase): MH-1 split, MH-2 order, MH-4 encumbrance 0 violations for every track (528 households); MH-3 joint 0 for Adult Financial (208 values) and Medicaid (416), not run for SNAP (section 6); MH-5 expiry 0 for every track, Medicaid included.

## 10. Check

`CHECK_BASE=origin/main npm run check` on c4cd658 (committed, clean tree): OK; co rule tests 5,104 of 5,104 (CO-5320-T21 to T23 among them), household expectations 3,976 of 3,976 (CO-300's new one among them); change impact 29 flags, 29 dispositioned, 0 open; conformance self-check OK (co 5,625 cases, 9,240 checked, 0 failed; mwr 150 cases, 197 checked, 0 failed). Four stale entries that the check names as "no longer flagged" (CO-303 to CO-301 and CO-314, in 2026-11-23-fix-round-other-families.yaml and 2026-11-23-receipts-3.yaml) came with the SNAP round's merge and are not this round's; they do not block.

## 11. Left open

- OQ-1240 (the source of replacement proceeds: `proceeds_source` is in the schema, read by no rule), OQ-1243 (per-program defaults of record fields), OQ-1250 to OQ-1252, OQ-1254 (the SNAP and Adult Financial track's).
- R-6 (MH-3 per-figure person filter) and R-8 (the earnings harness's eh1 files): for the harness owner and E2.
- H2: re-point HOLDINGS_BASELINE to the end of this integration; restate investment property and burial spaces with what is owed when the scalar facts are retired.
