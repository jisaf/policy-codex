# Colorado build plan

Spec: docs/design-colorado.md. One phase per program family; each phase ends with a policy review, the target household's expectations for that program filled and passing, and a phase note in docs/colorado-notes.md (what worked, what did not, where open questions cluster).

## Phase 1: platform (this branch)
- Volume selector, tag hierarchy with parent groupings, tag and group filters.
- Parameter versions with `to` and per-version source; rule effectivity; case-level relationships with inverses.
- `co` volume skeleton and the target household (CO-01, CO-02).
- Check script and CI run over every volume in the manifest.

## Phase 2: SNAP
Sources: 7 U.S.C. 2011–2036d; 7 CFR 271–273; 10 CCR 2506-1 (Colorado Food Assistance rules); FNS COLA memo for FY2027 and FY2026 (versioning); H.R.1 ABAWD provisions.
Chapters: household composition (purchase-and-prepare, mandatory members, ineligible and disqualified members, minor parents), citizenship and immigrant eligibility, categorical eligibility (BBCE in Colorado), gross and net income tests, deductions (standard, earned income, dependent care, medical for elderly/disabled, child support, shelter and SUA), resources, allotment, work registration and exemptions, ABAWD time limit and exemptions under H.R.1, students, elderly/disabled definitions, homeless shelter deduction, expedited service as an eligibility rule.

## Phase 3: MAGI Medicaid and CHP+
Sources: 42 U.S.C. 1396a, 1397aa–1397mm; 42 CFR 435 subpart B/C/E/G, 457; 10 CCR 2505-10 8.100 (all subsections); Colorado state plan pages; immigrant coverage under Colorado law (Cover All Coloradans).
Chapters: MAGI household construction (tax filer, dependent, non-filer rules, pregnancy counting), income (MAGI-based, 5% disregard), categories (children by age band, pregnant, parents/caretakers, adults, former foster youth, CHP+ children and prenatal), immigrant eligibility, continuous eligibility, presumptive eligibility, retroactive coverage, CHP+ premiums.

## Phase 4: non-MAGI, long-term care, waivers, Buy-In, MSP
Sources: 42 CFR 435 subpart D/F/H/I, 435.700–435.735 (post-eligibility), 435.1005–1012, 1396r-5 (spousal impoverishment), 1396p (transfers, estate recovery as a rule only); 10 CCR 2505-10 8.100.5–8.100.7, 8.110, 8.500s (waivers), 8.900s (PACE); SSI rules 20 CFR 416 by reference.
Chapters: SSI-related income and resource methodology, aged/blind/disabled, institutional eligibility, spousal impoverishment (CSRA, MMMNA, income allocation), transfer penalties and look-back, home equity, post-eligibility patient liability, HCBS waivers (financial rules; level of care supplied), Buy-In (WAwD, CBwD) income and premiums, MSP (QMB/SLMB/QI/QDWI), PACE.

## Phase 5: cash programs
Sources: 45 CFR 260–265; C.R.S. 26-2; 9 CCR 2503-6 (Colorado Works), 9 CCR 2503-5 (Adult Financial), 10 CCR 2505-10 8.940s (OAP health care).
Chapters: Colorado Works assistance unit, income and resources, grant calculation, time limits and exemptions as eligibility rules, work requirements as rules; OAP A/B, AND-SO/CS, AB eligibility and grant.

## Phase 6: CCCAP and LEAP
Sources: 8 CCR 1403-1; 8 CCR 1405-1 (LEAP).
Chapters: eligibility, income limits, activity requirements (as rules).

## Per-phase mechanics
1. Fetch documents into `volumes/co/documents/D-n.md`; append excerpts to sources.md with `Document: D-n`.
2. Author items in batches of ~30 with `rationale`, `nearest` acknowledged, `implemented: engine`, rule tests; run `npm run governance` and `npm run check`.
3. Write program cases (target household first) and fill CO-01/CO-02 expectations for the program.
4. Policy review by a separate reviewer role against the sources: completeness (statute/rule sections not represented), correctness (each rule vs its excerpt), cases (expected outcomes recomputed by hand).
5. Fix round; phase note.

## Completion phases (7–11), started 2026-11-21

Goal: every program a household can apply for through PEAK is in the volume, every element it reads is defined, document collection (verification) is modeled, and every open question that published Colorado or federal rule can answer is answered.

