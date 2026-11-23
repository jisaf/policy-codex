# Review: restructure proposal (docs/design-restructure-proposal.md)

Reviewer: independent, read-only. Commit reviewed: `3ea00f8`. Date: 2026-11-23. This file is the only file written.

Read: the proposal, plan-colorado.md (product-owner decisions), conventions.md, operators.md, governance.md, conformance.md, the eight coverage3 reviews (findings and dispositions), the coverage2 verdicts, the stakeholder fact-graph and Corticon reviews, handoff-2026-11-22.md, the sampled items named in the brief, `src/engine/types.ts`, and `volumes/co/tests/cases.yaml`. Counts below come from a script over the item YAML at this commit and over the local `conformance/co/suite.json` (generated 2026-11-22, so slightly behind HEAD).

## 1. Verdict

**Proceed with changes.** Steps 1, 4 and 6 are sound and should start now, with the adjustments below. Step 2 should not start as written. Step 3 and step 5 need a different mechanism than the one proposed.

Three reasons the proposal should not be built as it stands:

1. **The safety net it relies on cannot see the change.** Step 2 says "any household whose answer moves is visible immediately". Of the 139 stored households, 19 state a nonzero "part of" money fact. 92 of the 113 part-of facts are never nonzero in any stored household, and 158 of the 234 supplied money facts are never nonzero. A full green run after step 2 would prove almost nothing about the facts being reshaped.
2. **A flat set of disjoint leaves cannot be disjoint along the dimensions the rules use.** A receipt has a source, a form (recurring or one-time), a date, a frequency and sometimes an earmark. The rules cut on all of them. A taxonomy that partitions on one dimension turns the others back into "part of" facts or into leaf pairs.
3. **Steps 2 to 5 address a little over half of the pass-3 P1s.** The rest come from household composition, time, and fixes that did not reach every reader of the thing they changed. The restructure is itself a 180-item fix round, and fix rounds have been the main source of regressions.

Nothing in the volume carries a status or an approval record, and the repository has no tags, so this is the cheapest moment to restructure. That argues for doing it, not for doing it in the proposed order.

## 2. Top risks, ranked

| # | Severity | Risk | Mitigation |
|---|---|---|---|
| R1 | Critical | Stored cases do not exercise the facts step 2 changes (19 of 139 cases; 92 of 113 part-of facts never nonzero). Also 2,740 of 4,104 rule tests state a derived item as an input, so a test that gives an aggregate keeps passing after the aggregate becomes derived. | Build a differential harness first (section 3, change A). Fail `npm run check` on any test that states an identifier whose kind changed from supplied to derived. |
| R2 | Critical | Fixed leaf taxonomy reproduces dual statement at every intersection (lump sum that is crime-victim compensation; PASS set-aside of SSDI; calendar month against the thirty-day window). 35 part-of facts already name more than one possible parent and 24 leave the parent open ("or the fact that names the source"). | Decide the receipt model by a spike before any migration (change B). |
| R3 | High | About 11 of 25 pass-3 P1s are untouched by steps 2 to 5, and a 180-item rewrite voids every earlier "stays fixed" confirmation. Passes on stable code still found 25 to 31 P1s. | Add a composition and time workstream and a propagation check (changes E, F). Split answer-preserving refactors from answer-changing fixes (change C). |
| R4 | High | Leaves default to 0 when not stated, as part-of facts do today. If aggregates become sums of defaulted leaves, an unstated income is silently zero. That breaks convention rule 12 and the 160 cannot-determine conformance cases. | Keep one required residual leaf per group, or a required completeness fact, that carries the unknown (change B3). |
| R5 | High | "One program at a time" is not possible for program-neutral supplied facts: every program reads them. During migration old aggregates and new leaves coexist, which is dual entry. Translating a stored `other_unearned_income_nontaxable: 300` into a leaf means inventing what the money was. | Migrate facts once for all programs with a mechanical mapping into residual leaves, then migrate each program's readers (change C). |
| R6 | High | Splitting shared derived items per program creates copies that drift, the defect class step 4 exists to remove. "Primitive" is ambiguous: `age`, the proposal's first example, caused P1s N-02 and N2-3 in pass 2. | Three classes, not two, plus a sibling registry (change D). |
| R7 | Medium | Step 3's static check gives false assurance. Verification drifts in conditions (who, when, changed since last certification), not in the list of types. It would have caught 1 of the 3 SNAP verification P1s. | Make it an invariant evaluated on households (change G). |
| R8 | Medium | Step 4's "alternate paths read the main items" is wrong where the rule gives the alternate path a different household, person set or exclusion list. The re-sum lint will flag legitimate second sums. | Parameterise instead of copy; allow a cited exception (change H). |
| R9 | Medium | Probe promotion. The probes exist only in a session scratch directory under /tmp. Some use retired facts, some assert readings the fix round rejected or turned into open questions, and each has hand-derived values for one to three outputs only. | Copy them into the repository today. Promote with sparse expectations and a status (change I). |
| R10 | Medium | Consumers. Suite inputs and identifiers change; open-questions.md references 1,022 distinct item ids; UI tests pin volume counts; item precision text narrates fix history by id. | Tag before starting, publish an old-to-new fact map, move history out of precision (section 5, question 6). |
| R11 | Low | The leaf taxonomy is invented without the CBMS or PEAK income-type list, so it may be reshaped again at fact assembly. | Align leaf names with the PEAK application's income categories where they are public; mark the rest provisional. |

