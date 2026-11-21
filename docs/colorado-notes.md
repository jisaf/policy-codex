# Colorado build notes

One entry per phase: what the approach handled, what it did not, and where open questions cluster. Written at the end of each phase for the reader who was not in the room.

## Phase 1: platform (2026-09-17)

Built: a volume selector in the header (the manifest now lists `mwr` and the draft `co`); a tag hierarchy declared in `volume.yaml` with filters by tag (AND) and by parent grouping in the table, program view, and search; dated parameter versions with an exclusive `to` and a per-version excerpt, rule effectivity ranges that make a rule evaluate to unknown outside its dates (trace origin `not-in-force`), and case-level relationships `[role, from, to]` that the engine expands with inverses; the `co` skeleton with seven programs and the target household (CO-01, CO-02) as cases with empty expectations; `npm run check` and the other scripts run per volume.

Worked: every piece was additive. The 138-item federal volume's fixtures did not change, so the engine's behaviour for existing rules is provably the same.

Did not fit cleanly:
- `paramValue` (the item block, lead sentence, editor) still reads the last version in array order and ignores `to`, because the item-block fixtures pin it. Dating those surfaces is a follow-up.
- The text-editor item block has no line format for version tables; a versioned parameter is edited through the form until the grammar grows a `Versions` field.
- `docs/conventions.md` does not yet describe `versions[].to`/`source` or case-level relationships.
- Network policy: the primary sources (eCFR, Cornell, the Colorado Secretary of State, HCPF, CDHS, FNS, CMS, SSA, ASPE) were allow-listed during this phase but the running session still saw 403s; the authoring phases need a session started after the policy change.

Open questions to settle before phase 2 authoring:
- Whether SNAP household composition should be a derived fact over `buys_prepares_with` edges (the plan says yes) or a supplied unit id from the worker; the target household has a grandmother in a facility, so the rule must handle institutional exclusion.
- How to represent the ITIN tax filer (p3) who claims citizen children: the MAGI household rules need `is_tax_filer` and dependency edges, but immigrant eligibility must not read them.

## Phase 2: SNAP (2026-09-18)

