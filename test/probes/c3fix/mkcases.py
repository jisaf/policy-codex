import yaml, copy, sys
S='/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/c3fix'
A=yaml.safe_load(open(S+'/all.yaml')); d={c['id']:c for c in A}
def body(c, cid, title):
    c=copy.deepcopy(c); c['id']=cid; c['title']=title; c.pop('expect',None)
    t=yaml.safe_dump([c], sort_keys=False, width=200, allow_unicode=True)
    return t
y1=copy.deepcopy(d['Y-1']); y1['persons']['p2']['facts']['cccap_caretaker_joined_during_eligibility_period']=True
t1=body(y1,'CO-215','Coverage pass 3 (CCCAP): at a change, a stepfather who moved in during the period with no activity')
c1='''  # Coverage pass 3 C3-1 (probe Y-1). 8 CCR 1403-1 3.125.EE.1-2, 3.125.Q.2, 3.111.D.1. p1 (38) works ($2,000 a month, 120 hours) and her
  # son p3 (6) was authorized at the last determination (fee then $60). During the twelve-month period p2 (40) married p1 and moved in;
  # he has no job or other activity and no income, and the case record shows he joined during the period. A change is reported in Denver
  # on November 15, 2026.
'''
e1='''  expect:
    # Activity (CO-991): p1 is in an activity ($2,000 / 120 h = $16.67 an hour, at least $7.25). p2 is a caretaker (a stepparent who
    # contributes) with no activity, but he joined during the period and this is a change: EE.1 acts on a composition change only for an
    # additional child, EE.2 holds the rest until the redetermination, and Q.2 discontinues care only for a caretaker "no longer" in an
    # activity, so he is not tested (CO-4910). Household of 3 (p2 is a member), income $2,000, under 85% SMI: eligible_low_income.
    # Fee (3.124.P): 100% FPG for 3 = $27,320 / 12 = $2,276.67; $2,000 is under it, 1% x $2,000 = $20; within the period the fee does
    # not rise above the last determination's $60 (CO-4052): min($20, $60) = $20. Before the fix: ineligible_activity, fee $0.
    # At the redetermination the same household is ineligible_activity (D.1.c.1; rule test CO-991-T12).
    p1:
      cccap_household_caretakers_in_eligible_activity: {"2026-11": true}
      cccap_eligibility_status: {"2026-11": eligible_low_income}
      cccap_household_size: 3
      cccap_household_income: {"2026-11": 2000}
      cccap_parent_fee: {"2026-11": 20}
    p3:
      cccap_eligibility_status: {"2026-11": eligible_low_income}
      cccap_parent_fee: {"2026-11": 20}
    p2:
      cccap_eligibility_status: {"2026-11": eligible_low_income}
'''
t2=body(d['Y-8c'],'CO-216','Coverage pass 3 (CCCAP): the father is in jail (involuntarily out of the home); the mother works')
c2='''  # Coverage pass 3 C3-2 (probe Y-8c). 8 CCR 1403-1 3.111.D.1.a-b, 3.103.LLL, 3.111.A. p1 (38) works ($2,000 a month, 120 hours) and
  # lives in Denver with her son p3 (6). p3's father p2 (40), her husband, is in jail, involuntarily out of the home; his county is stated
  # as Denver and no residency document has come in for him. Application in Denver, determined November 15, 2026.
'''
e2='''  expect:
    # Household (CO-982): D.1.b makes this "a household with one adult caretaker", D.1.a keeps only a caretaker voluntarily out of the
    # home in the household, and LLL counts the children "in the home": p2 is not a member (OQ-872). Household p1 and p3, size 2,
    # income $2,000. Activity: p1 works ($16.67 an hour). Residency and assets are tested on p1 only (Denver; declared within the limit).
    # Entry limit 185% x $21,640 / 12 = 185% x $1,803.33 = $3,336.17: eligible_low_income. Fee (3.124.P): 1% x $1,803.33 + 15% x
    # ($2,000 - $1,803.33) = $18.0333 + $29.5005 = $47.5338 -> $47. Verification: p2's residency document is not asked: complete.
    # p2's own household is himself, with no eligible child: ineligible_child. Before the fix: size 3, fee $20, verification past_due.
    p1:
      cccap_household_members: [p1, p3]
      cccap_eligibility_status: {"2026-11": eligible_low_income}
      cccap_household_size: 2
      cccap_household_income: {"2026-11": 2000}
      cccap_parent_fee: {"2026-11": 47}
      cccap_verification_status: {"2026-11": complete}
    p3:
      cccap_eligibility_status: {"2026-11": eligible_low_income}
      cccap_parent_fee: {"2026-11": 47}
    p2:
      cccap_eligibility_status: {"2026-11": ineligible_child}
'''
def assemble(t,c,e):
    lines=t.rstrip('\n').split('\n')
    # insert comment after the title line
    out=[lines[0],lines[1]]+c.rstrip('\n').split('\n')+lines[2:]
    return '\n'.join(out)+'\n'+e
txt=assemble(t1,c1,e1)+assemble(t2,c2,e2)
p='volumes/co/tests/cases.yaml'; s=open(p).read()
assert '- id: CO-215\n' not in s
# CO-201 re-pin p2
i=s.index('- id: CO-201\n'); j=s.index('\n- id: ',i+5)
blk=s[i:j]
o='''    p2:
      cccap_eligibility_status:
        2026-11: eligible_homelessness_stabilization
'''
n='''    # Coverage pass 3 C3-2: p2, involuntarily out of the home, is no longer a household member (3.111.D.1.b, 3.103.LLL; OQ-872); his own
    # household is himself, with no eligible child, so his own status is ineligible_child (was eligible_homelessness_stabilization).
    # p1 and p3 are unchanged (a household of 2 now).
    p2:
      cccap_eligibility_status:
        2026-11: ineligible_child
'''
assert blk.count(o)==1; blk=blk.replace(o,n); s=s[:i]+blk+s[j:]
if not s.endswith('\n'): s+='\n'
s+=txt
open(p,'w').write(s)
