# Final verification pass: SNAP (Colorado Food Assistance)

Reviewer: fresh, independent SNAP policy reviewer (family `snap`). Read-only pass at `80f2e9e` (branch
`ccr-9d19bf4c-wmnwcl`). The only file written is this one. The governing text was read directly. It is
mainly the current Colorado rule, 10 CCR 2506-1 effective 2026-10-01 (`documents/D-82.md`), together with
7 U.S.C. 2014-2017 (D-3, D-4), Pub. L. 119-21 (D-5), 7 CFR 271.2, 273.1-273.24 (D-7..D-16, D-95, D-186),
8 U.S.C. 1612-1613 (D-24, D-25) and the FNS FY 2027 COLA tables (D-83, D-84). The excerpts in
`volumes/co/sources.md` were checked against those files. No earlier review was relied on.

Scope:
- household composition;
- non-citizen eligibility under H.R.1;
- BBCE/ECE;
- income, deductions and SUA;
- resources;
- allotment, proration and the minimum allotment;
- expedited service;
- work registration, ABAWD and voluntary quit;
- students, strikers and disqualifications;
- recertification;
- SNAP verification.

All of these are the 29 declared SNAP outcomes in `volume.yaml` plus `snap_is_eligible` and
`snap_is_work_registrant`: 428 items reached through `uses`. Out of scope: SUN Bucks, which has its own
family.

Mechanical state:
- `npm run check -- --volume co` passes ("check: OK"). The conformance self-check gives 5436/5436. No
  SNAP-specific error.
- `npm run export -- --volume co` writes the same ledger (no diff).

## 1. Verdict

**13 P1 found.** The SNAP chapter is **not complete** under the stopping rule.

What holds:
- The FY 2027 figures are all correct and correctly dated.
- The allotment, proration, ECE, SUA, shelter, medical and ABAWD-clock arithmetic is right.
- Every stored SNAP case I recomputed agrees with the engine.

The P1s fall into three groups:
1. Rule-provided pathways or computations that have no item, and no open question that records them:
   - sponsor deeming;
   - the Family Preservation route into BCE;
   - former-refugee LPRs and the other 8 U.S.C. 1612(a)(2) exceptions;
   - three prongs of "person with disabilities";
   - the farm-loss offset;
   - the ABAWD in-kind and unpaid work;
   - the California Indian exception;
   - two student exemption details;
   - the 18+ maximum allotment row.
2. Two places where the codex gives an answer the governing text contradicts:
   - the initial-month floor is $25, not the federal $10;
   - ineligible students' resources are counted, and those students enter the proration divisor.
3. Two verification gaps:
   - the authorized representative's identity;
   - unverified expenses still deducted after day 30.

Each P1 is a local change. None needs a redesign.

## 2. Findings

Severity:
- **P1**: wrong answer, missing pathway, undefined element, or an unmodeled verification requirement.
- **P2**: maintainability or approval risk.
- **P3**: note.

