import yaml, copy, sys, os
os.chdir('/home/user/policy-codex/.claude/worktrees/agent-aaa043a2b1429cc45/volumes/co')
cases = yaml.safe_load(open('tests/cases.yaml'))
cases = cases if isinstance(cases, list) else cases['cases']
base = [c for c in cases if c['id'] == 'CO-164'][0]
exp = yaml.safe_load(open(sys.argv[1])) if len(sys.argv) > 1 else {}

q1 = copy.deepcopy(base); q1.pop('expect', None)
q1['id'] = 'CO-190'
q1['title'] = 'Colorado Works coverage pass 2 CW2-1: an unmarried 16-year-old mother living with an unrelated caretaker who does not join needs a county approved setting'
q1['relationships'] = [['parent', 'p1', 'p2'], ['has_primary_responsibility_for', 'p3', 'p1']]
q2 = copy.deepcopy(base); q2.pop('expect', None)
q2['id'] = 'CO-191'
q2['title'] = "Colorado Works coverage pass 2 CW2-2: a minor mother's mother in the home is deemed; her father in another home adds nothing to the needs deducted"
q2['relationships'] = [['parent', 'p1', 'p2'], ['parent', 'p3', 'p1'], ['parent', 'p4', 'p1']]
q2['persons']['p3']['month_defaults']['wages_gross'] = 600
q2['persons']['p3']['facts']['date_of_birth'] = '1985-01-22'
p4 = copy.deepcopy(q2['persons']['p3'])
p4['facts']['dwelling_id'] = 'h2'; p4['facts']['sex'] = 'male'; p4['facts']['date_of_birth'] = '1984-05-05'
p4['month_defaults']['wages_gross'] = 0
q2['persons']['p4'] = p4
for q in (q1, q2):
    if q['id'] in exp:
        q['expect'] = exp[q['id']]
out = yaml.safe_dump([q1, q2], sort_keys=False, allow_unicode=True, width=200)
open(sys.argv[2] if len(sys.argv) > 2 else '/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/cw2fix/cases_new.yaml', 'w').write(out)
print(len(out))
