"""Writes the promoted Colorado Works coverage cases (CO-160..CO-164) as block YAML. usage: python3 -I mkcases.py <out>"""
import sys
out = sys.argv[1]

BASE_FACTS = dict(sex="female", immigration_status="us_citizen", state_of_residence="CO", marital_status="single",
    is_pregnant=False, receives_ssi=False, child_welfare_payment_type="none", cw_is_head_of_assistance_unit=False,
    is_requesting_assistance_for_own_child=False, received_tanf_from_another_state_this_month=False,
    months_of_assistance_received=0, cw_months_received_in_exempt_indian_country=0, cw_is_serving_ipv_disqualification=False,
    is_fleeing_felon=False, residence_setting_type="private_dwelling", dwelling_id="h1", receives_tanf_cash=False,
    has_domestic_violence_extension_approved=False, has_hardship_extension_approved=False, is_sponsored_non_citizen=False,
    is_emancipated_minor=False, cw_has_failed_to_apply_for_ssn=False, is_participating_in_strike=False,
    cw_has_refused_child_support_assignment=False, cw_has_failed_child_support_cooperation=False,
    cw_requests_inclusion_in_assistance_unit=False, cw_is_optional_member_by_custody_or_support=False,
    is_full_time_secondary_student_finishing_before_nineteen=False, county_approved_living_arrangement=False)
BASE_MONTH = dict(wages_gross=0, self_employment_gross_receipts=0, social_security_income=0, pension_income=0,
    unemployment_income=0, adult_financial_cash_income=0, tanf_cash_income=0, ssi_income=0, child_support_received=0,
    other_unearned_income_taxable=0, other_unearned_income_nontaxable=0, tax_exempt_interest=0,
    child_support_paid_legally_obligated=0)

def val(v):
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, list): return "[" + ", ".join(val(x) for x in v) + "]"
    if isinstance(v, dict): return "{" + ", ".join(f'{k}: {val(x)}' for k, x in v.items()) + "}"
    if v[:1].isdigit(): return f'"{v}"'
    return v

def case(cid, title, comment, as_of, case_facts, rels, persons, expect):
    L = [f"- id: {cid}", f'  title: "{title}"']
    L += ["  # " + c for c in comment]
    L += [f'  as_of: "{as_of}"', "  case_facts:"]
    L += [f"    {k}: {val(v)}" for k, v in case_facts.items()]
    L += ["  relationships:"] + [f"    - {val(r)}" for r in rels]
    L += ["  persons:"]
    for pid, (facts, month, note) in persons.items():
        f = dict(BASE_FACTS); f.update(facts)
        m = dict(BASE_MONTH); m.update(month)
        L += [f"    {pid}:", f"      # {note}", "      facts:"] + [f"        {k}: {val(v)}" for k, v in f.items()]
        L += ["      month_defaults:"] + [f"        {k}: {val(v)}" for k, v in m.items()]
    L += ["  expect:"]
    for pid, e in expect.items():
        L += [f"    {pid}:"] + [f"      {k}: {val(v)}" for k, v in e.items()]
    return "\n".join(L) + "\n"

CF = {"cw_application_date": "2026-10-12"}
M = "2026-10"
cases = []

cases.append(case("CO-160",
  "Colorado Works coverage review CW-2: an emancipated 16-year-old living alone with her baby is assisted as an adult",
  ["Probe ZZ-1 of docs/reviews/coverage-colorado-works.md. p1, 16, is emancipated and lives alone with her baby p2;",
   "no income. A minor parent who does not live in the home of a caretaker receives assistance as an adult if approved",
   "(9 CCR 2503-6 3.604.2.N.2.c, S3153); emancipation approves the arrangement (N.2.a). So the unit is priced on the",
   "One Caretaker row with one child (3.606.1.F): need standard 331, grant standard 488 (before the fix: caretaker",
   "count 0, child count 2, the No Caretaker row, 245 and 362). Income 0 < 331: eligible. October is the month of the",
   "October 12 application (3.609.2.A.1, CW-8): 20 days, .65754 x 488 = 320.88, cents dropped = 320."],
  "2026-10-15", CF, [["parent", "p1", "p2"]],
  {"p1": ({"date_of_birth": "2010-03-01", "cw_is_head_of_assistance_unit": True, "is_emancipated_minor": True, "is_requesting_assistance_for_own_child": True}, {}, "16, emancipated, alone with her baby, no income."),
   "p2": ({"date_of_birth": "2026-06-01"}, {}, "Her baby.")},
  {"p1": {"cw_minor_parent_is_assisted_as_adult": True, "cw_unit_caretaker_count": 1, "cw_unit_child_count": 1, "cw_need_standard": 331, "cw_grant_standard": 488,
          "cw_eligibility_status": {M: "eligible"}, "cw_grant_amount": {M: 320}, "cw_person_participation_status": "eligible_member"},
   "p2": {"cw_minor_parent_is_assisted_as_adult": False, "cw_eligibility_status": {M: "eligible"}, "cw_grant_amount": {M: 320}}}))