Network as of this date: the Colorado SOS CCR site (sos.state.co.us, official current rule PDFs), eCFR, govinfo, federalregister.gov, medicaid.gov, cms.gov, fns.usda.gov (redirects but serves), Cornell LII and leg.colorado.gov answer; hcpf.colorado.gov, cdhs.colorado.gov, cdec.colorado.gov, colorado.gov and ssa.gov refuse (403). State-published figures are taken from the rule text at SOS, from CMS publications on medicaid.gov (SSI and spousal impoverishment standards, eligibility levels, approved state plan amendments), and from FNS memos.

### Phase 7: Medicaid and CHP+ completion
Emergency Medicaid as its own determination (emergency medical condition, every other requirement met, the CHP+ prenatal route for undocumented pregnant people), the Breast and Cervical Cancer Program, family planning and the state Reproductive Health Care Program, the Old Age Pension Health Care and Supplemental programs, QDWI, the full HCBS waiver list with target groups, Pickle/DAC/widow(er) protected groups and 1619(b), Cover All Coloradans, and the state figures still supplied (children's income standard from the Medicaid/CHIP eligibility levels, CHP+ enrollment fee, CSRA/MMMNA/home equity/transfer divisor, MSP resource limits). IDs CO-1100–1199, documents D-65–D-79, excerpts S600–S699, open questions OQ-200–OQ-249.

### Phase 8: cash, food and the other PEAK programs
Home Care Allowance, Colorado Works diversion and sanctions (3.608), OAP/AND/AB grant standards and burial assistance from the current 9 CCR 2503-5, the Summer EBT (SUN Bucks) program, LEAP's own income table and benefit formula, the CCCAP gaps (K-4..K-9), and the SNAP updates (FY2027 COLA, standard utility allowances, Colorado's H.R.1 implementing rules). IDs CO-1200–1299, D-80–D-94, S700–S799, OQ-250–OQ-299.

### Phase 9: document collection (verification)
For every program: which elements must be verified and when (mandatory, questionable, at application, at renewal), what documents or electronic data sources satisfy each, the time the applicant has to provide them (including the reasonable opportunity period for citizenship and immigration status), and a per-program verification outcome. IDs CO-1300–1499, D-95–D-114, S800–S999, OQ-300–OQ-349.

### Phase 10: open-question sweep and reviews
Each open question is answered from published rule where one exists (the item is fixed and the question marked Resolved with the citation) or left open with the reason no published rule settles it. A policy review per new chapter, fix rounds, and a complex case per phase.

### Phase 11: wrap-up
Notes, README/volume.yaml status, handoff regenerated.

### Phase 12: stakeholder reviews (requested 2026-11-21)
After phases 7–11, six high-effort reviewers, each writing to docs/reviews/: an HCPF program manager (Medicaid, CHP+), a CDHS program representative (SNAP, Colorado Works, Adult Financial, LEAP, SUN Bucks, CCCAP), a county case worker tracing why a case passed or failed, a Drools developer, a Corticon developer, and a developer porting the codex to a fact-graph engine modeled on the IRS Direct File Fact Graph (github.com/IRS-Public/direct-file: direct-file/fact-graph-scala and the XML fact dictionaries) and on Code for America's fact_graph Ruby gem (github.com/codeforamerica/fact_graph: entity and aggregate facts, dry-schema inputs, evaluation that continues past unmet dependencies). Also a vocabulary review (data steward, docs/reviews/vocabulary-reuse.md): duplication, reuse that should happen, reuse that should not (income, household, disability, residency and the other terms each program defines differently), and clarity of names and meanings. Findings are fixed or answered before the volume is called complete.

