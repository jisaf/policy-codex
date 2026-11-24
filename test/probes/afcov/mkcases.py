import re, sys
src = open(sys.argv[1]).read()
out_path = sys.argv[2]

def block(pid):
    m = re.search(rf"^- id: {pid}\n.*?(?=^- id: |\Z)", src, re.S | re.M)
    return m.group(0).rstrip("\n")

CASES = [
 ("PR-ABS", "CO-165", "Coverage round (Adult Financial F-1): an OAP client out of State for 122 days, not for medical treatment",
  """  # p1, 70, a U.S. citizen with $600 of Social Security and $500 in the bank, left Colorado on June 1, 2026 to stay with
  # a friend in Arizona, intending to come back; she is not away for medical treatment or to care for an injured service
  # member, and the county has no information rebutting the presumption. Determination on October 1, 2026.
  # Residency (9 CCR 2503-5 3.520.64.E.2, S3201): June 1 to October 1 is 122 consecutive days out of the State, which is
  # 90 or more, so the rebuttable presumption that she is no longer a resident applies (af_is_presumed_nonresident_by_
  # absence true; E.1's 30 days do not apply, as she is in the United States; E.3's calendar-year count is not stated).
  # af_meets_residency false, so af_category none and no OAP grant. Before the coverage round she was oap with $452
  # (600 - 20 = 580; 1,032 - 580). The probe household PR-ABS of docs/reviews/coverage-adult-financial.md.""",
  {"p1": ["temporary_absence_reason: other_with_intent_to_return"]}, None,
  """  expect:
    p1:
      af_is_presumed_nonresident_by_absence: true
      af_meets_residency: {"2026-10": false}
      af_countable_income: {"2026-10": 580}
      af_category: {"2026-10": none}
      af_oap_grant: {"2026-10": 0}"""),
 ("PR-ISM", "CO-166", "Coverage round (Adult Financial F-5): an OAP client living rent-free in her daughter's home after losing her apartment",
  """  # p1, 70, with $600 of Social Security, lost her apartment and lives in her daughter's home, paying nothing toward its
  # $1,200 a month of shelter costs (at market value). She lives in one home as a member of that household, not with a
  # succession of friends or relatives. Determination on October 1, 2026.
  # Homelessness (3.510, S3205; af_is_homeless, CO-4410): not homeless - shared_housing_due_to_loss_or_hardship is not a
  # stay with a succession of others (stays_with_succession_of_others_without_permanent_arrangement not stated, false).
  # ISM (3.520.79.C.3; af_in_kind_support_and_maintenance, CO-1512): all shelter is provided and she pays nothing, so the
  # full maximum, af_ism_maximum 351 (2026).
  # Countable income (3.533.A.2): 600 + 351 = 951 unearned, less the $20: 931. 931 < 1,032: oap. Grant (3.532.B): 1,032 -
  # 931 = 101, raised to the OAP payment floor of 189 (3.530.C, af_oap_payment_floor). Before the coverage round the
  # stay was read as homeless: ISM 0, countable 580, grant 452. (The review's $101 left out the floor.) Probe PR-ISM.""",
  {}, None,
  """  expect:
    p1:
      af_is_homeless: false
      af_in_kind_support_and_maintenance: {"2026-10": 351}
      af_countable_income: {"2026-10": 931}
      af_category: {"2026-10": oap}
      af_oap_grant: {"2026-10": 189}"""),
 ("PR-APART", "CO-167", "Coverage round (Adult Financial F-3): an OAP client whose husband lives in another home",
  """  # p1, 70, with $600 of Social Security, is married to p2, 68, who lives in another home (dwelling d2) with $3,000 of
  # Social Security; they are not legally separated or divorced. p2 receives no Adult Financial, SSI or Medicaid, pays
  # no court-ordered support and has no dependent children. Determination on October 1, 2026.
  # Spouse deeming (3.534.A-B, S1632; 3.520.63.D, S3204; af_deemed_relative_income, CO-2384): the spouse is deemed wherever
  # he lives. Not exempt under 3.534.C (not on AF, SSI or Medicaid). Earned: none. Unearned: 3,000 less the OAP grant
  # standard 1,032, no children's needs, medical payments or support: 1,968 deemed.
  # Countable income: 600 - 10 (the married client's half of the $20, 3.533.A.2.c.1) + 1,968 = 2,558 >= 1,032: none.
  # Before the coverage round nothing was deemed from a spouse living elsewhere: countable 590, oap, grant 442. Probe
  # PR-APART (with p2's court-ordered support and medical payments for dependents stated, as 3.534.B.4-5 ask).""",
  {"p2": ["child_support_paid_legally_obligated: 0", "af_medical_payments_for_dependents: 0"]}, None,
  """  expect:
    p1:
      af_deemed_relative_income: {"2026-10": 1968}
      af_countable_income: {"2026-10": 2558}
      af_category: {"2026-10": none}
      af_oap_grant: {"2026-10": 0}"""),
 ("PR-PNA", "CO-168", "Coverage round (Adult Financial F-4): an AND-CS client who entered a nursing facility in mid-September",
  """  # p1, 30, receives SSI of $500 for a disability and entered a licensed nursing facility on September 15, 2026.
  # Determination on October 1, 2026.
  # AND-CS (3.546-3.549): an SSI recipient under 60, a citizen, $500 of resources; countable income is the gross SSI, 500
  # (3.549.A, 3.548.G) < 994: and_cs.
  # PNA (3.548.D, F, S1010): from October 15 she has been in an approved facility thirty consecutive days, and October is
  # the whole of the month (af_resides_in_care_facility_thirty_consecutive_days true for October). But \"The AND-CS grant
  # shall not be reduced until the month following the first full calendar month that the client is a resident\":
  # October is the first full calendar month, so the October grant is unreduced, 994 - 500 = 494; from November (entry
  # on or before October 1, the first day of the month before) only the PNA, 79 - 500, nothing. Before the coverage round
  # October paid 0. Probe PR-PNA.""",
  {}, None,
  """  expect:
    p1:
      af_category: {"2026-10": and_cs, "2026-11": and_cs}
      af_resides_in_care_facility_thirty_consecutive_days: {"2026-10": true}
      af_and_grant: {"2026-10": 494, "2026-11": 0}"""),
 ("PR-SPON", "CO-169", "Coverage round (Adult Financial F-2): an OAP client, a sponsored LPR since 2010 with forty qualifying quarters",
  """  # p1, 70, a lawful permanent resident since March 1, 2010, sponsored on a Form I-864 by p2, 51, a U.S. citizen who
  # earns $4,000 a month. SSA credits p1 with 40 qualifying quarters. p1 has $600 of Social Security and $500 in the bank.
  # Determination on October 1, 2026.
  # Sponsor's obligation (3.520.69.B.2, S3203; af_sponsor_deeming_applies, CO-4400): it ends when the non-citizen has 40
  # qualifying quarters, so nothing is deemed: af_deemed_sponsor_income 0 and none of p2's $100 of resources.
  # Countable income: 600 - 20 = 580 < 1,032: oap (citizenship: an LPR for more than five years, CO-929). Grant: 1,032 -
  # 580 = 452. Before the coverage round 4,000 - 994 = 3,006 was deemed and the category was none. Probe PR-SPON.""",
  {}, None,
  """  expect:
    p1:
      af_sponsor_deeming_applies: false
      af_deemed_sponsor_income: {"2026-10": 0}
      af_countable_income: {"2026-10": 580}
      af_category: {"2026-10": oap}
      af_oap_grant: {"2026-10": 452}"""),
]

parts = []
for probe, cid, title, comment, extra, _, expect in CASES:
    b = block(probe)
    b = b.replace(f"- id: {probe}", f"- id: {cid}", 1)
    b = re.sub(r'^  title: .*$', f'  title: "{title}"\n' + comment, b, count=1, flags=re.M)
    b = b.replace("facts: &oapbase", "facts:").replace("month_defaults: &oapmonth", "month_defaults:")
    for pid, lines in extra.items():
        # insert after the person's "facts:" line
        m = re.search(rf"^    {pid}:\n(?:      .*\n)*?      facts:\n", b, re.M)
        assert m, (cid, pid)
        ins = "".join(f"        {l}\n" for l in lines)
        b = b[:m.end()] + ins + b[m.end():]
    parts.append(b + "\n" + expect)
open(out_path, "w").write("\n\n" + "\n\n".join(parts) + "\n")
print(len(parts))