cases.append(case("CO-161",
  "Colorado Works coverage review CW-3: unmarried parents, and the father who is not the head has sixty counted months",
  ["Probe ZZ-3. p1 (head, 10 months) and p2 (not married to her, 60 months already counted toward his limit, as the",
   "statewide automated system tracks it) live with their child p3. 3.606.6.C (S3154): a unit containing an individual",
   "who has received TANF as an adult for sixty or more cumulative months is not eligible without an extension; no",
   "extension is approved. cw_months_of_assistance_used reads p2's 60 (it read 0 for a non-head before the fix, and the",
   "unit was eligible: Two Caretakers, one child, grant standard 649, paid in full before the CW-8 proration)."],
  "2026-10-15", CF, [["parent", "p1", "p3"], ["parent", "p2", "p3"]],
  {"p1": ({"date_of_birth": "1995-01-01", "cw_is_head_of_assistance_unit": True, "months_of_assistance_received": 10}, {}, "Head, 10 months used."),
   "p2": ({"date_of_birth": "1990-01-01", "sex": "male", "months_of_assistance_received": 60}, {}, "The father, not the head, 60 months counted."),
   "p3": ({"date_of_birth": "2020-06-01"}, {}, "Their child.")},
  {"p1": {"cw_months_of_assistance_used": 10, "cw_time_limit_reached": True, "cw_eligibility_status": {M: "time_limit_reached"}, "cw_grant_amount": {M: 0}},
   "p2": {"cw_months_of_assistance_used": 60, "cw_eligibility_status": {M: "time_limit_reached"}, "cw_grant_amount": {M: 0}},
   "p3": {"cw_eligibility_status": {M: "time_limit_reached"}, "cw_grant_amount": {M: 0}}}))

cases.append(case("CO-162",
  "Colorado Works coverage review CW-4: a sponsor's income between 125% of the 2021 and of the 2026 poverty guidelines is deemed",
  ["Probe ZZ-4. p1, a lawful permanent resident sponsored on an I-864, lives with her child p2; her sponsor p3 lives",
   "elsewhere in a household of two and earns 2,900. Combined household for the test: the budgetary unit (2) plus the",
   "sponsor's household (2) = 4. 3.601 (S3150) adopts the 2021 guidelines (86 FR 7732, S3151): 26,500 x 1.25 / 12 =",
   "2,760.42; 2,900 is not less, so no A.5.c.5 exemption and deeming applies (against the 2026 guideline, 3,437.50, it did",
   "not). Deemed: 2,900 less the lesser of 20% (580) and 175 = 2,725 (3.605.1.A.5.b). Countable 2,725 >= the One",
   "Caretaker, one child need standard 331: ineligible_income, grant 0 (was eligible, 488 for the full month)."],
  "2026-10-15", CF, [["parent", "p1", "p2"], ["sponsor", "p3", "p1"]],
  {"p1": ({"date_of_birth": "1995-01-01", "cw_is_head_of_assistance_unit": True, "immigration_status": "lawful_permanent_resident", "us_entry_date": "2015-01-01", "qualified_status_date": "2015-01-01",
           "is_sponsored_non_citizen": True, "qualifying_quarters": 0, "status_before_lpr_adjustment": "none", "is_victim_of_battery_or_extreme_cruelty": False, "cw_sponsor_income_availability_rebutted": False}, {}, "Sponsored LPR, no income."),
   "p2": ({"date_of_birth": "2020-06-01"}, {}, "Her child, a citizen."),
   "p3": ({"date_of_birth": "1970-01-01", "sex": "male", "dwelling_id": "h2", "sponsor_household_size": 2, "support_paid_to_dependents_outside_home": 0}, {"wages_gross": 2900}, "The sponsor, in another home, earning 2,900.")},
  {"p1": {"cw_sponsor_deeming_applies": {M: True}, "cw_sponsor_deemed_income": {M: 2725}, "cw_countable_income": {M: 2725}, "cw_eligibility_status": {M: "ineligible_income"}, "cw_grant_amount": {M: 0}},
   "p2": {"cw_eligibility_status": {M: "ineligible_income"}, "cw_grant_amount": {M: 0}}}))

