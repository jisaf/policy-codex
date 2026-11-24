import yaml,copy,sys
src=sys.argv[1]; out=sys.argv[2]
cs=yaml.safe_load(open(src))
by={c['id']:c for c in cs if isinstance(c,dict) and 'id' in c}
P=[]
def base(i): c=copy.deepcopy(by[i]); c.pop('expect',None); return c
# Z-ADM: spouse admitted this month; community spouse's own ABD test
c=base('CO-213'); c['id']='Z-ADM'; c['title']='scratch - spouse admitted this month'
c['as_of']='2026-11-20'
c['relationships']=[r for r in c['relationships'] if 'p3' not in r]
del c['persons']['p3']
c['persons']['p1']['facts']['institution_entry_date']='2026-11-03'
c['persons']['p1']['month_defaults'].update(social_security_income=1000,pension_income=0)
c['persons']['p2']['month_defaults'].update(social_security_income=700)
P.append(c)
# Z-DACIRWE: DAC, 35, working with IRWE
c=base('CO-212'); c['id']='Z-DACIRWE'; c['title']='scratch - DAC with earnings and IRWE'
f=c['persons']['p1']['facts']; m=c['persons']['p1']['month_defaults']
f.update(date_of_birth='1991-05-01',meets_ssa_disability_criteria=True,title_ii_benefit_type='disabled_adult_child',lost_ssi_due_to_social_security_benefits=True,receives_va_aid_and_attendance=False,va_aid_and_attendance_amount=0,medicare_part_a_entitled=False,education_program_type='none')
m.update(social_security_income=1200,pension_income=0,wages_gross=2200,impairment_related_work_expenses_paid=600)
P.append(c)
# Z-DACSTU: DAC, 20, student with earnings
c=copy.deepcopy(P[-1]); c['id']='Z-DACSTU'; c['title']='scratch - DAC student with earnings'
c['persons']['p1']['facts'].update(date_of_birth='2006-05-01',education_program_type='higher_education',class_attendance_hours_per_week=12)
c['persons']['p1']['month_defaults'].update(impairment_related_work_expenses_paid=0)
P.append(c)
# Z-WAWDSTU: WAwD 19 student with wages
c=copy.deepcopy(P[-1]); c['id']='Z-WAWDSTU'; c['title']='scratch - WAwD student'
f=c['persons']['p1']['facts']; f.update(date_of_birth='2007-03-01',title_ii_benefit_type='none',lost_ssi_due_to_social_security_benefits=False,ma_buy_in_determination_month='2026-10')
c['persons']['p1']['month_defaults'].update(social_security_income=0,wages_gross=3000)
P.append(c)
yaml.safe_dump(P,open(out,'w'),sort_keys=False)
