import os
os.chdir('/home/user/policy-codex/.claude/worktrees/agent-a84186d76c3bacb83')
p = 'docs/reviews/coverage2-medicaid-nonmagi.md'
L = open(p).read().split('\n')
add = {
    83: ' Fix round: dated onset carried by ma_month_is_before_disability_onset (CO-4888, disability_onset_date CO-4887) in CO-612.',
    90: ' Fix round: carried by ma_abd_denied_for_noncooperation (CO-4886, CO-4884).',
    107: ' Fix round: carried by CO-2470 (A&A/UME portion excluded).',
    114: ' Fix round: j, o, p carried by CO-2470 (CO-3812, CO-4308, CO-3815 less CO-4300); z by CO-2471 (CO-4881).',
    120: ' Fix round: N2-5 recorded in OQ-822 and CO-641.',
    146: ' Fix round: carried by CO-2470 (rents net of CO-4458); OQ-867.',
    148: ' Fix round: carried by CO-2470.',
    165: ' Fix round: carried by ma_spouse_or_dependent_relative_lives_in_home (CO-4880).',
    166: ' Fix round: N2-6 recorded in CO-4622 precision.',
    168: ' Fix round: carried by CO-4880.',
    305: ' Fix round: N2-7 recorded in CO-4624 precision.',
    417: ' Fix round: carried by CO-657 (statute_override).',
    424: ' Fix round: carried by CO-4886 (CO-4885).',
    449: ' Fix round: carried by CO-4883 (CO-4882).',
    457: ' Fix round: carried by CO-2470 (americorps_payments_received).',
}
for n, t in add.items():
    line = L[n - 1]
    assert line.startswith('| ') and line.endswith(' |'), (n, line)
    L[n - 1] = line[:-2] + t + ' |'
open(p, 'w').write('\n'.join(L))
print('ok')