| id | sev | item(s) | governing excerpt | what is wrong | proposed fix |
|---|---|---|---|---|---|
| F-1 | P1 | CO-385, CO-2308, CO-135 (OQ-38 resolution) | 7 U.S.C. 2017(c)(2)(B) (D-4:19): the initial-month allotment is prorated, "except that no allotment may be issued … if the value … is less than $10". 7 CFR 273.10(e)(2)(ii)(B) (D-14:111): "less than $10 …, no benefits shall be issued … for the initial month". 10 CCR 2506-1 4.207.3.B (D-82:2603, S737) instead says "less than the federal minimum allotment" ($25). | `snap_allotment` pays $0 for an initial month whose prorated benefit is $10-$24. The federal statute entitles the household to it. The codex elsewhere follows the federal statute over a stale Colorado rule (`statute_override` on CO-119, CO-166, CO-308, CO-414, CO-1243). Here it follows the state text with no override and no open question: OQ-38 is closed with "in Colorado is the minimum allotment rather than the federal $10". | Add `snap_initial_month_minimum_issuance` ($10, S1617/D-4). Make CO-385 read it. Add a `statute_override` naming 4.207.3.B. If the SNAP owner or Legal believe a waiver supports $25, record a Legal open question with that text instead. CO-2308-T3 and the CO-385 tests change. |
| F-2 | P1 | CO-331, CO-332, CO-343, CO-2337 | 4.305.2.C-D (D-82:4082-4165): "the local office shall deem the income and resources of the sponsor and the sponsor's spouse … as the unearned income and resources of the sponsored non-citizen". D.2.a-c: less 20% of earnings, less the 130% gross limit for the sponsor's household size, divided among the sponsor's non-citizens. D.4: excess actual payments. D.6: resources less $1,500. Federal equivalent: 7 CFR 273.4(c)(2)(i)-(v) (D-9:120-134). | `snap_sponsor_deeming_applies` exists but feeds only verification (CO-1616). No item deems any sponsor income or resources, so an eligible sponsored LPR's household is budgeted without them. Example: an LPR past the five years with fewer than 40 quarters, not living with the sponsor. This is a wrong eligibility and allotment answer. OQ-380 is marked Resolved, and its 2026-11-21 entry itself says "the SNAP sponsor-deeming computation itself is not in the ledger". The federal child exemptions (273.4(c)(3)(vi)-(vii), D-9:152-154) are also absent from CO-2337. | Add `snap_sponsor_deemed_income` and `snap_sponsor_deemed_resources`. They read the shared sponsor facts that `cw_sponsor_deemed_income` already uses (CO-2355..CO-2359, `sponsors`, `sponsor_household_size`). Add them in CO-331 and CO-343. Add the (c)(3)(vi)-(vii) arms to CO-2337, or record a state-choice open question if Colorado's narrower E list is meant. Reopen OQ-380. |
| F-3 | P1 | CO-306, CO-307, CO-308 | The 2015(f) amendment (S8) still admits LPRs. Every LPR remains a qualified alien under 8 U.S.C. 1612(a), whose exceptions sec. 10108 did not touch. The exceptions: (a)(2)(A) refugee/asylee/withholding/Cuban-Haitian/Amerasian, 7 years (D-24:17-37); (a)(2)(G) American Indians born in Canada and tribal members; (a)(2)(K) Hmong/Highland Lao veterans and family (D-24). 7 CFR 273.4(a)(6)(ii)(B)-(F) and (iv) (D-9:68-110): "Subsequent adjustment to a more limited status does not override eligibility based on an earlier less rigorous status". 8 U.S.C. 1613(b)(1) (S1150). | CO-307's additional condition reads only under-18, disability, military, the 1931 elderly arm, 40 quarters and 5 years. A refugee or asylee who adjusted to LPR is therefore ineligible for the first five years after admission. So is an LPR Canada-born Indian, and an LPR Hmong veteran's widow. The facts exist (`status_before_lpr_adjustment` CO-2700, CO-2701, CO-2702), and the shared `is_exempt_from_five_year_bar` (CO-1725) already reads CO-2700 for Medicaid. SNAP reads none of them. CO-308's own meaning promises "the five-year bar of 8 U.S.C. 1613 or one of its exceptions". | Add to CO-306: `status_before_lpr_adjustment` in [refugee, asylee, deportation_withheld, cuban_haitian_entrant, amerasian_immigrant] (with (a)(6)(iv) there is no 7-year cut-off, since (L) is met by then); `is_american_indian_born_in_canada_or_tribal_member`; `is_hmong_or_highland_lao_veteran`. Cite D-24 and D-9. Add a CO-308 test for an LPR formerly a refugee. |
| F-4 | P1 | CO-336, CO-338, CO-341 | 4.206.C.1.a.2 (D-82:2337): "BCE households are: … 2) A household in which at least one (1) member receives services from the Family Preservation Program." | This BCE pathway has no item. A household above 200% FPL with one member in Family Preservation is classed `standard`. That makes it subject to the gross, net and resource tests that BCE deems met, which can give a wrong ineligibility. | Add a supplied `receives_family_preservation_services` (a neutral fact). Make CO-338 read it: all members on SSI/CW/OAP/AND/AB, **or** any member in Family Preservation. |
| F-5 | P1 | CO-407, CO-409, CO-410 | 4.306.1.D (D-82:4434-4441): "A full-time student in the same SNAP household with a child who is under their parental control may qualify if they do not reside with their spouse." 4.306.1.B (D-82:4414): "If the student is self-employed, the student shall work an average of twenty (20) hours a week **and** have earnings after allowable business expenses … equal to at least the federal minimum wage multiplied by twenty (20) hours." 7 CFR 273.5(b)(8) says the same. | First arm: CO-409 requires the student to be a `parent` of the child, so the non-parent caretaker arm (no parent in the household) is missing. A grandparent student raising a grandchild is wrongly an ineligible student. Second arm: CO-407 exempts on hours alone, so a self-employed student working 20 hours who earns under $145 a week is wrongly exempt. | CO-409: add an arm for when no natural, adoptive or stepparent of the child is in the household: the student has `has_primary_responsibility_for` or `legal_guardian` of a child under 12 and no spouse in the household. CO-407: for self-employment hours, also require `snap_self_employment_income` / 4.3 ≥ `federal_minimum_wage` × 20. |
| F-6 | P1 | CO-343, CO-1740, CO-333, CO-371, CO-2300, CO-2301, CO-336 | 4.411.2.C (D-82:8733): "A person who is an ineligible student … shall be treated as a non-household member. … The income and resources of the ineligible student shall not be considered available to the other household members … nor shall the student be considered in determining the household's allotment." 4.411.2.A: the same for "non-household members … such as live-in attendants and ineligible students". | Ineligible students stay in `snap_household_members` (participation status `ineligible_member_student`), with three consequences. First, CO-343 and CO-1740 sum *every* member's resources, the student's included: a wrong resource-test or expedited answer. Second, the prorating items divide by `count(snap_household_members)` (CO-333, CO-371, CO-2300, CO-2301), so the student inflates the divisor for an ineligible non-citizen's or ABAWD's income and expenses. Third, CO-336's "all members receive" test reads the student, so a student who does not receive SSI or CW blocks BCE. | Filter `snap_is_ineligible_student` out of the CO-343 and CO-1740 sums, the four pro-rata divisors and CO-336's member set. Add tests. |
| F-7 | P1 | CO-302, CO-015, CO-303 | 10 CCR 2506-1 4.000.1 "Person with disabilities" (D-82:570-620), which mirrors 7 CFR 271.2 (10)-(11) (S1951): 2. "… or is a veteran receiving a pension for a non-service connected disability"; 7. "Receives an annuity for disability from the railroad retirement board who is considered … disabled … by the SSA or who qualifies for Medicare as determined by the railroad retirement board"; 8. "a recipient of interim assistance benefits pending the receipt of … SSI, disability-related medical assistance under Title XIX …". | `snap_is_disabled_member` has no arm for a Railroad Retirement disability annuitant, for interim assistance pending SSI, for disability-related Medicaid, or for Colorado's VA non-service-connected pension. No fact carries any of them; a search of the ledger for "railroad" or "interim assistance" finds nothing. Such a household loses four protections: the gross-income exemption (CO-347), the uncapped shelter deduction (CO-379), the medical deduction (CO-376) and the $4,750 resource limit (CO-344). That gives wrong eligibility and allotment answers. | Add neutral facts `receives_railroad_retirement_disability_annuity`, `receives_ssi_interim_assistance` and `receives_va_nonservice_connected_pension`. For disability-related Medicaid, read an existing Medicaid category such as `ma_ssi_related_category` or add a fact. Add the arms to CO-302 and cite D-82:570-620. |
| F-8 | P1 | CO-1702, CO-330 | 4.403.12.E (D-82:6266-6290): if a self-employed farmer's (≥ $1,000 gross a year) costs exceed income, "such losses shall be offset against other income received by the household". The order is: first other self-employment income, then other earned income (before the earned income deduction), then the other income is added. | CO-1702 floors self-employment at 0, and its precision says "A farm loss offset against other income … is not modeled". No open question records it. A farm household's gross and net income are therefore overstated: a wrong answer for that pathway. | Add `self_employment_is_farm` (or a farm-loss fact) and `snap_farm_loss_offset`. Apply it in CO-330 and CO-331 in the stated order. At minimum, record an open question now. |
| F-9 | P1 (verification) | CO-1370, CO-1387, CO-1394 | 4.301 (D-82:2970-2974) and 4.505.1.A (D-82:9320): "When an authorized representative applies on behalf of a household, the identity of both the authorized representative and the head of household shall be verified." 4.502.A.1 says the same for expedited service (D-82:8815). 273.2(f)(1)(vii) (D-8). | CO-1370's precision says "An authorized representative's identity … is not modeled; the volume has no authorized-representative fact." That is a verification requirement the rule states, left unmodeled. Expedited postponement (CO-1394) also turns on it. | Add case facts `snap_application_filed_by_authorized_representative`, `authorized_representative_identity_verified` and `…_document_received`. Count the representative's identity in CO-1387/CO-1389 and in CO-1394's expedited arm. |
| F-10 | P1 | CO-374, CO-376, CO-377, CO-2003 vs CO-1394 | 4.502.A.3 (D-82:8856, S818): "If the expense cannot be verified within thirty (30) calendar days of the date of application, the local office shall determine the household's eligibility and benefit level without providing a deduction or exclusion for the unverified expense." 273.2(f)(3)(ii) (S812). | `snap_verification_status` returns `expenses_disallowed` ("the deductions are disallowed"). For the same household and month, `snap_allotment` still deducts those expenses. CO-91 shows it: in 2027-02 the status is `expenses_disallowed`, yet `snap_dependent_care_deduction` in 2026-11 is 200, and nothing in the deduction items reads verification. The answer there is masked only because net income is $0. A household with income gets an allotment the rule forbids. | Gate each deductible component on `not [all, <elem>_verification_is_pending, [">", det_date, snap_expense_verification_due_date]]`. The components are dependent care (CO-2301), medical (CO-376 input), shelter (when CO-1379 required it; SUA unaffected) and the child support exclusion (CO-2003). Add a CO-91 expectation for a variant with income. |
| F-11 | P1 | CO-130, CO-131, CO-383 | FNS FY 2027 Table 1 (D-83:31) and 4.207.3.D (D-82:2651): "9-17 $225 per additional person; **18+ $3,887**". | CO-383 extrapolates $225 per person without limit, which gives $4,091 for 18 people where the text states $3,887. This is a stated figure that is not modeled. It is rare but wrong. | Add the 18+ figure as a dated parameter, `snap_maximum_allotment_large_household`, and cap CO-383 at size 18 and above. If the row is thought to be a misprint, record an open question citing both texts. |
| F-12 | P1 | CO-415, CO-022, CO-2309/CO-418 | 4.311.B.1.a (D-82:5447-5458): "Working includes: i. … compensated work; ii. Work completed in exchange for goods or services (in-kind work); iii. Unpaid work verified by the provider of the unpaid work; or iv. Any combination". 7 CFR 273.24(a)(1)(ii)-(iii) (D-16:25-27). | `hours_worked` (CO-022) is "for pay", and CO-415 counts only it plus `work_program_hours`. An ABAWD meeting 80 hours through in-kind or verified unpaid work accrues a countable month. That gives a wrong `snap_abawd_time_limit_status` and, from the fourth month on, a wrong exclusion of the member. Regaining under 4.311.3.D has the same gap. | Add `in_kind_or_unpaid_work_hours` (person-month, verified by the provider) and add it in CO-415 and in the regaining test. Fix CO-022's meaning (see F-16). |
| F-13 | P1 | CO-050, CO-414 | 7 U.S.C. 2015(o)(3)(G) as amended (S127, S128): the time limit does not apply to "(G) a California Indian described in section 1679(a) of title 25". | CO-050 covers tribal members, Alaska Natives and urban Indians only, so the statutory exception (G) is missing. A California Indian living in Colorado who is not an enrolled member would be wrongly time-limited. | Add `is_california_indian_under_ihcia` (25 U.S.C. 1679(a)) to CO-050. Cite S127/S128. |
| F-14 | P2 | CO-341, CO-1374..CO-1377, CO-1616 | 4.000.1 (D-82:93): "'Basic Categorical Eligibility (BCE)' means the status granted to any household that is **not eligible for Expanded Categorical Eligibility** and contains only members who receive…". 4.206.C.1.d (D-82:~2380): "Households that are ineligible … under BCE rules shall have their eligibility determined under ECE or SE rules." | CO-341 tests BCE first. Under the definition, an all-SSI household at or below 200% FPL is ECE, not BCE. The verification relief items read `basic_categorical`, so the same household's income, SSN and residency verification depend on which reading applies. Neither reading is recorded. | Record a state-choice open question (SNAP owner) quoting both texts, and state the order on CO-341. |
| F-15 | P2 | CO-041 | 4.803.3.D (D-82:~14053): "An individual shall not be ineligible due to a drug conviction unless misuse of SNAP benefits is part of the court findings … twenty-four (24) months on the first … permanently … second". | The meaning of `snap_is_disqualified_drug_felony` describes the federal 21 U.S.C. 862a ban ("possession, use, or distribution … after August 22, 1996"), which Colorado does not apply, and it has no `sources`. A worker who supplies the fact by its meaning disqualifies the wrong people. | Re-mean the fact per 4.803.3.D and cite it. Data steward and SNAP owner. |
| F-16 | P2 | CO-022, CO-2337, CO-331 | — | These are stale references: CO-022's meaning points to `workfare_hours (CO-049)`, which does not exist. CO-2337 cites the threshold as "(CO-103)"; it is `federal_qualifying_quarters_threshold`, CO-3033. CO-331's precision and assumption still say "the 273.9(c) exclusions are not modeled (OQ-390)", which CO-2339 now does. | Correct the text. |
| F-17 | P2 | S47, S48, S57, S99, S132, S135 (and the items citing them) | — | These excerpts quote the Cornell copies (D-17, D-18, D-19), not the current SOS rule (D-82). The text mostly agrees. But S132 carries the superseded "Aged fifty-five (55) or older", and it omits 4.206.C.1.a.2 (see F-4) and 4.306.1.B's minimum-wage sentence (see F-5). This is an approval risk: a signer reads outdated text. | Re-point them to D-82 with line ranges. Keep the Cornell copies only as history. |
| F-18 | P2 | CO-311, CO-1601, CO-1394 | 273.2(f)(1)(ii)(B)-(C) (D-8): "An alien is ineligible until acceptable documentation is provided unless …". The household gets a reasonable opportunity to the 30th day. | After `snap_noncitizen_documentation_due_date`, the status reads `past_due`, but the member stays in the eligible size. The rule excludes the member, not the household. This is borderline application processing, which is why it is P2. | Either exclude the member in CO-311 after the due date with status pending, or record that the exclusion is left to processing. |
| F-19 | P2 | CO-376 | 4.411.1.B.2.c (S1602) prorates only shelter and dependent care, and applies the earned income deduction to the prorated earnings. It says nothing on the medical expenses of an ineligible non-citizen, SSN or ABAWD member. | CO-376 counts an ineligible elderly member's medical expenses in full, an unrecorded reading. | Record an open question (state choice), or exclude them, citing the FNS reading when it is available. |
| F-20 | P2 | CO-2720 | — | `snap_battered_non_citizen_exemption_months` has its only version from 2026-10-01, so a determination before then has no version. The rule has been unchanged for years. | Date it from the rule's effective date, or from 2000-01-01 as CO-2812 is. |
| F-21 | P3 | CO-378 / OQ-30 | — | OQ-30 does not change any outcome. With the deductions taken before the shelter deduction above gross income, net income is $0 whether or not the intermediate figure is floored; only the displayed excess shelter figure differs. | Close OQ-30 as immaterial to every outcome, or keep it as a display note. |
| F-22 | P3 | CO-306 | 1612(a)(2)(I) requires "lawfully residing" on 1996-08-22; CO-306 reads `qualified_status_date` ≤ 1996-08-22. | This is an approximation, documented nowhere. | Add a precision note. |
| F-23 | P3 | CO-348 | 273.2(i)(1) lists liquid resources as "cash on hand, checking or savings accounts, savings certificates, and lump sum payments". | `liquid_resources_value` also includes stocks, bonds and cryptocurrency, so the expedited test is slightly stricter than the text. | Add a precision note, or add a narrower expedited-liquid fact. |

