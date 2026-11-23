# Independent review: docs/restructure-revised-plan.md

Reviewed 2026-11-23 at b121b4c. Read: the plan, README, plan-colorado.md, conventions.md, operators.md, governance.md, conformance.md, handoff/co.md, volumes/co (items, volume.yaml, tests/cases.yaml, open-questions.md, sources.md), conformance/known-failures.json, the eight coverage3 reviews and the three implementer stakeholder reviews. Not read, by instruction: restructure-proposal-review.md and design-restructure-proposal.md.

## Verdict

**Proceed with changes.** The plan is a sound regression-control plan: it will stop fixes from breaking neighbours and stop parallel paths from drifting. It is not yet a plan that drives wrong answers toward zero, and it does nothing to move the codex toward being an *approved* definition. Three things need to change before it runs:

1. Decide the supplied-money representation now, while nothing is approved, instead of after the exhaustive reviews.
2. Add systematic test generation and a measure of how good the tests and reviews are, so "a fresh pass finds nothing" is evidence and not luck.
3. Bring policy owners and an outside source of truth into the loop. Today the author, the reviewer and the test expectation all come from the same kind of reading of the same text.

## What I found in the codex that bears on the plan

| Fact | Count | Why it matters |
|---|---|---|
| Items with any status other than Draft | 0 of about 2,200 | No approval can be invalidated today; that window closes at the first sign-off |
| Supplied facts | 811 | The input contract an engine team and an intake team must fill |
| Supplied facts whose text says they are "part of" another fact | 147 | The overlap the plan's step 5 keeps |
| Supplied facts whose text says "if not stated, every program reads it as 0" | 160 | Conflicts with the plan's "never a silent zero" unless scoped |
| `otherwise <fact>, 0` in derivations | 396 uses in 101 items | The default lives in each reader, not on the fact |
| Stored households | 139 | Plan adds about 185 probes |
| Open questions classed state policy choice / needs Legal / blocked on a document | 90 / 14 / 26 | Each is an assumption in force that no review counts as wrong |
| Entries in known-failures.json | 0 | Step 1 will populate it for the first time |

One item shows the cost of the current representation better than any count. `leap_excluded_receipts_in_lump_sum` (CO-4962), written to fix coverage3 F3-2, infers where an excluded payment "sits" when the case states it in two overlapping facts: "a part not stated is taken from the month's facts ... as far as the month's lump sum reaches ... the overlap is forced". That is a data-placement heuristic, not a paragraph of 9 CCR 2503-7. A LEAP policy owner cannot check it against the rule, and an engine team must reproduce it exactly to pass the suite.

## 1. Fit to purpose

**Serves the purpose:**
- Steps 1 and 2 (every probe kept, fixes shipped with a whole-household case, refactor and fix in separate commits) are the right response to "half of each pass's findings came from the last pass's fixes".
- Step 4 (alternate paths read the main path) removes the commonest finding. The Adult Financial deeming P1s (H-1, H-2) and MAGI C3-02 are exactly this.
- Step 6's declared cross-program reads give implementers a dependency list between programs they do not have today.

**Serves the harness more than the definition or the implementer:**
- **Step 5 keeps the overlap and adds machinery around it.** `part_of` metadata, consistency checks and a metamorphic test protect a representation whose own fixes look like CO-4962. The metamorphic relation as written ("the same money stated in any permitted place gives the same answer") is also not true as policy: $3,000 stated as crime victim compensation and $3,000 stated as an unnamed lump sum should give different LEAP answers. To state the relation correctly you need a table of permitted placements per fact, which is most of the deferred receipt model.
- **"Shared template" (step 4) is a new grammar construct.** The product-owner guardrail says every new construct is justified by rule text and documented for engine teams in the same change. The plan does not say whether a template is expanded into ordinary items at export, whether each instance has its own ID, meaning, citation and approval, or what happens to the IDs of the copies it replaces.
- **Sibling registrations and sharing classes** are governance metadata. They are harmless if they stay out of derivation trees and appear in ledger.json as information. The plan should say so.
- **Step 1's "known failures"** will put expectations in the suite that the reference evaluator fails. conformance.md tells engine teams to "implement the derivations exactly" and requires the self-check to report 0 failed. The plan does not say how such a case is exported.

**Identifier and approval churn:** the plan is silent on both. There is no cost today because nothing is approved. I found no rule in governance that returns an Approved item to Draft when it, or something it reads, changes after signature; `approval` records a commit but nothing compares it. That must exist before the first sign-off, and it is the strongest argument for doing all structural change first.