### Phase 13: interfaces for policy and legal staff (requested 2026-11-21)
After the codex is complete and the stakeholder reviews are fixed. The current app exposes the ledger as items, tables and graphs; policy and legal staff who are not technical need a way in that starts from the questions they ask.
1. Discovery: walkthroughs of the current app by agents playing non-technical policy and legal staff (an HCPF eligibility policy analyst, a CDHS cash-programs policy lead, an assistant attorney general reviewing a rule change, a county eligibility supervisor), each with real tasks: find what a term means, check a figure against the rule, approve a change, answer an open question, explain a denial. Findings ranked by how often they block the task.
2. Design and build 3–5 new views, each a workflow rather than a data dump. Candidates:
   - By aid code: the program/category outcome a household ends in (what CBMS would assign), the rules that lead to it, and the figures it depends on. Requires an aid-code layer mapping each program outcome value to a code. Decision (2026-11-21, product owner): placeholder aid codes for now, clearly marked as placeholders, to be replaced with the CBMS codes when the list is supplied.
   - Open questions: a decision queue by program and owner, each question with the text it turns on, the assumption in force, the items and household outcomes that change if it is answered the other way, and an answer/approve action that opens a change.
   - By role: what HCPF Medicaid, CHP+, CDHS SNAP, cash, CDEC child care and Legal each own, need to approve, and have open.
   - Case walkthrough: step through a household's determination rule by rule, in plain language, with each value, the rule text it rests on, and where an unknown stopped it.
   - Approvals: what is waiting on whom, grouped by change, with the diff in plain language and its effect on outcomes.
3. Usability test of the new views by the same personas; fix round.

### Product-owner decisions (2026-11-21, on the design-limit questions)
- Nothing is deferred "until a case needs it": everything needed for certification at launch is in scope.
- Supplied facts are program-neutral statements of what is true of the person (one immigration status, one income receipt, one relationship). Each program's meaning of a shared word (income, household, caretaker, lawful presence, disability, student, ...) lives in that program's own derived items, never in a second supplied fact.
- Hard-coded figures in derivations become parameters or tables (OQ-82). Facts that another record or edge can supply are read from it, not entered twice (OQ-97, OQ-95). Where a rule asks for a lighter determination (attested rather than computed income, OQ-54), the ledger uses the lighter fact.
- OQ-44 is to be fixed: one immigration-status fact with the full documented category set; per-program derived eligibility. OQ-216, OQ-323, OQ-396 and OQ-413 are to be fixed in full.
Audits (read-only, docs/reviews/audit-*.md): hard-coded numbers; dual entry and derivable facts; heavier-than-needed definitions; same word, different meaning. A fix round follows each.

### Stopping rule (product owner, 2026-11-21)
The Colorado volume is complete when a fresh verification pass (one reviewer per program family, reading the current rule text) finds:
1. no P1: no wrong eligibility or benefit answer, no missing pathway or program, no element a rule reads that is undefined;
2. every remaining open question classed either as a genuine state policy choice (with the text checked recorded) or as blocked on a named document no allowed host serves;
3. if usage allows before the next usage reset, no P2 either (maintainability and approval-risk findings); otherwise every P2 is listed with its disposition.
`npm run check` (with the conformance self-check on every volume), typecheck and the unit tests pass at the commit the pass reviews.

### Phase 13 started early (2026-11-21)
The product owner asked for the UI work to run in parallel with the audit fix tracks. Discovery walkthroughs run now; the aid-code layer waits until the outcome names settle after fix track 1.
Scope (product owner, 2026-11-21): the app defines policy as rules; it is not a rules engine. No intake and no live calculation. The case walkthrough is a read-only step-through of the stored test households, and "what changes" compares stored cases before and after a staged rule change.
Added (product owner, 2026-11-22): a visual design pass after the UI fix round (layout, hierarchy, spacing, a consistent component style, the long walkthrough broken into sections or tabs); and two "blind builder" prototypes, built from the data and the user brief without seeing the current interface, under prototypes/, for comparison.

### Product-owner decision: the engine's role (2026-11-22)
The evaluator in `src/engine/` is the codex's test harness and the producer of the conformance suite, not a product. It runs definitions so rule tests and stored households prove each rule does what its meaning says, explains stored households, and shows a proposed change's effect to approvers. It does not do intake or live calculation for arbitrary households, and it is not to grow into a production engine. Guardrails: every new operator is justified by rule text that needs it and is documented in docs/operators.md (with its P-number in docs/conventions.md) for the engine teams in the same change.

### Product-owner decision: restructure and shared primitives (2026-11-23)
The restructure in docs/design-restructure-proposal.md is approved. Programs are independent: a cross-program read is allowed only for a primitive with one definition everywhere (age, dates, relationships, published figures). Complex program-specific calculations (income, resources, units, homelessness, countable expenses) are never shared; each program builds its own from the shared supplied facts. Every case matters, including edge cases; the stopping rule is unchanged.