## 3. Coverage map (pathways and computations the current rule provides → items)

The coverage map follows. Gaps are marked **GAP** with the finding that covers them.

**Household composition (4.304, 273.1)**
- Who lives together: `lives_with` (CO-1925), `dwelling_id`.
- Purchase and prepare together: `snap_household_members` (CO-305).
- Mandatory spouses: CO-305.
- Mandatory children under 22 with a parent: CO-305, CO-101.
- Mandatory children under 18 under the parental control of another member: CO-305, CO-018, CO-102.
- Elderly or disabled member unable to prepare meals as a separate household at 165% (4.304.3.A): CO-419, CO-2304, CO-114, CO-3043, CO-2303.
- Boarders excluded unless the household requests (4.304.3.C): CO-2567, CO-304.
- Roomers and live-in attendants: CO-2566.
- Foster children optional (4.304.3.B): handled by whether `buys_prepares_with` is stated. P3: the 4.304.3.B.3 "may not apply separately" is not enforced.
- Residents of institutions providing meals, with the treatment-facility and group-living exceptions: CO-007, CO-304.
- Temporary absence: OQ-612.

**Non-citizen eligibility under H.R.1 (2015(f) as amended; 4.305; 8 U.S.C. 1612-1613)**
- Categories (citizen/national, LPR, Cuban/Haitian entrant, COFA): CO-308, CO-309, CO-1358.
- LPR additional condition:
  - 40 quarters: CO-307, CO-3033;
  - 5 years in status: CO-508, CO-104;
  - under 18: CO-306, CO-177;
  - disability benefits: CO-306;
  - military: CO-306, CO-005;
  - born on or before 1931 and residing on 1996-08-22: CO-306, CO-2601, CO-279;
  - former refugee, asylee, withholding, Cuban/Haitian or Amerasian adjusted to LPR: **GAP F-3**;
  - Canada-born Indians and tribal members: **GAP F-3**;
  - Hmong and Highland Lao: **GAP F-3**.
