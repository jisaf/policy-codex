# Open-question triage against published rule

Date: 2026-11-21. Branch: ccr-9d19bf4c-wmnwcl. Scope: the 127 questions in
`volumes/co/open-questions.md` whose heading does not say "Resolved". This note
proposes ledger changes; it edits nothing under `volumes/` or `docs/` other than
this file.

## Method and conventions

- Grepped the volume's own documents first (`volumes/co/documents/D-n.md`, line
  numbers below are those files' lines). Fetched only from the allowed hosts.
  New documents are saved under `/tmp/claude-0/oq-docs/` (text conversions in
  `/tmp/claude-0/oq-docs/txt/`). They are not yet in `documents.yaml`; a ledger
  round that adopts an answer should add them as new D-n documents.
- Verdicts. ANSWERED: published text settles the question. PARTLY: part is
  settled. POLICY CHOICE: the text leaves a state option, is silent or conflicts,
  or the question is a ledger-design choice no rule bears on. NEEDS FACT: the
  rule is clear and the ledger lacks a supplied fact (or, where stated, a
  relationship or engine capability) to express it. BLOCKED: the governing
  figure or text is on a refused or unreachable host, named.
- "ANSWERED (no change)" means the text confirms what the ledger already does;
  the question can be closed with the citation.

## New documents fetched this round

| Path under /tmp/claude-0/oq-docs/ | What it is | Source URL |
|---|---|---|
| fr-2026-22944.pdf, txt/fr-2026-22944.raw.txt | FNS proposed rule "Modification to Work Requirements for Able-Bodied Adults", 91 FR 72439 (Nov. 10, 2026), RIN 0584-AF09; comments close 2026-12-10 | https://www.govinfo.gov/content/pkg/FR-2026-11-10/pdf/2026-22944.pdf |
| fr-2026-22936.json | Metadata of FNS proposed rule "SNAP: Reforming Categorical Eligibility", 91 FR 72454 (Nov. 10, 2026) | https://www.federalregister.gov/api/v1/documents/2026-22936.json |
| fr-fns-search1.json | Federal Register API listing of FNS documents since 2025-07-01 (no final or interim SNAP rule implementing Pub. L. 119-21) | federalregister.gov API |
| fna-*.html | FNS (now "Food and Nutrition Administration", fns.usda.gov redirects to fna.usda.gov) OBBB memo landing pages; each embeds its PDF from www.usda.gov | https://www.fna.usda.gov/working-families-tax-cuts/snap/... |
| sos-2506-1-ruleinfo.html | SOS version list for 10 CCR 2506-1: current version is still the 10/01/2026 emergency rule (D-82); archived 12/30/2025 (12299) and 10/03/2025 (12181) | https://www.sos.state.co.us/CCR/DisplayRule.do?action=ruleinfo&ruleId=2818 |
| sos-10ccr2506-1-v12299.pdf, txt/sos-10ccr2506-1-v12299.txt | 10 CCR 2506-1, version effective 12/30/2025 (FY2026 tables) | https://www.sos.state.co.us/CCR/GenerateRulePdf.do?ruleVersionId=12299&fileName=10%20CCR%202506-1 |
| sos-10ccr2506-1-v12181.pdf, txt/sos-10ccr2506-1-v12181.txt | 10 CCR 2506-1, emergency version effective 10/03/2025 (same FY2026 tables) | ...ruleVersionId=12181... |
| sos-ag53.html, sos-rule31xx.html, sos-rule3457.html | SOS lists of CDHS Income Maintenance rules (9 CCR 2503-1..-10): no Summer EBT rule exists | sos.state.co.us |
| ecfr-42-435.551..560.xml, txt/ecfr-42-435.552-555.txt, txt/ecfr-42-435.559-560-551.txt | 42 CFR 435.551-435.560 (community engagement), eCFR as of 2026-11-19 | https://www.ecfr.gov/api/versioner/v1/full/2026-11-19/title-42.xml?part=435&section=... |
| ecfr-45-261.31.xml, ecfr-45-261.60.xml, txt/ecfr-45-261.31-60.txt | 45 CFR 261.31, 261.60 | eCFR as of 2026-11-19 |
| cornell-29usc206.html, txt/cornell-29usc206.txt | 29 U.S.C. 206 (FLSA minimum wage) | https://www.law.cornell.edu/uscode/text/29/206 |
| fr-2025-01377.pdf, txt/fr-2025-01377.txt | HHS 2025 poverty guidelines, 90 FR 5917 (Jan. 17, 2025) | https://www.govinfo.gov/content/pkg/FR-2025-01-17/pdf/2025-01377.pdf |
| crs2024-title-22.pdf, txt/crs2024-title-22.txt | C.R.S. title 22 (2024), incl. 22-33-104, 22-2-149 | https://leg.colorado.gov/sites/default/files/images/olls/crs2024-title-22.pdf |
| crs2024-title-25.5.pdf, txt/crs2024-title-25.5.txt | C.R.S. title 25.5 (2024), full title (D-69 is article 2 only) | .../crs2024-title-25.5.pdf |
| crs2024-title-26.pdf, txt/crs2024-title-26.txt | C.R.S. title 26 (2024), incl. 26-2-309 (Summer EBT) | .../crs2024-title-26.pdf |

