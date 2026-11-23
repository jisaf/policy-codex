import yaml, sys
cs = {c['id']: c for c in yaml.safe_load(open(sys.argv[1]))}
hdr = {
'CO-212': ("An aged veteran at home whose VA pension includes Aid and Attendance", """  # Coverage pass 2, N2-1 (docs/reviews/coverage2-medicaid-nonmagi.md; scratch Y-VAAA). p1, 76, single, at home;
  # Social Security 400; a VA pension of 900, of which 400 is Aid and Attendance (the VA award letter); savings 1,000;
  # Medicare Part A. Applied 2026-10-05.
  # Hand derivation, October 2026:
  # - 8.100.5.K: the A&A portion "shall not be considered as income when determining eligibility" (F.5.j.vi counts
  #   veterans benefits other than A&A and UME): unearned 400 + 900 - 400 = 900; less the 20 general exclusion: 880.
  # - 880 at or under the individual FBR (994): aged; resources 1,000 at or under 2,000.
  # - QMB: 880 at or under 100% of the poverty level for one (1,330): eligible in October, in effect from November
  #   (the month after the determination): ma_msp_category none in October, qmb in November.
  # New case. Before the fix the A&A portion was counted: 1,280, over the FBR: ma_ssi_related_category none.
"""),
'CO-213': ("An institutionalized spouse whose community spouse keeps their 15-year-old, who has her own income", """  # Coverage pass 2, N2-2 (scratch Y-FAMALLOW). CO-112's couple with the income allowance not refused, and their
  # daughter p3, 15, at home with the community spouse p2, who claims her as a tax dependent; p3 has 600 of Social
  # Security survivor benefits. p1 entered a nursing facility 2026-10-05; applied 2026-11-02.
  # Hand derivation, November 2026:
  # - Gross income 1,900 + 700 = 2,600 (300% x 994 = 2,982): eligible_institutional, as in CO-112.
  # - Available income 2,600 - personal needs allowance 110.36 = 2,489.64.
  # - Community spouse income allowance: MMMNA 2,705 + excess shelter 866.40 = 3,571.40, less p2's 1,900: 1,671.40.
  # - Family allowance for p3 (42 U.S.C. 1396r-5(d)(1)(C), "at least 1/3 of the amount by which" the MMMNA standard
  #   "exceeds the amount of the monthly income of that family member", over 8.100.7.T.1.c.i's smaller figure):
  #   (2,705 - 600) / 3 = 701.67.
  # - Deductions 1,671.40 + 701.67 + income tax 60 + Part B 202.90 (second month) + Part D 40 = 2,675.97, more
  #   than 2,489.64: 0; plus Long-Term Care insurance 300: patient payment 300.
  # New case. Before the fix the family allowance was 2,705/3 - 600 = 301.67 and the patient payment
  # 2,489.64 - 2,275.97 + 300 = 513.67.
"""),
'CO-214': ("A widowed veteran in a State Veterans Home whose son, his tax dependent, lives in the home", """  # Coverage pass 2, N2-4 (scratch Y-DEPREL). CO-139's veteran (State Veterans Home since 2026-09-14; Social
  # Security 1,300; VA pension 600 of which 300 is Aid and Attendance; resources 1,200; home equity 240,000) with no
  # intent to return home; his son p2, 40, not disabled, lives in the home and is claimed by p1 as a tax dependent.
  # Hand derivation, November 2026:
  # - 8.100.5.M.2.a.ix: the home stays the principal place of residence "irrespective of the individual's intent to
  #   return as long as the individual's spouse or dependent relative continues to live there"; 8.100.1: a
  #   Dependent Relative is "one who is claimed as a dependent by an applicant for federal income tax purposes": p2.
  #   The home is exempt; resources 1,200 at or under 2,000.
  # - Income 1,300 + 600 - 300 A&A = 1,600, at or under 2,982: eligible_institutional.
  # - Patient payment as in CO-139: 1,600 - 90 (veterans PNA) + 300 (K.2) = 1,810. p2, 40, is not a dependent child,
  #   so K.2 and the 90 allowance read p1 as having no dependents (OQ-720's assumption).
  # New case. Before the fix p2 was not a "dependent relative" (only CO-889's spouse or child under 21 or
  # disabled), the home counted (241,200): ineligible_resources.
"""),
}
exp = {
'CO-212': {'p1': {'ma_ssi_countable_income': {'2026-10': 880}, 'ma_ssi_related_category': {'2026-10': 'aged'}, 'ma_msp_category': {'2026-10': 'none', '2026-11': 'qmb'}}},
'CO-213': {'p1': {'ma_family_allowance': {'2026-11': 701.6666666666666}, 'ma_ltc_eligibility_status': {'2026-11': 'eligible_institutional'}, 'ma_patient_payment': {'2026-11': 300}}},
'CO-214': {'p1': {'ma_spouse_or_dependent_relative_lives_in_home': True, 'ma_home_is_countable_resource': False, 'ma_ltc_eligibility_status': {'2026-11': 'eligible_institutional'}, 'ma_patient_payment': {'2026-11': 1810}}},
}
out = []
for cid in ['CO-212', 'CO-213', 'CO-214']:
    c = cs[cid]; c.pop('title', None); c.pop('id', None); c['expect'] = exp[cid]
    body = yaml.safe_dump(c, sort_keys=False, allow_unicode=True)
    body = ''.join('  ' + l + '\n' for l in body.splitlines())
    t, h = hdr[cid]
    out.append(f"\n- id: {cid}\n  title: {t}\n{h}{body}")
open(sys.argv[2], 'w').write(''.join(out))