- Ineligible member treatment: CO-310, CO-311, CO-2565, CO-333.
- Sponsor deeming:
  - when deeming applies: CO-2337;
  - the deemed income and resources: **GAP F-2**.
- Effective date for ongoing cases: OQ-1, OQ-533.

**Categorical eligibility (4.206)**
- BCE through SSI/CW/OAP/AND/AB: CO-336, CO-338, CO-073, CO-2710.
- BCE through Family Preservation: **GAP F-4**.
- BCE/ECE bars for IPV or a SNAP-misuse drug felony: CO-337, CO-1731.
- ECE at or below 200%: CO-339, CO-340, CO-122, CO-123 (OQ-12, OQ-356).
- Category: CO-341, CO-342.
- Order of BCE and ECE: F-14.
- Effect of categorical eligibility on the tests: CO-347, CO-382, CO-344.
- Zero benefit while categorically eligible: CO-386, CO-387.

**Income (4.403-4.405, 273.9-273.11)**
- Earned income: CO-330. Unearned income: CO-331. Person gross: CO-332.
- Household gross with ineligible members: CO-333, CO-334, with rounding.
- Excluded income: CO-2338, CO-2339.
- Student earnings exclusion: CO-2568, CO-2569.
- Work-study: CO-2338.
- Self-employment: CO-1700, CO-1701, CO-1702, CO-3370 to CO-3372.
- Farm loss offset: **GAP F-8**.
- Child support exclusion with three-month averaging: CO-2002, CO-2003, CO-3039.
- Strikers' income (greater of pre-strike or current): CO-3502, CO-3503.
- Sponsor income: **GAP F-2**.