## 3. Recommended changes to the proposal

**A. Add a step 0: a differential harness, before any item changes.**
- A generator that builds households from the 139 stored cases by setting each money fact nonzero in turn, and each pair of facts that the current definitions say can overlap.
- A translation function from old facts to new facts, written once, reviewed as code.
- For every generated household: evaluate old facts on the old ledger and translated facts on the new ledger, and compare every program outcome. This is the dual run the brief asks about, and it is the only check that covers the 92 unexercised facts.
- Add the metamorphic test the reviewers already ran by hand as "control" probes (QZ-1C, Y-3b, PR3-L2): the same money stated under each placement the definitions allow must give the same answer. Run it on today's ledger first. Its failures are the real size of the dual-statement problem.

**B. Re-scope step 2 behind a spike and a decision.**
1. Spike three hard cases in both candidate models before committing: LEAP unearned income (CO-3913, CO-3926, CO-4511, CO-4961, CO-4962, CO-4069), SNAP unearned income (CO-331) and Adult Financial deeming (CO-4720 against CO-3831).
2. Candidate models:
   - *Receipt records.* A list of receipts per person, each with kind, amount, date received, form, frequency and earmarked amounts. This is the shape the rules use ("received in the thirty days", "in the month received", weekly times 4.3, "largest single game"). It needs a new input collection, two or three operators, and a suite schema change.
   - *Scalar partition with anchored overlays.* Leaves partition by source only, with one required residual leaf per group. Every other dimension is an "of which" fact tied to exactly one parent by a machine-readable `part_of` field. `npm run check` verifies part ≤ parent on every case and lints any item that adds a part and its parent, or subtracts two parts of one parent that are not declared disjoint. No engine change.
3. In either model keep the unknown: a required residual leaf (or a completeness fact) per group, so an unstated income source still gives "cannot determine".
4. State what "counting table" is in this engine. There is no operator that sums facts selected by a table. Recommended: the table is an authored field on one item per program (receipt kind to counted, excluded, or a named special-rule item, each with its citation); tooling compiles it to the ordinary expression tree and `npm run check` fails if tree and table disagree. Engine teams keep receiving trees only.
5. My recommendation between the two is the scalar partition now, with leaf names chosen so they can become the `kind` values of a receipt record later. Receipt records are the better model, but they are the largest input change since person-month and the fact-graph reviewer already found per-person-per-month hard to port. If the spike shows the LEAP thirty-day cases cannot be made single-statement with scalars, take receipt records to the product owner as an explicit exception to the engine guardrail.

**C. Sequence the migration so expectations cannot move silently.**
- Tag the commit before starting.
- Fix the open non-MAGI P1s (C3-1 to C3-5) first, as ordinary fixes with hand-derived cases. Holding known wrong answers through a refactor makes every moved expectation ambiguous.
- Every restructure commit is either a refactor (zero expectation changes, differential harness clean) or a fix (answers change, each with a hand derivation). Never both. No re-pinning from engine output in a refactor commit.
- Migrate supplied facts once, for all programs, into leaves plus residuals. Then move each program's readers, one program per commit.

**D. Step 5: three classes and a sibling registry.**
- *Primitive*: supplied facts, published parameters, and derived items that are pure functions with no "as of when" or "who counts" choice inside them.
- *Adopted method*: a definition several programs incorporate by reference (the SSI methodology, MAGI, the federal qualified non-citizen definition). Conventions rules 2 and 15 already allow these. Splitting `ssi_countable_resources_individual` into Medicaid and Adult Financial copies would create drift where both rules cite 20 CFR 416. Each reader cites its incorporating paragraph.
- *Program calculation*: never shared.
- When a shared item is split, each copy records its siblings. A change to one lists the others in the check output for an explicit "reviewed, differs because" or "reviewed, same change applied".