Built: the SNAP chapter of the `co` volume, authored in four batches from 25 fetched documents (7 U.S.C. 2012, 2014, 2015, 2017; Pub. L. 119-21 subtitle A; 7 CFR 271.2, 273.1, 273.2, 273.4, 273.5, 273.7, 273.8, 273.9, 273.10, 273.11, 273.24; 10 CCR 2506-1 §§ 4.206–4.207, 4.304–4.311, 4.401–4.411 via Cornell's CCR mirror; the FNS FY2026 COLA tables; the 2026 HHS poverty guidelines; 8 U.S.C. 1612–1613). Chapters: household composition as a derived purchase-and-prepare unit with mandatory members and institutional exclusion; elderly/disabled member; citizenship and non-citizen eligibility under 7 U.S.C. 2015(f) as amended by H.R.1 sec. 10108 with the PRWORA five-year bar; income counting with Colorado's pro rata treatment of an ineligible non-citizen's income and its child support exclusion; Colorado's basic and expanded categorical eligibility (200% FPL) and standard eligibility; resources; expedited service; deductions, net income, allotment and the minimum allotment; work registration and exemptions; the ABAWD time limit under the amended 2015(o) (age band 18–65, dependent child under 14, no homeless/veteran/foster-youth exception), effective 2025-07-04; students. Three SNAP outcomes are declared: `snap_eligibility_status`, `snap_allotment`, `snap_abawd_time_limit_status`. The target household's SNAP expectations are filled for CO-01 and CO-02 (the grandmother excluded as an institution resident, a unit of four with one ineligible non-citizen, three eligible members, expanded categorical eligibility, an allotment computed end to end) and a third case (CO-03, a two-person elderly household) exercises the medical deduction, the resource test and the minimum allotment. The policy review is kept at docs/reviews/snap-phase-2.md with each finding's disposition below.

Platform changes the chapter needed: patterns P35–P42 (every person in the case; a relationship closure with an optional edge condition, which is how mandatory members are expressed; filter, count and sum over a group; greater-of; rounding; a table keyed by household size) and the `Parameter has a value` constraint accepting dated versions, which phase 1 had left as a blocking error on every versioned parameter (the mwr fixture for WR-101 was pinned as failing for that reason and is now correct). `scripts/eval-case.ts` evaluates any identifiers for a case and lists the supplied facts still missing; `scripts/sync-manifest.mjs` regenerates the manifest from disk.

Worked:
- Authoring from fetched text with excerpts appended per batch and `Document: D-n` on each excerpt. The reviewer could check every rule against a document line; the three places where the statute and the older regulation or the Colorado manual disagree (non-citizen categories, ABAWD exceptions, the ABAWD age band) were all caught by the authors and recorded as open questions with the statute controlling.
- Person-scoped household facts. Every member's value of `snap_household_members` is their own unit, so no case-scoped evaluation was needed; an excluded person's unit is empty.
- Batches in sequence with a fixed interface of identifiers. The one cross-batch edit (adding the student prong to `snap_is_ineligible_member`) cascaded unknowns into 21 earlier tests, which is the correct behaviour of unknown propagation and was fixed by stating the fact in those tests.
- The review (docs/reviews/snap-phase-2.md) found what governance and check cannot: a vacuous "all members receive assistance" on an empty unit, a double count of work-program hours in a supplied fact's meaning, no rounding of net income, a minimum-allotment floor gated on the net test alone, and four smaller misreadings; the fix round closed every blocking and should-fix finding (S136–S138, OQ-36–OQ-38 record the rest), and the target household's net income moved from 2198.50 to 2199 with the allotment unchanged at 125.

Did not fit cleanly:
- The standard utility allowance. The CDHS SUA amounts are not in any fetched document (the rule manual delegates them), so `utility_allowance_amount` is a supplied fact and the target household's allotment is computed with no SUA; with a heating/cooling SUA the allotment would be materially higher. H.R.1 secs. 10103 (LIHEAP-based SUA limited to elderly/disabled households) and 10104 (internet costs excluded) are recorded but not modeled.
- FY2027. The FNS FY2027 COLA memo is hosted on usda.gov, which refused the session, so every COLA-driven parameter carries the FY2026 version with no end date and the as-of date of 2026-10-01 falls outside the memo's stated period (OQ-21).
- Income exclusions. The supplied income facts are the countable, post-exclusion amounts; the 7 CFR 273.9(c) exclusions are not rules.
- Scope: initial-month proration, the ABAWD additional three months and regaining eligibility, voluntary quit, and the 273.10(e)(3) destitute-household rule are listed in an open question as out of this phase.
- Governance treats every file since `origin/main` as new for the whole branch, so a later batch adding a same-shaped rule can raise `rationale.required` on an earlier batch's item; batch 3 shaped one derivation differently to avoid it. A per-commit notion of "new" would remove the incentive.
- The elderly/disabled separate-household election (273.1(b)(2)) is a rule (`snap_meets_elderly_disabled_separate_household_election`) but not wired into the household closure: composing it correctly needs a two-pass rule over a unit whose membership depends on the election (OQ-37).
- After the review, `receives_general_assistance` is the disability-based prong only and `receives_state_cash_assistance` carries the OAP/AND/AB prong of basic categorical eligibility; the resource test reads liquid and non-liquid countable resources, with the exclusions of 273.8(e) still supplied rather than derived.

Open questions cluster in three places: what Colorado will publish to implement H.R.1 (secs. 10102, 10103, 10108) against a rule manual that still states the pre-H.R.1 law; the state-published numbers that no fetched document states (SUA amounts, the FY2027 COLA, the current 200% FPL table, which 4.401.1 dates 2024-10-01); and the elective readings the manual leaves open (rounding option under 273.10(e)(2)(ii)(A), the homeless shelter deduction, the "over 65" age band).

## Phase 3: MAGI Medicaid and CHP+ (2026-09-18)

Built: the MAGI Medicaid chapter (volumes/co/medicaid, CO-500–CO-566) and the CHP+ chapter (volumes/co/chp, CO-700–CO-708) from 17 fetched documents (42 U.S.C. 1396a, 1396d, 1396r-1, 1396r-1a, title XXI; 42 CFR 435 subparts B, C, E, G with the definitions, effective-date, continuous and presumptive eligibility sections; 42 CFR 457 subparts A, C, E, H; 10 CCR 2505-10 8.100.1–8.100.4 and 10 CCR 2505-3 via Cornell's CCR mirror). Chapters: the 42 CFR 435.603(f) household (tax filer, tax dependent with the claimed-by-a-non-parent exception, non-filer with parents and siblings under 19) and family size with the pregnant count; MAGI income and whose income counts; residency; citizenship with the PRWORA five-year bar and Colorado's rule that persons under 19 and pregnant or postpartum persons are covered regardless of status; emergency-only status; the covered groups with Colorado's percentages (children 133%, parents and caretakers 60%, adults 133%, pregnant 185%, needy newborn, former foster care) and the 5% disregard at the highest applicable standard; continuous eligibility for children, retroactive coverage, presumptive eligibility, postpartum coverage; CHP+ eligibility for children and pregnant persons in the 142%–260% band, the Medicaid-eligible and other-coverage exclusions, presumptive eligibility. Outcomes: `ma_magi_category`, `ma_magi_eligibility_status`, `chp_eligibility_status`. The target household's expectations are filled for CO-01 and CO-02; two complex cases (CO-04, CO-05: a pregnant lawfully present mother within the five-year bar with a child claimed by a non-custodial parent and a stepparent filing jointly; a former foster care youth with a sibling in continuous eligibility and a retroactive month) were designed by the reviewer and added after the fix rounds. The policy review is kept at docs/reviews/magi-chp-phase-3.md.

Platform changes: pattern P43 (the persons who share a relationship with this person, for siblings), P44 (N months after or before a month), a `shared` chapter holding the cross-program `age` rule (the SNAP rule moved there), the `chp` tag.

Worked:
- The household closure and filter patterns carried over from SNAP; the MAGI household needed only the sibling join, which was the one engine gap batch 5 reported.
- The review was decisive again. Governance and check passed while the five-year bar reached no outcome, continuous eligibility was computed and ignored (and thirteen months long), the minimum-essential-coverage condition sat on the parent group instead of the adult group, and the 5% disregard was applied at every category's own standard. All four came out of the reviewer's reading of the text against the rules, none from any automated check.
- Splitting the fix round in two (rules, then cases) after the first fix agent declined the combined list as too large.

Did not fit cleanly:
- The 133%/142% child gap: Colorado's rule defers to an HCPF income chart this session cannot fetch (403), so children between the MAGI-equivalent 133% standard and the CHP+ 142% floor fall in a gap the volume cannot close (OQ-63, blocking).
- The CHP+ enrollment fee: the fetched § 300 has no operative text on Cornell's mirror; the item was removed and OQ-57 records the provenance gap to re-fetch from the Colorado SOS.
- Governance's `derived.alias` rule pushes authors to wrap a bare reference in `[all, x]` (CO-601, CO-602, CO-700); the wrapper is an alias in disguise and the right fix is to read the underlying fact directly. CO-700 was removed in the phase 6 wrap-up (the CHP+ rules read the MAGI age rule directly); CO-601 and CO-602 go in the phase 4 fix round.
- Not modeled, recorded as open questions: the (f)(2)(ii)/(iii) household exceptions and a `lives_with` fact (OQ-42), the community engagement requirement of 42 CFR 435.119(d) for the adult group (OQ-65; the mwr volume models it), cost-sharing exemptions and copayments (OQ-64), the SSA-benefit exclusion from the dependent filing threshold.
- Concurrency: three authors in one working tree collide on half-written YAML during another author's check run; each batch was committed from a staged, isolated tree. A per-author worktree would remove the noise.

Open questions cluster in: state-published figures the session cannot fetch (the HCPF income chart, the CHP+ fee schedule); federal rule text the Colorado manual has not caught up with (435.119(d), the H.R.1-era provisions); and modeling gaps that need a co-residence fact.

## Phase 4: non-MAGI Medicaid, long-term care, MSP and Buy-In (2026-09-18)

Built: volumes/co/medicaid CO-600–CO-622 (SSI-related aged, blind and disabled categories with the SSI income and resource methodology of 20 CFR 416 subparts K and L: the $20 general and $65-plus-half earned exclusions, in-kind support, the individual and couple resource limits; the Medicare Savings Programs QMB, SLMB and QI; Medicaid Buy-In for working adults with disabilities and for children with disabilities) and CO-640–CO-660 (institutionalized status with the 30-day expectation, the special income group at 300% of the SSI federal benefit rate, HCBS waiver eligibility and its target groups, PACE, spousal impoverishment with the CSRA, the MMMNA and the community spouse income allowance, transfer of assets with the penalty divisor, the home equity limit, the patient payment with the personal needs allowance) from D-43–D-58 (42 U.S.C. 1382a–c, 1396p, 1396r-5; 42 CFR 435 subparts D, F, H, I and 435.1005–435.1012; 20 CFR 416 K and L; 10 CCR 2505-10 8.100.5–8.100.7, 8.400, 8.7000, 8.500/8.508/8.509/8.497; SSA's 2026 COLA notice for the SSI federal benefit rate). Outcomes: `ma_ssi_related_category`, `ma_msp_category`, `ma_buy_in_category`, `ma_ltc_eligibility_status`, `ma_patient_payment`. State-set figures the fetched text does not state (the CSRA minimum and maximum, the MMMNA standard and cap, the home equity limit, the transfer penalty divisor, the MSP resource limits) are supplied facts with open questions; the target household carries illustrative values marked as such. Review at docs/reviews/non-magi-ltc-phase-4.md.

Worked:
- The SSI methodology as a chain of small items (gross, exclusions, countable, deemed) was reused as-is by Adult Financial in phase 5.
- The review again found what governance and check could not: the CSRA followed the federal half-of-resources formula where Colorado's 8.100.7.M.1.a gives the community spouse the couple's total resources up to the maximum; the patient payment was computed for the community spouse; HCBS and PACE couples never reached spousal impoverishment; the SSI/OAP and Buy-In routes into HCBS were run through the 300% test. All four passed every mechanical check.

Did not fit cleanly:
- Colorado's CSRA is a single "min of total and maximum" while 1396r-5(f)(2)(A) has a spousal share and a floor; the volume follows the state text and records the tension (OQ-126). The federal floor remains a supplied fact with no consumer.
- The PACE-before-institutional ordering in `ma_ltc_eligibility_status` decides the target household's grandmother's status (`eligible_pace`, not `eligible_institutional`) and is an authoring choice the text does not force (OQ-100).
- The transfer penalty needed a start date and a partial-month day count; the engine has no floor operator, so whole months use `-ceil(-x)`.
- Buy-In's exemption from spousal impoverishment (8.7100.C.3) is recorded, not modeled, because wiring it reverses the dependency between the couple test and waiver eligibility (OQ-127).
- Second fix round: the unused $20 general exclusion now carries to earned income, the personal needs allowance became a supplied fact (the text re-bases it annually), the MMMNA standard is derived from the poverty guideline, the CSRA reads an intake snapshot fact distinct from current resources. Left for a later round: nine excerpts on the completeness list and three test-coverage additions named in the review. Complex case CO-06 (nursing-facility admission with a transfer penalty, CSRA, income allowance, a QMB community spouse and a Buy-In adult child) was added with expectations from the fixed rules; its SSI countable income differs from the reviewer's hand derivation by the $20 carry-over.

## Phase 5: Colorado Works and Adult Financial (2026-09-18)

Built: volumes/co/cash CO-900–CO-927 (Colorado Works: the assistance unit closed over parent/child and caretaker/dependent with the minor-parent split and the SSI and Title IV exclusions, dependent child, minor-parent living arrangement and deeming of the minor parent's parents' income, residency, the qualified-non-citizen rule with the August 22, 1996 cutoff, the $90 eligibility disregard and the 67% payment disregard, the need and grant standards of 3.606.1.F as three tables by caretaker count keyed by child count, the unit-level sixty-month limit counting only the head and spouse with the hardship and domestic-violence extensions, work-eligible individual and work participation hours) and CO-940–CO-953 (Adult Financial: OAP-A/B by age and SSI eligibility, AND-SO with the six-month disability standard excluding SSDI and SSI recipients, AND-CS for SSI recipients under the state standard, AB, SSI-methodology income with the state disregards, the resource limit, the grant standards as supplied facts) from D-59–D-62 (C.R.S. 26-2 parts 1 and 7; 45 CFR 260, 261, 263, 264; 9 CCR 2503-6 and 2503-5) with D-53/D-54/D-58. Outcomes: `cw_grant_amount`, `cw_eligibility_status`, `af_category`, `af_oap_grant`, `af_and_grant`. Review at docs/reviews/cash-phase-5.md.

Worked:
- The 3.606.1.F chart is in the fetched text with all three caretaker rows, so the standards are parameters, not supplied facts. A two-key table type was not needed: three one-key tables selected by a caretaker count do the job (K-10).
- The minor-parent unit in the target household (a 17-year-old and her infant living with the 17-year-old's undocumented mother) exercised the deeming rule end to end: the mother's income less the $90 disregard less a one-person needs allowance is deemed to the unit, which is then over the need standard.

Did not fit cleanly:
- The grant was first computed with the $90 eligibility disregard; 3.606.2.A.1 applies the 67% disregard to the payment. The review caught it; the two disregards are now separate items.
- 3.608 (sanctions) is not in the fetched text; there is no sanction rule (OQ recorded). The FVO waiver and the domestic-violence time-limit extension are different things in 3.604.5; the supplied fact now names the extension.
- The sixty-month clock is per unit and counts the head of household and spouse only (45 CFR 264.1(b)); the first draft ran it per person.
- Second fix round: the reviewer proposed dropping AB's age-59 cap, but 3.520.61.A folds blindness into AND-SO's own 0–59 band, so the cap stayed and OQ-112 says why; the five-year bar was narrowed to AND; the minor-parent unit split now conditions on a request for the child; the $10 pregnancy allowance, the Indian Country exemption and the disqualified-member bar on extensions were added; AND-CS tests the full SSI benefit against a new `ssi_income` fact. The budgetary unit (K-1), the remaining disqualified-member consequences and the married $20 split stayed open questions because wiring them changes income aggregation across the suite. Complex case CO-07 (two-caretaker unit with an SSI child, near the time limit with a domestic-violence extension, an OAP-B grandparent) was added; under the unit-level extension the whole unit stays eligible, which the reviewer's pre-fix derivation did not have.

## Phase 6: CCCAP and LEAP (2026-09-18)

Built: volumes/co/childcare CO-980–CO-993 (CCCAP: eligible child under 13 or under 19 with additional care needs, teen parent, adult caretaker, the household of 3.103.GGG closed over minor children only, the household-level eligible-activity test of 3.111.D.1, household income with children's earnings excluded, the entry limit as the county percentage of the 3.111.H.2 poverty table capped at 85% SMI, the exit limit, the Colorado Works Child Care and protective-services routes) and volumes/co/energy CO-1000–CO-1010 (LEAP: the economic-unit household sharing heating fuel with the 3.753.17 citizenship filter, household income summed over the unfiltered unit with children's earnings excluded, the income limit as a supplied figure, vulnerability to heating cost, lawful presence, residency, the November–April eligibility period) from D-63 (9 CCR 2503-7) and D-64 (8 CCR 1403-1). Outcomes: `cccap_eligibility_status`, `leap_is_eligible`. Review at docs/reviews/cccap-leap-phase-6.md.

Worked:
- The `reachable` edge condition (P36) carried both households once the condition tested the child's age on whichever end of the edge is the child; the first draft joined the grandparents, their adult daughter and the daughter's children into one CCCAP and one LEAP household, and tested the wrong end of the edge from the child's perspective.
- Lifting a per-person test to the household (CO-991) fixed a class of defect worth naming: an outcome evaluated for an infant read the infant's own work hours.

Did not fit cleanly:
- LEAP has an eligibility period; the target household's month (October) is outside it, so the LEAP expectations for CO-01 are ineligible for that reason alone and CO-02 (November) carries the substantive answer. Whether LEAP is a monthly re-evaluation or a point-in-time program-year determination is OQ-137.
- The engine has no way to declare a new relationship role from a volume, so "shares heating fuel with" is a per-person supplied override on existing spouse/parent/child edges; unrelated roommates cannot join a LEAP household (OQ-132). A `month`-scope derived item is not evaluated by the engine (only case-stated month facts are read), so the eligibility-period rule is person-month scoped.
- The county CCCAP entry limit is county-published and stays supplied. The LEAP income ceiling was turned into a parameter table keyed by household size in the second fix round, but the figures were backed out of CCCAP's fetched 85% SMI column (3.752.22.D states 60% of SMI; LEAP's own table is not in the fetched text), so OQ-122 stays open and the table should be replaced when the LEAP table is fetched.
- Second fix round: the teen-parent activity prong, protective services keeping the income test, CCCAP residency (reusing the Medicaid item; a CCCAP copy tripped the duplicate-derivation rule), child citizenship and the $1M asset rule, the institutional exclusion from heating-cost vulnerability. Complex case CO-08 (two caretakers with different activities, a child with additional care needs, an 18-year-old student, an undocumented earner, heat in rent) was added; the undocumented relative ends up as his own one-person household on both programs because no relationship edge joins him, which OQ-132's missing economic-unit role explains.

## Phase 9: verification across every program (2026-11-21)

Built: 45 shared supplied facts (CO-1300–CO-1344: per element, verified by electronic data source, document received, attestation questionable, and the document type for identity and citizenship; the verification request date; the electronic household income for reasonable compatibility), 11 parameters (CO-1345–CO-1355: each program's period to verify, the Medicaid 90-day reasonable opportunity period and 5-day notice receipt, the 30-day income period, the 20% compatibility threshold, the Colorado Works lawful-presence age), 13 shared rules (CO-1356–CO-1368), and per program a requirement item per element, acceptability items where the rule lists documents, pending counts, due dates and a status: SNAP CO-1370–CO-1394, Medicaid CO-1395–CO-1415, CHP+ CO-1416–CO-1418, Colorado Works CO-1420–CO-1427, Adult Financial CO-1430–CO-1438, CCCAP CO-1440–CO-1451, LEAP CO-1455–CO-1462, from D-95–D-109 (7 CFR 273.2; 42 CFR 435.406–435.407, 435.910, 435.912, 435.940–435.965, 457.380; 42 U.S.C. 1396b(x), 1396a(ee); 45 CFR 205.52, 205.55; the current SOS text of 10 CCR 2505-10 8.100, 10 CCR 2505-3, 10 CCR 2506-1, 9 CCR 2503-1, 2503-5, 2503-6, 2503-7 and 8 CCR 1403-1). Outcomes: `<prog>_verification_status` and `<prog>_pending_verification_count` for all seven programs. Pattern P46 (`N days after [date]`) was added for due dates. Complex case CO-91 (numbered CO-13 on its branch; renumbered at merge because phase 8 also used CO-13).

Worked:
- One requirement item per element, read through a `case`-per-element count, keeps each program's rule visible on its own line while the status stays a short ordered `case`. A requirement that is false short-circuits, so a case need not state the verification facts of elements a program never asks for.
- Program-neutral supplied facts held: the same "document received" means the same thing to every program; what differs is which documents a program accepts (acceptability items) and whether an electronic match counts (Department of Labor wage data is not verified upon receipt for SNAP, Colorado Works or Adult Financial, so their earned-income arm reads the document fact only).

Did not fit cleanly:
- The alias rule forbids a requirement item that only restates a fact, so where a program requires an element whenever it is present (Colorado Works citizenship and SSN, Adult Financial age, residency and identity, LEAP SSN), the count reads the shared declaration or presence fact directly instead of a `<prog>_requires_verification_of_<element>` item.
- Two document lists are identical across programs (Colorado Works and Adult Financial citizenship and lawful-presence documents), so they are shared items rather than per-program acceptability items; the incorporated Department of Revenue and 45 CFR 1626.6 lists were not fetched (OQ-315).
- One request date serves every program (OQ-300), so a case cannot show SNAP's 10 days and a Medicaid reasonable opportunity period opened by a different notice. Extensions (good cause, good faith) are not modeled (OQ-316). LEAP excludes a member without an SSN rather than denying; the count treats it as pending (OQ-318), which shows in CO-02.

## Phase 8 policy-review fix round (2026-11-21)

Fixed the findings of docs/reviews/cash-snap-other-phase-8.md (disposition at the end of that review). New items CO-1500–CO-1520, excerpts S1000–S1021 (quoted from the phase-8 documents D-80, D-81, D-82, D-87 and the Cornell D-62; no new documents), open questions OQ-350–OQ-358.

- Two provisions encoded from the Cornell copies were not the current rule and both changed money: the Colorado Works payment disregard (3.606.2.A, 100% in the first certification period and for a new source since 2023-06-01) and the Colorado Works drug-felony disqualification (gone from 3.604.2.L-M). Adult Financial income now subtracts SSI, applies the $20 to the rest and adds SSI back (3.533.A.2, 3.549.A.2), so CO-07's AND-CS child is paid $294, not $994.
- ID retired: CO-036. Phase 8 had reused the ID of the deleted supplied fact `utility_allowance_amount` for the derived `snap_utility_allowance_amount`; the derived rule is now CO-1500 (same identifier, now household-level so a household gets one SUA), and CO-036 is not used again.
- Phase 8's change to the target household's SNAP allotment (125 to 336) was partly a fact change, not a rule effect: p2 now states heat plus three utilities where every person had stated `utility_allowance_amount: 0`. In this round the target household also became one LEAP household (the family buys heat in common), which changes its LEAP figures.
- Supplied facts added for the cash chapter (first certification period, new source, the Adult Financial ISM, the facility stay for the personal needs allowance, a deceased Colorado Works client) are prefixed or program-scoped where their meaning is program-specific; the shared income and disqualification facts the vocabulary review will split are read as they are.

## Vocabulary fix round (2026-11-21)

Fixed the findings of docs/reviews/vocabulary-reuse.md (disposition at the end of that review). New items CO-1700–CO-1750, excerpts S1150–S1157 (quoted from the documents already in the volume: D-15, D-25, D-59, D-65, D-80, D-81, D-82, D-87; no new documents), open questions OQ-390–OQ-396. Governance gained `read.cross_program` (warn) and the `accepts_from` field; the volume now reports no unacknowledged cross-program read (71 cross-program reads of supplied or derived items before the round, counted on the base tree; 51 after, every one listed in its reader's `accepts_from`). The four `name.prefix` warnings are gone (N-1).

- **Income (R-1).** Every supplied income fact now states the gross amount received; the phase 2 note above ("the supplied income facts are the countable, post-exclusion amounts") no longer holds. `earned_income` is `wages_gross`. Self-employment is `self_employment_gross_receipts` (shared) netted by each program's own allowable-cost fact into its own figure (SNAP, Medicaid non-MAGI, Colorado Works, Adult Financial, CCCAP, LEAP); MAGI reads the federal tax figure (`self_employment_net_earnings_for_tax`). Colorado Works, Adult Financial, the SSI-related groups, the Buy-In and the spousal family allowance now count self-employment. Other unearned income is split taxable/non-taxable and MAGI reads the taxable part only. Cash assistance is split into `tanf_cash_income` and `adult_financial_cash_income`, so neither program counts its own grant, and SNAP counts SSI. Program exclusion lists remain unmodeled (OQ-390).
- **Program-specific facts (R-2 to R-7, R-8 to R-14).** School enrollment, the Indian-country months, the 8 U.S.C. 1613(b) exemption and the date of entry, the AND-SO state disability and SSDI, the program disqualifications, the Colorado Works head of the assistance unit, the medical institution, CCCAP's asset declaration and incapacity, Colorado Works work-activity hours, the SNAP application date, the Medicaid reasonable opportunity notice date, the OAP Health Care institution exclusion and the CHP+ reentry carve-out are each defined by the rule that reads them.
- **Merged for being the same rule.** Once Colorado Works and Aid to the Needy Disabled read the same federal exemption, their citizenship rules were identical, as C.R.S. 26-2-111.8(2) makes them: CO-905 survives as `meets_public_assistance_citizenship_requirement` (program All) and CO-943 is retired. `ma_meets_residency` had no Medicaid-specific content and is the shared `is_colorado_resident` (OQ-393 records Medicaid's unmodeled special rules).
- **IDs retired** (files deleted; the IDs are not used again): CO-047 (`is_in_snap_employment_and_training`, unread), CO-049 (`workfare_hours`, unread), CO-054 (`was_foster_youth_at_eighteen`, duplicate of `age_at_foster_care_exit`), CO-105 and CO-115 (unread SNAP percent-of-poverty limits restated by the dollar tables), CO-116 and CO-117 (the SNAP copy of the federal poverty guideline), CO-210 and CO-211 (CHP+ lower bounds restating the Medicaid limits), CO-541 (an alias of `ma_income_limit_parent_caretaker_pct`), CO-553 (`ma_magi_is_eligible`, unread), CO-805 (`is_employed`, duplicate of `has_earned_income`), CO-917 (`cw_time_limit_exempt`, unread), CO-943 (`af_meets_citizenship_requirement_and`, merged into CO-905), CO-1111 (`is_widow_or_widower`, now `marital_status` widowed).
- **Moved to shared/** (program All, same ID): CO-505, CO-506, CO-508, CO-905.
- **Expected values.** No household case expectation changed: the cases state zero self-employment, zero cash assistance and zero other unearned income, the one SSI recipient (CO-07 p3) is not in an evaluated SNAP household, and the new facts were added to the cases with the values the old shared facts carried (in CO-01 and CO-02 the Colorado Works head is p3, the mother, while p2 stays the SNAP head). New rule tests show each behavior change (for example CO-905-T5/T6, CO-907-T6, CO-908-T3, CO-946-T10, CO-331-T3, CO-502-T4, CO-302-T3, CO-928-T5, CO-942-T5, CO-337-T3, CO-544-T5, CO-984-T8).

Identifier renames (the product owner accepted renames through change sets; each keeps its CO ID):

| ID | Old identifier | New identifier | Why |
|---|---|---|---|
| CO-005 | is_veteran_or_active_duty | has_military_connection | C-1: the name hid the spouse, surviving spouse and dependent child |
| CO-007 | in_medical_institution | snap_resides_in_institution_providing_meals | R-8: SNAP's majority-of-meals test; Medicaid and HCA read resides_in_medical_institution |
| CO-011 | is_disabled_ssa | meets_ssa_disability_criteria | R-5: an SSA determination, not a benefit; AND-SO has its own fact |
| CO-014 | receives_general_assistance | receives_disability_based_general_assistance | C-1: the meaning is the disability-based kind only |
| CO-015 | receives_social_security_disability | snap_receives_disability_or_blindness_payment | R-5: SNAP's 271.2 list, read as SSDI elsewhere |
| CO-020 | is_enrolled_in_school | snap_is_enrolled_half_time_in_school_or_training | R-2: one of four school definitions |
| CO-023 | earned_income | wages_gross | R-1: wages only, read as all earned income |
| CO-024 | self_employment_net_income | self_employment_net_earnings_for_tax | R-1: one "net" for programs with different cost rules |
| CO-029 | cash_assistance_income | tanf_cash_income | R-1: programs counted their own grant |
| CO-030 | other_unearned_income | other_unearned_income_nontaxable | R-1: MAGI counted gifts and contributions |
| CO-031 | countable_liquid_resources | snap_countable_liquid_resources | C-2, R-11: countable under 7 CFR 273.8 |
| CO-038 | is_fleeing_felon_or_probation_violator | is_fleeing_felon | R-6: two conditions; Adult Financial names one |
| CO-039 | is_disqualified_for_intentional_program_violation | snap_is_serving_ipv_disqualification | R-6: a SNAP finding |
| CO-041 | is_disqualified_drug_felony | snap_is_disqualified_drug_felony | R-6: SNAP's member disqualification |
| CO-050 | is_indian_or_urban_indian | snap_is_indian_or_urban_indian | R-3: SNAP's ABAWD exemption, read for TANF Indian Country |
| CO-067 | is_head_of_household | snap_is_head_of_household | R-7: the SNAP head, read as the TANF head |
| CO-074 | countable_nonliquid_resources_snap | snap_countable_nonliquid_resources | C-2, N-4: prefix leads |
| CO-079 | other_taxable_income | magi_other_taxable_income | C-2: MAGI's own figure |
| CO-088 | application_date | ma_application_date | R-13: the Medical Assistance application date |
| CO-090 | has_other_creditable_health_coverage | chp_has_other_health_coverage | R-14: CHP+'s definition |
| CO-104 | snap_five_year_bar_years | qualified_non_citizen_waiting_period_years | U-2, N-2: one federal figure read by four programs |
| CO-181 | ma_poverty_guideline_table | federal_poverty_guideline_annual_table | D-1, N-2: one federal table |
| CO-182 | ma_poverty_guideline_each_additional | federal_poverty_guideline_annual_each_additional | D-1, N-2 |
| CO-230 | ma_ssi_general_income_exclusion | ssi_general_income_exclusion | N-2: SSI figure read by Adult Financial |
| CO-231 | ma_ssi_earned_income_exclusion | ssi_earned_income_exclusion | N-2 |
| CO-232 | ma_ssi_earned_income_disregard_rate | ssi_earned_income_disregard_rate | N-2 |
| CO-233 | ma_ssi_resource_limit_individual | ssi_resource_limit_individual | N-2 |
| CO-234 | ma_ssi_resource_limit_couple | ssi_resource_limit_couple | N-2 |
| CO-235 | ma_ssi_federal_benefit_rate_individual | ssi_federal_benefit_rate_individual | N-2 |
| CO-279 | cw_non_citizen_entry_date_cutoff | qualified_non_citizen_entry_cutoff_date | R-4: the statutory date Colorado Works and AND share |
| CO-313 | snap_household_size | snap_eligible_household_size | C-3: counts eligible members only |
| CO-323 | cccap_poverty_guideline_table | cccap_poverty_guideline_monthly_table | D-1, C-3: monthly, beside an annual table of the same stem |
| CO-324 | cccap_poverty_guideline_each_additional | cccap_poverty_guideline_monthly_each_additional | D-1, C-3 |
| CO-505 | ma_meets_residency | is_colorado_resident | R-9, U-4: plain state residence, read by CCCAP and LEAP |
| CO-506 | ma_is_qualified_non_citizen | is_qualified_non_citizen | U-3, N-2: 8 U.S.C. 1641, read by Adult Financial |
| CO-508 | ma_meets_five_year_bar | has_held_qualified_status_five_years | U-2: read by four programs |
| CO-800 | countable_resources_individual | ssi_countable_resources_individual | C-2: SSI-method figure |
| CO-801 | countable_resources_couple | ssi_countable_resources_couple | C-2 |
| CO-807 | msp_resource_limit_individual | ma_msp_resource_limit_individual | N-1: program All only to avoid the prefix warning |
| CO-808 | msp_resource_limit_couple | ma_msp_resource_limit_couple | N-1 |
| CO-827 | csra_minimum_standard | ma_csra_minimum | N-1 |
| CO-828 | csra_maximum_standard | ma_csra_maximum | N-1 |
| CO-830 | mmmna_cap | ma_mmmna_cap | N-1 |
| CO-831 | home_equity_limit | ma_home_equity_limit | N-1 |
| CO-888 | countable_resources_couple_at_snapshot | ma_spousal_resources_at_snapshot | C-2: Medicaid's spousal impoverishment figure |
| CO-905 | cw_meets_citizenship_requirement | meets_public_assistance_citizenship_requirement | R-4: one rule for Colorado Works and AND (CO-943 retired) |
| CO-1005 | leap_has_lawfully_present_member | leap_has_countable_household_member | C-4: the derivation tests a non-empty household |
| CO-1271 | estimated_home_heating_costs | estimated_home_heating_costs_for_season | C-3: a season total, not monthly |
| CO-1311 | ssn_verification_document_received | ssn_furnished_or_application_shown | C-4: true with no document |
| CO-1332 | disability_verified_by_electronic_data_source | disability_benefit_receipt_verified_by_electronic_data_source | C-4: verifies benefit receipt |
| CO-1358 | claims_citizenship | is_us_citizen_or_national | U-3: the shared citizen-or-national test |
| CO-1367 | identity_document_is_lawful_presence_document | identity_document_is_on_cash_program_list | C-4: used for identity and lawful presence |

Option renamed: `citizenship_status` (CO-002) `other_non_qualified_non_citizen` → `other_lawfully_present_non_citizen` (R-10: every reader used it for a lawfully present non-qualified status). Options narrowed: `ma_five_year_bar_exempt_category` (CO-1170) loses the two 1613(b) categories now in `federal_five_year_bar_exempt_category` (CO-1724). Options added: `marital_status` widowed; `leap_living_arrangement` institutional_group_care.

Did not fit cleanly:
- Governance treats a moved file (CO-505, CO-506, CO-508, CO-905 into shared/) as changed and prints a git "path exists on disk, but not in origin/main" line while ratcheting; the check still passes.
- The alias rule decided two shapes: a program item that only restates a shared one cannot exist, so where a shared item was the whole rule (residency, the AND/Colorado Works citizenship test) the program items were merged into it rather than kept as wrappers; LEAP's citizenship list (CO-1010) keeps its explicit list because reading the shared items would make it identical to OAP's (CO-929).
- The exclusion lists of each program's income rule (OQ-390), county residence for CCCAP and SNAP residency (OQ-393) and per-program relationship roles (R-15, OQ-396) remain open.

### Duplicate ids renumbered (2026-11-21)

Ten parameters added in phases 4–6 reused ids that SNAP items already held (CO-330–333, CO-340–345). The parameters moved to CO-1800–CO-1809 with their identifiers unchanged: ma_wawd_premium_cap_pct CO-330 → CO-1800, ma_mmmna_applicable_pct CO-331 → CO-1801, ma_sga_non_blind CO-332 → CO-1802, ma_sga_blind CO-333 → CO-1803, cccap_smi_income_limit_table CO-340 → CO-1804, cccap_smi_income_limit_each_additional CO-341 → CO-1805, leap_eligibility_period_start_month CO-342 → CO-1806, leap_eligibility_period_end_month CO-343 → CO-1807, leap_income_limit_monthly_each_additional CO-344 → CO-1808, cccap_asset_limit CO-345 → CO-1809. The SNAP items keep CO-330–345. Governance now reports a reused id as an error (`id.duplicate`).

## Phase 10: open-question sweep for CCCAP, LEAP and SUN Bucks (2026-11-21)

Items CO-2100–CO-2124, documents D-141–D-144 (and D-3, D-4, D-5 re-fetched: their files were missing), excerpts S1400–S1414.

- LEAP household (CO-1000, CO-1009): leaves out a member excluded for a missing SSN or an unverified status (OQ-370), does not cross to a person in institutional group care (OQ-358), drops a member of another approved household (3.751.2.A, CO-2100), and joins unrelated persons through the new symmetric relationship role `shares_heat_with` (engine: INVERSE_ROLE and RELS; OQ-132). LEAP is decided at `leap_application_date` (CO-2122, OQ-137). The income limit is CDHS's 2026-2027 season table (D-144, from cdhs.nxt-dev.colorado.gov, OQ-122).
- Target household: the grandmother is her own LEAP household; the family household is p2, p4, p5 with $3,560 counted, and the November benefit is $540 (was $450).
- SUN Bucks: `is_school_aged` (CO-1292) is derived from C.R.S. 22-33-104(1)(a) and moved to the sunbucks chapter; no Colorado Summer EBT rule exists (D-143).
- CCCAP: need for part-day care, activity time limits, the minimum-wage test, county residency and the entry/exit limits are modeled; the eligibility-granting defaults are gone.
- Renamed (same ID): CO-898 `is_absent_from_home` → `cccap_caretaker_is_involuntarily_absent` (3.111.D.1.b only; a voluntary absence exempts no one, OQ-136).
- ID retired: CO-1808 (`leap_income_limit_monthly_each_additional`): the season table runs to fifteen, the most 3.751.2.C allows.


CO-2105 (`county_of_residence`, text) retired at the phase-10 merge: the Medicaid sweep added the same fact as CO-1979 with the 64 counties as options; CO-1979 survives, `cccap_application_county` (CO-2106) takes the same options.

## Phase 10: supplied-facts round for SNAP, Colorado Works, Adult Financial, CCCAP and LEAP (2026-11-21)

Items CO-2300–CO-2399 (all used), excerpts S1600–S1637 (quoted from documents already in the volume: D-7, D-14, D-80, D-81, D-82, D-86, D-87, D-104; no new document), open questions OQ-490 and OQ-491, household case CO-83.

- Engine: P47 `the number of days from [date] to [date]` (`days_between`) for SNAP's exact-days initial-month proration (4.207.2.C) and Adult Financial's first-month proration.
- SNAP: shelter and dependent care are stated per member as billed or paid and counted by the member's disqualification (CO-2300–2302; OQ-28, OQ-29); the elderly and disabled separate household is wired into composition (CO-2303, CO-2304; OQ-37); initial-month proration, the ABAWD regained eligibility and additional three months, and voluntary quit (CO-2305–CO-2320; OQ-38); recertification re-verification (CO-2321–CO-2331; OQ-371, the $50 boundary still open); sponsor deeming exemptions and `members_excluded` (CO-2332–CO-2337; OQ-380). `snap_allotment` (CO-385) now prorates; the full-month figure is `snap_full_month_allotment` (CO-2307), which eligibility reads.
- Every program subtracts its own excluded income (CO-2338–CO-2345; OQ-390, SSI-method part open for Medicaid).
- Colorado Works: optional members join on request, the budgetary unit and stepparent deeming, sponsor deeming, and disqualified members removed from the unit size with gross earnings counted (CO-2346–CO-2369, CO-2383; OQ-101 in part, OQ-103, OQ-140, OQ-143, OQ-152; the M versus A.6 disregard wording is OQ-490); good cause and the county extension (CO-2370–CO-2373; OQ-316); a new source beside a current one (CO-2374; OQ-350); redetermination (CO-2375; OQ-373).
- Adult Financial: spousal, parental (AND-CS child) and sponsor deeming (CO-2384–CO-2388, CO-2392, CO-2393; OQ-114); own resources and sponsor resources (CO-2389, CO-2390; OQ-392); first-month proration and the birthday-month OAP transition (CO-2391; OQ-120, with OQ-491 for the inclusive day count); redetermination (CO-2376–CO-2378; OQ-373).
- CCCAP and LEAP: redetermination closure (CO-2379; OQ-373), the remaining verifications (CO-2394–CO-2399; OQ-378), vulnerability as a household element (CO-1004; OQ-381). Per-program verification request dates for SNAP, Colorado Works and Adult Financial (CO-2380–CO-2382; OQ-300).
- Neutral facts added: `sponsor_is_organization`, `sponsor_has_died`, `sponsor_gross_earned_income`, `sponsor_spouse_gross_earned_income`, `sponsor_unearned_income`, `sponsor_spouse_unearned_income`, `sponsor_support_paid_to_dependents_outside_home`, `sponsor_spouse_is_cosponsor`, `is_victim_of_battery_or_extreme_cruelty`, `sponsor_dependent_count`, `sponsor_has_spouse_in_household`, `receives_medicaid`. `is_sponsored_non_citizen` (CO-1573) now means a binding Form I-864 affidavit; `shelter_cost_monthly` (CO-035) and `dependent_care_expense` (CO-032) mean the member's own billed or paid amount.
- Household cases: no expectation changed. Added facts: CO-03 recertifies (so its $25 minimum stands), CO-07's parents receive Medicaid (so nothing is deemed to the AND-CS child), CO-71's grandfather has no I-864 sponsor. New case CO-83: a stepfamily applying on October 12 (SNAP $479 prorated, $743 full month; Colorado Works ineligible on the stepfather's $1,157 deemed income).