**Deductions and SUA (4.407, 273.9(d))**
- Earned income deduction 20%, including ineligible members' counted earnings: CO-371, CO-372, CO-373, CO-136.
- Standard deduction by size, 6 and above: CO-370, CO-132.
- Dependent care: CO-374, CO-2301.
- Medical (elderly or disabled, $35, SMED $165): CO-376, CO-2895, CO-137, CO-1514 (OQ-353).
- Shelter:
  - billed shelter cost: CO-2300, CO-377;
  - excess at 50%, capped unless elderly or disabled: CO-378, CO-379, CO-133, CO-138 (OQ-30);
  - homeless shelter deduction: CO-037, CO-380, CO-134, CO-2810 to CO-2812.
- SUA tiers:
  - HCUA: CO-1239, CO-1243 (H.R.1 sec. 10103 elderly/disabled limit, OQ-251), CO-1235;
  - BUA: CO-1241, CO-1236, CO-3042;
  - OUA: CO-1237;
  - telephone: CO-1238.
  - All four are combined in CO-1500.
- Internet excluded (H.R.1 sec. 10104): in the meanings of CO-035 and CO-1242.
- Unverified expenses disallowed: **GAP F-10**.

**Gross and net tests**
- Gross test at 130% with the elderly/disabled exemption: CO-345, CO-347, CO-110, CO-111.
- Net test at 100%: CO-346, CO-382, CO-112, CO-113.
- Net income: CO-381, with rounding.
- Disabled-member definition: CO-302, CO-015, CO-1729, CO-016, CO-2823, CO-014. The railroad, interim-assistance, Title XIX and VA-NSC-pension prongs are a **GAP F-7**.

**Resources (4.408-4.411)**
- Liquid resources plus non-home real property; vehicles excluded: CO-343, CO-074, CO-3390, CO-3393.
- Limits $3,000 and $4,750 (FY 2027): CO-118, CO-119.
- Categorical exemption: CO-344.
- Ineligible students' resources: **GAP F-6**.
- Sponsor resources: **GAP F-2**.
- Transfer of resources (4.408.2): not modeled. It is a disqualification determined at application and would enter as a supplied disqualification; P3.

**Allotment (4.207.2-4.207.3)**
- Maximum allotment: CO-383, CO-130, CO-131. The 18+ figure is a **GAP F-11**.
- 30% reduction and round-down: CO-384, CO-2307, CO-139.
- Minimum allotment for 1-2 persons: CO-2307, CO-135, CO-140.
- Zero-benefit denial for 3 or more persons except under BCE/ECE: CO-386, CO-387.
- Initial month:
  - which month: CO-2305, CO-1746, CO-1567;
  - migrant exception: CO-2306;
  - proration with exact days: CO-2308;
  - initial-month floor: CO-385, with **F-1** (the $25 floor against the federal $10).
- Release-date proration for joint SSI/SNAP applicants leaving an institution: unmodeled. It is recorded on CO-2305 and is a processing timing matter; P3.

**Expedited service (4.205.1, 4.205.11)**
- The three entitlement tests: CO-348, CO-1740, CO-120, CO-121, CO-055.
- Identity first; postponement to day 30, or to the third month for migrants: CO-1393, CO-3036 to CO-3038, CO-1346, CO-2570.
- Status: CO-1394.

