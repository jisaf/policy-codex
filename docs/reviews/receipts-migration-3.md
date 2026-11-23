# Receipt records, migration phase 3: the cleanup after every program reads the receipts

Phases 1 and 2 (docs/reviews/receipts-migration-1.md, receipts-migration-2-cw.md, receipts-migration-2-cccap-sunbucks.md, receipts-migration-2-medicaid.md) moved every program's unearned income onto the receipts list (CO-5000), each through its own counting table. Phase 2 retired nothing: a scalar fact left without a reader stayed in the ledger until the last program moved. Phase 3 is that cleanup, in seven steps on the integration branch, merged at fb3649b (steps 1-3) and f5275a6 (steps 4-7). It was written up in the commit messages only; this review collects them, so the items and files that cite it (CO-4369, CO-3912, volumes/co/changes/2026-11-23-receipts-3.yaml, scripts/receipts/allowed-differences.yaml section "Phase 3", docs/reviews/cross-program-audit.md) point at a document that exists.

The merge gate is `npm run receipts:harness` (and `--all-programs`) against c29d326 (phase 1 merged), read through the legacy translation where the phase-3 kinds are concerned (below), so the harness measures phase 3 beside phase 2. Each step ran it with 0 unexplained differences.

## 1. Commits

| Commit | Step | What |
|---|---|---|
| 5bf6252 | 1 | Retire the unearned-income facts no rule reads (46 supplied facts and the orphan derived quarter total CO-4077) |
| f4c1ce1 | 2 | Kinds of their own for the parts of a receipt (nine kinds, one field); readers stop subtracting a part stated twice; ten more facts retired |
| c913c81 | 3 | Split the thirty-day wages CCCAP and LEAP shared (CO-3912) |
| 2ba2530 | 4 | VA Aid and Attendance has a cited row in every counting table |
| a2017df | 5 | CO-5000 says what the receipts list is now that every program reads it |
| 6e34343 | 6 | The translator's header describes the end state |
| 0695acc | 7 | Re-key the stale change-impact dispositions |

## 2. Step 1: the facts no rule reads are retired (5bf6252)

With Colorado Works, CCCAP, SUN Bucks, Medicaid and CHP+ on the receipts, no rule read a scalar unearned-income fact (`npx vite-node scripts/receipts/readers.ts`). Retired, 46 supplied facts: CO-025 to CO-030, CO-081, CO-1181, CO-1713, CO-1714, CO-3158, CO-3360, CO-3362 to CO-3367, CO-3707, CO-3812 to CO-3815, CO-3820 to CO-3825, CO-3911, CO-3919, CO-3920, CO-4016, CO-4300, CO-4308, CO-4366, CO-4367, CO-4371, CO-4452, CO-4457, CO-4460, CO-4503, CO-4850, and Medicaid's VA pair CO-836 and CO-837. The derived quarter total CO-4077, read by no rule since CCCAP moved, went with them, and its stale given in CO-2338-T9.

Every household's and rule test's statement of a retired fact moved to scripts/receipts/retired-facts.yaml (6,395 statements; 215 rule tests in 56 item files), with the receipts unchanged: households re-translated 0, every rule test's receipts and expectations identical. A fact stated both for every month and for some months is kept as `{every_month, <month>: ...}`, so neither statement is lost (phase 1's format kept one). The translator takes each old fact's scope from its RETIRED table, no longer from the ledger. Items whose meaning named a retired fact now name the receipt kind; `nearest` lists drop the retired ids.

## 3. Step 2: kinds of their own for the parts of a receipt (f4c1ce1)