**E. Add a propagation check for fix rounds.** When an item changes, list the untouched items that cite the same excerpt, read the same supplied facts, or read the changed item's inputs under another person. The fix author acknowledges each. This targets the largest single mechanism in pass 3 (section 4, question 1).

**F. Add a composition and time workstream.** Six pass-3 P1s are about who is in the unit when, or which date a test uses. See question 1.

**G. Step 3 as an evaluated invariant.** For every stored and generated household, person and month: if the program counts a receipt kind above zero, then either the verification item requires it or a named, cited exemption item is true. Exemptions are items, not a list of types.

**H. Step 4: parameterise, and allow cited exceptions.** See question 4.

**I. Step 1: promote probes with care.** See question 5.

## 4. Answers to the questions

### Question 1. Does the diagnosis hold?

Partly. The four causes are real and the measured counts reproduce (113 of 234 supplied money facts say "part of" in their precision; 60 derived items in `shared/`; 72 derived items read a part-of fact). But they are not the main causes of the P1s taken together. My classification of the 25 pass-3 P1s:

| Mechanism | P1s | Count | Proposal step |
|---|---|---|---|
| Copy of a path missed a fix, or two gates disagree | AF H-1, H-2; MAGI C3-02, C3-03; non-MAGI C3-2, C3-3, C3-4 | 7 | 4 |
| Overlapping statement of money or resources | LEAP F3-1, F3-2; SNAP C3-5; partly CW3-1 | 3 to 4 | 2 |
| Verification drifted from counting | SNAP C3-1, C3-2; C3-3 only if expenses are included | 2 to 3 | 3 |
| Household composition or living arrangement | CCCAP C3-1, C3-2; MAGI C3-04; non-MAGI C3-1 | 4 | none |
| Dates, proration, pay frequency | CW3-3; SNAP C3-4 | 2 | none |
| A changed status or classification not followed to its readers | CW3-2; SNAP N3-1, N3-2 | 3 | none |
| Reading of the rule text | MAGI C3-01; non-MAGI C3-5 | 2 | none |

So step 2, the largest and riskiest step, addresses 3 or 4 of 25. Step 4 addresses 7. Eleven are outside steps 2 to 5. Pass 2 looks the same: most of its P1s were living-arrangement and age-in-month errors (AF G-2, G-3, G-5; CW2-1, CW2-2; MAGI N-02, N-03; non-MAGI N2-3) or paragraphs never mapped.

What the proposal misses:

- **Incomplete propagation is the common root.** Ten of the 25 are a fix or a classification that reached one reader and not its siblings. Duplicate paths are one form of it. The cure is a check at fix time (change E), not only a structure.
- **Time.** Facts are per calendar month; rules ask about the thirty days before application, the month received, the month after a spouse leaves, the pay schedule. The volume answers with second facts for the same money (`lump_sum_received` and `lump_sum_received_prior_thirty_days`) and fallback arithmetic between them (CO-4069, CO-4962). That is dual statement along the time axis, and the proposal does not mention it. `age` is computed once on the determination date and reused in every month, which caused N-02 and N2-3.
- **Composition changes within a period.** The model makes one determination at a time. Mid-period joiners, involuntary absence and the month of institutionalisation each needed a new case-record fact.
- **The language has no parameterised definition.** A derived item takes no arguments. Family Planning needs the MAGI income test with a different household size, deeming needs the client's income rule applied to another person with a different list, and annualised income needs the same sum over a different period. Authors copy the tree because they cannot call it. Step 4 forbids the copies without supplying the alternative.
- **Parallel fix tracks.** CCCAP C3-4 and C3-5 record duplicate neutral facts created "a few hours" apart by two tracks. Step 5 will add more parallel per-program work on the same supplied facts. One owner should approve every new supplied fact.
- **Test design beyond probes.** Rule tests that override derived inputs (2,740 of them) are useful for engine bring-up and blind as regression tests. Step 6 is right; it should also say that a fix's household test must state supplied facts only.

### Question 2. Is step 2 achievable without list-valued facts?

Achievable as a partition by source; not achievable as "one record per dollar".