**Work registration, ABAWD and voluntary quit (4.307-4.313)**
- Work registrant from 16 to 59 with the exemptions: CO-405, CO-406, CO-161, CO-162, CO-3040.
- The exemptions: unfit (CO-400), care of a child under 6 or an incapacitated person (CO-401, CO-065), employment of 30 hours or minimum wage × 30 (CO-402 to CO-404), school, drug or alcohol treatment, unemployment compensation, TANF or refugee work program.
- ABAWD:
  - age range 18-64 (H.R.1): CO-412, CO-165, CO-166;
  - exceptions: CO-414, including the dependent child under 14 (CO-413, CO-167), pregnancy and Indian or urban Indian (CO-050); the California Indian is a **GAP F-13**;
  - work requirement of 80 hours: CO-415; in-kind and unpaid work is a **GAP F-12**;
  - waiver and discretionary months: CO-052, CO-053;
  - countable months, the month of the 18th birthday and the fixed clock from 2023-07: CO-416, CO-417, CO-1515, CO-170;
  - regained and three additional months: CO-2309 to CO-2312;
  - status: CO-418; ineligible ABAWD: CO-2564.
- Voluntary quit (60 days; 1, 3 or 6 months): CO-2313 to CO-2320.
- Work-requirement noncompliance: CO-040.

**Students (4.306)**
- Age 18-49 at least half-time in higher education: CO-411, CO-021, CO-171, CO-172.
- Exemptions:
  - age;
  - unfit;
  - TANF;
  - 20 hours or work-study: CO-407;
  - care of a child under 6, or 6-11 with no care: CO-408;
  - single full-time parent: CO-409;
  - E&T placement: CO-072.
- The non-parent caretaker arm and the self-employed minimum-wage condition: **GAP F-5**.
- Treatment as non-household members: **GAP F-6**.

**Strikers**: CO-3500 to CO-3504. **Disqualifications**:
- IPV: CO-039;
- SSN: CO-2562;
- fleeing felon and probation violator: CO-038, CO-1732;
- convicted felon (4.304.4.A.6): CO-2563;
- drug felony: CO-041 (F-15).
- The full or prorated counting of each kind: CO-2302, CO-2565, CO-333, CO-371, CO-2300, CO-2301.
- Participation status: CO-2571.

**Recertification**
- No initial month at recertification: CO-2305.
- Re-verification arms for changes over $50 or $25, changed sources and outdated information: CO-1370 to CO-1384, CO-1596, CO-1597, CO-1619, CO-2321 to CO-2331 (OQ-371).

**Verification (4.500-4.506, 273.2(f))**
- Identity: CO-1370, CO-1387. The authorized representative is a **GAP F-9**.
- Citizenship when questionable: CO-1371, CO-1372, CO-1600.
- Immigration status: CO-1373, CO-1601, CO-1617.
- SSN: CO-1374, CO-1602.
- Residency: CO-1375, CO-1603.
- Earned income (self-employment only if questionable): CO-1376, CO-1604.
- Unearned income: CO-1377, CO-1605.
- Resources when questionable: CO-1378, CO-1606.
- Household composition: CO-1383, CO-1607.
- Disability: CO-1384, CO-1608.
- Age: CO-1385, CO-1609.
- ABAWD work hours: CO-1386, CO-1610.
- Sponsor: CO-1616, CO-1611.
- Shelter when questionable or for an unoccupied home: CO-1379, CO-1612.
- Medical: CO-1380, CO-1613. Dependent care: CO-1381, CO-1614. Child support paid: CO-1382, CO-1615.
- Counts and status: CO-1388 to CO-1391, CO-1394.
- Due dates: CO-1392, CO-1617, CO-1618.
- Utility verification is not needed: the SUA is mandatory (4.407.31: "cannot claim actual utility expenses").
- Effect of unverified expenses on the benefit: **GAP F-10**.

## 4. Rules checked against their text (48 items and 40 parameters)

