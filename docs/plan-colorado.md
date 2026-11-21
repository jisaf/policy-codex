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
After phases 7–11, six high-effort reviewers, each writing to docs/reviews/: an HCPF program manager (Medicaid, CHP+), a CDHS program representative (SNAP, Colorado Works, Adult Financial, LEAP, SUN Bucks, CCCAP), a county case worker tracing why a case passed or failed, a Drools developer, a Corticon developer, and a developer building a new rules-as-code engine that executes the codex files directly as a directed acyclic graph. Findings are fixed or answered before the volume is called complete.