The money the scalar facts stated as a part of another receipt, with no receipt kind of its own, became nine kinds, each with a row in all eight counting tables (LEAP CO-5001, SNAP CO-5010, Adult Financial CO-5016, Colorado Works CO-5650, CCCAP CO-5720, SUN Bucks CO-5730, MAGI CO-5500, SSI method CO-5510), each row citing the program's text or marked counted because no rule excludes it: `adoption_subsidy`, `early_childhood_research_payment`, `board_only_payment`, `room_only_payment`, `savings_account_distribution`, `medicare_premium_refund`, `insurance_cash_value`, `military_allotment` (the part for persons elsewhere its `for_person_living_elsewhere`) and `school_attendance_conditional_benefit` (carved from educational assistance). These are the kinds docs/design-earned-and-resource-records.md 4.1 lists as deferred by phase 2 because they touch every table. The lump-sum amounts designated for the costs of obtaining a lump sum (9 CCR 2503-6 3.605.4.B.33) are a property of the payment, so a field: `designated_for_lump_sum_costs`.

Readers no longer subtract a part stated twice. Medicaid's deeming and Children's Buy-In items (CO-4634, CO-5221, CO-4201) stop subtracting `adoption_subsidy_received`: the SSI table exempts the kind (8.100.5.F.6.t, S4041), so the subtraction the phase-2 Medicaid review names (section 3) is gone. CCCAP's CO-4463 stops subtracting the adoption subsidy and the research payments (its J.10 and J.29 rows). Colorado Works' CO-4369 keeps only rental expenses and the allotment for persons outside the unit; CO-5651 leaves out `spent_on_covered_costs` and `designated_for_lump_sum_costs`; CO-5654 reads the school-conditional kind; CO-4361 reads the board-only and room-only kinds as earned income (3.605.2.E.4.c-d). Colorado Works now excludes an adoption subsidy (3.605.4.B.32, S4040).

Retired with the step: CO-4451, CO-4453, CO-4830, CO-4832, CO-4836, CO-4661, CO-3816, CO-4370, CO-4368, CO-4365. Excerpts S4040-S4042. Open questions OQ-995 (SSI method: savings withdrawals, premium refunds, cash value; 20 CFR 416.1103(c)) and OQ-996 (SNAP: meals-only and room-only payments).

The harness's baseline reads a legacy translation (the new kinds left in the receipt that held them, `translateCase(..., legacy = true)`), since the phase-2 baseline's schema has no such kinds; ten generated variants state each part. The metamorphic split (MA-1) halves the new field too.

## 4. Step 3: the thirty-day wages are split (c913c81)

Decided from the two texts: LEAP's income verification period runs "from the date of application to the same date of the prior month (approximately thirty (30) calendar days)" (9 CCR 2503-7 3.751.1, S2712) and is read for wages only where a job began or ended (3.752.22.C.3); CCCAP's is "the prior thirty (30) day period" for ongoing employment at application and redetermination (8 CCR 1403-1 3.111.H.5.a.1, S891). Not the same window, so not a primitive. Two per-program items would have had identical derivations (both read the neutral thirty-day receipt, CO-3910, less work-study), which the duplicate check refuses, so CO-3912 keeps its id as LEAP's own item, `leap_wages_in_income_verification_period` (3.751.1, 3.752.23.P; OQ-681 on the period), read by `leap_person_wages` (CO-3925), and CCCAP's `cccap_person_earned_income` (CO-3915) states its own thirty days (H.5.a.1) and work-study exclusion (J.16, S2207). The cross-program allowlist drops CO-3912: 2 items and 3 readers held (5 entries), from 8 (docs/reviews/cross-program-audit.md). Harness unchanged.

## 5. Steps 4-6: VA rows, CO-5000's meaning, the translator's header