## 2. Completeness of the remedy

Classes of P1 in coverage pass 3, and what the plan does for each:

| Class | Examples | Plan coverage |
|---|---|---|
| Parallel path drifted from the main path | AF H-1, H-2; MAGI C3-02, C3-03 | Step 4: good |
| Fix not followed to every reader | SNAP N3-2 (sponsor deeming), CW3-2 (disqualified status order) | Step 3: partial; it lists items, it does not require a recorded decision on each |
| Verification rules lag the calculation they verify | SNAP C3-1, C3-2, C3-3 | Not named. Verification items are not in step 4's list of alternate paths |
| Money placement and overlap | LEAP F3-1, F3-2; CW3-1 (room-only payments) | Step 5: contained, not removed |
| Pay frequency and conversion | SNAP C3-4 (weekly unemployment not converted) | Mentioned in the context, no step |
| Time: which month, which prior state, partial months | non-MAGI C3-1 (month after separation), CW3-3 (application month), CCCAP C3-1 (change during the period) | Only "date-safe age comparisons". The largest untouched class |
| Rule text never modelled | SNAP C3-5 (excluded resources, recorded P3 "not taken" in two earlier passes), non-MAGI C3-3 (20 CFR 416.1112 exclusions) | Reviews only |
| Rule conflicts with statute or state plan | MAGI C3-01 | None; needs Legal, not a test |
| Assumption in force on an open question | 130 classed questions | None |

What is missing:

- **A stronger stopping rule.** Passes found 101, about 31, then 25. SNAP C3-5 survived two passes as a mis-graded P3. One clean pass after that history is weak evidence. Require two independent clean passes per program, or estimate what remains from the overlap between two reviewers' findings.
- **Systematic case generation.** Probes are whatever a reviewer thought of. Add generated households at every parameter boundary (at the limit, one cent either side), every date boundary (the day before, on and after an effective date, a birthday inside the month), every pay frequency for every income fact, and a household-size sweep across table rows.
- **Coverage and mutation measurement.** Report which `case` arms, `any` arms and table rows no stored household reaches. Then seed defects (drop a summand, flip a comparison, shift a boundary) and count how many the stored cases catch. That number says whether the suite would have caught the next H-1.
- **An oracle that is not the author.** Step 1 takes "the rule's answer" from the reviewer. For probes that already pass, the expectation is in practice the evaluator's output. Each expectation needs a hand computation with paragraph citations, and a sample needs checking against something external: published worked examples (FNS, CMS, state training material) or production determinations through the shadow-evaluation route conformance.md already describes.
- **Time.** operators.md states that a person-scope item is computed once per case, so "a past month's child under 22 uses today's age". For retroactive Medicaid months and the ABAWD look-back that is a wrong-answer generator by design. Step 7's age fix should be widened to an audit of every person-scope item read inside a month other than the determination month.
- **Open questions.** Cases whose answer turns on an open assumption should be marked in the suite, and the 104 questions that need a state decision or Legal should be put to their owners as part of this plan.

## 3. Risks the plan creates, ranked

1. **The deferred receipt decision lands after the exhaustive reviews and after approvals begin.** If the spike succeeds, every reviewed income item changes, the reviews are repeated and signatures are void. *Mitigation:* run the spike first, time-boxed, on the three named areas; decide before step 8's exhaustive pass.
2. **The stored cases pin wrong answers.** About 185 expectations set without an independent computation become the regression baseline and the conformance suite. *Mitigation:* a worked computation per expectation, an `expectation_basis` field (hand-computed with citations, external example, or evaluator output not yet verified), and policy-owner sign-off on cases as well as items.
3. **Un-sharing program calculations multiplies copies.** Sibling flags replace a structural guarantee with a reminder, and copy drift is already the top class. *Mitigation:* a flagged sibling blocks the merge until a disposition is recorded ("applies, changed" or "does not apply, because", with the citation); a differential test runs siblings on the same households and lists every difference with its recorded reason.
4. **The change-impact check becomes noise.** `wages_gross` is read across five programs; a list of every co-reader will be long and skimmed. *Mitigation:* rank by shared excerpt first, require a recorded disposition per item, and fail the check when one is missing.
5. **Templates change what engine teams must understand.** *Mitigation:* expand at export; every instance is an ordinary item with a stable ID, its own meaning, sources and approval; retired copies keep their IDs with a `superseded_by`.
6. **Known failures leak into the conformance suite unmarked.** *Mitigation:* export them with `known_failure` and the finding ID, excluded from an adapter's pass count.
7. **Targeted reviews repeat the same blind spots.** They use the method that produced fix-induced regressions. *Mitigation:* the generated and mutation tests above, and a reviewer who did not write the fix.