cases.append(case("CO-163",
  "Colorado Works coverage review CW-5: a minor mother's own mother who joins the unit is a member, not a deemed parent",
  ["Probe CWZ-8. p1, 16, unmarried, lives with her baby p5 and her mother p3, who asks to join the minor parent's unit",
   "(3.604.2.C.2.g) and earns 500. p3 is a participant, so her income counts once, as a member's: 500 - 90 = 410",
   "(3.606.2.A.1 eligibility test). Before the fix it was also deemed under 3.605.1.A.4 (S3155: a non-participant",
   "parent's income), giving 567 and ineligible. Unit: p3 the caretaker, p1 and p5 dependent children: One Caretaker,",
   "two children, need standard 421, grant standard 620. 410 < 421: eligible. Grant: the payment disregard is 100% in the",
   "first certification period (3.606.2.A.1), so 620 - 0 = 620 for the month; October 12 application, 20 days x .65754 =",
   "407.67, cents dropped = 407 (3.609.2.A.1, D)."],
  "2026-10-15", CF, [["parent", "p3", "p1"], ["parent", "p1", "p5"]],
  {"p1": ({"date_of_birth": "2010-03-01", "cw_is_head_of_assistance_unit": True, "is_requesting_assistance_for_own_child": True, "is_full_time_secondary_student_finishing_before_nineteen": True}, {}, "16, unmarried, at school, no income."),
   "p3": ({"date_of_birth": "1985-01-01", "cw_requests_inclusion_in_assistance_unit": True}, {"wages_gross": 500}, "Her mother, joins the unit, earns 500."),
   "p5": ({"date_of_birth": "2026-06-01"}, {}, "p1's baby.")},
  {"p1": {"cw_deemed_parent_income_of_minor_parent": {M: 0}, "cw_countable_income": {M: 410}, "cw_need_standard": 421, "cw_grant_standard": 620,
          "cw_eligibility_status": {M: "eligible"}, "cw_grant_amount": {M: 407}},
   "p3": {"cw_eligibility_status": {M: "eligible"}, "cw_grant_amount": {M: 407}},
   "p5": {"cw_eligibility_status": {M: "eligible"}, "cw_grant_amount": {M: 407}}}))

cases.append(case("CO-164",
  "Colorado Works coverage review CW-7: an unmarried 16-year-old mother living with her grandmother needs no county approval",
  ["Probe CWZ-18. p1, 16, unmarried and not emancipated, lives with her baby p2 and her grandmother p3, who has primary",
   "responsibility for her and does not ask to join; the county has approved no setting. 3.604.2.N.1 and N.2.a (S3153)",
   "accept residence with another adult caretaker or an adult relative, so the arrangement is met (before the fix p1 was",
   "ineligible_living_arrangement while her baby was paid 362). p1 lives in a caretaker's home, so she is a dependent child",
   "of the unit: p1 and p2, No Caretaker row, two children, need standard 245, grant standard 362. Income 0: eligible.",
   "October 12 application: 362 x .65754 = 238.03, cents dropped = 238."],
  "2026-10-15", CF, [["parent", "p1", "p2"], ["grandparent", "p3", "p1"], ["has_primary_responsibility_for", "p3", "p1"]],
  {"p1": ({"date_of_birth": "2010-03-01", "cw_is_head_of_assistance_unit": True, "is_requesting_assistance_for_own_child": True, "is_full_time_secondary_student_finishing_before_nineteen": True}, {}, "16, unmarried, at school."),
   "p2": ({"date_of_birth": "2026-06-01"}, {}, "Her baby."),
   "p3": ({"date_of_birth": "1960-01-01"}, {}, "Her grandmother, who does not ask to join.")},
  {"p1": {"cw_minor_parent_living_arrangement_met": True, "cw_minor_parent_is_assisted_as_adult": False, "cw_need_standard": 245, "cw_grant_standard": 362,
          "cw_eligibility_status": {M: "eligible"}, "cw_grant_amount": {M: 238}},
   "p2": {"cw_eligibility_status": {M: "eligible"}, "cw_grant_amount": {M: 238}},
   "p3": {"cw_eligibility_status": {M: "not_in_unit_did_not_request"}, "cw_grant_amount": {M: 0}}}))

open(out, "w").write("\n".join(cases))
print("wrote", out)
