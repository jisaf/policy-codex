# X-CHPDIS: CO-140 with no employer coverage, wages 4,500 (249.5%): CBwD-eligible disabled child, no other coverage
x=clone('CO-140','X-CHPDIS')
f1=x['persons']['p1']['facts']; f1['employer_family_coverage_employer_premium_share']=0; f1['is_enrolled_in_employer_family_coverage']=False
x['persons']['p1']['month_defaults']['wages_gross']=4500
x['persons']['p3']['facts']['chp_has_other_health_coverage']=False
out.append(x)
# X-CHPSSI: X-CHPDIS with p3 receiving SSI
y=copy.deepcopy(x); y['id']='X-CHPSSI'; y['persons']['p3']['facts']['receives_ssi']=True; y['persons']['p3']['month_defaults']['ssi_income']=300; out.append(y)
# X-19: CO-110 p1 alone, 19th birthday 2026-11-05, wages 1,930 (145.1% of 1,330), as_of 2026-11-10
z=clone('CO-110','X-19'); z['as_of']='2026-11-10'; z['relationships']=[]
del z['persons']['p3']
f=z['persons']['p1']['facts']; f['date_of_birth']='2007-11-05'
for k in ['pregnancy_end_date','pregnancy_start_date']: f.pop(k,None)
f['ma_application_date']='2026-11-02'; f['ma_retroactive_coverage_requested']=False
z['persons']['p1']['month_defaults']['wages_gross']=1930; z['persons']['p1']['months']={}
out.append(z)
f.update(ma_lottery_winnings_hardship_exemption_granted=False, is_claimed_by_filer_outside_case=False, dwelling_id='d1', expects_to_be_claimed_as_dependent=False)
z['persons']['p1']['month_defaults']['wages_gross']=1850
w=copy.deepcopy(z); w['id']='X-19U'; w['persons']['p1']['facts']['immigration_status']='undocumented'; out.append(w)
v=copy.deepcopy(z); v['id']='X-19B'; v['persons']['p1']['facts']['date_of_birth']='2007-11-25'; out.append(v)
for c in (z,w,v): c['persons']['p1']['relationships']=[]
# X-TMA: CO-77 with p1 earning 3,000 (166.4%); p2 given the family's TMA facts as CO-2430's precision directs (I.2)
t=clone('CO-77','X-TMA')
t['persons']['p1']['month_defaults']['wages_gross']=3000
f2=t['persons']['p2']['facts']; f2['ma_first_month_of_ineligibility']='2026-10'; f2['ma_ineligibility_reason']='increased_earnings'
t['persons']['p2']['months']={m:{'ma_prior_enrollment_category':'parent_caretaker'} for m in ['2026-04','2026-05','2026-06','2026-07','2026-08','2026-09']}
out.append(t)