| item | check | result |
|---|---|---|
| CO-130/131 | FY27 max allotment 306/562/808/1023/1217/1463/1616/1841, +225 (D-83, D-82:2630-2651) | match; 18+ missing (F-11) |
| CO-132 | std ded 217/217/217/229/268/308 (D-82:7410) | match |
| CO-133, CO-134 | cap 769, HSD 205.66 (D-82:7455, 7467) | match |
| CO-135, CO-140 | min allotment $25 for 1-2 (D-82:2653; D-83) | match |
| CO-110/111 | 130% 1729…6037, +616 (D-82:5750; D-84) | match |
| CO-112/113 | 100% 1330…4644, +474 (D-82:5778; D-84) | match |
| CO-114/3043 | 165% 2195…7662, +781 | match |
| CO-122/123 | 200% 2660…9288, +948 (D-82:5750) | match |
| CO-118/119 | $3,000 / $4,750 FY27 (D-83 asset table; 4.408.E still $4,500 → `statute_override`) | correct |
| CO-1235-1238 | HCUA 616, BUA 390, OUA 73, phone 100 (D-82:7619-7671) | match |
| CO-1514, CO-137 | SMED $165 over $35 | match (OQ-353 recorded) |
| CO-136, CO-138, CO-139 | 20%, 50%, 30% | match |
| CO-166, CO-165, CO-167, CO-169, CO-170 | ABAWD 18-64, child under 14, 3 in 36 (S127, S128) | match |
| CO-161-164, CO-3040 | work registration 16-59, 30 hours, child under 6 | match |
| CO-171-175 | students 18-49, 20 hours, children 6/12 | match |
| CO-120/121 | expedited $150 / $100 | match |
| CO-301/100 | elderly at 60 | correct |
| CO-302 | disabled-member prongs | incomplete (F-7) |
| CO-007, CO-304 | institutions, boarders | correct |
| CO-305 | mandatory combinations | correct (P3: foster child "may not apply separately" not enforced) |
| CO-419, CO-2304 | 165% separate-household election | correct |
| CO-018, CO-2569, CO-2338 | parental control; student earnings exclusion (273.9(c)(7)) | correct |
| CO-330-332, CO-2339 | income composition, exclusions | correct (F-2, F-8 gaps) |
| CO-2002/2003 | child support exclusion averaging (4.407.5.D-E) | correct |
| CO-1702 | self-employment net of costs (4.403.11.B) | correct apart from F-8 |
| CO-3503/3504 | striker rule | correct |
| CO-306-310 | H.R.1 categories and conditions | categories correct; exceptions incomplete (F-3) |
| CO-311, CO-2302, CO-2565 | which disqualified members are counted in full or prorated (4.411.1.B.1-2; 273.11(c)(1)-(2)) | correct |
| CO-333, CO-371, CO-2300, CO-2301 | pro rata (n-1)/n; full SUA added after proration (4.411.1.B.2.c) | correct except the divisor (F-6) |
| CO-334, CO-381 | rounding (273.10(e)(1)(ii)) | correct |
| CO-370, CO-374, CO-376, CO-377 | deductions | correct |
| CO-1239, CO-1241, CO-1243, CO-1500 | SUA tiers and the order of 4.407.31.A-D; H.R.1 sec. 10103 | correct |
| CO-378, CO-379 | 50% shelter test, cap unless elderly or disabled (4.407.3.B) | correct |
| CO-037, CO-380 | homeless definition (271.2, 90 days); HSD only with some shelter cost | correct |
| CO-336, CO-338, CO-340-342 | BCE/ECE | correct apart from F-4, F-6, F-14 |
| CO-343, CO-344, CO-074 | resources, categorical exemption, vehicles excluded (4.410.A) | correct apart from F-2, F-6 |
| CO-345-347, CO-382 | gross and net tests | correct |
| CO-383-385, CO-2307, CO-2308, CO-2305 | allotment, minimum, proration (4.207.2.C exact days) | correct apart from F-1, F-11 |
| CO-386, CO-387 | zero benefit for 3+ except BCE/ECE (4.207.3.B) | correct |
| CO-348, CO-1393 | expedited tests (4.205.1.A); postponement to day 30, migrant to the third month (4.205.11.B.2) | correct |
| CO-400-406 | work registration exemptions (273.7(b)(1)) | correct |
| CO-407-411 | student exemptions | F-5 |
| CO-412-418, CO-2309-2312, CO-2564 | ABAWD | correct apart from F-12, F-13 |
| CO-2313-2320 | voluntary quit; level sanctions 1/3/6 (4.308, 4.310.8) | correct |
| CO-1370-1394 | verification requirements and status | correct apart from F-9, F-10, F-18 |

## 5. Cases recomputed by hand (FY 2027 figures), then compared with `scripts/eval-case.ts`

**CO-03** (elderly couple, recertification, October 2026). Both members are over 60, so the household size is 2.
1. Gross income: 1650 + 900 = **2550**. That is at or below the ECE limit of 3608, so the household is **ECE**.
2. Medical: p1's $180 is over $35, so the deduction is max(165, 145) = 165.
3. Adjusted income: 2550 − 217 (standard) − 165 = **2168**.
4. Shelter: rent 1100. Heat is included in rent and there are no other utilities, so the SUA is 0.
5. Excess shelter (elderly, so no cap): 1100 − 1084 = **16**.
6. Net income: 2168 − 16 = **2152**.
7. 562 − ⌈645.6⌉ is below zero. The household is ECE with 2 members, so the minimum applies: **$25**.
8. This is a recertification, so it is not an initial month.

The engine gives 2550 / 2168 / 16 / 2152 / 25 / `eligible` / `expanded_categorical`. Agrees.

**CO-87** (ABAWD over the limit, prorated, October 2026).
1. p1 is 58 and had 3 countable months from July to September 2026 in the clock period that began 2026-07. His status is **limit_reached**, which makes him an ineligible member.
2. p2 works 130 hours: 130 / 4.3 = 30.2, which is at least 30, so he is exempt from work registration and **not_subject**.
3. p1's pension is prorated: 600 × 1/2 = **300**. Gross income: 1500 + 300 = **1800**. The eligible size is 1, and 1800 is at or below 2660, so the household is ECE.
4. Earned income deduction: 300. Adjusted income: 1800 − 300 − 217 = 1283.
5. Shelter: 900 + 616 (HCUA, the vendor is paid directly) = 1516. 1516 − 641.5 = 874.5, capped at **769**.
6. Net income: **514**. Allotment: 306 − 154.2 = 151.8, rounded down to **151**.
7. The household applied on the 1st, so the prorated amount is the full 151.

The engine gives limit_reached (3 months) / 300 / 1 / 1800 / 300 / 616 / 769 / 514 / 151 / `eligible`. Agrees.

**CO-83** (initial month, applied 2026-10-12, household size 3).
1. Gross income: 1500. Earned income deduction: 300. Standard deduction: 217. Adjusted income: **983**.
2. Shelter: 1200 + 616 = **1816**. 1816 − 491.5 = 1324.5, capped at **769**.
3. Net income: **214**.
4. Full month: 808 − 64.2 = 743.8, rounded down to **743**.
5. October: (31 + 1 − 12) = 20 days, so 743 × 20/31 = 479.35, rounded down to **479**.
6. November: **743**.

The engine gives 1500 / 214 / 1816 / 743 / 479 / 479, then 743 for 2026-11. Agrees.