## 4. The implementer's view

After the plan, a Drools, Corticon or fact-graph team has a larger suite and cleaner paths inside each program. They would still trip on:

- **Overlapping inputs.** 147 facts that are part of another fact, with the rule for each stated in prose. `part_of` helps only if it is exported in ledger.json, enforced on case input (part not above the whole) and documented in conventions.md as an input-contract constraint.
- **Implicit defaults.** Whether an unstated fact is unknown or zero is decided by each reader's `otherwise`. A reader that omits it stalls the determination; a reader that adds it to a required fact produces the silent zero the plan forbids. Put `required` or `default` on the supplied fact, generate the readers' behaviour from it, and check that no reader overrides it.
- **Time granularity.** Person-scope values frozen at the determination date, parameter versions chosen by the determination date unless `as_of` says otherwise, partial months, and facts about the previous determination. The fact-graph review's S4 was only documented; the per-item declaration of which months an item reads was declined.
- **No assistance-unit identity** (fact-graph S3, still a follow-up). Household-level outcomes are copied onto each person.
- **Cross-program reads.** The three classes omit the one that matters most to an engine: a rule-required read of another program's *outcome* (Adult Financial barred by Colorado Works, SNAP categorical eligibility, SUN Bucks through SNAP or Medicaid, MAGI reading Colorado Works). Each needs a declared answer to: is the other program's result derived or supplied, what happens when that program was not applied for, and in what order programs are determined.
- **Evaluation-order dependence.** The "missing facts" list depends on left-to-right short-circuiting. It is ungraded, but caseworker-facing output will differ by engine.
- **Scale and items like CO-4962.** About 960 derived items and a 1 MB handoff are workable; items that encode placement heuristics are where ports will diverge.

## 5. The policy expert's view

- **Nothing in the plan produces an approval.** Every step is authoring, checking or AI review. The purpose says experts "define and agree"; the plan should end with chapters put to their owners.
- **Program-owned copies help approval.** Under `upstream_of_outcomes` the CHP+ owner must sign Medicaid items CHP+ reads. Each program owning its income and resource calculation makes sign-off cleaner.
- **"Adopted method" needs a product-owner ruling.** The 2026-11-23 decision allows cross-program reads only for primitives. An adopted method is a third class the decision does not name. It also needs an approval answer: when the SSI method changes, do the adopting programs' owners re-sign?
- **Templates and placement items are harder to sign.** An approver signs a meaning against an excerpt. A template instance must read as a complete rule with its own citation, and items such as CO-4962 should be marked as input-handling, owned by the data steward, not presented to a program owner as policy.
- **Households are the best approval surface and the plan underuses them.** Program staff can check "this family, this answer, these paragraphs" more reliably than an expression. Give each stored case an owner and a status.
- **Approvals need protection from later fixes.** Add the stale-approval check before the first signature.

## 6. Changes, in order

1. **Rule on two open points first:** the adopted-method class and a fourth class for rule-required outcome links (product owner); template semantics, ID retirement and how known failures are exported (engineering).
2. **Step 1 as planned, plus an expectation basis** on every case and an independent hand computation for the 185 probes.
3. **Run the receipt spike now,** time-boxed, behind the old-versus-new comparison harness. Decide before any exhaustive review. If it is rejected, do step 5 with a precise metamorphic relation and a permitted-placement table.
4. **Put `required` or `default` on supplied facts** and remove per-reader defaults. Export it and `part_of` to ledger.json.
5. **Step 4, widened** to verification items: they read the calculation's own components, not a parallel sum.
6. **Step 3 with recorded dispositions** that block the merge; the same for siblings, with the differential test.
7. **Fix the open findings** (step 2) on the settled structure.
8. **Time audit:** person-scope items read in other months, partial months, pay-frequency conversion for every income fact, prior-determination facts.
9. **Generated boundary cases, branch coverage and mutation score,** with a stated threshold before the exhaustive pass.
10. **Exhaustive reviews** with the stopping rule tightened to two independent clean passes, plus an external check on a sample of cases.
11. **Stale-approval check, then chapter-by-chapter sign-off** by the owning roles, with open questions routed to their owners and affected cases marked provisional in the suite.
