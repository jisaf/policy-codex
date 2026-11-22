# Coverage-matrix verification: MAGI Medicaid and CHP+ (family file `coverage-medicaid-magi-chp`)

Reviewer: independent coverage pass (brief: `brief-coverage.md`), 2026-11-22.
Commit reviewed: `a2ed7f0` (branch `ccr-9d19bf4c-wmnwcl`, working tree clean apart from this file).
Governing texts:
- 10 CCR 2505-10 § 8.100.1 through § 8.100.4 (D-65, `volumes/co/documents/D-65.md` lines 19-2095), rule version 12735, effective 11/14/2026.
- 10 CCR 2505-3 (D-66), rule version 12687, effective 08/30/2026: §§ 50, 100-180, 300-330 and 400-440 (eligibility, enrollment, cost sharing).

Out of scope here: §§ 8.100.5-8.100.7 (aged, blind and disabled; long-term care and post-eligibility; MSP; the Buy-In programs; OAP Health Care) belong to the non-MAGI coverage pass. Rows of § 8.100.3 that only route to those groups (F.1.b-j, l-m; M) are mapped to their items but not re-verified.

**Currency check (sos.state.co.us, 2026-11-22).**
- Rule-info page for 10 CCR 2505-10 8.100 (`DisplayRule.do?action=ruleinfo&ruleId=2918`): current version 11/14/2026 (permanent rule adopted 09/11/2026, eDocket 2026-00328, Word version id 12735). D-65 is current.
- Rule-info page for 10 CCR 2505-3 (`ruleId=2816`): current version 08/30/2026 (adopted 07/10/2026, eDocket 2026-00229, Word version id 12687). D-66 is current.

**Method.**
- I read D-65 lines 19-2095 and D-66 §§ 50-440 line by line.
- I regenerated the ledger in a scratch copy (`git archive HEAD`; `npm run export -- --volume co`: 1,894 items). I mapped every D-65, D-40, D-101, D-66, D-42 and D-102 excerpt to the items that cite it (173 excerpts).
- I read the derivation, meaning and precision of every MAGI and CHP+ derived item: the 283 Medicaid and CHP+ derived items, less the non-MAGI ones. I also read the shared facts they turn on (`lives_with`, `is_inmate_of_public_institution`, `birth_mother_coverage_at_birth`, `is_required_to_file_tax_return`, `chp_has_other_health_coverage`).
- I confirmed suspected wrong answers with `scripts/eval-case.ts` on scratch households RV-GM, RV-SPA, RV-SE, RV-65, RV-INM, RV-PP and RV-CHPB.
  - The generator is `/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/gen/` (`mk.py`, `p1.py`-`p3.py`, `run.sh`). It appends the probes to the scratch copy's `volumes/co/tests/cases.yaml`.
  - Each probe states residency, status, tax filing, income and verification facts in full. Determination date: 2026-11-10. Application date: 2026-11-02, unless stated otherwise.
- For the open questions, I fetched three documents from medicaid.gov (an allowed host):
  - Colorado's MAGI conversion state plan amendment CO-13-0045-MM1 (S25, Parents and Other Caretaker Relatives; approved 12/18/13).
  - The hospital presumptive eligibility SPA CO-13-051-MM.
  - Colorado's MAGI-based eligibility verification plan (`/sites/default/files/2019-12/colorado-verification-plan-template-final.pdf`).

## 1. Verdict

**9 P1 found.** The family is not complete under the stopping rule.

The earlier P1s for this family (final-, final2-, final3-medicaid-chp) stay fixed (spot-checked, section 5). The new P1s fall in four groups:
- **MAGI household composition (§ 8.100.4.E).**
  - The non-filer household reaches grandchildren and a child's spouse through a transitive walk (F-01).
  - A tax filer's household takes in a spouse who lives elsewhere (F-02).
- **MAGI income rules with no item.**
  - Sponsor deeming, § 8.100.3.K.1 (F-03).
  - Annualized self-employment, seasonal and commission income, § 8.100.4.C.4.a (F-04).
  - The below-100%-FPL tax-credit methodology rule, § 8.100.4.C.5 (F-05).
- **Group boundaries.**
  - The Adults group "through the end of the month that the individual turns 65" (F-06).
  - Inmates reported fully eligible rather than on the limited incarceration benefit (F-07).
- **CHP+.**
  - A postpartum Prenatal Care Program client is charged copayments (F-08).
  - CHP+ reports eligibility for months before the month of application (F-09).

There are also 12 P2 and 5 P3 findings. Four of the P2s are open questions that fail the stopping rule: OQ-50, OQ-302, OQ-513 and OQ-540 each cite "no published rule" or "not on an allowed host" for a document medicaid.gov serves (section 4).

## 2. Findings

P1: a wrong eligibility or benefit answer, a missing pathway, or an unmodeled or wrong verification requirement. P2: a gap or mismatch with no answer effect in ordinary cases, or an open-question record that is misclassified or incomplete. P3: a note.

