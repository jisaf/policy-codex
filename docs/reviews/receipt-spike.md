# Receipt spike: receipt records or a scalar partition

Time-boxed spike, step 3 of the plan the product owner approved on 2026-11-23 (docs/plan-colorado.md, last section; docs/reviews/restructure-proposal-review.md, change B; docs/reviews/revised-plan-review.md, change 3). Branch `spike/receipt-models`, from `a8b4317`. Prototypes, harness and raw results are in `prototypes/receipt-spike/` (kept for the record, not part of the codex; the spike's engine and operator-doc changes are saved as `prototypes/receipt-spike/engine-and-docs.patch`, not applied). Three slices only: LEAP unearned income (CO-3926, CO-3913, CO-4069, CO-4511, CO-4961, CO-4962), SNAP unearned income (CO-331, CO-2338, CO-2339, CO-4330) and Adult Financial deeming (CO-4720, CO-2384, CO-2386 through CO-3831 and CO-2343). Earned income, resources and the 68 readers outside the slices were not touched.

## 1. Recommendation

**Adopt Model A (receipt records) for unearned income, as an explicit, recorded exception to the engine guardrail, on four conditions (section 9). Reject Model B.**

The deciding evidence:

1. **Model B regresses where the rules cut on form, and no check can see it.** A partition by source has no "paid once" for a named source. SNAP then counts a one-time foster care, kinship, diversion, housing allowance, G.I. Bill, refugee, supportive services or claim-expense payment that 4.405.E excludes as a nonrecurring lump sum: 2 probe households (CO-374, PR3-L4) and 40 generated households give a wrong SNAP figure under B and the right one under A. The only repair inside B is a "one-time" leaf per source plus its window twin, which is today's overlap again.
2. **Model B cannot state some households at all.** A $2,000 one-time child support arrears payment received on October 25, inside the income verification period of a November 10 LEAP application, counts under 3.752.21 and 3.752.22.A. B's only place for it is `child_support_received` for October, which LEAP reads for November: household income 2,000 where the rule gives 4,000 (family F2). The review set exactly this as the test: "If the spike shows the LEAP thirty-day cases cannot be made single-statement with scalars, take receipt records to the product owner as an explicit exception to the engine guardrail."
3. **Model A gave no answer the harness could not explain except one translation ambiguity** (a retroactive "SSI or public assistance" lump sum, which today's fact CO-3920 does not split; section 4), reproduced every one of the 158 translated probe households exactly, and passed all four metamorphic relations on 449 households with no violation.
4. **Model A removes the placement heuristics instead of checking them.** CO-4961, CO-4962, CO-4960 and the month-to-window fallbacks disappear; the LEAP slice reads 2 supplied facts instead of 40 and carries no reader-supplied default (45 today).

Model A's costs are real and are the engine teams' (section 6): a list-of-records input, three operators, a record schema with declared defaults, a suite schema change, and a fact-graph port that needs a filter binding it does not have today.

Whatever is decided, three defects in today's ledger turned up and should be fixed now (section 4, classes 3 to 5).

## 2. What was built

| | Model A: receipt records | Model B: scalar partition |
|---|---|---|
| Input | `receipts` (CO-9900): per person, a list of records `{kind, amount, month?, date?, frequency=monthly, per_payment?, retroactive=false, irregular=false, hours_served?, earmarks=0}`; 43 kinds; field defaults declared once on the schema (`record_fields`) | Two required residual leaves (CO-9951, CO-9952), a one-time residual leaf (CO-9953) and its window (CO-9954); every named source a leaf with `default: 0`; 12 overlays and 2 window parts, each with exactly one `part_of`; 2 window facts (`window_of`); a group sum `gross_unearned_income` read only by the check |
| Counting | One table per program (`leap_`, `snap_`, `af_receipt_treatment_table`): kind → counted / excluded / named special rule, with the paragraph of each exclusion | Each program's item adds the leaves it counts and lists the leaves it leaves out (`excludes`) |
| Engine | `sum_receipts` (P55), `receipt` (P56), `received_in` (P57); a missing record field reported as `receipts[i kind].field`; 132 lines in `src/engine` (evaluate, check, render, types, yaml) | None (item metadata keys only) |
| Checking | Table lookup miss is unknown and reported; a kind with no row is never counted | `check-b.ts`: part ≤ parent per case, window ≤ months, double-count and counting-coverage lint, reader default = declared default |
| Items, LEAP | 8 (CO-3926 and five named parts, the table, the period start) replace 6 derived items and 9 thirty-day and placement facts (CO-3911, CO-4065 to CO-4068, CO-4507 to CO-4509, CO-4960) | 1 (CO-3926) replaces 6 derived items and 5 of those facts (CO-3911, CO-4067, CO-4068, CO-4508, CO-4960); CO-4066 becomes CO-9954 |
| Items, SNAP | 6 (CO-331, CO-2338, three special rules, the table) replace CO-331, CO-2339 and the 3 periodic facts | 1 (CO-331) replaces CO-331 and CO-2339 |
| Items, AF | 4 (CO-3831, CO-4720, one shared counted figure, the table) replace 3 | 3 (CO-3831, CO-4720, one shared figure) replace 3 |

Both models keep today's scalar facts in the translated households, so every item outside the slices reads what it read before. No item outside LEAP, SNAP and Adult Financial reads a rewritten item (checked on the dependency graph, `readers.ts`), and the SUN Bucks outcomes, which follow SNAP, did not move in the harness.

## 3. Evidence table

| Measure | Today | Model A | Model B |
|---|---|---|---|
| Harness, 139 stored households: values that differ / of them regressions | n/a | 5 / 0 | 5 / 0 |
| Harness, 158 translated probes (hand-derived expectations): values that differ / regressions | n/a | 0 / 0 | 2 / 2 (CO-374) |
| Harness, 289 raw probe-pool households: values that differ / regressions | n/a | 9 / 0 | 11 / 2 (PR3-L4) |
| Harness, 336 generated households: households that differ / with a regression | n/a | 61 / 3 (one translation ambiguity, section 4 class 6) | 66 / 40 |
| Metamorphic relations over every translated household | MO-1: 0 of 28 | MA-1 to MA-4: 0 of 449 each | MB-1: 0 of 13 |
| F1: one-time crime victim payment, every permitted statement | SNAP 0 instead of 900 when stated as CO-4960 says it is | right in all 3 statements | right in its one statement; a mis-statement (5,900) passes every check |
| F2: one-time child support in the LEAP period | right only as `lump_sum_received` | right | cannot be stated (2,000 for 4,000) |
| F3: two incomes paid other than monthly (SNAP) | 730 (one per person) | 529.9999 (rule) | 730 |
| LEAP slice: supplied facts read / `otherwise` on a supplied fact | 40 / 45 | 2 / 0 | 30 / 21 |
| SNAP slice | 39 / 29 | 3 / 2 | 39 / 30 |
| AF slice | 30 / 25 | 3 / 3 | 30 / 23 |
| Tree nodes, LEAP / SNAP / AF | 336 / 324 / 183 | 298 / 461 / 139 | 181 / 320 / 166 |
| "Cannot determine" for an unstated income | names the residual among ~40 defaulted facts | names `receipts[0 other_nontaxable].amount` | names the residual among ~30 defaulted leaves |
| Engine change | n/a | 3 operators, record input, schema defaults, trace naming | none |
| Suite schema change | n/a | yes (a fact whose value is a list of records) | no (new identifiers) |
| Readers to migrate beyond the slices | n/a | 68 items | 68 items |

(`otherwise` counts in B are each checked against the fact's one declared default; in A the record schema supplies them. The two left in A's SNAP slice and three in AF read scalar facts outside the receipt model: expenses, destitute-household income, refused income.)

## 4. The old-versus-new harness

`prototypes/receipt-spike/harness.ts` evaluates every LEAP, SNAP, Adult Financial and SUN Bucks outcome, the slice items and every identifier a case expects, for every person and every month a case names, on today's ledger with today's facts and on each model's ledger with the translated facts (`translate.ts`). Sources: the 139 stored households; the 158 probe households translated by the probe-preservation round, with hand-derived expectations (`probe-inv/out-*.yaml`; not yet on origin, read from the session scratchpad); the 289 raw reviewer households (`probe-inv/pool.yaml`); and 336 generated households (`generate.ts`: five bases, CO-224 LEAP, CO-155 SNAP, CO-196 client and spouse, CO-94 sponsor, each varied by one money fact or one overlapping pair, plus six LEAP period households). 195,438 values compared per model. Full output: `results/harness.txt`; grouped: `results/harness-classes.txt`.

Every difference, by class:

| # | Class | A | B | Explanation |
|---|---|---|---|---|
| 1 | LEAP "cannot determine" becomes an answer for a one-time receipt LEAP excludes (crime victim compensation, foster care, kinship, diversion, reverse mortgage, housing allowance, G.I. Bill, refugee, supportive services, retroactive SS, retroactive SSI/PA) stated with no thirty-day fact | 55 households | 55 (+5 claim expense) | **Fixed.** Today CO-4069 needs the thirty-day facts before it can place any lump sum, even one 3.752.23.G, U, W-AA, FF or EE excludes on every date. Both models exclude by source first, so the date is not asked for. |
| 2 | AmeriCorps payments with the service hours not stated: LEAP outcome becomes "cannot determine" (CO-155, 5 generated) | 6 | 6 | **Intended**, decision 4 of 2026-11-23: CO-4511 counted the payments when the hours were unstated, a default no rule gives (3.752.23.F needs the hourly rate). |
| 3 | SNAP unearned income 0 instead of 900: a one-time crime victim payment stated, as CO-4960 says it must be, both as `crime_victim_compensation_received` and as `lump_sum_received`; CO-2339 subtracts both, wiping out $900 of child support (stored CO-225, pool PR3-L3) | 2 | 2 | **Fixed. New finding (P1, SNAP):** the SNAP twin of LEAP coverage-3 F3-2, never fixed for SNAP. Family F1 reproduces it. |
| 4 | An inheritance stated only as `lump_sum_received` (pool PR-LUMP): AF countable income 580 and an OAP grant of $452 become 5,580 and category none; SNAP 0 becomes 600 | 1 | 1 | **Fixed:** coverage-adult-financial F-12, whose hand answer is 5,580 and none. Today's fix made `lump_sum_received` "part of" the other-unearned facts, so a lump sum entered without restating it in its parent is ignored by AF and subtracted from Social Security by SNAP. Nothing reports the part exceeding its parent (check-b found 2 such households). |
| 5 | A one-time crime victim payment received in the month before a LEAP application, inside the period: LEAP household income 5,000 (ineligible) becomes 2,000 (eligible) | 1 | 1 | **Fixed:** the limit CO-4962's precision records (F3-2 residual): when CO-4960 is not stated, the placement reads only the application month, so an excluded payment of the month before is counted as an unnamed lump sum. |
| 6 | A retroactive "SSI or public assistance" lump sum: AF unearned income other than SSI 300 becomes 0 (OAP grant 742 becomes 1,032) | 3 | 0 | **Regression in A's prototype, from the translation.** CO-3920 names two sources; the translation chose kind `ssi`, which AF's table counts separately, and AF still reads SSI from the scalar `ssi_income` (af_countable_income, outside the slice), so the receipt falls between them. Fix: split the fact into two kinds and have the AF owner state the treatment of a retroactive SSI award (3.520.785.B.1.a against 20 CFR 416.1124 as K incorporates it). |
| 7 | SNAP counts a one-time payment of a named source SNAP counts when recurring (refugee, foster care, kinship, diversion, housing allowance, G.I. Bill, supportive services, claim expense): CO-374, PR3-L4 and 40 generated households | 0 | 42 | **Regression in B, structural.** 4.405.E excludes a nonrecurring lump sum whatever its source; the partition has no form dimension for named sources. |

The translation inherits today's placement heuristics where the old facts force one (a named receipt and a lump sum in the same month overlap as far as the lump sum reaches, CO-4962; `named_source_receipts_in_lump_sum_prior_thirty_days` caps it), so the harness measures the models, not a re-reading of old households. It also records where today's facts state the same money twice along the time axis: the two stored households that state `unearned_income_received_prior_thirty_days` (CO-125, CO-135) state the month's figure again; both models read the month's recurring receipts (3.752.22.A's "not to exceed one month's income").

## 5. Metamorphic tests

`metamorphic.ts`; results in `results/metamorphic.md`.

Property relations, over every translated household (stored, probes, generated), on the eleven slice outcomes:

- **MA-1 split** (A): a receipt split into two records with the same fields, the amounts, earmarks and per-payment amounts summing to the original, gives the same outcomes. *Policy says not invariant* for SNAP's substantial lottery winnings ("a single game", 4.403.I), so lottery receipts are left out of the relation. 0 violations in 449 households.
- **MA-2 order** (A): reversed record order. 0 of 449.
- **MA-3 month** (A): a receipt stated for every month and the same receipt stated for the month evaluated, in that month. *Not invariant by design* for receipts read in other months (irregular and charitable receipts summed over the SNAP quarter, one-time receipts over the LEAP period), which are left out. 0 of 449.
- **MA-4 / MB-1 / MO-1 residual**: taxable residual moved into the nontaxable residual. *Invariant* for LEAP, SNAP and Adult Financial; *not* for MAGI (not in the slices). 0 of 449, 0 of 13, 0 of 28.
- **Not invariant, as policy says:** a one-time receipt moved across the LEAP period boundary (counted inside, not outside); a one-time receipt stated by month only when its month overlaps the period (cannot determine, until the date is stated); a kind relabelled from an excluded source to an unnamed one (different money).

Families with the rule's answer (all evaluated):

- **F1**, $900 child support and a $3,000 one-time crime victim payment on November 3: today gives SNAP 0 for two of its three permitted statements (the double subtraction of class 3), and 2,000/0/0 when the part is stated without raising its parent; A gives the rule's 2,900/900/900 for all three of its statements (dated, month only, frequency left at its default); B gives the rule for its one statement, and 5,900/900/3,900 for the forbidden statement as an unnamed one-time payment, which every B check accepts.
- **F2**, $2,000 one-time child support on October 25 (LEAP period): today right only as a lump sum; A right; B 2,000 for 4,000, with no correct statement available.
- **F3**, weekly unemployment $100 (five payments) and a $300 quarterly dividend: SNAP 529.9999 under A (4.402.A.2 for each); 730 today and under B, whose periodic facts allow one such income per person (CO-4330).
- **F4**, $100 of $300 set aside under a PASS, the $300 being Social Security or a pension: the same in all three models.

## 6. What an engine team must implement

**Model A.** One more input shape and three operators, documented in docs/operators.md ("Receipt records", spike draft) with the rule text that needs each:
- **Drools:** a `Receipt(person, kind, amount, month, date, frequency, ...)` fact per record; each sum is an `accumulate(... sum(...))` with the condition as the pattern; the counting table is a lookup fact or rule rows. Unknown fields need the review's `Tri` treatment field by field (receipts need a `ReceiptsStated(person)` marker, as the review's `RelsStated` does for relationships, so an unstated list is not read as none). Fits the Drools review's generic-fact design.
- **Corticon:** a `Receipt` entity associated to `Person`; `->sum` over the association with a filter; the counting table is a rulesheet whose rows are the kinds, which is how a Corticon author would write it. The review's open VERIFY items on `->sum` over an empty association and null guards apply unchanged.
- **Fact graph (Direct File, fact_graph):** a top-level `/receipts/*` collection with an owner reference, the W-2 shape. A per-person sum needs a filter comparing each receipt's owner with the person being evaluated: the binding for the outer item in `Filter` that stakeholder-factgraph lists as missing. Without it the adapter must group receipts per person before the graph sees them. This is the largest engine cost of A.
- **Conformance:** `SuiteCase.persons[].facts.receipts` is a list of records (a new value shape); `ledger.json` must export `record_fields`; `missing` entries name `receipts[i kind].field`; the cannot-determine generator must learn to remove a record field or the list.

**Model B.** No new operator. Adapters remap identifiers; `part_of`, `window_of` and `default` go into ledger.json as information; `otherwise` stays as today.

## 7. Readability for a policy owner

`results/readability.md` holds the pattern English of every item of every slice in each model, as the app renders it.

Could a LEAP owner check the slice against 3.752.21-23?
- **Today:** six items, and the owner must follow CO-4962's "a part not stated is taken from the month's facts ... as far as the month's lump sum reaches"; the revised-plan review already judged it uncheckable against the rule.
- **Model A:** yes, in two steps. The table is the rule: one row per kind with 3.752.23's letter in the meaning, and the five named parts of CO-3926 follow 3.752.21.I, 3.752.211.H, 3.752.22.A, 3.752.23.DD and 3.752.211.D one paragraph each. The weak spot is the period test in CO-9916 (the month-only fallback), which is input handling an owner should not have to read, and the repeated receipt conditions: there are no per-receipt derived items, so "recurring and received in the month" is written in each sum.
- **Model B:** yes for the counted list (a flat sum of 20 leaves plus `excludes` with the letters); the owner cannot see from the item that a one-time named payment is mishandled, because the gap is in the partition, not in the rule.

SNAP under A is larger than today (461 nodes, against 324), because the quarter arithmetic of A and A.10 is written over receipts; it reads 3 supplied facts instead of 39.

## 8. "Cannot determine" for missing income

Decision 4 of 2026-11-23: missing information means cannot determine unless the rule gives a default; each fact states it once.
- **A:** the `receipts` list is required; a stated empty list is "no unearned income". Kind and amount are required on each record; frequency defaults to monthly, month to "every month", earmarks to 0, each declared once on the schema and applied by the engine; date, per-payment amount and service hours have no default, so a rule that needs one cannot determine. With the 13-line trace extension, the missing list names the record and field (`receipts[0 other_one_time].date` for an undated October inheritance). Readers carry no default for income at all.
- **B:** the residual leaves are required; named leaves default to 0 on the fact; the check confirms each reader's `otherwise` equals the declared default. Running it on B's own rewrite found 6 reader-invented defaults on facts outside the partition (offsetting expenses, refused income, earned irregular income, destitute-household income): decision 4 reaches beyond money.
- **Today:** the missing list for an unstated other-unearned income names it among about 40 defaulted part facts, every one of which the evaluation asked for.

## 9. Adoption: conditions and cost

Conditions for adopting A:
1. **Product-owner exception to the engine guardrail**, recorded in plan-colorado.md, with P55-P57 justified by the rule text in docs/operators.md (draft written on this branch) and a word from the three engine reviewers, the fact-graph one first (the outer-item filter binding).
2. **Split the ambiguous facts into kinds before migration** (CO-3920 SSI versus public assistance; the part-of facts whose parent is "or the fact that names the source", 24 by the restructure review's count), and have each program owner sign its counting table row by row: the tables expose what is counted by silence today (Adult Financial counts loans and reimbursements because CO-2343 does not list them).
3. **Migrate earned income and resources with the same record**, or decide explicitly not to: the review's lump-sum, PASS and in-kind findings cross into both.
4. **Keep the harness as the merge gate**: every migration commit runs it on stored, probe and generated households with zero unexplained differences.

Cost beyond the slices (`migration.ts`):
- 65 supplied unearned-income facts reshaped; 68 derived items read them (Medicaid 21, Adult Financial 16, Colorado Works 11, LEAP 7, CCCAP 5, SNAP 4, shared 3, SUN Bucks 1). Both models rewrite the same 68; A also retires the scalars once the last reader moves.
- 136 of 139 stored households and 380 of 4,104 rule tests state one of these facts; `translate.ts` restates them mechanically, and its notes list each household where today's facts state the same money twice.
- Engine: about 130 lines in the reference evaluator (done here), the operators and schema in docs, the suite schema, and one adapter change per engine team.
- B's would-be cost, for comparison: no engine work, a 170-line check, metadata on 47 facts, and the unresolved form gap, whose fix (a one-time leaf and a window leaf per named source) reintroduces the overlap the restructure set out to remove.

## 10. Not done in the time box

Earned income and resources; the 68 readers outside the slices (CCCAP still reads CO-3913); per-receipt derived items; a fact-graph or Drools adapter for receipts; the split of CO-3920; a conformance-suite build with receipts; promotion of the generated households to stored cases. The harness reads the probe households from the session scratchpad because they are not yet on origin (`--probes` points elsewhere).
