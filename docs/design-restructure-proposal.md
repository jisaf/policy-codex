# Proposal: restructure so edge cases are hard to get wrong (awaiting product-owner approval)

Status: proposed 2026-11-22, not started. Work is paused until approved.

## Why
Three exhaustive coverage passes per program family found 101, then ~31, then 25 P1s. The counts fall, but every pass finds new ones, and about half of each pass's P1s are regressions of the previous fix round. Measured causes in the current design:

1. **The same money can be stated in more than one place.** 114 of 232 supplied money facts are defined as "part of" another fact; 63 derived items read the aggregates and must subtract the right parts. A missed subtraction counts a dollar twice; an extra one drops it. This produced the largest group of findings (lump sums, PASS set-asides, in-kind pay, G.I. Bill allowances, rents, diversion payments, adoption subsidies). The latest LEAP fix needed a dedicated item just to decide where excluded money sits, and still records a known limit.
2. **The same logic is written more than once.** 51 verification items list income facts by hand instead of reading what the program counts (SNAP C3-1..C3-3). Alternate paths copy the main path and miss its fixes: Family Planning vs MAGI income, the SNAP allotment's own copy of the eligibility gates, Adult Financial deeming vs the client's income, two parallel Medicaid "eligible" gates (non-MAGI C3-2).
3. **Shared derived items tie programs together without a rule requiring it.** 60 derived items live in `volumes/co/shared/`; some (e.g. the 30-day income items read by CCCAP and LEAP) made fixes in one program collide with the other.
4. **The regression net discards its evidence.** Reviewers built ~185 probe households proving real defects; only a minority became stored cases. Many rule tests give the item's inputs directly, so an item passes while the household fails (the meal-plan regression).

## Principles (product owner, 2026-11-22)
- Every case matters; edge cases are not deprioritised.
- Programs are independent of each other except where a rule or policy requires a link.
- Verification should not drift from counting.

## Proposed changes, in order
1. **Keep every probe household.** Promote all reviewer probes to stored cases with the reviewer's hand-derived expectations. From now on every probe goes straight into `volumes/co/tests/cases.yaml`.
2. **One record per dollar.** Supplied income and resource facts become disjoint, program-neutral leaves (wages, SSDI, lump sum, G.I. Bill allowance, crime-victim payment, ...), each stated once. Aggregates become derived sums, never entered. Each program gets one counting table (receipt type → counted / excluded / special rule, with citations) as the only place it decides what counts. Resources the same.
3. **Verification reads what is counted.** Each program's verification starts from its own counting table; rule-text differences (statement accepted, verify only if questionable, excluded-but-verified) are explicit, cited exceptions. A check in `npm run check` fails if a counted receipt type is neither verified nor on the cited exemption list.
4. **No duplicate paths within a program.** Alternate paths (Family Planning, allotment, deeming, the second Medicaid gate) read the program's main items. A governance check flags an item that re-sums the same leaves another item of the same program already sums.
5. **No cross-program derived dependencies unless a rule requires them.** Only supplied facts are shared across programs. Shared derived items in `volumes/co/shared/` are split into per-program items. The 32 existing cross-program reads are audited; each stays only with `accepts_from` and a rule citation, and governance blocks any undeclared cross-program read.
6. **Every fix ships with a whole-household test**, not only an item test with mocked inputs.

Step 2 touches every program (~180 items). It is done one program at a time, sequentially, with the full stored-case set as the safety net: any household whose answer moves is visible immediately.

## Review process after the restructure
- **Light edge reviews first:** fast, targeted at the known defect sources (what the last change touched, household composition, date edges, dual statement of money); every finding becomes a stored case.
- **Full coverage pass last:** once light reviews come back clean, one exhaustive paragraph-by-paragraph pass per family decides completion under the unchanged stopping rule.

## Current state (commit 990ed5e)
- check, typecheck and tests pass.
- Third-pass P1s fixed and merged for SNAP (both halves), Colorado Works, Adult Financial (H-1, H-2; H-3..H-5 open), CCCAP, LEAP/SUN Bucks and MAGI Medicaid/CHP+; not yet re-reviewed.
- Non-MAGI Medicaid third-pass P1s (C3-1..C3-5) open, held for the restructure.