- **Step 4 (2ba2530).** Each counting table already had a `va_aid_and_attendance` row; each was checked against the fetched text. LEAP's was counted by silence, but 9 CCR 2503-7 3.752.211.E names veteran compensation and pension (D-86, S4043) and 8.100.5.K (S2900) calls Aid and Attendance a portion of the VA's pension payments: now counted, cited (LEAP's readers treat the two alike, so no answer changes). Adult Financial's meaning named no paragraph: now 3.520.785.B.4 (D-80, S4044), less what 3.520.786.F exempts. SUN Bucks' `not_read` states its reason for the kind (292.2, 292.5(a)). SNAP, Colorado Works, CCCAP, MAGI and the SSI method were cited and match their text.
- **Step 5 (a2017df).** CO-5000's meaning names every program that reads the list (CHP+ through Medicaid's MAGI income), says a stated empty list is no unearned money and an unstated one is unknown (decision 4 of 2026-11-23), and its precision names all eight tables, records that the scalar facts are retired and kept only for the harness's translation check, and lists the nine readers that still take one sum over an unknown list as 0 (CO-3701, CO-3827, CO-4023, CO-4361, CO-4363, CO-4369, CO-4412, CO-4518, CO-4930), under review (docs/handoff-2026-11-23.md).
- **Step 6 (6e34343).** scripts/receipts/translate.ts's header describes the end state: every program reads the receipts alone; all 85 old facts are retired (the 83 the translation reads and Medicaid's VA pair); none is in the ledger; no stored household or rule test states one; their earlier statements are in retired-facts.yaml; the transition rule no longer applies. The translation is kept for the harness's baseline evaluation and its translation check, the generated households, and apply.ts's fixed-point check. Comments only.

## 6. Allowed differences (scripts/receipts/allowed-differences.yaml, "Phase 3")

| Class | Households | Rule text |
|---|---|---|
| P3-1 Colorado Works excludes an adoption subsidy | CO-400, CO-401, and the generated adoption-subsidy variant | 9 CCR 2503-6 3.605.4.B.32 (S4040): the subsidized child's income "shall be exempt"; before, it sat in the parent's other non-taxable income, counted by silence |
| P3-2 the SSI method exempts an adoption subsidy for the adoptive parent too | CO-400, CO-401, the generated variant | 10 CCR 2505-10 8.100.5.F.6.t (S4041); before, counted as the parent's other non-taxable income and subtracted only where the parent's income was deemed to the child. The deemed figure and the child's outcomes do not change |
| P3-3 Colorado Works reads a room-only payment as earned income only; does not verify as unearned a part it never counted | CO-206, CO-362; the generated board-only, room-only, savings distribution, cash value and SMIB refund variants | 3.605.2.E.4.c-d (S3159), 3.605.4.B.21, B.30, 3.605.3.B.9; the verification element (3.604.3.B.2.e) asks for income "used to determine eligibility and payment" |
| P3-4 SNAP leaves out an allotment received for persons not in the household | the generated allotment variant | 10 CCR 2506-1 4.405.B (S3100): money received and used for a third-party beneficiary who is not a household member |

No stored household changes an eligibility or benefit outcome under P3-1 to P3-4 other than those listed, each a cited fix.

## 7. Step 7: change impact (0695acc)

`CHECK_BASE=origin/main npm run check` printed 64 stale-disposition lines (53 before steps 4-6; CO-5000's meaning and Adult Financial's VA row moved more fingerprints) and 11 flags were open again. 32 entries reported "no longer flagged" were removed (24 pairs, some recorded in more than one change record); the Colorado Works and CCCAP/SUN Bucks phase-2 records are left with an empty impact list. 32 entries reported "review it again" were re-keyed, reason unchanged, after reading what moved each fingerprint (for CO-303 only CO-2710's meaning; for CO-608, CO-613, CO-616, CO-654, CO-2419, CO-2467, CO-4201, CO-946 and CO-4930 the receipts migration upstream; for CO-4930 also its own meaning). None changes the relation each reason describes. The record is volumes/co/changes/2026-11-23-receipts-3.yaml.

## 8. What remains

- The nine readers that still take one sum over an unstated receipts list as 0 (step 5's list): under review against decision 4. Another fix round owns them; earnings step E0 does not touch their derivations.
- Owner sign-off of every counting-table row marked counted because no rule excludes it (each table's meaning lists them).
- Earned income and resources: docs/design-earned-and-resource-records.md, starting with step E0 (docs/reviews/earnings-e0.md), which also cites the remaining LEAP rows the rule names (pension, unemployment compensation, child support, adoption assistance, dividends and interest; S4100).