**CO-91** (homeless and expedited; verification only).
- Expedited: true.
- Postponement end: 2026-12-02, which is the application date plus 30.
- Due date: 2026-11-12.
- 2027-02: `expenses_disallowed` with 2 pending.
- Residency is not required of a homeless household.

All of these agree with the expectations. The same run shows the F-10 inconsistency: `snap_dependent_care_deduction` is 200 while the status reads `expenses_disallowed`.

## 6. Elements

I walked `uses` from all 31 SNAP outcomes in `conformance/co/ledger.json` (export at 80f2e9e). That reaches 428 items. Every identifier resolves to a defined item, except `relationships`, which is the engine's structural relationship input (`src/engine/check.ts:215`), not an item. `npm run check` reports no undefined reference.

The **missing elements** are the facts the P1 fixes need:
- sponsor income and resource deeming (F-2);
- Family Preservation (F-4);
- railroad, interim-assistance and VA-pension disability (F-7);
- farm loss (F-8);
- the authorized representative (F-9);
- in-kind and unpaid work (F-12);
- the California Indian (F-13).

One more is a dangling reference in prose: `workfare_hours (CO-049)` in CO-022 (F-16).

## 7. Verification (document collection)

The SNAP verification chapter covers every mandatory element of 273.2(f)(1) and 4.502-4.506:
- income;
- alien status, with the 30-day reasonable opportunity (CO-1617);
- utilities, not needed under the mandatory SUA;
- medical;
- SSN;
- residency, with the homeless and "cannot reasonably be accomplished" exceptions;
- identity;
- disability;
- household composition when questionable.

It also covers the elements the rule makes conditional:
- questionable citizenship, age and resources;
- ABAWD work hours (4.505.x, S810);
- sponsor information;
- expenses within 30 days.

And it covers the recertification thresholds and outdated-information re-verification, plus the expedited postponement.

Two verification requirements the rule states are not modeled:
- the authorized representative's identity (**F-9**);
- the effect on the benefit of an expense still unverified after 30 days (**F-10**).

## 8. Open questions in scope

Each open or partly resolved question in the SNAP scope was read against the current text.

| OQ | Class line | confirmation |
|---|---|---|
| OQ-1 | blocked on a named document | **Correct.** Sec. 10108 (D-5) has no effective-date clause. D-82 4.305 still lists the pre-Act categories (D-82:3572-3700, re-read). I fetched fns.usda.gov's implementation page in this pass: it now redirects to fna.usda.gov and only links to `www.usda.gov/guidance-documents/snap/fns/snap-provisions-one-big-beautiful-bill-act-2025-information-memorandum` (a refused host). The named memo is the only text that answers. |
| OQ-12 | state policy choice | **Correct.** 4.206.C.2.a.2 (D-82:2385-2395) requires "authorized to receive" and only that the language be on the forms. No rule equates the two. The proposed rule D-132 changes nothing yet. |
| OQ-30 | state policy choice | Class correct (273.10(e)(1)(i)(H) and 4.407.3 are silent). **Immaterial to every outcome** (F-21). |
| OQ-251 | blocked on a named document | **Correct** for the remaining half (sec. 10103 date). 4.407.31.A.1.b (D-82, S743) is unchanged. The FNS energy-assistance memo is on www.usda.gov. |
| OQ-353 | state policy choice | **Correct.** 4.407.61.A (D-82, S1013) gives the SMED for expenses "less than or equal to the SMED", and actual expenses when they, after $35, "exceed the SMED". $165.01-$200 falls in neither. |
| OQ-356 | state policy choice | **Correct.** 4.401.A.1 "below" and 4.206.C.2.a.1 "at or below" (D-82:5704, 2385). |
| OQ-371 | state policy choice | **Correct.** 4.502.B.2 says both "$50 or more" and "$50 or less" (S1056/S1618). 273.2(f)(8)(i)(A) says "more than $50". |
| OQ-533 | blocked on a named document | **Correct.** The Act has no transition clause. The FNS memos are on www.usda.gov and the CDHS agency letter is on cdhs.colorado.gov, both refused. |
| OQ-612 (shared) | state policy choice | **Correct for SNAP.** D-82 and 7 CFR 273.1 state no temporary-absence limit; a search of D-82 for "temporar* absen" finds none. |
| OQ-380 (marked Resolved) | — | **Should be reopened, or replaced by the F-2 fix.** Its own record says the SNAP deeming computation is not in the ledger, and 4.305.2.C-D answers it. |
| OQ-38 (marked Resolved) | — | Its resolution adopts the $25 initial-month floor without recording the conflict with 7 U.S.C. 2017(c)(2)(B). See F-1. |

Questions that should exist and do not:
- the BCE/ECE order (F-14);
- the medical expenses of prorated ineligible members (F-19);
- if not fixed now, the farm-loss offset (F-8) and the 18+ row (F-11).

## 9. P2 dispositions proposed

| id | disposition |
|---|---|
| F-14 | Record a state-choice open question (owner: SNAP policy owner) with both texts. Keep BCE first until answered. |
| F-15 | Fix now: re-mean CO-041 and cite 4.803.3.D. Signed by the Data steward and the SNAP owner. |
| F-16 | Fix now (text only). |
| F-17 | Fix now: re-point S47, S48, S57, S99, S132 and S135 to D-82. Approval risk otherwise. |
| F-18 | Record an open question, or fold into F-10's gate (exclude the member after `snap_noncitizen_documentation_due_date`). |
| F-19 | Record a state-choice open question. |
| F-20 | Fix now (version start date). |