- The current facts already partition by source and tax status (the named sources plus two "other" buckets). The 113 part-of facts are the other dimensions laid over that partition: form (lump sum), earmark (PASS), purpose (expense part of a workers' compensation award), window (prior thirty days), and still-held (the resource side of a receipt).
- A disjoint leaf must choose one slot per dollar. A one-time crime-victim payment is both `crime_victim_compensation_received` and `lump_sum_received`. Either the taxonomy adds the cross product (each excluded source in a recurring and a one-time leaf, each again by window), or it keeps an overlay. CO-4960 (`named_source_receipts_in_lump_sum_prior_thirty_days`) is what the cross product looks like in practice, and CO-4962's own precision says "the overlap is forced".
- PASS is an earmark on any income, earned or unearned. With disjoint leaves, SSDI splits into set-aside and not set-aside, and so does every other source.
- Resources have the same shape: leaves by asset type, exclusions by the source of the money held (SNAP C3-5, the `_held_value` facts).

So yes, a fixed taxonomy reproduces the dual-entry problem in another form unless the overlays are made explicit and checked. The receipt model is in change B. On the engine question: scalar partition with anchored overlays needs no engine change, only check tooling. Receipt records need a new collection and operators. That can be squared with the test-harness decision, because the rule text needs it and it is a fact model, not intake or live calculation, but it changes the suite schema and every adapter, and it needs the product owner's explicit decision and a word from the three engine reviewers. A nested per-person collection is a known problem for the Direct File style fact graph; a top-level receipts collection with an owner reference is how that engine models W-2s.

### Question 3. Where does verification legitimately differ from counting?

A single table plus a type-level exemption list gets these wrong:

- **Aggregate verification.** MAGI and CHP+ test attested total income against a data source under reasonable compatibility. Nothing is verified per receipt kind. A per-kind check would need dozens of empty exemptions or would push a false structure onto the rule. MAGI C3-03 was about which standard the comparison uses.
- **Excluded but verified.** Income is often verified in order to be excluded (a bona fide loan, educational assistance, a PASS). SNAP verifies exempt income "only if questionable".
- **Counted but not verified from the client.** Benefits the agency already knows (SSI and Title II through the SSA interface, the program's own grant, Colorado Works income for Colorado Works Child Care).
- **Different person.** Deemed income of a sponsor, spouse or parent is counted to the client and verified from someone outside the unit.
- **Different time.** SNAP recertification verifies only income whose source changed or whose amount moved by more than $50. That compares two certifications per source; SNAP C3-2 was this.
- **Things that are not receipts.** Zero income, termination of employment, shelter and medical expenses, costs netted from rent or self-employment. SNAP C3-3 was an expense. The table as proposed covers receipts only; extend it to deductions or say that it does not cover them.
- **Gross against net.** Verification is of the gross amount and the payer; counting may be net of costs.

The invariant in change G handles each of these because the exemption is a condition, not a type.

### Question 4. Steps 4 and 5: where is the line, and what breaks?

Ambiguous items among the 60 in `shared/`:

| Item | Why it is not clearly primitive |
|---|---|
| `age` | Fixed to the determination date. Programs differ on the date and on whether the birthday month counts. Prefer no shared derived age; each rule writes years between the birth date and the date its text names. |
| `is_married`, `lives_with_spouse` | Legal marriage only. SSI-method and SNAP rules also treat couples holding themselves out as married. |
| `lives_with` | Primitive as co-residence from `dwelling_id`; temporary absence is each program's. Keep, and say so. |
| `is_colorado_resident` | Read by seven programs. The meaning says "intends to remain", which is not every program's test. |
| `is_qualified_non_citizen`, `has_held_qualified_status_five_years` | A federal definition adopted by reference: the adopted-method class. |
| `ssi_countable_resources_*`, `ssi_in_kind_support_and_maintenance` | Complex, but one method two programs incorporate. Adopted method, not split. |
| `unearned_income_is_verified`, `age_is_verified`, `resources_are_verified`, `has_earned_income` | Each encodes what "verified" or "earned" means across programs. `has_earned_income` omits in-kind pay and training allowances that some programs count as earned. Program calculation. |
| `resides_in_medical_institution`, `is_inmate_of_public_institution` | Setting facts with program-specific exceptions. |
| `unearned_income_prior_thirty_days`, `wages_gross_prior_thirty_days` | The month-to-window fallback is fact assembly, not policy. Splitting it per program duplicates a heuristic. Make the window figure supplied, or solve it with receipt dates. |
| Poverty-guideline lookups | The table is a published figure. The household size, the guideline year in force for the program, and the monthly conversion and rounding are program choices. With no parameterised items, each program inlines the arithmetic, and eight copies can round differently. |
| Relationship roles | Supplied, but "parent" excludes stepparents by declaration, which caused MAGI C3-04. A primitive can still be misread. |

What breaks on splitting: more copies and so more propagation failures, unless siblings are registered (change D); more items for the engine teams (the handoff sheet is already about 1 MB); and approval routing changes, because an `All` item needs four owners and a program copy needs one.

On step 4: reading the main items is right where the rule says "the same income". It is wrong where the rule differs on purpose: Family Planning's household is one larger; the long-term-care 300% test is gross by its own paragraph; SSI deeming applies a different exclusion list to the ineligible spouse than to the client; main items often return 0 or unknown for a non-member, which is the wrong answer when read for a sponsor outside the unit. Recommended: a build-time template (a tree with named slots for the person set, the period and the counting column, expanded into ordinary trees before export, so no new operator), and a cited `differs_from` acknowledgement to silence the re-sum lint where the rule requires a second sum.

### Question 5. Migration risk and sequencing

How expectations go silently wrong:

- A case's facts are translated by guess (which leaf was the $300 of "other" income?). Programs treat the candidates differently, so the case now tests an invented household.
- An expectation moves and is re-pinned from engine output with a plausible explanation. The handoff note describes re-pinning as routine for UI counts, and the conformance suite records the engine's own evaluation as the expected value.
- A rule test gives an aggregate that is now derived. The stated value replaces the rule and the test passes.
- A leaf not stated defaults to 0, so a case that used to be "cannot determine" becomes a confident answer.
- A probe is promoted with the reviewer's reading for one output and engine output for the rest, and the engine output is later taken as reviewed.

Sequence: step 0 harness (A); copy probes into the repository; fix the open P1s; tag; steps 1, 6, E and 4; the receipt-model spike and decision; fact migration for all programs at once into leaves and residuals with the differential run clean; then program readers one at a time; then step 3's invariant and step 5's classification; then light reviews and the full pass. Run at most the four concurrent tracks the handoff note says the machine can carry.

On probes: copy the scratch files into the repository now, since /tmp can be cleared. Promote each with only its hand-derived assertions, a pointer to the finding, and a status (confirmed by the fix, superseded, or open question). Probes that state retired facts need restating; that restatement is a translation and gets the same review. Consider a "base case plus differences" form for cases, expanded at export, because 185 more full households would roughly double a 33,600-line file that already needs a custom three-way merge.

### Question 6. Consumers

- **Conformance suite and engine teams.** Inputs change shape and supplied identifiers are retired, so every adapter mapping breaks once. Publish a machine-readable old-to-new fact map with the restructure, and tag the last pre-restructure commit so a team can pin to it. If receipt records are adopted, `SuiteCase` gains a collection and docs/conformance.md and docs/operators.md change in the same commit. The cannot-determine cases need a new rule for which fact is removed. The stakeholder estimates (Drools, Corticon, fact graph) were made against the current shape and item count.
- **Handoff.** Retired items are deleted from disk today. Keep a retirement record (id, successor) in the volume so an engineer or an open question that cites CO-4454 can be resolved without git archaeology.
- **UI.** Tests under test/ui pin volume counts and will all move; treat their re-pin as its own commit. Item pages render precision text that narrates fix history by item id; after the restructure much of it describes facts that no longer exist. Move history to the rationale or to docs/colorado-notes.md during the migration.
- **Open questions.** open-questions.md references 1,022 distinct item ids. Add a check that every id it cites exists or has a retirement record.
- **Approvals.** No item has a status or approval record, so nothing signed is invalidated. Routing changes when `All` items become program items; tell the owners before, not after.

### Question 7. A smaller change with most of the benefit

Yes. In order of yield per unit of risk:

1. Store every probe, and require a supplied-facts-only household test with every fix (steps 1 and 6).
2. The propagation check at fix time (change E). Aims at 10 of 25.
3. Step 4, with templates and cited exceptions. Aims at 7 of those 10, structurally rather than by review.
4. Machine-readable `part_of` on the existing facts, the part ≤ parent case check, the double-count lint, and the metamorphic restatement test. Aims at the same 3 or 4 that step 2 does, without changing any fact's shape, and tells you by measurement whether the full reshaping is still needed.
5. One owner for new supplied facts across parallel tracks.
6. Replace the shared `age` with dated comparisons, and write down each program's rule for mid-period composition changes. Aims at the 6 composition and date P1s.

Together these aim at roughly 20 of the 25 pass-3 P1s (10, 3 or 4, and 6). The full step 2 adds nothing to that number; its value is in making future receipt rules cheaper to state, which is worth having but is not what stands between the volume and the stopping rule.

## 5. What I did not verify

- I classified pass-3 P1s from the review files' own descriptions; I did not re-run the probes.
- I did not read every item in `shared/` or audit the 55 cross-program derived reads I counted (the proposal says 32; the difference is probably reads already listed in `accepts_from`, which I did not subtract).
- The suite counts are from a suite file generated one day before HEAD.
- The "aims at" figures say which findings a measure targets, not that it would certainly have prevented them.