| ID | Pri | Paragraph | Item(s) | Governing text | What is wrong | Proposed fix |
|---|---|---|---|---|---|---|
| F-01 | P1 | 8.100.4.E.1.d.iii-iv | CO-500 `ma_magi_household_members` (non-filer arm) | E.1.d: the non-filer household is "i) The applicant; ii) The applicant's spouse who lives in the household; iii) The applicant's natural, adopted, and step children under the age of 19, who live in the household; and iv) In the case of applicants under the age of 19, the applicant's ... parents and ... siblings under age 19" | The non-filer arm takes `[reachable, [spouse, parent, stepparent], ...]` (P36). That walk is transitive: from the applicant to a child under 19, then on to that child's own child under 19 and to that child's spouse. So a non-filer grandparent's household includes a grandchild, which E.1.d does not list. **RV-GM:** non-filer mother p1 (wages $2,800) lives with her 17-year-old daughter p2 and p2's baby p3. p1's household is {p1, p2, p3}, size 3: 123.0% FPL, `adult` / `eligible`. The rule gives {p1, p2}, size 2: $2,800 / $1,803.33 = 155.3%, over 133% + 5%, so `ineligible_income`. p2's and p3's own households are right. | Replace the reachable walk with single hops: the applicant's spouse, and persons who are a child or stepchild under 19 of the applicant (or of the applicant's spouse, for stepchildren not stated by an edge). Add RV-GM as a rule test. |
| F-02 | P1 | 8.100.4.E.1.a.ii, E.1.b.ii, E.1.b.iv, E.4 | CO-500 (filer and tax-dependent arms) | E.1.a.ii "The Tax-Filer's spouse **if living in the home**"; E.1.b.ii "The Tax-Filer and their spouse if living in the home"; b.iv "The Tax Dependent's spouse, if living with the Tax Dependent"; E.4 "Married couples **living together** will each be included in the other's MAGI household" | The filer and dependent arms cross every `spouse` edge without reading `lives_with`. Only the non-filer arm filters on `lives_with`. A spouse with a different `dwelling_id` (separated, filing separately) is in the filer's household with all of his income. **RV-SPA:** p1 (filer, wages $1,200) and her spouse p2 (filer, wages $5,000, `dwelling_id` h2). Household {p1, p2}, 343.8% FPL, `ineligible_income`. The rule gives p1 alone: 90.2%, `adult` / `eligible`. | Cross a spouse edge in arms 1 and 2 only where the spouse is in `lives_with` (`otherwise` true when no `dwelling_id` is stated, as the non-filer arm does). Add RV-SPA as a test. |
| F-03 | P1 | 8.100.3.K.1, K.1.a | none (`is_sponsored_non_citizen` CO-1573 is read by no Medicaid item) | K.1: "Income or resources of an alien sponsor or an alien sponsor's spouse shall be countable to the sponsored alien effective December 19, 1997 ... until the alien becomes a U.S. citizen or has worked or can be credited with 40 qualifying quarters"; K.1.a: "When the sponsored alien is a pregnant woman or a child the income ... will not be countable" | Medicaid has no sponsor-deeming item, and no open question or recorded reason. `is_sponsored_non_citizen` and `sponsors` feed SNAP, Colorado Works and Adult Financial only; no `ma_` item uses them. "8.100.3.K" is cited only for self-employment (K.9). A lawful permanent resident adult past the five-year bar, with a binding I-864 sponsor and no 40 quarters, is tested on her own income alone. K.1 counts the sponsor's and the sponsor's spouse's income too (8 U.S.C. 1631 applies deeming to Medicaid, MAGI groups included). Eligibility is overstated for every such adult. | Add `ma_sponsor_deemed_income` (the sponsor's and the sponsor's spouse's income, while the person is not a citizen, has fewer than `federal_qualifying_quarters_threshold` quarters and is not pregnant or under 19). Add it to `ma_person_magi_income` or the household total for the sponsored person's own determination. Or record an open question that cites K.1 and 8 U.S.C. 1631 (with the 1631(e)-(f) indigence and battery exceptions). |
| F-04 | P1 | 8.100.4.C.4.a | none (CO-502/503/504 read the month only) | C.4: "determined based on current or previous monthly household income"; C.4.a: "Applicants who are found financially ineligible based on current or previous monthly household income ... and whose household has earned income from self-employment, seasonal employment, and/or commission-based employment, **shall** have their financial eligibility determined using annualized self-employment, seasonal employment, and commission-based employment income." | No item annualizes. "annualiz" appears in no item, fact or open question. **RV-SE:** self-employed single adult with $3,000 net in November and $818 in each other month of 2026 ($11,998 a year = 75.2% FPL). The engine gives November 225.6%, `ineligible_income`. C.4.a requires the annualized figure, which gives `adult` / `eligible`. | Add a fact for the projected annual self-employment, seasonal and commission income (or read the twelve months stated), and `ma_annualized_household_income_pct_fpl`. A category's income test passes on either the monthly or, for a household with such income found ineligible monthly, the annualized figure. |
| F-05 | P1 | 8.100.4.C.5 | none | "If an applicant does not meet the financial eligibility requirements for Medical Assistance based on MAGI, but meets all other eligibility requirements, the applicant **shall be found eligible** ... if the applicant's income, as calculated using the methodology for determining eligibility for Advanced Premium Tax Credits or Cost Sharing Reductions through the marketplace, is below 100% of the federal poverty level." (42 CFR 435.603(i)) | No item and no recorded reason. RV-SE is also a C.5 case: annual household income under the APTC method (26 U.S.C. 36B, annual, tax household) is 75.2%, under 100%, so the rule gives `eligible`; the engine gives `ineligible_income`. | Add a fact for the household's projected annual income under the 36B method as a percentage of FPL (or derive it from the annual figure of F-04). Treat an income-ineligible person who meets every other requirement as income-eligible when it is below 100%. Report the reason in CO-554. |
| F-06 | P1 | 8.100.1 (Adult MAGI Medical Assistance Group), 8.100.4.G.1, G.4 | CO-548 `ma_is_adult_category`, CO-539, CO-552, CO-199 | 8.100.1: the Adults group covers "adults from the age of 19 **through the end of the month that the individual turns 65**, who do not receive or who are ineligible for Medicare"; G.1: "any person who is determined to be eligible ... at any time during a calendar month shall be eligible for benefits during the entire month" | CO-548 tests `age < 65` on the determination date. A person whose 65th birthday fell earlier in the determination month is outside the group. This is the defect F3-3 fixed for the 19th and 26th birthdays; the 65th was left. No open question. **RV-65:** born 1961-11-05, not entitled to Medicare, wages $900 (67.7%), determined 2026-11-10: `none` / `ineligible_no_category`. The rule gives `adult` / `eligible` for November. Only people without Medicare in the birthday month are affected. | Test the age on the last day of the month before the determination month (the CO-564 idiom) in CO-548, CO-539 and CO-552, against `ma_adult_upper_age_limit`. Add RV-65 as a test. |
| F-07 | P1 | 8.100.3.G.1.b.ii | CO-554 `ma_magi_eligibility_status`, CO-551 (no reader of CO-1105 outside continuous eligibility) | G.1.b.ii: "Inmates who are incarcerated in a correctional institution ... may be enrolled, if eligible, with **benefits limited to**: a) an in-patient stay of 24 hours or longer in a medical institution; and b) 90 days prior to release, Reentry Demonstration Initiative Services" | CO-554 reports `incarceration_limited` only for a child in a continuous eligibility period (Q.1.b.ii.1). Any other inmate who meets a category is `eligible`, the full-benefit answer. **RV-INM:** a single adult in a government-run county jail (`is_inmate_of_public_institution` true), no income: `adult` / `eligible`. The rule gives eligibility with benefits limited to inpatient stays and reentry services. That is the outcome the volume already names `incarceration_limited` (as it names `emergency_only` for another limited benefit). | In CO-554, report `incarceration_limited` for any person who meets a category (not only a child in a continuous eligibility period) and is an inmate of a public institution. Update the option's meaning to cite G.1.b.ii. |
| F-08 | P1 | 2505-3 § 330.4; § 430.3 | CO-1990 `chp_is_exempt_from_cost_sharing`, CO-2231 `chp_copayment` | 330.4: "Prenatal Care Program clients shall be exempt from cost sharing requirements"; 430.3: the pregnant woman's "enrollment span shall end on the last day of the month 12 months after the birth" | CO-1990 reads `chp_prenatal_is_eligible`, which requires `is_pregnant` in the month. After the birth the woman is still enrolled in the prenatal span (`chp_eligibility_status` `eligible_prenatal` through CO-2407), but she is no longer exempt, so she is charged copayments. **RV-PP:** a CHP+ prenatal span recorded from 2026-03, delivery 2026-08-10, wages $4,000 (221.8%, band D), office visit in 2026-11: `eligible_prenatal`, exempt false, `chp_copayment` $10. The rule gives $0. | Read `chp_is_in_prenatal_coverage_period` (CO-2407), or `chp_eligibility_status` = `eligible_prenatal`, in CO-1990 instead of `chp_prenatal_is_eligible`. Add RV-PP as a test. |
| F-09 | P1 | 2505-3 § 430.1 (and § 50.7) | CO-707 `chp_eligibility_status`, CO-705, CO-706 | 430.1: "Eligibility for the Children's Basic Health Plan shall be effective on the latter of: A. The first day of the month of application for Medical Assistance; or B. The first day of the month the person becomes eligible" | No CHP+ item gates months before the application month. Medicaid's CO-4101 does, through `ineligible_before_coverage_period`. CO-707 cites S1714 (430.1-430.2) but its derivation does not apply 430.1. **RV-CHPB:** child p2, application 2026-11-02, household at 205.2%. `chp_eligibility_status` is `eligible_child` for 2026-08, while `ma_magi_eligibility_status` for the same month is `ineligible_before_coverage_period`. CHP+ has no retroactive coverage, so August is ineligible. (final3's P3-1 recorded the same pattern for the non-MAGI outcomes. Here 430.1 is an operative effective-date rule, so the answer is wrong.) | Add a first branch to CO-707: a month before the month of `ma_application_date` (or before the person's birth) is `ineligible_before_coverage_period` (new option), as CO-554 does. |
| F-10 | P2 | 8.100.4.G.3 (OQ-50) | OQ-50, CO-544 | OQ-50 is classed "state policy choice". Checked line: "the election is in the State plan, which no allowed host publishes" | medicaid.gov publishes Colorado's MAGI conversion SPA CO-13-0045-MM1 (approved 12/18/13, effective 01/01/2014). Its page S25 ("Parents and Other Caretaker Relatives", page 1) has the radio button "The state elects to eliminate the requirement that a dependent child must be deprived of parental support or care ..." selected. The question is settled in the direction of the assumption, so no answer changes. **Stopping-rule failure:** the document is on an allowed host. | Add CO-13-0045-MM1 S25 as a document, resolve OQ-50 citing it, and cite it in CO-544's sources. |
| F-11 | P2 | 8.100.1 Caretaker Relative (OQ-540) | OQ-540, CO-2606 | 8.100.1: "assumes responsibility for the dependent child's care"; SPA S25: "The definition of caretaker relative includes any adult with whom the child is living and who assumes **primary** responsibility for the dependent child's care" (checked) | OQ-540's Checked line cites § 8.100.1, 42 CFR 435.4 and 8 CCR 1403-1 only, and says "none says whether care shared with a parent in the home counts". Colorado's state plan elects 435.4's "primary responsibility" wording, which settles the Medicaid half in the direction of the assumption. The CCCAP half stays open. | Cite CO-13-0045-MM1 S25 in OQ-540's Checked line and narrow the question to CCCAP's "loco parentis". |
| F-12 | P2 | 8.100.4.C.2.a.ii (OQ-302) | OQ-302, CO-1402, CO-1403 | OQ-302 is classed "blocked on a named document": Colorado's verification plan, "not published on an allowed host; the medicaid.gov verification-plan pages tried on 2026-11-22 return 404" | medicaid.gov serves Colorado's MAGI-based eligibility verification plan at `/sites/default/files/2019-12/colorado-verification-plan-template-final.pdf`. That is the 2015 plan, with a 10% threshold; the rule now says 20%. It states the test as "the difference between the two is greater than 10%", so it does not say 20% of what either. It also says that "When an individual attests to income above the applicable standard and data source indicates income below the standard, the state will take the attestation and make the person ineligible ... Additional information will not be requested." CO-1402 treats that combination as not compatible, so CO-1403 asks for earned income documentation. **Stopping-rule failure:** the class is wrong (the named document is on an allowed host and was read). | Add the plan as a document. Reclassify OQ-302 as a state policy choice with the plan checked (the base of the percentage stays unstated). Make attested-above with data-below compatible in CO-1402 (no documentation requested). |
| F-13 | P2 | 8.100.3.R.1.c, R.2.d (OQ-513) | OQ-513, CO-2439 | OQ-513 Checked line: "Whether Colorado permits a 65-year-old a presumptive period is its plan choice; no published rule settles it" | The hospital presumptive eligibility SPA CO-13-051-MM (medicaid.gov) lists the populations hospitals may determine presumptively as "Adult Group, if covered by the state". Individuals above 133% FPL under age 65 are left unchecked, and "Eligibility groups for individuals age 65 and over" is not selected. The Adult group is 435.119's, 19 through 64. This supports the reading in force. **Stopping-rule failure:** the plan is published on an allowed host and was not checked. | Cite CO-13-051-MM in OQ-513 and resolve it (19 through 64, or through the 65th-birthday month if F-06's reading is taken for the full group). |
| F-14 | P2 | 8.100.3.P.3.f-g, P.5, P.5.b | none | P.3.f: "If the member submits the redetermination form ... before the end of the eligibility period, the member must maintain coverage until ... final determination"; P.5.b: "the effective date of coverage will be the first day of the month in which the redetermination form was returned ... the member can request up to three months in retroactive coverage" | No item cites § 8.100.3.P. CO-4101 opens coverage only from `ma_application_date` and a retroactive request. A reconsideration-period return has no fact, so its effective date and its up-to-three-month retroactive request are not modeled, and no note records the scope. 2505-3 § 140.2.B.2 states the same for CHP+. | Record in the notes that renewal coverage continuation and the reconsideration period are out of scope, or add a fact for the reconsideration return date that CO-4101 reads as an application date. |
| F-15 | P2 | 8.100.3.G.1.b.i.5 | CO-1105 `is_inmate_of_public_institution` | G.1.b.i.5: "Individuals participating in community corrections programs or residents in community corrections facilities ('halfway houses') who have freedom of movement and association" may be enrolled | CO-1105 has no setting or fact for community corrections with freedom of movement. A halfway-house resident in a government-run facility of more than 16 beds is an inmate. That matters only where the volume reads inmate status: a continuous eligibility child is moved to `incarceration_limited`, and a CHP+ child is `ineligible_institution`. | Add a fact (resides in community corrections with freedom of movement) that CO-1105 excludes, citing G.1.b.i.5 and 435.1010. |
| F-16 | P2 | 8.100.4.G.6.a; G.5 | CO-566, CO-554 | G.6.a: a Legal Immigrant Prenatal member's guaranteed period ends on death, becoming an inmate, leaving the required household, non-residency, being unable to be located, a withdrawal request, failing a reasonable opportunity period or an erroneous grant | CO-566 locks the pregnancy coverage period with no exception. CO-554 checks residency first, so non-residency is carried; the other G.6.a events are not, and no reason is recorded. The same events end a child's continuous eligibility period (CO-2205, which could be reused). | Have CO-566 (or CO-554's pregnancy-period row) read CO-2205's exceptions for a person in the G.6 population, or record why not. |
| F-17 | P2 | 8.100.4.C.1.f.i.1, f.ii.1 | CO-078 `is_required_to_file_tax_return`, CO-503 | "Income from Title II Social Security benefits and Tier I Railroad benefits are excluded when determining if a child is required to file taxes" | CO-078's meaning is the plain 26 U.S.C. 6012(a)(1) requirement. It does not tell the supplier to leave out Title II and Tier I benefits, which the special MAGI test (also 435.603(d)(2)) requires. A child with large survivor benefits could be stated as required to file, so her income is counted in her parent's household. | State the exclusion in CO-078's meaning (or split a MAGI-specific fact). |
| F-18 | P2 | 8.100.3.K.7 | none | K.7: Difficulty of Care payments to a live-in provider are excluded for MAGI only if the provider lives full-time with a recipient enrolled in an HCBS waiver or the Buy-In with HCBS. K.7.c: not excluded for more than 10 foster individuals under 19 or 5 over 19 | No fact names Difficulty of Care payments. Whether a supplier puts them in `wages_gross` (counted) or `other_unearned_income_nontaxable` (not counted) is not stated, and no condition of K.7 is tested. | Add a neutral fact for Difficulty of Care payments and the two conditions, and count it in CO-502 unless they are met. Or state in the income facts' meanings where it goes, with K.7's conditions. |
| F-19 | P2 | 2505-3 § 440.4.C vs § 430.2.B | CO-707 | 440.4.C: "The admission of an enrollee into any federal, state, or county institution for the treatment of mental illness, substance use disorder, or into any correctional facility" may disenroll; 430.2.B lists inmate (limited benefit) but not IMD | During a CHP+ continuous eligibility period, an enrollee admitted to an institution for mental diseases stays `eligible_child`, because the continuous eligibility row precedes `ineligible_institution`. The conflict between 430.2.B and 440.4.C is not recorded. | Record the reading (430.2.B's closed list governs during the period) in CO-707's precision, or add an open question. |
| F-20 | P2 | 8.100.3.G.3.a.i, H.9.a | CO-1413 | G.3.a.i: the 90-day period "shall begin on the date of the Notice of Action"; H.9.a: "begin as of the date of the Notice of Action" | CO-1413 starts the period five days after the notice date (42 CFR 435.956(b)(2)(ii)(B), receipt), giving 95 days. The federal rule may be more generous, but no `statute_override` or open question records the departure from the Colorado text. | Add a `statute_override` citing 435.956 to CO-1413, or follow the rule. |
| F-22 | P2 | 2505-3 § 430.3.A.i vs 8.100.4.G.5.a.i | CO-2407, CO-566 | CHP+: "by the end of the **90-day** reasonable opportunity period"; Medicaid: "by the end of the **30day** reasonable opportunity period". Both apply "only ... the first-time income is verified following an initial eligibility determination or an annual redetermination" | Neither coverage-period item tests the first-verification exception, and the two periods differ. CO-2407 leaves it to the verification items, which use one 30-day due date for both programs. CHP+'s 90-day period is not stated anywhere. | State the CHP+ 90-day period, as `chp_income_reasonable_opportunity_days`, in `chp_verification_due_date` (CO-2219), or record the difference. |
| F-23 | P3 | 8.100.3.H.1.b.vii | CO-1395 | "This requirement does not apply to ... vii) Individuals receiving Medical Assistance during a period of presumptive eligibility" | Not an exemption in CO-1395. No answer effect, since presumptive eligibility is decided from declarations. | Note it in the precision. |
| F-24 | P3 | 8.100.3.H.2.b.i.3, xiii-xx | CO-1397 | Document conditions: "recorded before the person was 5", "created at least 5 years before the initial application date", near the time of birth for children under 16 | Carried only by the stated document type: the supplier must apply the conditions. | Name the conditions in `citizenship_verification_document_type`'s option meanings. |
| F-25 | P3 | 8.100.3.G.1.g.iii | CO-509 | "applying for Medical Assistance benefits to begin no earlier than five years after the individual's **date of entry**" | The five years are counted from `qualified_status_date` (8 U.S.C. 1613's date of entry with qualified status). This is stated in the precision but not as a `statute_override`. | Mark it as an override of iii's wording. |
| F-26 | P3 | 2505-3 § 110.1.A.1 | CO-705 | "Be less than 19 years of age" (while B.5.o names the 19th-birthday month) | CO-705 uses CO-564 (through the birthday month). G.1's whole-month rule is Medicaid's. For CHP+ only B.5.o states the month, so the reading is reasonable but unrecorded. | One line in CO-705's precision. |
| F-27 | P3 | 8.100.3.R.2.e | CO-3154 | "a parent or caretaker relative **or legally appointed guardian or conservator**" | The declaration fact's meaning should name guardians and conservators. | Confirm in CO-3154's meaning. |

F-21 is not used. P2: F-10 to F-20 and F-22 (12). P3: F-23 to F-27 (5).

## 3. Coverage matrix

Legend: **C** = carried by (items checked against the text; "ok" means the derivation matches); **NA** = not applicable (reason); **OQ** = open question; **GAP** = no item and no reason; **F-nn** = see findings.

### 3.1 § 8.100.1 Definitions (D-65:19-262)

| Definition | Disposition |
|---|---|
| 300% group, 1619b, AB, ABD, ABLE, AND, AFDC, AP-5615, Ambulatory, Annuity, Burial spaces/trusts, Blindness, Cash surrender value, CDHS, CBMS, Community spouse, CSRA, Dual eligible, Equity value, FBR, HCBS, Institution and institutionalized definitions, Long-term care definitions, LTSS LOC, MMMNA, MIA, MSP, Nursing facility, OAP, OASDI, PACE, PNA, Premium, RRB, SGA, SISC, SSI, SSI Eligible, Limited Disability, Legal Immigrant Prenatal | NA here: used by §§ 8.100.5-7 (non-MAGI pass). Legal Immigrant Prenatal: see G.6. |
| Adult MAGI Medical Assistance Group ("19 through the end of the month that the individual turns 65 ... not ... Medicare") | C: CO-548, CO-199. **F-06** (end of the 65th-birthday month not carried) |
| Children MAGI group ("through the end of the month that the individual turns 19") | C: CO-564, CO-545, ok (F3-3 fix holds) |
| Pregnant Women group ("less than 195% ... including ... 12 months post-partum") | C: CO-546, CO-194, CO-566, CO-560. G.5's "does not exceed" governs. ok |
| Parent and Caretaker Relative group; Caretaker Relative | C: CO-547, CO-2606. OQ-540 (F-11) |
| Dependent Child ("under the age of 18, or ... 18 and a full-time student, and expected to graduate by age 19") | C: CO-544, CO-1720, ok. OQ-50 (F-10) |
| Applicant; Application Date | C: `ma_application_date` (supplied). NA for the date-stamp mechanics (county administration) |
| AGI; MAGI; Earned/Unearned Income; In-Kind Income; Earned income disregards | C: CO-502 (via 8.100.4.C) |
| Tax Dependent; Tax-Filer; Non-Filer; Dependent Relative | C: CO-076, `is_tax_filer`, CO-500, CO-1976 |
| Medical Assistance Required Household | C: CO-2205 (`ma_has_left_required_household`); MAGI uses CO-500 |
| Minimal Verification; Questionable; Reasonable Compatibility; Reasonable Explanation; Electronic Data Source | C: CO-1403/1404/1407-1409 (questionable gates), CO-1402, CO-1344. OQ-302 (F-12) |
| Resident | C: CO-505, CO-2250 |
| Citizen; Alien; Legal Immigrant | C: CO-1358, CO-507, CO-509 |
| Employed ("has earned income ... has proof of employment") | C: CO-2425 (`has_earned_income`). Proof is a verification matter (CO-1403) |
| Complete Application; Good Cause; Ex Parte Review; IAP; SSAp; PEAK; CHP+; CMS; Colorado State Plan; Department; Eligibility site; EPSDT; FFP; FPL; Managed care; Medical Assistance; MEC; Provider; Psychiatric facility; Public institution; Qualified Hospital PE Sites; Recipient; Client; Secondary School; Single Entry Point; SSA; TANF; Third Party; Title XIX; TMA; VA; Categorically Eligible; Common Law Marriage; Community Centered Boards; COLA; Child Support Services; Case Management; Fair Market Value; Face value; Inpatient; Outpatient; Patient | NA: names, agencies and procedures with no condition of their own. Each is used where the operative paragraph is mapped (FPL: CO-181/182, OQ-515; MEC: `dependent_child_has_minimum_essential_coverage`; Common law marriage: the `spouse` edge) |
| Disability | NA here (§ 8.100.6; `meets_ssa_disability_criteria`) |

### 3.2 § 8.100.2 Legal Basis

| Para | Disposition |
|---|---|
| 8.100.2 (5 paragraphs) | NA: statement of authority |

### 3.3 § 8.100.3.A-F

| Para | Disposition |
|---|---|
| A.1 (evaluate under all categories; no time limit) | C: every category is derived independently; CO-551 order; CO-1176. ok |
| A.2, A.2.a (screen for CHP+ and the marketplace; transfer data) | C: CHP+ items CO-705-707 read the same facts. Marketplace transfer NA (no marketplace program in the volume; out of scope) |
| A.3-A.4 (one application; review for other programs; referrals) | NA: application procedure |
| A.5 (signature) | NA: procedure |
| A.6-A.8 (who may apply or sign) | NA: procedure |
| A.9-A.11 (no interview; hours; withdrawal) | NA: procedure |
| B.1, B.1.a (apply in county of residence; no durational or permanent-dwelling requirement; LTC county of domicile) | NA: county assignment; no durational test anywhere (ok) |
| B.2 (Colorado resident: living in and considering Colorado the place of residence) | C: CO-505, CO-2250, ok |
| B.2.a-d (institutionalized persons who cannot indicate intent) | C: CO-2251-CO-2257, CO-2282. OQ-472 (B.2.b vs c) |
| B.3.a-c (incapable of indicating intent) | C: CO-2252/CO-2253 (`ma_is_incapable_of_indicating_intent`) |
| B.4 (retained until abandoned; temporary absence) | C: CO-505's meaning; CO-3350 `dwelling_id` |
| B.5 (non-resident) | C: CO-505 |
| C.1-C.7 (county transfer) | NA: county administration |
| D.1.a-e (45/90-day processing; unusual circumstances; PHE) | NA: processing timeliness, no eligibility effect; D.1.e expired 5/11/2023 |
| D.2 (extension of time on request) | C: CO-2220 `ma_verification_extended_due_date`, CO-1414, ok |
| D.3-D.5 (timeframes not a waiting period; delay notice; SSA appeal continuation) | NA: procedure and notice |
| D.6-D.7 (voter registration) | NA |
| E.1 (three months before the application, or from the date eligible, whichever later; medical services received; all requirements met) | C: CO-557, CO-2472 (with the Pub. L. 119-21 sec. 71112 override for applications from 1/1/2027), CO-4100, CO-4101, CO-565, ok |
| E.2 (explanation; request on the application or verbally later; need not be eligible in the application month; proof of service not required) | C: CO-4100, CO-4101, CO-3601, ok |
| F.1.a (MAGI groups and family planning) | C: CO-551, CO-1154 |
| F.1.b-h, j, l, m (SSI-related, OAP, Pickle, DAC, LTC, Buy-In) | C (non-MAGI pass): CO-1163, CO-1156, CO-1158-1161, CO-641/653, CO-618-622 |
| F.1.i (children who would otherwise be institutionalized, 1902(e)(3)) | C: CO-653 (CwCHN, S3005; final3 P3-2 done) |
| F.1.k (emergency only for those meeting a category but not citizenship) | C: CO-1150, CO-510, CO-1151. OQ-200 |
| F.1.n (COVID-19 group, ended 5/11/2023) | NA: expired |

### 3.4 § 8.100.3.G General and citizenship requirements

| Para | Disposition |
|---|---|
| G.1.a (resident) | C: CO-2250 (read by CO-554, CO-562 and the other outcomes) |
| G.1.b.i.1-4 (patients in public medical institutions, LTC residents, parolees, small public residences may enroll) | C: CO-1105 excludes medical institutions, ICFs, community residences of 16 or fewer, and non-correctional settings |
| G.1.b.i.5.a-d (community corrections with freedom of movement) | **F-15** (P2) |
| G.1.b.ii (inmates: benefits limited to inpatient stays and reentry services) | **F-07** (P1): carried only for continuous eligibility children (CO-554 `incarceration_limited`, CO-2205) |
| G.1.c (IMD or TB institution, ages 21-64) | C: CO-1179, CO-1104, read by CO-562, CO-1150, ok |
| G.1.d-f (financial and other requirements; disability definition) | C: by each category item |
| G.1.g.i (citizen or national) | C: CO-1358, CO-509 |
| G.1.g.ii (lawfully residing, entered before 8/22/1996) | C: CO-509 (CO-507, CO-1726, CO-279) |
| G.1.g.iii (LPR after five years) | C: CO-509, CO-508. F-25 (P3) |
| G.1.g.iv.1-11 (LPR exemptions from the five-year rule) | C: CO-1172, CO-1725, CO-2700-2703. OQ-213 |
| G.1.g.v.1-2 (Cuban/Haitian entrant; COFA) | C: CO-1172 via CO-1725; CO-2400 |
| G.1.g.vi (incorporation by reference) | NA |
| G.1.g.vii.1-28 (CHIPRA 214 lawfully residing pregnant women and children) | C: CO-507, CO-509 (vii arm), CO-002 options. OQ-550 (SAVE list) |
| G.1.g.viii.1-2 (Afghan humanitarian parolees) | C: CO-1172, CO-2703, CO-2705 |
| G.1.g.ix.1, ix.1.a-b (Cover All Coloradans: under 19 or birthday month, pregnant, 12 months postpartum) | C: CO-1173, CO-1174, CO-1175, CO-562 (OQ-214); TMA, the four-month extension and Psych <21 read CO-1174, ok |
| G.1.g.ix.2 (emergency and reproductive care regardless of status; emergency medical condition) | C: CO-1100, CO-1151, CO-510, CO-1154 (reproductive health care program) |
| G.1.g.ix.2 last sentences (physician certification on claims; no primary care physician) | NA: claims and benefit administration |
| G.1.g.ix.3 (confidentiality toward USCIS) | NA |
| H.R.1 / Pub. L. 119-21 sec. 71109 (1396b(v)(5), from 10/1/2026) | C: CO-3034, CO-2400, CO-509 (`statute_override`), CO-3155, CO-2439. OQ-510, OQ-517, OQ-518 |
| G.2, G.2.a.i-ii (verify declared immigration status through VLP/SAVE) | C: CO-1622, CO-1308, CO-1359, CO-3157, ok |
| G.3.a.i-iii (90-day reasonable opportunity period from the notice; no delay or denial during it) | C: CO-1413 (F-20), CO-1415 (`pending_reasonable_opportunity`), CO-1347 |
| G.3.a.iv (benefits from the application date during the reasonable opportunity period) | C: CO-1415 meaning; CO-4101 |
| G.3.b (termination if not provided) | C: CO-1415 `reasonable_opportunity_expired`; CO-2205 (vii) |
| G.3.c, c.i-ii (programs the reasonable opportunity period applies to) | C: CO-1347 / CO-1413 apply to every Medicaid determination (the list covers all the groups the volume models) |

### 3.5 § 8.100.3.H Citizenship and identity documentation

| Para | Disposition |
|---|---|
| H.1 (verify citizenship and identity at application and redetermination unless already documented) | C: CO-1395, CO-1398, CO-1620, CO-1621 |
| H.1.a.i-ii (SSA and DMV interfaces) | C: `citizenship_verified_by_electronic_data_source`, identity data source facts (CO-1300-1304), CO-1398 |
| H.1.b.i-vi (exempt: Medicare, SSI, IV-B foster care, IV-E, SSDI, deemed newborns including emergency or retroactive birth coverage) | C: CO-1395 exemptions; CO-1587; CO-087, ok |
| H.1.b.vi.1 (deemed newborn never needs documentation) | C: CO-1395 (`mother_was_enrolled_in_medicaid_at_birth` at any age), ok |
| H.1.b.vi.2.a-c, H.2.a.iv.1 (reversal of denials from 2006-2009 or for tribal members) | NA: historical case remedies |
| H.1.b.vii (presumptive eligibility period) | F-23 (P3) |
| H.1.b.viii ("8.100.3.G.g.viii") | C: no documentation is required for an Afghan parolee declaring citizenship (not a citizen); NA |
| H.2.a.i-iv (stand-alone documents) | C: CO-1396, ok (also accepts 435.407(a) items) |
| H.2.b.i-xxi (evidence of citizenship with identity) | C: CO-1397, document types. F-24 (P3) |
| H.2.c.i-iii (collectively naturalized) | C: CO-1397 (`other_us_birth_record` and the type list) |
| H.2.d.i-iii (Colorado birth certificate referrals) | NA: county assistance procedure |
| H.3.a-h (identity documents) | C: CO-1399, ok |
| H.3.i (children under 16: records, parent affidavit) | C: CO-1399 (child arm reads under 19; H.3.i.3.e allows a parent affidavit to 18) ok |
| H.3.j (institutional affidavit) | C: CO-1399 `facility_director_affidavit` |
| H.3.k (expired documents) | C: NA (acceptability of a type is unaffected) |
| H.3.l (DMV ID referrals) | NA |
| H.4.a-g (copies, originals, presumed genuine, submission) | NA: document handling |
| H.4.h.i-ii (resubmission only if questioned or gap over five years with documents not retained) | C: CO-2214, CO-2211-2213, CO-2831, ok |
| H.5-H.8 (record retention; name change; assistance) | NA: administration |
| H.9.a (reasonable opportunity period from the notice) | C: CO-1413 (F-20); PHE text expired |
| H.9.b, b.i-ii (90 days; MAGI, Adult and Buy-In programs) | C: CO-1347 (90), CO-1413 |
| H.10.a (good-faith extension) | C: CO-2221, CO-1413, ok |

### 3.6 § 8.100.3.I-R

| Para | Disposition |
|---|---|
| I.1 (SSN or proof of application for each person requesting assistance; not for non-requesting members) | C: CO-1401, CO-1623, CO-1311/1312, ok |
| I.1.a.i-ii (refusal: person ineligible; sole dependent child: denial) | C: CO-1415 (`past_due` closes the person). ii is the same result for the only child |
| I.1.b.i-iii (SSN exceptions) | C: `ssn_exception_applies` (CO-2215/2216) |
| I.1.c (PHE self-attestation) | NA: expired |
| I.2 (assignment of rights; child support referral optional) | NA: no eligibility condition in MAGI (referral is optional) |
| I.3 (third-party resource information; refusal "may result in loss") | NA: discretionary; recorded here |
| I.4 (free choice of provider) | NA |
| J.1.a-d (choice between MAGI and SSI) | NA: the volume evaluates both |
| J.2, J.2.a (SSI and OAP-A recipients not in the required household; MAGI exception) | C: CO-500 includes SSI recipients by tax rules; CO-502 excludes `ssi_income`, ok |
| J.3 (AND payment not counted for MAGI) | C: CO-502 excludes `adult_financial_cash_income`, ok |
| K.1, K.1.a (sponsor deeming; pregnant and child exception) | **F-03 GAP (P1)** |
| K.2-K.6, K.8-K.11 (income definitions, self-employment, room and board, unearned income) | C for MAGI only where 8.100.4.C does not govern: CO-024 (K.9.b.i.1 depreciation for MAGI), CO-1703/1704 (non-MAGI pass). K.11.a.i.1 routes MAGI to 8.100.4 |
| K.7, K.7.a-c (Difficulty of Care, MAGI) | **F-18** (P2) |
| K.12-K.14 (stimulus, FPUC, tax refunds, EITC and CTC exempt) | NA: none is MAGI income or a modeled fact (expired or excluded by the tax code) |
| L.1 (no resource test for MAGI or the Buy-In) | C: no MAGI item reads resources, ok |
| L.2 (stimulus as a resource) | NA (non-MAGI; expired) |
| M.1-M.3 (FFP, SISC codes) | NA here: funding (CO-2456, OQ-514); SISC B in the non-MAGI pass |
| N.1-N.9 (confidentiality) | NA |
| O.1-O.4 (non-discrimination) | NA |
| P.1 (redetermine at least every 12 months; review all bases) | C: CO-2455 (12, or 6 for expansion adults from 2027 under Pub. L. 119-21), CO-1566 |
| P.2.a-b (ex parte review) | NA: renewal procedure |
| P.3.a-e, h (forms, annuity disclosure, signature) | NA: procedure (annuity disclosure is in the non-MAGI pass) |
| P.3.f-g (coverage kept if returned before the period ends; lost after) | **F-14** (P2) |
| P.4.a-e (county processing times) | NA |
| P.5, P.5.a-b (90-day reconsideration; effective date; three months retroactive) | **F-14** (P2) |
| Q.1 (12-month continuous eligibility for children under 19) | C: CO-555, CO-556, CO-561, ok |
| Q.1.a (without regard to changes) | C: CO-551, CO-554 order, ok |
| Q.1.b.i-viii (exceptions; ii.1 limited incarceration benefit and reinstatement) | C: CO-2205, CO-561 (iv), CO-554 `incarceration_limited`, ok |
| Q.2 (begins the month the application is received or when criteria are met; new period on CHP+-to-Medicaid transition) | C: CO-561 (recorded start CO-094 or the application month); the transition period is carried only as a recorded start (no computed transition; acceptable) |
| Q.2.a-g (programs; SSI and LTC continue as MAGI child; Buy-In premiums) | C: CO-2446, CO-561, CO-2448, ok |
| Q.3.a-c (foster care exit) | C: CO-2446 `foster_care_exit`, CO-561 |
| R.1, R.1.a-d (hospital presumptive eligibility groups) | C: CO-2439, CO-2432 |
| R.2.a-b (pregnant 195%, child 142%; status exception) | C: CO-2439, ok (F-2 fix holds, CO-111) |
| R.2.c (limited family planning, 133-260%, counted as two, no full coverage) | C: CO-2439, CO-3152. OQ-590 |
| R.2.d (19-65 at 133%) | C: CO-2439. OQ-513 (F-13) |
| R.2.e (parent or caretaker, guardian or conservator, 68%) | C: CO-2439, CO-3154. F-27 (P3) |
| R.2.f (employed and disabled, 16+, own income 450%) | C: CO-2439, CO-3153 |
| R.3, R.4, R.6, R.7 (site certification; forwarding; no appeal of the end; appeal of delay) | NA: procedure |
| R.5 (presumptive period from the determination to the full determination) | C: informational outcome; dates NA (period dates not modeled; recorded in CO-2439's role) |
| R.8 (not already receiving another program) | C: CO-2439 (`is_enrolled_in_medical_assistance`) |
| R.9 (once per 12 months; once per pregnancy) | C: CO-2439, ok |

### 3.7 § 8.100.4 MAGI

| Para | Disposition |
|---|---|
| A.1-A.2 (single streamlined application; application sites) | NA: procedure |
| A.3.a-b (EPSDT referral) | NA |
| B.1.a, a.i.1 (SSN; emergency-only applicants) | C: CO-1401 (excludes emergency-only), ok |
| B.1.b (citizenship and identity per H) | C: CO-1395, CO-1398 |
| B.1.c (earned income: attestation and data source; documents when not verifiable; estimated or actual monthly; PHE paragraph) | C: CO-1403, CO-1624, CO-1316. Wage-stub mechanics NA (documentation practice). PHE text expired |
| B.1.d (unearned income self-attested) | C: CO-1404 (MAGI arm: only when questionable), CO-1625, ok |
| B.1.e (immigration status declared and verified via VLP; termination after the reasonable opportunity period) | C: CO-1622, CO-1410, CO-1415 |
| B.2-B.3 (no other verification unless questionable; document the finding) | C: the questionable gates in CO-1406-1409; B.3 NA |
| B.4 (use information already in CBMS) | C: the data-source facts; NA otherwise |
| B.5, B.5.a-b (age and relationship declared unless questionable) | C: CO-1408, CO-1409, CO-1629, CO-1630, ok |
| B.6.a-b (dependent child's age and living in the home, if questionable) | C: CO-1408, CO-1409 |
| C.1 (gross income per 26 U.S.C. 61) | C: CO-502 |
| C.1.a.i-vi (earned income) | C: CO-502 (`wages_gross`, CO-024, CO-079 for property gains, `pension_income` or `other_unearned_income_taxable` for taxable disability) |
| C.1.b.i-xii (interest, rents, royalties, dividends, alimony before 2019, pensions, life insurance, discharge of debt, estates and trusts, Social Security, partnerships) | C: CO-502 via CO-1714, CO-079, `pension_income`, `social_security_income`, `tax_exempt_interest` |
| C.1.b.xiii (capital gains) | C: CO-079 |
| C.1.b.xiv.1-3 (winnings spread) | C: CO-1185, CO-1187, CO-1183/1184, ok (120-month override). OQ-592 |
| C.1.b.xiv.4 (others in the household count winnings in the month received) | C: CO-502, CO-503, ok |
| C.1.b.xiv.5.a-b (hardship exemption) | C: CO-2222, CO-1187 |
| C.1.b.xv.1-2 (discharged student loans) | C: CO-1190, CO-1188/1189, CO-2463-2465, ok (with the 26 U.S.C. 108(f)(5) override) |
| C.1.c.i-iii (tax-exempt interest; untaxed foreign wages; Title II) | C: CO-502, ok |
| C.1.d.i (lump sum in the month received) | C: CO-502 (income facts' convention) |
| C.1.d.ii-vi (scholarships, child support, workers' compensation, SSI, veterans' benefits excluded) | C: CO-502 does not read `child_support_received`, `ssi_income` or CO-030 (veterans' benefits, workers' compensation), ok |
| C.1.d.vii-viii (stimulus, FPUC) | NA: expired |
| C.1.d.ix (AI/AN exceptions of 435.603(e)) | C: CO-502 via the tax figures (excluded from taxable income); NA |
| C.1.e.i-xv (above-the-line deductions; 401(k)/403(b); NOL; capital losses; alimony paid before 2019) | C: CO-080 `pretax_deductions`, CO-502 |
| C.1.f.i, f.ii (child or dependent income only above the filing threshold) | C: CO-503 (`is_required_to_file_tax_return`). F-17 for i.1 and ii.1 (P2) |
| C.1.f.iii (income always counts for own eligibility when not living with a parent) | C: CO-503 (summing-household test), ok |
| C.2 (30-day reasonable opportunity period for income) | C: CO-1349, CO-1414, CO-1415 |
| C.2.a.i-iii (both below; within 20%; both above) | C: CO-1402, CO-1344, CO-2217/2218. OQ-302 (F-12) |
| C.2.b, b.i (explanation, then documentation; PHE text) | C: CO-1403 (`reasonable_explanation` facts CO-2239/2241); PHE text expired |
| C.3 (self-employment ledger sufficient unless questionable) | C: CO-1403 (self-employment arm only when questionable), ok |
| C.4 (current or previous monthly income) | C: CO-502-504 (the month) |
| C.4.a (annualize self-employment, seasonal and commission income when ineligible monthly) | **F-04 GAP (P1)** |
| C.5 (eligible if below 100% FPL by the APTC method) | **F-05 GAP (P1)** |
| D.1, D.1.a-b (5-point disregard as the last step, only above the threshold, per program, for titles XIX and XXI) | C: CO-183, CO-539, CO-545-548, CO-704 (CHP+), CO-1155, ok |
| E.1 (household by relationship to the filer) | C: CO-500 |
| E.1.a.i-iii (filer household) | C: CO-500 arm 1. **F-02** (spouse not living in the home) |
| E.1.b.i-iv (tax dependent's household) | C: CO-500 arm 2. **F-02** (b.ii, b.iv) |
| E.1.c.i-iii (exceptions) | C: CO-1976, CO-563, ok |
| E.1.d.i-iv (non-filer household) | C: CO-500 arm 3. **F-01** (transitive walk) |
| E.2 (pregnant woman counted with expected children) | C: CO-501, ok |
| E.3 (family planning applicant counted as two) | C: CO-1153, CO-3029. OQ-204 |
| E.4 (married couples living together in each other's household) | C: CO-500 (F-02 for spouses not living together) |
| E.5 (joint filers, one parent outside the home) | C: CO-1976, ok |
| E.6 (both a dependent and a filer: a dependent) | C: CO-500 (arm 1 requires not claimed), ok |
| F.1 (presumptive eligibility: pregnant, child, limited family planning) | C: CO-558, CO-559, CO-3155 |
| F.2.a-b (195% / 142%; status exception) | C: CO-558, CO-559, ok (OQ-56 resolved) |
| F.2.c (limited family planning presumptive eligibility) | C: CO-3155, CO-3152. OQ-590 |
| F.3-F.7 (site certification, forwarding, period, appeals) | NA: procedure (F.5 as R.5) |
| F.8 (not already receiving a program) | C: CO-558, CO-559, CO-3155, ok |
| F.9 (once per 12 months or per pregnancy) | C: same, ok |
| G.1 (eligible any day means eligible for the whole month) | C: month-level outcomes; CO-564, CO-549. **F-06** (not applied at the 65th birthday) |
| G.2 (children, 142%) | C: CO-545, CO-191, ok. "Income chart" NA (OQ-63 resolved) |
| G.2.a (through the end of the month turning 19) | C: CO-564, ok |
| G.3 (parents and caretaker relatives, 68%; a dependent child in the household) | C: CO-547, CO-192, CO-2606, CO-544, ok |
| G.3.a.i-vi (child considered living in the home despite absences) | C: CO-3350 `dwelling_id` (temporary absence), CO-1925. OQ-612 |
| G.4 (adults, 133%; parents over 68% fold in) | C: CO-548, CO-193, ok. **F-06** |
| G.4.a (dependent child must have MEC) | C: CO-548, ok |
| G.4.b (COVID-19 testing group) | NA: expired |
| Pub. L. 119-21 community engagement (42 CFR 435.119(d), from 1/1/2027) | C: CO-1975, CO-1960-1974, CO-3165, CO-554 rows. OQ-410, OQ-411, OQ-412, OQ-593 (not re-derived in this pass beyond the CO-551 and CO-554 rows) |
| G.5 (pregnant, 195%; from the application date through the 12th month after the pregnancy ends; regardless of financial changes once income is verified) | C: CO-546, CO-565, CO-566, CO-560, CO-3601, CO-194, ok (F-1 and F2-1 fixes hold) |
| G.5.a.i (ends if income not reasonably compatible by the end of the 30-day period, first verification only) | C: partly, through CO-566 (income verification not pending at the start month). F-22 (P2) |
| G.6 (Legal Immigrant Prenatal) | C: CO-509 (vii arm, lawfully present and pregnant), CO-546 |
| G.6.a.i-viii (guaranteed period ends on listed events) | **F-16** (P2) |
| G.7 (eligible needy newborn, one year, including retroactive birth coverage; need not live with the mother) | C: CO-550, CO-087, CO-3322, ok (CO-110) |
| G.7.a (report the birth; no SSN or application needed) | C: CO-1401 (newborn exempt from SSN); reporting NA |
| G.8 (limited family planning 133-260%; residency and status; no full coverage) | C: CO-1154, CO-1155, CO-1153, CO-1176, ok. OQ-204 |
| H.1.a (Psych <21, under the MAGI needs standard; to 22 if still inpatient) | C: CO-2419, CO-2414-2418. OQ-512 |
| H.1.b-g (foster care and adoption groups; g to 21 unless subsidized adoption) | C: CO-2419 (`ma_needy_young_person_basis`), CO-3028, CO-2415 |
| H.2.a (former foster care to the end of the 26th-birthday month) | C: CO-549, ok (F3-3 fix holds) |
| H.2.a.i-iii (not subsidized adoption; not mandatory MA; out-of-state since 1/1/2023) | C: CO-549, CO-551 order, CO-2420/2421/2853, ok |
| H.2.b (no income or resource test) | C: CO-549, ok |
| H.2.c (newborn of a former foster youth is a needy newborn) | C: CO-550 via CO-087, ok |
| I.1, I.1.a-b, b.i (TMA 12 months; 3 of 6 months; earnings; employed parent) | C: CO-4205, CO-2425, CO-2422-2429, ok (I.1.a reads enrollment as eligibility; acceptable) |
| I.2, I.2.a-b (joining members; continuous eligibility children; redetermined members) | C: CO-2430, CO-4204, ok (F3-4 fix holds) |
| I.3 (household must include a dependent child) | C: CO-4205 over CO-4204, ok |
| I.4 (reassess when TMA ends) | NA: procedure |
| I.5, I.5.a (four-month extension for support income; alimony before 2019) | C: CO-2431, CO-2423, ok |
| J (Express Lane: purpose) | C: CO-2442 |
| J.1.a.i-vi (free and reduced lunch application route) | C: CO-2442, CO-3156, CO-2440/2441/2443/2444, CO-2445, ok |
| J.1.b.i-ii (lunch recipients not forwarded) | C: CO-2442 (`ma_express_lane_source` options), ok |
| J.2.a.i-vii (SNAP and Colorado Works application route) | C: CO-2442, CO-3156, ok |

### 3.8 10 CCR 2505-3 (CHP+)

| Para | Disposition |
|---|---|
| 50.1-50.2, 50.4-50.5, 50.8-50.12, 50.15, 50.17 | NA: names, entities, procedure |
| 50.3 (child under 19) | C: CO-705 via CO-564. F-26 (P3) |
| 50.6 (dependent child) | C: CO-544 (shared definition) |
| 50.7 (effective date = application date) | **F-09** (with 430.1) |
| 50.13 (household per 8.100.4.E) | C: CO-500, CO-704 (OQ-62 resolved). F-01 and F-02 carry over |
| 50.14, 50.18 (income per 8.100.4.C) | C: CO-503, CO-504 |
| 50.16 (presumptive eligibility) | C: CO-708 |
| 50.19 ("Woman" 19 or older) | C: CO-704 tests the child band first, so a pregnant minor is a child; ok |
| 110.1.A.1-2 (under 19, or pregnant) | C: CO-705, CO-706 |
| 110.1.B.1-4 (citizenship and qualifying statuses) | C: CO-2706, ok (trafficking-victim override; OQ-550) |
| 110.1.B.5.a-n (CHIPRA 214 categories) | C: CO-2706, ok |
| 110.1.B.5.o (Cover All Coloradans exception) | C: CO-2707 via CO-1173, ok |
| 110.1.B.5.o.1 (confidentiality) | NA |
| 110.1.C, C.1-2 (verify status through VLP; reasonable opportunity period) | C: CO-1622 (via CO-3157), CO-1416, CO-1418 |
| 110.1.C.3.a (not for Cover All Coloradans applicants) | C: CO-3157 / CO-1622 status arm, ok |
| 110.1.D (Colorado resident; temporary absence) | C: CO-505, CO-705/706 |
| 110.1.E (child: over 142%, up to 260%) | C: CO-704, CO-211-type parameters (`chp_income_limit_pct_upper`), ok |
| 110.1.F (pregnant: over 195%, up to 260%) | C: CO-704, ok |
| 110.1.G (incomplete application: denial) | C: CO-1418 (`chp_verification_status` `past_due`) |
| 120.1.A (other group or health insurance, excluding COBRA, at application or redetermination) | C: CO-090, CO-705/706/707 (continuous eligibility keeps an enrollee who gains coverage until renewal, as 440.4.B says), ok |
| 120.1.B (eligible for Title XIX) | C: CO-1176 in CO-705/706/707, ok (F3-2 fix holds) |
| 120.1.C (inmate or IMD patient; 90-day reentry carve-out) | C: CO-1105, CO-1104, CO-1749, ok. F-15, F-19 |
| 120.2 (no uninsured waiting period) | C: no item imposes one, ok |
| 130.1 (minimal verification per 8.100.4.B) | C: CO-1416, CO-1417, CO-1418, CO-1642, CO-1643, CO-3634, CO-3635, CO-1641, CO-2219 |
| 140.1-140.2.B.2 (redetermination, reconsideration) | NA: renewal procedure (same scope note as F-14) |
| 150.1 (income per 8.100.4.C) | C: CO-503/504 (F-04, F-05 carry over) |
| 150.2 (disregard per 8.100.4.D) | C: CO-704, ok |
| 160 (repealed) | NA |
| 170.1.A-B (presumptive eligibility: child 142-260%, pregnant 195-260%) | C: CO-708, ok |
| 170.1.C (status or exception) | C: CO-708 (every person reached is in the exception population; H-11), ok |
| 170.2, 170.2.A, 170.3, 170.4, 170.4.A-B | NA: procedure |
| 170.5 (not already receiving a program) | C: CO-708, ok |
| 170.6 (once per 12 months or per pregnancy) | C: CO-708, ok |
| 180.1.A.1-6, 180.1.B.1-2, 180.2.A.1-6 (Express Lane) | C: CO-2442, CO-3156 (it enrolls in Medical Assistance; the same as 8.100.4.J) |
| 200-210 (benefits package) | NA: covered services, not eligibility, cost sharing or enrollment |
| 310 (repealed enrollment fee) | NA (OQ-57 resolved) |
| 320.1.A-D (copayment bands and schedules) | C: CO-2228, CO-2230, CO-3009-3012, CO-2225-2227, ok. OQ-470 |
| 320.1.C.3, D.3 (COVID-19 laboratory copayments waived) | C: CO-2230 (`covid_19_laboratory_testing`), ok |
| 330.1 (AI/AN exempt) | C: CO-1989, CO-1990, ok |
| 330.2 (5% of income yearly cap) | C: CO-2229, CO-2231, ok |
| 330.3.A-D (no copayments for preventive services) | C: CO-2230, ok |
| 330.4 (Prenatal Care Program clients exempt) | **F-08** (P1) |
| 400.1, 410.1-410.5 (election; MCO selection) | NA: plan enrollment administration |
| 420.1-420.2 (all eligible children enrolled in the same MCO) | NA: enrollment administration |
| 430.1.A-B (effective on the later of the application month or the month eligible) | **F-09** (P1) |
| 430.2, 430.2.A, A.i (12-month continuous eligibility; transition to Medicaid) | C: CO-2404, CO-2403, CO-2402, CO-707, ok |
| 430.2.B.i-viii (exceptions; limited incarceration benefit) | C: CO-2404 via CO-2205, CO-707 `eligible_incarceration_limited`, ok |
| 430.3 (pregnant span: application month through 12 months after the birth) | C: CO-2406, CO-2407, ok |
| 430.3.A.i (90-day reasonable opportunity exception) | F-22 (P2) |
| 430.4.A-B (MCO enrollment date) | NA: plan enrollment administration |
| 430.5, 430.5.A (newborn of a CHP+ mother guaranteed one year; report the birth) | C: CO-2408, CO-2410, CO-707, ok |
| 440.1-440.3, 440.5 (MCO disenrollment) | NA: plan administration |
| 440.4.A-F (program disenrollment: fraud, other coverage at renewal, institution, ineligibility, copayments, no MCO) | C: B (CO-707 continuous eligibility before the coverage branch), C (inmate limited benefit; F-19 for IMD), D (CO-707). A, E, F NA (administration and sanctions) |
| 500-510 (financial management) | NA |
| 600-610 (appeals) | NA |

**Matrix size:** 236 paragraph rows (D-65 § 8.100.1-8.100.4: 168 rows, including the definitions as 14 grouped rows; D-66: 68 rows). The long document and immigration-category lists (H.2.b.i-xxi, H.3.a-h, G.1.g.vii.1-28, G.1.g.iv.1-11, 110.1.B.4-5) are each one row, mapped to the item that enumerates them.

Tally:
- Carried: 158 (of which 9 carry a P1 mismatch and 7 a P2 or P3 note).
- Not applicable: 61.
- Open question only: 0 (each OQ row is also carried).
- GAP: 4 P1 (K.1, C.4.a, C.5, 430.1/50.7), 3 P2 (P.3.f-g/P.5, G.1.b.i.5, K.7) and 1 P2 partial (G.6.a).

## 4. Open-question confirmations

Each family question was checked for its class and for whether the "Checked" texts include everything an allowed host serves.

| OQ | Class recorded | Confirmation |
|---|---|---|
| OQ-50 deprivation | state policy choice | **Fails.** Colorado SPA CO-13-0045-MM1 S25 on medicaid.gov selects "The state elects to eliminate the requirement that a dependent child must be deprived of parental support". This resolves the question (assumption confirmed). F-10. |
| OQ-200 emergency "otherwise eligible" routes | state policy choice | Confirmed. F.1.k and 1396b(v)(2)(B) do not say whether the HCBS special income group is a route. |
| OQ-204 family planning household of two and disregard | state policy choice | Confirmed. E.3 and G.8 read. |
| OQ-213 five-year exemptions | needs Legal | Confirmed. The iii/iv text conflict is real. |
| OQ-214 Cover All Coloradans postpartum | needs Legal | Confirmed. ix.1 versus C.R.S. 25.5-5-201(6). |
| OQ-302 reasonable compatibility base | blocked on a named document | **Fails.** The named document (Colorado's MAGI verification plan) is on medicaid.gov and states the threshold test and the attested-above case. Reclassify as a state policy choice with the plan checked. F-12. |
| OQ-303 period for other documentation | state policy choice | Confirmed. |
| OQ-410, OQ-411, OQ-412, OQ-593 community engagement | state policy choice | Confirmed. § 8.100 has no community engagement text, and the 42 CFR 435.55x provisions read leave each item to the State. No Colorado community engagement SPA was found on medicaid.gov (search 2026-11-22). |
| OQ-470 CHP+ copayment band gaps | state policy choice | Confirmed. |
| OQ-472 residency of the incapacitated institutionalized | needs Legal | Confirmed. B.2.b against B.2.c and 435.403. |
| OQ-510 payment limit by determination date | needs Legal | Confirmed. |
| OQ-512 "MAGI needs standard" | state policy choice | Confirmed. Undefined in § 8.100. |
| OQ-513 hospital presumptive eligibility "19-65" | state policy choice | **Fails (incomplete).** The hospital presumptive eligibility SPA CO-13-051-MM on medicaid.gov lists "Adult Group" (435.119, under 65) and not the 65-and-over groups. Cite it and resolve. F-13. |
| OQ-514 aid codes | blocked on a named document | Confirmed. The CBMS aid code table is not on an allowed host. |
| OQ-515 poverty guideline adoption date | blocked on a named document | Confirmed. The HCPF memo is on hcpf.colorado.gov only. |
| OQ-517 transition under the payment limit | blocked on a named document | Confirmed. |
| OQ-518 rule versus federal payment limit | needs Legal | Confirmed. |
| OQ-540 caretaker "assumes responsibility" | state policy choice | **Incomplete.** SPA S25 settles the Medicaid half ("assumes primary responsibility"). Cite it and narrow the question to CCCAP. F-11. |
| OQ-550 SAVE status list | blocked on a named document | Confirmed. uscis.gov is not an allowed host. |
| OQ-590 limited family planning presumptive eligibility household of two | state policy choice | Confirmed. |
| OQ-592 two winnings receipts in a month | state policy choice | Confirmed. |
| OQ-612 temporary absence | state policy choice | Confirmed for Medicaid. 8.100.4.G.3.a lists absences without a limit. |
| OQ-62, OQ-63 (resolved) | resolved | Confirmed. |

## 5. Earlier P1s (spot-check)

| Earlier ID | Status | Evidence (engine at a2ed7f0) |
|---|---|---|
| F-1 pregnancy in retroactive months; postpartum | fixed | CO-110 p1: `pregnant` / `eligible` in 2026-06 and 2027-08; `none` / `ineligible_income` in 2027-09. |
| F-2 hospital presumptive eligibility status declaration | fixed | CO-111: p3 and p4 (undocumented, pregnant) `pregnant`; p5 `none`; p2 `employed_disabled`. |
| F2-1 retroactive pregnancy period only on request | fixed | CO-138 (no request), 2026-09: MAGI `ineligible_income`, CHP+ `eligible_prenatal`. CO-137 (request): `pregnant`, CHP+ `ineligible_medicaid_eligible`. |
| F3-2 CHP+ Title XIX exclusion | fixed | CO-705, CO-706 and CO-707 read CO-1176 (derivations read). |
| F3-3 19th and 26th birthday months | fixed | CO-564 and CO-549 take the age on the day before the first of the month (derivations read). The same pattern at 65 is new: F-06. |
| F3-4 TMA for dependent children | fixed | CO-2430 admits a dependent child in a TMA household (CO-4204, CO-4205). |
| F-3 to F-7, F2-2, F3-1 (non-MAGI) | not re-checked here | Belong to the non-MAGI coverage pass. |

## 6. Probe households (scratch only)

| Probe | Shape | Engine | Rule |
|---|---|---|---|
| RV-GM | non-filer mother p1 ($2,800), daughter p2 (17), p2's baby p3 | p1 household 3, 123.0%, `adult` `eligible` | household 2, 155.3%, `ineligible_income` |
| RV-SPA | filer p1 ($1,200), spouse p2 ($5,000) in another home | p1 household {p1, p2}, 343.8%, `ineligible_income` | {p1}, 90.2%, `adult` `eligible` |
| RV-SE | self-employed adult, $3,000 in November, $11,998 for the year | 225.6%, `ineligible_income` | annualized 75.2% (C.4.a, C.5): `eligible` |
| RV-65 | born 1961-11-05, no Medicare, $900 | `none` `ineligible_no_category` | `adult` `eligible` (8.100.1, G.1) |
| RV-INM | adult in a government-run jail, no income | `adult` `eligible` | eligible with benefits limited (G.1.b.ii) |
| RV-PP | CHP+ prenatal span from 2026-03, birth 2026-08-10, 221.8% | November office visit copayment $10 | $0 (330.4) |
| RV-CHPB | child, application 2026-11-02, 205.2% | CHP+ `eligible_child` in 2026-08 | not eligible before November (430.1) |
