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