Hosts that could not be read (not on the refused list, but the server or the
session's network policy denied them):

- www.usda.gov: every FNS OBBB memo PDF (alien eligibility, ABAWD exceptions,
  time-limit Q&A, energy assistance, internet expenses) is served from
  `www.usda.gov/sites/default/files/guidance-documents/...`, which answers
  "Access Denied" (Akamai). The fna.usda.gov pages carry only the titles. An
  archive.org copy was not attempted further after the session's permission
  layer refused it.
- acf.gov (LIHEAP IM 2025-02 and its SMI attachment): empty HTTP 202
  challenge; www.hhs.gov guidance portal copies: 403; liheapch.acf.gov: TLS
  failure through the proxy.
- The Firecrawl service was out of credits.

## SNAP

### OQ-1. Pub. L. 119-21 sec. 10108 and Colorado's 4.305
Verdict: PARTLY.
- Settled: the five-year bar does not reach Cuban/Haitian entrants. The
  question's premise that "1613(b) exempts refugees and asylees but not
  entrants" is wrong. 8 U.S.C. 1613(b)(1)(D), D-25:27-31:
  > (b) Exceptions The limitation under subsection (a) shall not apply to the following aliens: ...
  > (D) An alien who is a Cuban and Haitian entrant as defined in section 501(e) of the Refugee Education Assistance Act of 1980 .
  The draft's treatment (entrants eligible without a wait, CO-308) stands.
- Still open: the effective date FNS applies to current participants. FNS has
  issued "SNAP Implementation of the One Big Beautiful Bill Act of 2025 – Alien
  SNAP Eligibility – Revised" and "... Alien SNAP Eligibility – Question and
  Answer #1" (titles from `fna-working-families-tax-cuts_snap_alien-eligibility.html`,
  `fna-snap_obbb-alien-eligibility-qas1.html`, page updated 2026-11-20), but
  the text is only at www.usda.gov (Access Denied). No Federal Register rule
  amends 7 CFR 273.4 (`fr-fns-search1.json` and the term searches: the only
  FNS SNAP rules since July 2025 are the ABAWD and categorical-eligibility
  proposed rules, the cost-sharing proposed rules and retailer rules). The
  current 10 CCR 2506-1 is still the 10/01/2026 version (D-82;
  `sos-2506-1-ruleinfo.html`), and the 12/30/2025 version's history notes list
  no 4.305 amendment (`txt/sos-10ccr2506-1-v12299.txt`, editor's notes).
- Ledger change: CO-308 cites D-25 (1613(b)(1)(D)) for the entrant point; drop
  that half of the question. Keep the effective-date half open, tagged BLOCKED
  (www.usda.gov).
- Items: CO-306, CO-307, CO-308, CO-309, CO-310.

### OQ-2. "Elderly or disabled lawfully residing on August 22, 1996" versus 4.305.B.3.e
Verdict: ANSWERED.
- Citation: 8 U.S.C. 1612(a)(2)(I) and (F)(ii) (D-24:139-147, 101-117); 10 CCR
  2506-1 4.305.B.3.d-e (D-82:3944-3951).
- Quote (D-82:3944-3951):
  > d. Blind or Person with Disabilities
  > A non-citizen who is blind or a person with a disability if the non-
  > citizen is receiving benefits or assistance for their condition
  > regardless of entry date.
  > e. Born on or before August 22, 1931 who lawfully resided in the U.S.
  > on August 22, 1996.
- Answer: the brief merged two separate exemptions. The elderly one is the
  date-of-birth test CO-306 models (federal (I): lawfully residing and 65 or
  older on 1996-08-22). The disabled one has no 1996 condition at all: a blind
  or disabled non-citizen receiving disability benefits is exempt from the
  waiting period "regardless of entry date" (federal (F)(ii), D-24:117).
- Ledger change: CO-306 (snap_is_exempt_from_immigrant_waiting_period) is
  missing branch d. Add a disjunct for a person who is blind or disabled and
  receives benefits for it (the SNAP disability definition already read by
  snap_household_has_elderly_or_disabled_member's per-person test, or
  receives_ssi / receives_social_security_disability / is_disabled_ssa as that
  item uses them), and cite D-82:3944-3948 and D-24:117. Add a test: an LPR
  receiving SSI with a qualified_status_date two years ago is eligible.
  Remove OQ-2 from CO-306.
- Items: CO-306 (and through it CO-307, CO-308).

### OQ-3. No supplied fact establishes U.S. residency
Verdict: ANSWERED.
- Citation: 10 CCR 2506-1 4.303.A (D-82:3096-3099).
- Quote:
  > 4.303 RESIDENCY REQUIREMENT
  > A. Applicants shall live in the county or district in which they make application for the
  > Program ...
- Answer: a person meeting Colorado's residency requirement lives in a Colorado
  county and so is "a resident of the United States" (7 U.S.C. 2015(f)(1)); no
  separate fact is needed, but the SNAP citizenship test should read a
  residency conjunct rather than nothing.
- Ledger change: CO-307 (or CO-309) adds the residency read the other programs
  use (ma_meets_residency, CO-505, as CCCAP and LEAP already reuse it), citing
  D-82:3096-3099. The county-of-application half stays with OQ-159's missing
  county fact.
- Items: CO-307.

### OQ-12. ECE's TANF/MOE non-cash-service condition treated as always met
Verdict: POLICY CHOICE.
- Text checked: 10 CCR 2506-1 4.206.C.2.a (D-82:2383-2402): ECE requires
  households "who have been authorized to receive non-cash" TANF/MOE service,
  and "Language regarding the non-cash TANF/MOE funded program shall be provided
  on the application, application for recertification, periodic report form,
  and/or the statement of facts." The rule makes every applicant receive the
  language but never says receipt of the language is the authorization; the
  draft's reading is the natural one but not stated.
- Watch item: FNS proposed rule 2026-22936 (91 FR 72454, Nov. 10, 2026) would
  limit categorical eligibility to households receiving TANF "assistance" as
  defined at 45 CFR 260.31, ending non-cash ECE. It is a proposal (comments
  close 2026-12-10) and changes nothing today.
- Items: CO-339, CO-340.

### OQ-15. The FY2026 200% BBCE table (2025-10-01 to 2026-09-30)
Verdict: ANSWERED.
- Citation: 10 CCR 2506-1 4.401.1, version effective 12/30/2025 (and the
  identical 10/03/2025 emergency version). Saved:
  `/tmp/claude-0/oq-docs/sos-10ccr2506-1-v12299.pdf`, text
  `txt/sos-10ccr2506-1-v12299.txt:5134-5157` (v12181: same lines).
- Quote:
  > Effective October 1, 2025, the gross income levels for one hundred thirty percent (130%), two hundred
  > percent (200%), and one hundred sixty-five percent (165%) of the federal poverty level ...
  > 1 $1,696 $2,610 $2,152    2 $2,292 $3,526 $2,909    3 $2,888 $4,442 $3,665
  > 4 $3,483 $5,360 $4,421    5 $4,079 $6,276 $5,177    6 $4,675 $7,192 $5,934
  > 7 $5,271 $8,110 $6,690    8 $5,867 $9,026 $7,446    Each additional +$596 +$918 +$757
  (table rows condensed onto three lines; figures verbatim.) The same version
  states the FY2026 net (100%) levels ($1,305 ... $4,513, +$459, lines
  5163-5175), standard deduction ($209/$223/$261/$299, line 6604), shelter cap
  $744 (6647), homeless deduction $198.99 (6658) and SUAs $594/$377/$71/$97
  (6791-6843).
- Answer: determinations dated 2025-10-01 through 2026-09-30 use 200% limits of
  $2,610 (1) through $9,026 (8), +$918.
- Ledger change: add a version of snap_bbce_gross_income_limit_table (CO-122)
  and snap_bbce_gross_income_limit_each_additional (CO-123) valid
  2025-10-01..2026-10-01 with these figures; end the 2024-10-01 version at
  2025-10-01. Do the same for the 130%/165% and 100% tables if the ledger
  carries them as Colorado-sourced versions. Re-run CO-339-T1/T2. Add the
  document as a new D-n.
- Items: CO-122, CO-123.

### OQ-31. ABAWD age: "under 18, or over 65" - 18-65 or 18-64
Verdict: ANSWERED.
- Citation: FNS proposed rule, 91 FR 72439 (Nov. 10, 2026), sec. II "Age-Based
  Exceptions" and proposed 7 CFR 273.24(c)(1). Saved:
  `/tmp/claude-0/oq-docs/fr-2026-22944.pdf`, `txt/fr-2026-22944.raw.txt:376-412, 2383-2388`.
- Quote:
  > This proposed rule would amend paragraph 7 CFR 273.24(c)(1) to increase
  > the upper age limit to 65 years of age or older. ...
  > Although the OBBB did not change who is subject to the general work
  > requirements, it increased the upper age limit for the time limit to
  > include individuals through age 64.
  and the proposed text: "(c) Exceptions. The time limit does not apply to an
  individual if he or she is: (1) Under 18 or 65 years of age or older;".
- Answer: USDA reads "over 65" as excepting a person aged 65; the time limit
  reaches 18 through 64. The rule is a proposal, but the preamble describes
  itself as codifying "USDA's regulatory implementation" already in force, and
  no other federal or Colorado text reads the statute the other way.
- Ledger change: snap_abawd_max_age (CO-166) from 65 to 64 (CO-412 tests
  age <= max), citing 91 FR 72439; CO-412/CO-418 tests at age 65 flip to
  not_subject. Version it from 2025-07-04 (enactment) unless the FNS memo
  (blocked, see OQ-1) gives a later implementation date. Note in CO-405's
  rationale the preamble's point that persons 60-64 are not exempt from the time
  limit merely by age (proposed 273.24(c)(5) cites 273.7(b)(1)(ii)-(vii), not
  (i)); CO-414 should not let the 60+ general work-registration exemption
  carry over as an ABAWD exception.
- Items: CO-166, CO-412, CO-418 (and check CO-414).

### OQ-32. Homeless, veteran and former-foster-youth ABAWD exceptions
Verdict: ANSWERED (no change).
- Citation: same proposed rule, `txt/fr-2026-22944.raw.txt:465-490`.
- Quote:
  > The OBBB removes the temporary exceptions at Section 6(o)(3) of the Act
  > for homeless individuals, veterans, and individuals 24 years of age or younger
  > and in foster care on their 18th birthday ... This proposed rule would codify
  > USDA's regulatory implementation of these changes by replacing paragraphs 7
  > CFR 273.24(c)(7) through (8) ... and strike paragraph 7 CFR 273.24(c)(9).
- Answer: USDA treats the three exceptions as ended; Colorado's 4.311.1.C-E
  (D-82) is stale text, not a state option (the statute lists the exceptions;
  a state's only lever is the discretionary-exemption allotment of 7 U.S.C.
  2015(o)(6)). CO-414 is right.
- Ledger change: cite 91 FR 72439 on CO-414; close OQ-32. Also add the new
  exceptions the proposal names (Indian or Urban Indian, California Indian) if
  CO-414 lacks them (is_indian_or_urban_indian exists).
- Items: CO-414.

### OQ-34. "Single parent" for the student exemption
Verdict: ANSWERED.
- Citation: 10 CCR 2506-1 4.306.1.D and 7 U.S.C. 2015(e)(8) (sources S135, S133).
- Answer: the text is unambiguous: the exemption applies "where only one
  natural, adoptive, or stepparent ... is in the same SNAP household as the
  child". The open point is the ledger's approximation, not the rule.
- Ledger change: CO-409 should count the child's parents among
  snap_household_members (the engine's relationship operators already reach a
  child's parents; OQ-41 used shared_relative) and require exactly one, instead
  of testing the absence of a spouse edge.
- Items: CO-409.

### OQ-35. Federal minimum wage figure
Verdict: ANSWERED.
- Citation: 29 U.S.C. 206(a)(1)(C). Saved `/tmp/claude-0/oq-docs/cornell-29usc206.html`,
  `txt/cornell-29usc206.txt:15-21`.
- Quote:
  > (1) except as otherwise provided in this section, not less than—
  > (A) $5.85 an hour, beginning on the 60th day after May 25, 2007 ;
  > (B) $6.55 an hour, beginning 12 months after that 60th day; and
  > (C) $7.25 an hour, beginning 24 months after that 60th day;
- Answer: $7.25 from 2009-07-24.
- Ledger change: add the document; cite it on federal_minimum_wage (CO-160);
  close OQ-35. The same figure now also feeds 42 CFR 435.552(a)(6) (OQ-65).
- Items: CO-160.

### OQ-22. Child support paid: three-month averaging
Verdict: NEEDS FACT.
- Text: 4.407.5.D-E (D-82:7745-7752): households with three or more months of
  payments "shall have the support payments averaged", fewer than three are
  estimated. The rule is clear; the ledger's supplied monthly amount is assumed
  already averaged. A history-of-payments fact (or a meaning change on
  child_support_paid_legally_obligated saying it is the 4.407.5.D average)
  would state it.
- Items: CO-332.

### OQ-27. Earned income deduction base for a prorated ineligible member
Verdict: ANSWERED (no change).
- Citation: 10 CCR 2506-1 4.407.2.A (D-82:7414-7417): "The twenty percent (20%)
  deduction shall also apply to prorated income earned by the disqualified
  member and attributed to the household." CO-371/CO-372 implement exactly this;
  the open point was only why it is a new item. Close.
- Items: CO-371, CO-372.

### OQ-28. Proration of a disqualified member's billed shelter and dependent care
Verdict: NEEDS FACT. 4.411.1.B.2.c is clear; the ledger cannot say which member
is billed for an expense (needs a billed-member attribution on
shelter_cost_monthly and dependent_care_expense). Items: CO-374, CO-377.

### OQ-29. Summing shelter costs over members with a known value
Verdict: NEEDS FACT. The rule treats shelter cost as a household figure; the
ledger lacks a head-of-household (or household-level) shelter fact. Items: CO-377.

### OQ-30. Floor at $0 before the 50% shelter test
Verdict: POLICY CHOICE. Text checked: 7 CFR 273.10(e)(1)(i)(H)-(I) (D-14:85-87:
"Subtract from total shelter costs 50 percent of the household's monthly income
after all the above deductions have been subtracted"), 4.407.3 (D-82:7427-7450).
Neither addresses a negative intermediate figure. Items: CO-378.

### OQ-37. Elderly/disabled separate-household election not wired into composition
Verdict: NEEDS FACT (engine/structure). 273.1(b)(2) is clear; composition needs
a two-pass rule or an edge-exclusion read. Items: CO-305, CO-419.

### OQ-38. Initial-month proration, ABAWD regaining/additional months, voluntary quit
Verdict: NEEDS FACT. All three are stated in D-82 (cited in the question); the
ledger lacks an application date distinct from the determination date as an
initial-month marker, countable-month history and a quit-history fact. Items: CO-040, CO-418.

### OQ-251. Colorado has not adopted the H.R.1 SUA limit or the FY2027 elderly/disabled resource limit
Verdict: PARTLY.
- (2) Resource limit, settled: the FY2027 limit is FNS's indexed figure (D-83,
  S732: $4,750), required by 7 U.S.C. 2014(g)(1); a state rule cannot set a
  lower federal resource limit, so CO-119's FNS version stands (no change).
- (1) SUA energy-assistance route: the statute (sec. 10103) already governs and
  CO-1243 follows it. FNS's "SNAP Implementation of the OBBB – Treatment of
  Energy Assistance Payments – Revised" memo (title in
  `fna-snap_admin_energy-assistance-payments.html`) would give the
  implementation date; its text is only at www.usda.gov (Access Denied).
  BLOCKED for the date.
- Items: CO-119, CO-1243.

### OQ-353. SMED: expenses between $165 and $200
Verdict: POLICY CHOICE. Text checked: 4.407.61.A (S1013). The two sentences
leave a gap; the federal SMED rests on Colorado's demonstration terms, not
fetched. Items: CO-376.

### OQ-356. ECE gross income "below" or "at or below" 200%
Verdict: POLICY CHOICE. 4.401.A.1 (D-82:5704) and 4.206.C.2.a.1 (D-82:2384-2386)
conflict; the FY2026 version keeps the same pair (`txt/sos-10ccr2506-1-v12299.txt:5100`
"below", 2119 "at or below"). Items: CO-339, CO-340.

### OQ-309. SNAP "past due" marks the end of the time allowed
Verdict: ANSWERED (no change).
- Citation: 7 CFR 273.2(h)(1)(i)(C) (D-95:315): "Sufficient time shall be at
  least 10 days from the date of the State agency's initial request for the
  particular verification that was missing." The status label is consistent
  with the text; denial timing is out of scope. Close.
- Items: CO-1394.

### OQ-313. SNAP third-party citizenship statements
Verdict: NEEDS FACT. 4.505.5.B and 273.2(f)(2)(ii) state the conditions
(other forms cannot be obtained; reasonable explanation); no fact carries the
worker's finding. Items: CO-1372.

### OQ-323. Postponed verification: thirty days, or the second or third month
Verdict: ANSWERED (no change, one small fact gap).
- Citation: 7 CFR 273.2(i)(4)(iii)(A)-(B) (D-95:375-377): verification "may be
  postponed until the second month" / "may be postponed until the third month
  of participation, if necessary"; 10 CCR 2506-1 4.205 (D-103:180-187).
- Quote (D-103:183-187):
  > Except for migrant households needing out-of-state verification,
  > when the postponed verification is not completed within thirty (30)
  > calendar days from the date of application, the local office shall
  > terminate the household's participation on the thirtieth (30th)
  > calendar day without providing a notice of adverse action.
- Answer: the federal periods are permissive outer limits ("may"); Colorado
  elected thirty days for both groups, except migrants needing out-of-state
  verification. CO-1393 is right.
- Ledger change: none to the period. The migrant out-of-state exception needs a
  fact (NEEDS FACT) if a case requires it.
- Items: CO-1346, CO-1393.

### OQ-371. Recertification: the $50 boundary, changed expense sources, outdated information
Verdict: POLICY CHOICE. 4.502.B.2 (S1056) says both "fifty ($50) or more" must
be verified and "fifty dollars ($50) or less" need not; 273.2(f)(8)(i)(A) says
"more than $50". Exactly $50 is unsettled. Changed expense source and
outdated information are NEEDS FACT. Items: CO-1619 and the listed expense items.

### OQ-380. Sponsor verification: whose eligibility, which exemptions
Verdict: NEEDS FACT. 4.505.7.B-C and the deeming exemptions are clear; no facts
for indigence, forty quarters or battery. Items: CO-1573, CO-1616, CO-1654, CO-1672.

## Medical Assistance (MAGI) and CHP+

### OQ-42. MAGI household: joint-filing and non-custodial-parent exceptions
Verdict: NEEDS FACT.
- Citation: 10 CCR 2505-10 8.100.4.E.1.c.ii-iii and E.5 (D-65:1881-1883, 1901);
  42 CFR 435.603(f)(2)(iii)(A)-(B) (D-34:166-170).
- Quote (D-34:166-170):
  > (iii) Individuals under the age specified by the State ... who expect to be claimed as a tax
  > dependent by a non-custodial parent. For purposes of this section—
  > (A) A court order or binding separation, divorce, or custody agreement establishing physical custody controls; or
  > (B) If there is no such order or agreement or in the event of a shared custody agreement, the custodial
  > parent is the parent with whom the child spends most nights.
- Answer: the rule is fully stated, including the definition of custodial
  parent. Colorado adds a route the question omits: E.5, a child claimed by
  married parents filing jointly where one parent lives outside the household
  because of separation or pending divorce goes to non-filer rules (D-65:1901).
- Ledger change: (ii) can be derived from existing data: claimed by one parent
  (tax_dependent edge), two parents in the case, and the claiming parent not
  files_jointly_with_spouse (CO-077). (iii) needs a supplied
  `is_custodial_parent_of` relationship (or a per-child "custodial parent" fact)
  whose meaning quotes 435.603(f)(2)(iii)(A)-(B). E.5 needs a "parent lives
  outside the household due to separation or pending divorce" fact. Wire all
  three into CO-500's non-filer routing.
- Items: CO-500.

### OQ-44. lawful_presence_status as a separate fact
Verdict: POLICY CHOICE (ledger design; no rule text bears on it). Items: CO-084, CO-507, CO-509.

### OQ-49. Parents/Caretaker Relatives federal-floor comparison
Verdict: ANSWERED (no change).
- Citation: 42 CFR 435.110(b)-(c) (D-31:15-19).
- Quote:
  > (b) ... The agency must provide Medicaid to parents and other caretaker relatives ... whose
  > household income is at or below the income standard established by the agency in the State plan ...
  > (c) Income standard. The agency must establish in its State plan the income standard as follows:
  > (1) The minimum income standard is a State's AFDC income standard in effect as of May 1, 1988 ...
- Answer: the 1988 floor constrains the standard the State sets in its plan; it
  is not a second per-person test. The individual is tested only against the
  State plan standard (68%, D-65 8.100.4.G.3). CO-541 is right; close.
- Items: CO-541.

### OQ-50. Dependent-child deprivation
Verdict: POLICY CHOICE. 42 CFR 435.4 lets the State eliminate deprivation in its
State plan; 8.100.4.G.3 (D-65) states none. The election is in the state plan,
which is not in the volume. Items: CO-544.

### OQ-51. Caretaker relative's relation categories
Verdict: NEEDS FACT. 435.4 lists the relations (the same list appears at
42 CFR 435.554(a), `txt/ecfr-42-435.552-555.txt:119-125`); the volume's
caretaker edge does not record the relation degree. Items: CO-547.

### OQ-53. Continuous eligibility's other exceptions
Verdict: NEEDS FACT (death, inmate status, whereabouts, withdrawal, agency
error). Items: CO-555.

### OQ-54. Presumptive eligibility's attested income
Verdict: POLICY CHOICE (fact-interface choice; 8.100.4.F.2 and 435.1101-1102
do not require a separate figure). Items: CO-558, CO-559.

### OQ-55. Retroactive coverage "whichever is later"
Verdict: NEEDS FACT (month-by-month model; the text is clear). Items: CO-557.

### OQ-56. Presumptive eligibility's citizenship declaration
Verdict: NEEDS FACT (a declared-status fact distinct from the verified one). Items: CO-558, CO-559.

### OQ-59. State-employee-dependent exclusion (42 CFR 457.310(c))
Verdict: PARTLY.
- Citation: 42 U.S.C. 1397jj(b)(2)(B) and (b)(6) (D-30:3169, 3215-3229); 42 CFR
  457.310(c)(1) (D-36:660-662).
- Quote (D-30:3169):
  > except as provided in paragraph (6), a child who is a member of a family that is eligible for health
  > benefits coverage under a State health benefits plan on the basis of a family member's employment
  > with a public agency in the State.
- Answer: the exclusion is part of the federal definition of a targeted
  low-income child, so it applies to CHP+ whether or not 10 CCR 2505-3 restates
  it; the question's premise that it needs a state rule is wrong. Whether
  Colorado uses the paragraph (6) exceptions (maintenance of agency
  contribution, or hardship) is a State plan election not in any fetched text,
  and C.R.S. title 25.5 (`txt/crs2024-title-25.5.txt`) states none: POLICY
  CHOICE for that half.
- Ledger change: add a supplied fact
  `eligible_for_state_health_benefits_plan_via_public_agency_employment`
  (meaning per 457.310(c)(1)(i)-(ii), including the "more than nominal
  contribution" test) and a CHP+ exclusion in CO-705, citing D-30:3169 and
  D-36:660-662, with the (6) exception recorded as an open state option.
- Items: CO-705, CO-706.

### OQ-60. § 320 copayment schedule and the 5% aggregate cap
Verdict: NEEDS FACT (running cost-sharing total). Items: CO-213.

### OQ-62. chp_household_* identifiers not created
Verdict: POLICY CHOICE (ledger design under derived.alias). Items: none.

### OQ-64. CHP+ cost-sharing exemptions and the § 320 schedule
Verdict: ANSWERED (exemptions; schedule stays with OQ-60).
- Citation: 10 CCR 2505-3 §§ 330.1, 330.3, 330.4 (D-66:653-667).
- Quote:
  > 330.1 American Indians and Alaskan Natives shall be exempt from cost sharing requirements. American
  > Indian shall mean a member of a federally recognized Indian tribe, band, or group, or a descendant in the
  > first or second degree of any such member. ...
  > 330.3 No copayments shall apply to preventive services. ...
  > 330.4 Prenatal Care Program clients shall be exempt from cost sharing requirements.
- Ledger change: add chp_is_exempt_from_cost_sharing (person) reading
  chp_prenatal_is_eligible (CO-706) and an American Indian/Alaska Native test.
  Note 330.1's definition (tribal member or first/second-degree descendant)
  is not the IHCIA definition is_indian_or_urban_indian carries; either widen
  that fact's meaning or add a 330.1-specific fact. No eligibility outcome
  changes.
- Items: CO-213 (new item).

### OQ-65. Community engagement (42 CFR 435.119(d))
Verdict: PARTLY.
- Citation: 42 CFR 435.551-435.560, eCFR as of 2026-11-19 (added by the CMS rule
  of 2026-06-03, 2026-11094). Saved `ecfr-42-435.55x.xml`,
  `txt/ecfr-42-435.559-560-551.txt`, `txt/ecfr-42-435.552-555.txt`.
- Quote (435.559(a), `txt/ecfr-42-435.559-560-551.txt:3`):
  > (a) Unless granted an exemption under § 435.560, the agency must require applicable individuals, as
  > defined at § 435.551, to comply with the requirement to demonstrate community engagement under
  > §§ 435.552 and 435.556, or be deemed to have demonstrated community engagement under § 435.553 or,
  > if applicable, § 435.555, as a condition of eligibility for medical assistance furnished on or after
  > January 1, 2027.
- Settled by federal text: the date (January 1, 2027; enrolled beneficiaries at
  the first renewal on or after it, 435.559(c)); who is subject (435.551: the
  Adults group, or 1115 expansion-like coverage for ages 19-64, not pregnant,
  not in Medicare); what counts (435.552: 80 hours of work, community
  service or a work program, half-time education, any combination, or income
  of at least the 29 U.S.C. 206(a)(1)(C) minimum wage times 80 hours, or the
  seasonal-worker average); mandatory exceptions (435.553: under 19, Medicare,
  a mandatory 1902(a)(10)(A)(i)(I)-(VII) group, a specified excluded
  individual, or an inmate in the prior 3 months) and the excluded list of
  435.554 (former foster youth, and others listed there).
- Not settled: whether Colorado has a CMS good-faith exemption (435.560, up to
  2028-12-31), and Colorado's options (the 435.555 short-term hardship
  exception; the 435.556 look-back period). No Colorado rule (D-65) states
  them: POLICY CHOICE for those.
- Ledger change: add ma_meets_community_engagement as a conjunct of CO-548 with
  an effective range from 2027-01-01, its exception and exclusion items, and
  supplied facts for monthly hours by activity, half-time enrollment and
  seasonal-worker status (MAGI income and federal_minimum_wage already exist).
  This is the largest pending eligibility effect in the Medicaid chapter: it
  denies Adults-group coverage from 2027-01-01 to anyone not meeting it.
  Model the mwr volume's WR-2xx items as a shape only.
- Items: CO-548 (new items).

### OQ-302. Reasonable compatibility: 20% of what
Verdict: POLICY CHOICE. 8.100.4.C.2.a.ii (S864) does not say; Colorado's
Medicaid verification plan (which would) was not fetched. Items: CO-1350, CO-1402, CO-1403.

### OQ-303. Period for other Medical Assistance documentation
Verdict: POLICY CHOICE. 435.952(c)(2)(iii) requires "a reasonable period";
Colorado states none. Items: CO-1349, CO-1414, CO-1415.

### OQ-382. One request fact for Medical Assistance and CHP+
Verdict: NEEDS FACT (per-program request facts). Items: CO-1415, CO-1418, CO-1560.

## Medical Assistance: non-MAGI, long-term care, other groups

### OQ-82. Buy-In premiums as case expressions
Verdict: POLICY CHOICE (ledger parameter types). Items: CO-619, CO-620.

### OQ-83. SSI-related couple income allocation
Verdict: NEEDS FACT (ineligible spouse and child income facts). Items: CO-605, CO-606, CO-607.

### OQ-94. Transfer penalty start date
Verdict: NEEDS FACT (date otherwise eligible; prior penalty periods). Items: CO-649, CO-651, CO-652.

### OQ-95. Family allowance's family-member group
Verdict: POLICY CHOICE (ledger design). Items: CO-657, CO-838.

### OQ-96. Income trust mechanics
Verdict: NEEDS FACT (trust distribution facts); the private-pay ceiling is
BLOCKED with OQ-212. Items: CO-642, CO-823.

### OQ-97. Community spouse facts supplied directly
Verdict: POLICY CHOICE (ledger design). Items: CO-643, CO-655-CO-657, CO-833-CO-835.

### OQ-98. Veterans PNA ($90) not wired
Verdict: NEEDS FACT.
- The rule is clear (D-65:4337-4339) and the statute adds a case the question
  omits: C.R.S. 25.5-6-206(2)(b)(II) also gives $90 to "a medical assistance
  member who is a surviving spouse of a person who received a non-service
  connected disability pension" (`txt/crs2024-title-25.5.txt:17072-17079`).
- Ledger change: a supplied fact for receipt of a VA non-service-connected
  pension (self or deceased spouse), no spouse or dependent child, then
  ma_patient_payment selects CO-255.
- Items: CO-887, CO-255, CO-658.

### OQ-99. Income trust private-pay ceiling
Verdict: BLOCKED. The regional average private-pay rate is calculated by HCPF
annually (D-65:3291) and published only on hcpf.colorado.gov. Items: CO-642.

### OQ-100. PACE first among settings
Verdict: POLICY CHOICE (no text orders the settings). Items: CO-652.

### OQ-126. The CSRA formula
Verdict: ANSWERED.
- Citation: 42 U.S.C. 1396r-5(f)(2)(A)(i) (D-47:287-293); 10 CCR 2505-10
  8.100.7.M.1 (D-65:4053-4059).
- Quote (D-47:287-293):
  > (2) Community spouse resource allowance defined ... an amount (if any) by which—
  > (A) the greatest of—
  > (i) $12,000 (subject to adjustment under subsection (g)), or, if greater (but not to exceed the amount
  > specified in clause (ii)(II)) an amount specified under the State plan,
- Answer: federal law lets the State plan set the community spouse's standard
  anywhere up to the indexed maximum. A State that sets it at the maximum gives
  the community spouse min(total resources, maximum), which is exactly
  8.100.7.M.1.a. Colorado's text is a permitted federal shape (a "maximum
  standard" election), not a drafting gap, and the half-share and
  minimum-standard terms never bind for it. ma_csra is right.
- Ledger change: cite D-47:287-293 on CO-646 and close OQ-126. Separately,
  M.1 says the CSRA is "the largest of" (a), (b) the 8.100.7.S increased CSRA,
  and (c) a court-ordered amount (D-65:4053-4059); CO-646's derivation is only
  (a). If the S increase and the court order are modeled elsewhere, CO-646 should
  take the max of the three; if not, record that as a NEEDS FACT gap.
  csra_minimum_standard (CO-827) has no Colorado consumer.
- Items: CO-646, CO-827.

### OQ-127. Buy-In bypass of spousal impoverishment
Verdict: NEEDS FACT (engine dependency order; the rule is clear). Items: CO-643, CO-653.

### OQ-144. CBwD premium wording
Verdict: POLICY CHOICE (the text is internally inconsistent). Items: CO-621.

### OQ-145. MMMNA July versus January timing
Verdict: PARTLY.
- Citation: HHS 2025 poverty guidelines, 90 FR 5917 (Jan. 17, 2025). Saved
  `/tmp/claude-0/oq-docs/fr-2025-01377.pdf`, `txt/fr-2025-01377.txt:11-36`.
- Quote:
  > 2025 POVERTY GUIDELINES FOR THE 48 CONTIGUOUS STATES AND THE DISTRICT OF COLUMBIA
  > 1 .... $15,650   2 .... 21,150   3 .... 26,650   4 .... 32,150
  > 5 .... 37,650   6 .... 43,150   7 .... 48,650   8 .... 54,150
  > For families/households with more than 8 persons, add $5,500 for each additional person.
- Answer: the figure that applies January-June 2026 is the one set in July 2025:
  150% x $21,150 / 12 = $2,643.75 (8.100.7.Q.1.a's formula). From July 1, 2026
  it is $2,705.00 (D-72).
- Ledger change: add a 2025 version to ma_poverty_guideline_table (CO-181).
  Because the engine cannot look a parameter up as of a different date, the
  simplest exact fix is to make the MMMNA a dated parameter (versions
  2025-07-01: 2,643.75; 2026-07-01: 2,705.00, each cited to the guideline and
  8.100.7.Q.1.a) or a derivation that selects the guideline version by the
  preceding July. The engine half stays open.
- Items: CO-662, CO-181.

### OQ-200. Emergency Medicaid "otherwise eligible"
Verdict: POLICY CHOICE. 1396b(v)(2)(B) reads any State plan group; whether the
HCBS special income group counts for a non-institutionalized applicant is not
settled by fetched text. Items: CO-1150 and the listed items.

### OQ-201. BCCP "woman"
Verdict: POLICY CHOICE (§ 8.715.2.C.1 says woman; 1396a(aa) states no sex). Items: CO-1152, CO-1101.

### OQ-202. BCCP transfer requirement and stale cross-reference
Verdict: POLICY CHOICE (the current text's cross-reference is stale). Items: CO-1102, CO-1152.

### OQ-203. 2002 edition of C.R.S. 10-16-102
Verdict: BLOCKED. leg.colorado.gov publishes only current C.R.S. editions
(the 2025 title PDFs 404; 2024 is the latest); no allowed host carries the
2002 edition. Items: CO-1152, CO-1191, CO-1192.

### OQ-204. Limited Family Planning household of two and the 5% disregard
Verdict: POLICY CHOICE (evidence both ways recorded in the question). Items: CO-1153, CO-1154, CO-1155.

### OQ-205. Reproductive health-care program
Verdict: NEEDS FACT (a child declining state medical assistance). Items: CO-1154.

### OQ-206. OAP Health Care: OAP-C and former recipients
Verdict: NEEDS FACT (court-commitment fact; former OAP receipt lost to a COLA). Items: CO-1156, CO-1177.

### OQ-207. Pickle countable income
Verdict: ANSWERED.
- Citation: 10 CCR 2505-10 8.100.6.E.1.e-E.2 (D-65:2799-2801); 42 CFR
  435.135(a)(3), (b) (D-31:394-396).
- Quote (D-65:2799-2801):
  > e. subtract the Pickle Disregard amount from the current OASDI income to get the countable OASDI income.
  > 2. If the countable OASDI income and all other countable income is less than the current SSI or OAP
  > standard, and the individual meets all other eligibility criteria then medical eligibility must continue ...
- Answer: the disregard comes off the OASDI benefit first ("deducted from
  current OASDI benefits", 435.135(a)(3)); SSI exclusions ($20 general,
  earned-income exclusion) then apply to the reduced income. 435.135(b) adds
  COLAs of a financially responsible spouse or parent.
- Ledger change: CO-1158 computes SSI countable income from (social_security_income
  - pickle disregard) plus other income, rather than subtracting the disregard
  after the exclusions (same result except where the $20 is not fully used by
  unearned income). Spouse/parent COLAs stay NEEDS FACT.
- Items: CO-1158.

### OQ-208. Disabled Adult Child countable income
Verdict: ANSWERED.
- Citation: 8.100.6.J.1.c (D-65:2877-2881).
- Quote:
  > i) the current OASDI income of the applicant is disregarded; and ...
  > iii) other countable income is below the current years SSI FBR.
- Answer: the OASDI is removed before "other countable income" is computed, so
  the $20 general exclusion applies to the other income.
- Ledger change: CO-1160 computes SSI countable income over income other than
  social_security_income, instead of subtracting OASDI after exclusions.
- Items: CO-1160.

### OQ-209. Disabled widow(er)s and closed groups
Verdict: POLICY CHOICE (§ 8.100.6.I.1.f states no test; closed cohorts). Items: CO-1162, CO-1163.

### OQ-210. HCBS target groups
Verdict: NEEDS FACT (diagnoses, settings, BI onset age). Items: CO-1164, CO-821, CO-653.

### OQ-212. Transfer-penalty divisor and institutional PNA
Verdict: BLOCKED.
- Checked: § 8.100.7.F.2.c.i (D-65:3467) and § 8.100.7.V.3.d.i.2
  (D-65:4333) state only the methods; the statute C.R.S. 25.5-6-206(2)(a)
  (`txt/crs2024-title-25.5.txt:17062-17068`) states the $75 base and the
  indexing ("the basic minimum amount must increase annually by the same
  percentage applied to the general fund share of the aggregate statewide
  average of the per diem net of patient payment"), not a 2026 figure. No other
  SOS rule (8.400s in D-55: PNA "is the amount specified in Section 8.110.7.V")
  states either figure. Both are published only on hcpf.colorado.gov.
- Ledger change: cite C.R.S. 25.5-6-206(2)(a) on CO-887's meaning.
- Items: CO-832, CO-887, CO-649, CO-659, CO-658.

### OQ-213. Five-year rule exemptions and the date of entry
Verdict: PARTLY.
- Settled: 8 U.S.C. 1613(a) (D-25:13) runs the five years "beginning on the
  date of the alien's entry into the United States with a status within the
  meaning of the term 'qualified alien'", so counting from qualified_status_date
  (CO-508) matches the federal text that 8.100.3.G.1.g.iii applies. 1613(b)(1)
  (D-25:15-31) exempts refugees, asylees, withholding grantees, Cuban/Haitian
  entrants and Amerasians whether or not adjusted to LPR, which supports
  CO-1172's reading of iv.
- Not settled: whether Colorado covers adult parolees, conditional entrants and
  battered non-citizens after five years (a State option under 8 U.S.C. 1612(b));
  the current iii lists LPRs only. POLICY CHOICE.
- Items: CO-509, CO-1172, CO-1170, CO-506, CO-508.

### OQ-214. Cover All Coloradans' categories
Verdict: PARTLY.
- Citation: C.R.S. 25.5-2-104(2) and 25.5-5-201(6)(a)-(b)
  (`txt/crs2024-title-25.5.txt:2926-2928, 10761-10767`).
- Quote:
  > (2) A child who is less than nineteen years of age is eligible to receive state medical
  > assistance if the child would be eligible for medical assistance ... but is not eligible due solely to the child's immigration status.
  > (6) (a) Beginning no later than January 1, 2025, a pregnant person who is not a citizen ... is eligible
  > to receive medical assistance ... if the individual meets the eligibility requirements other than those related to citizenship and immigration status.
- Answer: for children and pregnant people the statute is not limited to the
  categories ix.1.a-b lists: a child who would be eligible in any category
  (including SSI-related) gets state medical assistance, and a pregnant
  non-citizen meeting any category's other requirements is eligible, with
  12 months postpartum continuous eligibility under (6)(b). The exhaustive
  reading of the rule is therefore wrong for those two groups. A postpartum
  person who was not covered while pregnant is not reached by (6)(b); that
  part of the rule's ix.1 population stays a POLICY CHOICE.
- Ledger change: the routing that reports "emergency-only" for an undocumented
  child or pregnant person whose only category is not in ix.1.a-b (CO-1175,
  CO-510, CO-562) should report full coverage (for a child, through state
  medical assistance as CO-1154 already does), citing the two statutes.
- Items: CO-509, CO-1173, CO-1174, CO-1175, CO-562, CO-510.

### OQ-215. Limited family planning: no age or gender restriction
Verdict: POLICY CHOICE (G.8 and 8.730 conflict). Items: CO-1154.

### OQ-216. Lottery and gambling winnings
Verdict: PARTLY.
- Citation: 42 U.S.C. 1396a(e)(14)(K)(i)-(iii) (D-26:1609-1631).
- Quote:
  > (I) in the month in which such winnings or income (as applicable) is received if the amount ... is less than $80,000;
  > (II) over a period of 2 months if the amount ... is greater than or equal to $80,000 but less than $90,000;
  > (III) over a period of 3 months if ... greater than or equal to $90,000 but less than $100,000; and
  > (IV) over a period of 3 months plus 1 additional month for each increment of $10,000 ... not to exceed a
  > period of 120 months (for winnings or income of $1,260,000 or more), if ... greater than or equal to $100,000.
- Answer: the federal thresholds are $80,000/$90,000/$100,000, so exactly
  $79,999 and $89,999 fall in the month-received and two-month bands as CO-1183
  and CO-1185 read them; months = 3 + one per started $10,000 above $90,000,
  matching the draft; there is a 120-month cap Colorado does not restate; and
  (ii) requires equal monthly installments. The provision covers qualified
  lump-sum income too, and only MAGI determinations.
- Ledger change: add the 120-month cap to CO-1183/CO-1185, cite D-26 on both.
  One-receipt-per-person and the hardship exemption (State procedures,
  (K)(iii)) remain NEEDS FACT.
- Items: CO-1181-CO-1187, CO-503.

### OQ-217. Discharged student loan debt discretion
Verdict: POLICY CHOICE (the rule reserves Department discretion). Items: CO-1190, CO-1189.

### OQ-372. Renewal: citizenship information and the five-year gap
Verdict: NEEDS FACT (gap and retention). Items: CO-1395, CO-1566.

### OQ-374. ABD reasonable compatibility uses gross income and the individual rate
Verdict: NEEDS FACT (couple and countable-income comparison). Items: CO-1589, CO-1640.

### OQ-379. LTC documentation
Verdict: NEEDS FACT. Items: CO-1631, CO-1632, CO-1637.

## Colorado Works and Adult Financial

### OQ-101. Colorado Works three-caretaker units
Verdict: NEEDS FACT (unit composition). Items: CO-274 ... CO-927.

### OQ-102. Minor-parent deeming "needs" deduction
Verdict: PARTLY.
- Citation: 9 CCR 2503-6 3.605.1.A.4.a (D-81:2333-2346).
- Quote (D-81:2343-2346):
  > ... The needs of the stepparent or parent of
  > the minor parent, and the needs of individuals living in the home for whom the
  > stepparent or parent are responsible shall be deducted from the result to
  > determine the amount attributed to the assistance unit.
- Settled: the deduction covers the parent and the people in the home the
  parent is responsible for; CO-909 deducts only the parent's own needs. Not
  settled: which dollar measure "needs" means (the need standard is the
  natural reading; the text does not say): POLICY CHOICE.
- Ledger change: CO-909 deducts the need standard for a group of one plus the
  count of the non-participant parent's other dependents in the home (in CO-01,
  p3 plus p4), not size 1.
- Items: CO-909.

### OQ-103. Sponsor and disqualified-member deeming
Verdict: NEEDS FACT (unmodeled; D-81:2351-2400 is clear). Items: CO-910.

### OQ-104. Work participation monthly-hour equivalent
Verdict: POLICY CHOICE.
- Text checked: 45 CFR 261.31(a)(1) (`txt/ecfr-45-261.31-60.txt:5`):
  "participates in work activities during the month for at least a minimum
  average of 30 hours per week". The test is a weekly average over the month;
  45 CFR 261 states no weeks-per-month factor (the only federal factor found is
  4.33, in 42 CFR 435.552(d)(1)(ii), a different program). 261.31 measures
  the State's participation rate, and no fetched Colorado text (D-81) makes it
  an individual eligibility condition.
- Items: CO-919, CO-920.

### OQ-113. AND-SO medical certification
Verdict: NEEDS FACT. Items: CO-944.

### OQ-114. Spousal and sponsor deeming (Adult Financial)
Verdict: NEEDS FACT. Items: CO-946, CO-947.

### OQ-119. OAP: citizen/qualified alien versus "all non-citizens are eligible to apply"
Verdict: ANSWERED (no change).
- Citation: C.R.S. 26-2-111(2)(a)(I) (D-59:970-977); 9 CCR 2503-5 3.520.67.E
  (D-80:2068-2070).
- Quote:
  > (2) Old age pension. (a) ... the old age pension shall be granted to any person who
  > meets the requirements of subsection (1) of this section and any one of the following requirements:
  > (I) The person is a United States citizen or a qualified alien, has attained the age of sixty years ...
  and the rule: "all non-citizens are eligible to apply for OAP."
- Answer: the statute states the eligibility test; the rule speaks only of
  applying. CO-943 follows the statute; close. Note 26-2-111(2)(c)
  (D-59:999-1020) restricts qualified aliens further (sponsor and abandonment
  conditions); if CO-943 does not model (2)(c), record that as NEEDS FACT.
- Items: CO-943.

### OQ-120. Mid-month proration and the OAP birthday transition
Verdict: NEEDS FACT. Items: CO-951, CO-952.

### OQ-138. AND-SO and an SSDI recipient
Verdict: POLICY CHOICE. The current 3.540 (D-80:4197-4200) still says AND-SO
is for those who "have not been approved for ... (SSDI)"; the statute
26-2-111(4)(a) names SSDI as a route. The texts conflict. Items: CO-953.

### OQ-140. Budgetary unit members
Verdict: NEEDS FACT. Items: CO-910.

### OQ-142. 20% statewide extension cap
Verdict: NEEDS FACT (caseload aggregate; not per-person expressible). Items: CO-925.

### OQ-143. Disqualified-member penalties
Verdict: NEEDS FACT (unit-size versus income membership; M.4 SSN fact). Items: CO-900, CO-907, CO-910, CO-915, CO-923, CO-928.

### OQ-151. AND-SO SSI/SSDI application duty
Verdict: NEEDS FACT. Items: CO-944, CO-953.

### OQ-152. Optional assistance-unit members
Verdict: NEEDS FACT (a request-for-inclusion fact). Items: CO-900.

### OQ-153. "Shall not exceed" versus "equals or exceeds"
Verdict: POLICY CHOICE (the current text, D-81, keeps both). Items: CO-913.

### OQ-250. Home Care Allowance tiers, the HCBS transition, "home"
Verdict: BLOCKED (tier amounts), with NEEDS FACT parts.
- Checked: 9 CCR 2503-5 3.570.11.B, 3.570.13.C-D (D-80:5717-5718, 5867-5880)
  state tiers by score and the $977 floor but no tier maximum; C.R.S.
  26-2-122.3 (D-59:1790-1856) leaves amounts to rule. The tier maximums are
  published only by CDHS (cdhs.colorado.gov).
- The three-month HCBS transition (3.570.11.A.2.b, D-80:5704-5709) is clear:
  NEEDS FACT (a fact that the transition is delayed outside the client's
  control, and the reassessment date). "Other temporary setting": NEEDS FACT.
- Items: CO-1206, CO-1217, CO-1218, CO-1219.

### OQ-252. Colorado Works sanctions and diversion
Verdict: POLICY CHOICE (county diversion limit and State plan maximum are
county/State options; the default for an unstated sanction level is a NEEDS FACT
case-coverage device). Items: CO-1261, CO-1264, CO-1268, CO-1270.

### OQ-350. New and current earnings in one month
Verdict: NEEDS FACT (per-source income). Items: CO-922, CO-1502.

### OQ-351. Adult Financial $20 rollover and SSI
Verdict: POLICY CHOICE. 3.533.A.2.a defines gross unearned income "from all
sources" and A.2.c.2 (D-80:4074-4076) gives an SSI-only client no disregard;
A.2.f's literal reading (CO-946) is supported by A.2.a, the SSI-order reading by
20 CFR 416.1124. The text does not settle it. Items: CO-946.

### OQ-352. Adult Financial PNA
Verdict: POLICY CHOICE for (1); NEEDS FACT for (3)-(4).
- (1) 3.532.C-F (D-80:4013-4037) calls the PNA a "grant standard" and a "PNA
  maximum" of $79 and is silent on income. Supporting the ledger's
  income-deducted reading: 10 CCR 2505-10 8.100.7.V.3.d.j (D-65:4415) has Adult
  Financial pay "the difference between the reduced SSI payment and the
  personal needs allowance amount" to a nursing facility resident, which is a
  top-up net of income. Not conclusive for the $79.
- (3) psychiatric facility at 65+, (4) unlicensed facility: NEEDS FACT.
- Items: CO-951, CO-952, CO-1510.

### OQ-354. Death reimbursement order of offsets
Verdict: POLICY CHOICE. Items: CO-1508.

### OQ-355. Burial: prepaid plot and the $2,500 limit
Verdict: POLICY CHOICE. Items: CO-1221, CO-1230, CO-1231.

### OQ-357. Adult Financial bar on Colorado Works
Verdict: NEEDS FACT (closure reasons, withdrawal, F.1 application duty). Items: CO-953, CO-1203, CO-1511.

### OQ-373. Renewal verification for Colorado Works, Adult Financial, CCCAP
Verdict: NEEDS FACT (renewal facts). Items: CO-1433, CO-1436, CO-1424, CO-1448.

### OQ-375. AND-SO certification: thirty days after the interview
Verdict: NEEDS FACT (interview date). Items: CO-1438, CO-1599, CO-1669.

### OQ-376. Department of Revenue Rule 5 repealed
Verdict: PARTLY.
- Settled for Colorado Works: 3.604.3.I.1 incorporates Rule 5 Appendices A and B
  "(Mar. 2, 2021), no later editions", so the repeal does not change what
  Colorado Works accepts (OQ text; D-104; D-119).
- Not settled for LEAP: 3.753.11 and 3.753.14 name the appendices with no
  edition; once Rule 5 is repealed (effective 10/15/2026, withdrawal
  12/31/2026, D-120 S1072/S1098) the reference points at nothing current.
  POLICY CHOICE. The DMV check (H.4) is NEEDS FACT.
- Items: CO-1644, CO-1657.

## CCCAP and LEAP

### OQ-121. CCCAP county entry income limit
Verdict: BLOCKED.
- Checked: 8 CCR 1403-1 3.111.H.1.a (D-87:1681-1683) and the definition at
  3.103.XXXX (D-87:781-783: "'Self-sufficiency standard' means the level of income
  adequate in each county for a given year"). The rule fixes the floor (185% FPG)
  and cap (85% SMI) and has the Department set the level per county; the
  county figures are published only by CDEC (cdec.colorado.gov).
- Items: CO-870, CO-986.

### OQ-122. LEAP income limit (60% SMI)
Verdict: BLOCKED.
- Checked: 9 CCR 2503-7 3.752.22.D (D-86:1320-1336) incorporates 45 CFR 96.85
  (2025) and LIHEAP IM 2025-02 at acf.gov. acf.gov returned an empty HTTP 202
  challenge for the IM and its SMI attachment; the hhs.gov guidance-portal copies
  returned 403. 45 CFR 96.85 states only the method. A web search snippet
  attributes Colorado FFY2026 60% SMI of about $83,256 (four persons) to the
  LIHEAP Clearinghouse (liheapch.ncat.org), a contractor site that is not an
  allowed source; it was not fetched and is not usable here.
- Also note: D-86:1320-1324 still says "for federal fiscal year 2023" while
  incorporating IM 2025-02 (whose SMI estimates are for FY2026 use); a ledger
  round that obtains the IM should version the table by federal fiscal year.
- Items: CO-875, CO-344, CO-1003.

### OQ-124. CCCAP activity flags
Verdict: NEEDS FACT (training/post-secondary activity flag). Items: CO-984.

### OQ-125. CCCAP household shapes
Verdict: NEEDS FACT (absence, incapacity, responsibility facts). Items: CO-982, CO-990.

### OQ-132. LEAP economic unit without a relationship edge
Verdict: NEEDS FACT (engine: a symmetric relationship role). Items: CO-895, CO-1000, CO-1009.

### OQ-133. CCCAP entry versus exit limit
Verdict: NEEDS FACT (redetermination fact). Items: CO-989, CO-993.

### OQ-134. Colorado Works Child Care referral default
Verdict: NEEDS FACT (state the fact on every case). Items: CO-896, CO-988.

### OQ-135. "Financially contributing" default
Verdict: NEEDS FACT. Items: CO-897, CO-992.

### OQ-136. Involuntary versus voluntary absence
Verdict: NEEDS FACT. Items: CO-898, CO-991.

### OQ-137. LEAP point-in-time determination
Verdict: NEEDS FACT. "Point in Time" (D-86, S776) is clear: circumstances on
the application date govern. The ledger needs LEAP items evaluated as of
application_date (an engine/scope change). Items: CO-1007, CO-1281.

### OQ-157. Teen-parent activity default
Verdict: NEEDS FACT. Items: CO-981.

### OQ-159. CCCAP county residency
Verdict: NEEDS FACT (county of residence and of application). Items: CO-987.

### OQ-160. CCCAP child citizenship default
Verdict: NEEDS FACT. Items: CO-980, CO-998.

### OQ-161. CCCAP assets read from SNAP resource facts
Verdict: ANSWERED.
- Citation: 8 CCR 1403-1 3.103.K (D-87:126-137).
- Quote:
  > K. "Assets" include but are not limited to the following:
  > 1. Liquid resources such as cash on hand, money in checking or savings accounts, saving certificates, stocks or bonds ...
  > 2. Non-liquid resources such as any tangible property including, but not limited to, licensed and unlicensed
  > automobiles and motorcycles; utility trailer; seasonal or recreational vehicles ...; and real property
  > (such as buildings, land, and vacation homes). Primary home and automobile of the primary caretakers are excluded.
- Answer: CCCAP's definition diverges from SNAP's: SNAP's
  countable_nonliquid_resources_snap excludes "most vehicles" and everything
  7 CFR 273.8(e) excludes; CCCAP counts every vehicle except the primary
  caretakers' automobile and lists no retirement-account or other 273.8(e)
  exclusion.
- Ledger change: add a CCCAP-specific asset fact (or pair) with 3.103.K's meaning
  and have cccap_meets_asset_limit (CO-996) read it. With a $1,000,000 limit
  (D-87:1893-1894) the outcome changes only for very large estates.
- Items: CO-996.

### OQ-162. CCCAP need for care, time limits, minimum-wage test
Verdict: NEEDS FACT (figures are in D-87; unmodeled). The minimum wage figure
is now cited (OQ-35). Items: CO-980, CO-984, CO-985.

### OQ-163. LEAP shared fuel, duplicate household, teen-parent merge
Verdict: NEEDS FACT (K-7, K-8); K-9 is a POLICY CHOICE the text does not
resolve. Items: CO-982, CO-1007, CO-1008.

### OQ-253. LEAP Steps B, D, F
Verdict: POLICY CHOICE (the step wording admits both readings); the program-year
adjustment, minimum and maximum are notified to counties (3.758.48) and
published, if at all, by CDHS (refused host). Items: CO-1272, CO-1276-CO-1278, CO-1281.

### OQ-254. CCCAP parent fee
Verdict: NEEDS FACT (children in care; Q formula unmodeled; waivers). Q's band
edges (100/101, 130/131, 160/161) are a POLICY CHOICE. Items: CO-1289, CO-1290.

### OQ-358. LEAP household of a spouse in a nursing facility
Verdict: NEEDS FACT (the text answers the reading).
- Citation: 9 CCR 2503-7 3.751.1 "Household" and 3.751.2.B, D.1 (D-86:148-150,
  260-268).
- Quote:
  > "Household": The term "household" shall mean any individual or group of individuals who are living
  > together as one economic unit for whom primary heating fuel is customarily purchased in common ...
  > B. Each person living at a dwelling must be counted as either a member of the applicant's
  > household or a member of a separate household.
  > 1. Husband and wife living together;
- Answer: household membership turns on living together at the dwelling; D.1
  forbids separating spouses only when they live together. A spouse who lives
  in a nursing facility is not in the LEAP household (the rule states no
  temporary-absence exception).
- Ledger change: a supplied co-residence fact (or "resides in an institution"
  read from in_medical_institution with a duration) that removes the spouse
  edge in leap_household_members (CO-1000).
- Items: CO-1000, CO-1009.

### OQ-370. LEAP membership without an SSN or verified status
Verdict: NEEDS FACT (rule clear; filter CO-1000). Items: CO-1462, CO-1694, CO-1000.

### OQ-378. CCCAP verifications
Verdict: NEEDS FACT. Items: CO-1447, CO-1448, CO-1684.

### OQ-381. LEAP heating costs and zero income
Verdict: NEEDS FACT (household-level facts). Items: CO-1460, CO-1692, CO-1693.

## SUN Bucks (Summer EBT)

### OQ-255. No Colorado rule; school age; optional categorical sources
Verdict: PARTLY.
- (1) Confirmed: there is no Colorado Summer EBT rule. The SOS lists for CDHS
  Income Maintenance (9 CCR 2503-1 to -10, `sos-ag53.html`), SNAP (10 CCR
  2506-1) and Food Distribution (12 CCR 2514-1) carry none, although C.R.S.
  26-2-309(4)(a)(I), (VI) (`txt/crs2024-title-26.txt:6567-6568`) directs CDHS to
  "Establish eligibility criteria and distribute benefits consistent with federal
  law" and to promulgate rules. The Plan for Operations and Management is not on
  any allowed host.
- (2) School age, ANSWERED. 7 CFR 292.2 (D-88:148) makes "school aged" the
  State's compulsory-attendance years; C.R.S. 22-33-104(1)(a)
  (`txt/crs2024-title-22.txt:40329-40332`):
  > every child who has attained the age of six years on or before
  > August 1 of each year and is under the age of seventeen years, except as provided by this section,
  > shall attend public school ...
  Ledger change: replace supplied is_school_aged (CO-1292) with a derived item:
  age 6 attained on or before August 1 of the school year that began most
  recently, and under 17, citing 22-33-104(1)(a) and 292.2. (The (2) exceptions
  of 22-33-104 excuse individual children and do not change the age band.)
- (3) Medicaid or other streamlined-certification sources (292.12(d)(2)):
  POLICY CHOICE, needs the State's Plan; keep sebt_other_categorical_basis.
- (5) Special provision schools: NEEDS FACT.
- Items: CO-1292, CO-1296, CO-1297, CO-1298.

### OQ-377. SUN Bucks verification period and exceptions
Verdict: POLICY CHOICE. 7 CFR 292.14(f)(2)(i) (D-117) leaves the date to "the
Summer EBT agency"; Colorado has no rule (OQ-255). Foster, migrant and runaway
children need facts. Items: CO-1698, CO-1699.

## Cross-program verification

### OQ-300. One verification request date
Verdict: NEEDS FACT (per-program request dates). Items: CO-1343 and the listed due-date items.

### OQ-316. Extensions of time to verify
Verdict: NEEDS FACT (extension facts). Items: CO-1351, CO-1355, CO-1415, CO-1426, CO-1427, CO-1461, CO-1462.

### OQ-320. 9 CCR 2503-1 states no verification rule
Verdict: ANSWERED (no change; close). 9 CCR 2503-1 is "RESERVED FOR FUTURE
USE" (D-108); the SOS list (`sos-ag53.html`, `sos-rule3147.html`) shows 9 CCR
2503-8 is "Administrative Procedures for the Colorado Child Care Assistance
Program", not a general Income Maintenance verification rule, and 2503-2 and
-4 are reserved. Nothing remains to fetch. Items: none.

## Housekeeping found while checking

- `volumes/co/documents.yaml` lists D-3, D-4 and D-5 (7 U.S.C. 2015, 2017 and
  Pub. L. 119-21) with files `documents/D-3.md`, `D-4.md`, `D-5.md` that do not
  exist in the tree. The ABAWD and alien items cite excerpts from them.
- The OQ-358 entry in `open-questions.md` ends with a "Resolution" paragraph
  that belongs to OQ-324 (it describes is_in_title_iv_foster_care_or_adoption_assistance,
  CO-1587). OQ-358 itself is still open.

## Counts by verdict

| Verdict | Count |
|---|---|
| ANSWERED | 18 (7 of them "no change": OQ-27, 32, 49, 119, 309, 320, 323) |
| PARTLY | 11 |
| POLICY CHOICE | 33 |
| NEEDS FACT | 59 |
| BLOCKED | 6 |
| Total | 127 |

ANSWERED: OQ-2, 3, 15, 27, 31, 32, 34, 35, 49, 64, 119, 126, 161, 207, 208,
309, 320, 323. PARTLY: OQ-1, 59, 65, 102, 145, 213, 214, 216, 251, 255, 376.
BLOCKED: OQ-99, 121, 122, 203, 212, 250. OQ-358 is counted under NEEDS FACT:
the text answers the reading, but the ledger needs a co-residence fact to apply it.

## ANSWERED and PARTLY items in priority order (largest effect on eligibility answers first)

1. OQ-65 (PARTLY): 42 CFR 435.559 makes community engagement a condition of
   Adults-group eligibility from 2027-01-01; nothing in the ledger tests it.
   Every expansion adult determined for 2027 is affected.
2. OQ-31 (ANSWERED): ABAWD time limit reaches 18-64, not 18-65
   (snap_abawd_max_age 65 -> 64); every 65-year-old SNAP adult.
3. OQ-15 (ANSWERED): FY2026 BBCE/130%/165%/100% tables; every SNAP
   determination dated 2025-10-01..2026-09-30 is now tested against FY2025 figures.
4. OQ-2 (ANSWERED): missing SNAP waiting-period exemption for blind or disabled
   non-citizens receiving disability benefits (CO-306).
5. OQ-214 (PARTLY): C.R.S. 25.5-2-104(2) and 25.5-5-201(6) reach every category
   for undocumented children and pregnant people; the ledger reports some as
   emergency-only.
6. OQ-59 (PARTLY): the federal public-agency-employee exclusion applies to CHP+
   without a state rule; add the fact and exclusion.
7. OQ-126 (ANSWERED): Colorado's CSRA is a lawful maximum-standard election;
   no change to the formula; check the (b)/(c) "largest of" branches of CO-646.
8. OQ-102 (PARTLY): minor-parent deeming deducts the needs of the parent's
   dependents in the home too.
9. OQ-145 (PARTLY): January-June 2026 MMMNA is $2,643.75 (2025 guideline).
10. OQ-3 (ANSWERED): SNAP citizenship test should read a residency conjunct.
11. OQ-34 (ANSWERED): count parents in the SNAP household for the single-parent
    student exemption.
12. OQ-216 (PARTLY): lottery thresholds confirmed; add the 120-month cap.
13. OQ-207, OQ-208 (ANSWERED): Pickle and DAC remove OASDI (or the COLAs) before
    SSI exclusions.
14. OQ-213 (PARTLY): qualified_status_date matches 1613(a)'s start date.
15. OQ-1 (PARTLY): entrants are exempt from the five-year bar (1613(b)(1)(D));
    effective date blocked at www.usda.gov.
16. OQ-251 (PARTLY): FY2027 $4,750 resource limit stands.
17. OQ-255 (PARTLY): derive school age from C.R.S. 22-33-104(1)(a).
18. OQ-161 (ANSWERED): CCCAP asset definition differs from SNAP's (affects only
    estates near $1,000,000).
19. OQ-64 (ANSWERED): CHP+ cost-sharing exemptions (no eligibility effect).
20. OQ-376 (PARTLY): Colorado Works reads the incorporated edition of Rule 5.
21. No-change closures with citations: OQ-32, OQ-35, OQ-49, OQ-119, OQ-27,
    OQ-323, OQ-309, OQ-320.
