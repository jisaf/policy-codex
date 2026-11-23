P = '/home/user/policy-codex/.claude/worktrees/agent-a2cadfae7e8577c94/docs/reviews/coverage-cccap.md'
s = open(P, encoding='utf-8').read()
R = {
    '| C Adult caretaker | C: CO-992, CO-2607, CO-897; OQ-540 (loco parentis); see F-15 |':
    '| C Adult caretaker | C: CO-992, CO-2607, CO-897; OQ-540 (loco parentis; D.2 financial contribution, fixed F-15) |',
    '| K Assets (K.1 liquid, K.2 non-liquid; home and car excluded) | C: CO-1741 meaning, CO-1809; see F-02 |':
    '| K Assets (K.1 liquid, K.2 non-liquid; home and car excluded) | C: CO-1741 meaning, CO-1809, CO-987 (household; fixed F-02) |',
    '| DD Colorado Works Child Care | C: CO-988, CO-2709, CO-896; see F-01 |':
    '| DD Colorado Works Child Care | C: CO-988 (household; fixed F-01), CO-2709, CO-896 |',
    '| BBB Fair market value | GAP: used by I.4, see F-08 |':
    '| BBB Fair market value | C: CO-4454 (I.4 at cost or fair market value; fixed F-08) |',
    '| CCC Families experiencing homelessness (1-4) | C: CO-2814, CO-2810; see F-13 (campgrounds) |':
    '| CCC Families experiencing homelessness (1-4) | C: CO-2814, CO-2810 (campground option split; fixed F-13) |',
    '| NNN Incapacitated | C: CO-1744; see F-21 |':
    '| NNN Incapacitated | C: CO-1744, CO-4466, CO-4467 (verification element; fixed F-21) |',
    '| RRR Involuntarily out of the home | C: CO-898; see F-03 |':
    '| RRR Involuntarily out of the home | C: CO-898, CO-991 (fixed F-03) |',
    '| TTT Low-Income Child Care | C: CO-989; see F-12 |':
    '| TTT Low-Income Child Care | C: CO-989 (3.115.C row; fixed F-12) |',
    '| AAAA Originating county; OOOO Receiving county | GAP: see F-05 (3.125.GG) |':
    '| AAAA Originating county; OOOO Receiving county | C: CO-2107 (cccap_application_county is the originating county at a change; fixed F-05) |',
    '| TTTT Regionally accredited institution | C: CO-1722; see F-04 |':
    '| TTTT Regionally accredited institution | C: CO-1722, CO-4450 (fixed F-04) |',
    '| IIIII Training and post-secondary education (and SUD treatment) | C: CO-1722, CO-4074; see F-04 |':
    '| IIIII Training and post-secondary education (and SUD treatment) | C: CO-1722, CO-4450 (Bachelor\'s degree or less; fixed F-04), CO-4074 |',
    '| NNNNN Voluntarily out of the home | C: CO-991 (still a caretaker); OQ-612 (see F-17) |':
    '| NNNNN Voluntarily out of the home | C: CO-991 (still a caretaker); OQ-612 (Checked line cites it; fixed F-17) |',
    '| A (verified county residents) | C: CO-2107, CO-1440; see F-02. Second sentence (remain eligible after a county move): see F-05 |':
    '| A (verified county residents) | C: CO-2107, CO-1440, CO-987 (every caretaker; fixed F-02). Second sentence: CO-2107 (fixed F-05) |',
    '| C.1.c Head Start redetermination alignment | GAP: see F-18 |':
    '| C.1.c Head Start redetermination alignment | NA: redetermination scheduling, out of scope (docs/colorado-notes.md, coverage round; F-18) |',
    '| C.2.g incapacitation | C (folded into the fact): CO-1744; see F-21 |':
    '| C.2.g incapacitation | C: CO-4466, CO-4467, CO-1447, CO-1448 (fixed F-21) |',
    '| D.1.b involuntary absence | C: CO-898, CO-991; see F-03 |':
    '| D.1.b involuntary absence | C: CO-898, CO-991 (fixed F-03) |',
    '| D.1.c.3 one incapacitated | C: CO-991, CO-1744; see F-03 |':
    '| D.1.c.3 one incapacitated | C: CO-991, CO-1744 (fixed F-03) |',
    '| D.2 two caretakers by financial contribution or parental role | GAP: see F-15 |':
    '| D.2 two caretakers by financial contribution or parental role | C: role contributes_financially_to, CO-2607, CO-982, CO-992; OQ-540 (fixed F-15) |',
    '| D.6 caretaker not work eligible falls to Low-Income | C: CO-988 (falls through); see F-12 |':
    '| D.6 caretaker not work eligible falls to Low-Income | C: CO-988 (falls through), CO-989 (3.115.C governs for a unit member; fixed F-12) |',
    '| E incapacitated single caretaker ineligible | C: CO-991; see F-03 |':
    '| E incapacitated single caretaker ineligible | C: CO-991 (fixed F-03) |',
    '| G.1.c LLC and S-corporation owners are employees | NA: classification on the facts; see F-27 |':
    '| G.1.c LLC and S-corporation owners are employees | NA: classification on the facts, noted in CO-3915 (F-27) |',
    '| G.2.e launch period: projected income | GAP: see F-11 |':
    '| G.2.e launch period: projected income | C: CO-1710, CO-4461 (fixed F-11) |',
    '| G.4.a.1 post-secondary, 104 weeks | C: CO-1722, CO-2111; OQ-162; see F-04 |':
    '| G.4.a.1 post-secondary, 104 weeks | C: CO-1722, CO-4450 (fixed F-04), CO-2111; OQ-162 |',
    '| H.4.e rental income (self-employment if 20 hours or more; averaging; joint ownership) | C: CO-3914, CO-1714; see F-10 |':
    '| H.4.e rental income (self-employment if 20 hours or more; averaging; joint ownership) | C: CO-3914, CO-1714, CO-4457, CO-4458 (net; fixed F-10) |',
    '| H.5.c assets self-declared, $1M | C: CO-1741, CO-1809; see F-02 |':
    '| H.5.c assets self-declared, $1M | C: CO-1741, CO-1809, CO-987 (household; fixed F-02) |',
    '| I.3, I.3.a-c farm self-employment | GAP: see F-20 |':
    '| I.3, I.3.a-c farm self-employment | C: CO-1710, CO-1709, CO-4465 (farm interest; fixed F-20) |',
    '| I.4 in-kind compensation | GAP: see F-08 |':
    '| I.4 in-kind compensation | C: CO-4454, CO-4464 (fixed F-08) |',
    '| I.5 vendor payments as compensation | GAP: see F-08 |':
    '| I.5 vendor payments as compensation | C: CO-4455, CO-4464 (fixed F-08) |',
    '| I.7.c GI Bill subsistence | C, see F-09 |':
    '| I.7.c GI Bill subsistence | C: CO-4456, CO-4464 (fixed F-09) |',
    '| I.8 pensions and annuities (a-e) | C: CO-026, CO-3816; penalties see F-10 |':
    '| I.8 pensions and annuities (a-e) | C: CO-026, CO-3816; penalties CO-4459, CO-4463 (fixed F-10) |',
    '| I.12, I.17 net rental income | C, see F-10 |':
    '| I.12, I.17 net rental income | C: CO-4457, CO-4458, CO-4463 (fixed F-10) |',
    '| I.18 boarders and lodgers | GAP: see F-08 |':
    '| I.18 boarders and lodgers | C: CO-4161, CO-4464 (fixed F-08) |',
    '| I.21-22 insurance and lawsuit proceeds | C, see F-10 |':
    '| I.21-22 insurance and lawsuit proceeds | C: CO-3367, CO-4460, CO-3916 (fixed F-10) |',
    '| I.32 AmeriCorps and VISTA | C: CO-4016 (VISTA exception, see F-27) |':
    '| I.32 AmeriCorps and VISTA | C: CO-4016; VISTA stated by the I.32 condition, noted in CO-3915 (F-27) |',
    '| J.10 foster, kinship and adoption payments | GAP: see F-07 |':
    '| J.10 foster, kinship and adoption payments | C: CO-3821, CO-4451, CO-4463 (fixed F-07) |',
    '| J.13 Social Security under a PASS | GAP: see F-07 |':
    '| J.13 Social Security under a PASS | C: CO-3825, CO-4463 (fixed F-07) |',
    '| J.16, J.19, J.20 educational grants, loans, work-study, Perkins | C: CO-3360, CO-3361, CO-3912; see F-09 |':
    '| J.16, J.19, J.20 educational grants, loans, work-study, Perkins | C: CO-3360, CO-3361, CO-3912; GI Bill subsistence counted back (CO-4456; fixed F-09) |',
    '| J.17, J.18 WIA training allowances; youth projects | GAP: see F-07 |':
    '| J.17, J.18 WIA training allowances; youth projects | C: CO-3815, CO-4463 (fixed F-07) |',
    '| J.23 Colorado Works supportive services | GAP: see F-25 |':
    '| J.23 Colorado Works supportive services | C: CO-4452, CO-4463 (fixed F-25) |',
    '| J.24 Home Care Allowance | GAP: see F-07 |':
    '| J.24 Home Care Allowance | C: CO-3824, CO-4463 (fixed F-07) |',
    '| J.29 research-study income | GAP: see F-25 |':
    '| J.29 research-study income | C: CO-4453, CO-4463 (fixed F-25) |',
    '| 3.112.J ATS non-cooperation closure | GAP: see F-19 |':
    '| 3.112.J ATS non-cooperation closure | OQ: OQ-162 (county policy, blocked; F-19) |',
    '| 3.113.A.1.d assets | C: CO-1741; see F-02 |':
    '| 3.113.A.1.d assets | C: CO-1741, CO-987 (fixed F-02) |',
    '| 3.113.C Head Start alignment | GAP: see F-18 |':
    '| 3.113.C Head Start alignment | NA: redetermination scheduling, out of scope (docs/colorado-notes.md; F-18) |',
    '| 3.114.A.2 no longer a state resident | C: CO-505 via CO-2107; see F-05 |':
    '| 3.114.A.2 no longer a state resident | C: CO-505 via CO-2107 (state residency alone at a change; fixed F-05) |',
    '| 3.114.B.1 age limits (redetermination only) | C: CO-4056, CO-980; see F-06 |':
    '| 3.114.B.1 age limits (redetermination only) | C: CO-4056, CO-4462 (fixed F-06), CO-980 |',
    '| 3.114.B.3 time limits (redetermination only) | C: CO-2111; see F-06 |':
    '| 3.114.B.3 time limits (redetermination only) | C: CO-2111, CO-984 (fixed F-06); OQ-790 (3.132.B.3) |',
    '| 3.114.B.6 became a Colorado Works participant | GAP: see F-12 |':
    '| 3.114.B.6 became a Colorado Works participant | C: CO-989 (fixed F-12) |',
    '| 3.114.B.7 immunization records | C: CO-4060; see F-06 |':
    '| 3.114.B.7 immunization records | C: CO-4060, CO-4462 (fixed F-06) |',
    '| 3.115.A work-eligible, approved for Colorado Works; twelve months; freeze | C: CO-988; see F-01. Freeze NA |':
    '| 3.115.A work-eligible, approved for Colorado Works; twelve months; freeze | C: CO-988 (fixed F-01). Freeze NA |',
    '| 3.115.C not work eligible and not in the assistance unit | GAP: see F-12 |':
    '| 3.115.C not work eligible and not in the assistance unit | C: CO-989 (fixed F-12) |',
    '| 3.116.C, C.1-2 earned income only | C: CO-2578, CO-2873; see F-23 |':
    '| 3.116.C, C.1-2 earned income only | C: CO-2578, CO-2873, CO-1445 (fixed F-23) |',
    '| 3.120.D eligibility by the Child Welfare division (12 CCR 2509-4 7.302) | C: CO-2576; OQ-710 (see F-16); verification see F-14 |':
    '| 3.120.D eligibility by the Child Welfare division (12 CCR 2509-4 7.302) | C: CO-2576; OQ-710 (7.302 read, D-305; fixed F-16); verification CO-1441, CO-1445, CO-2873 (fixed F-14) |',
    '| 3.121.A definition | C: CO-2814; see F-13 |':
    '| 3.121.A definition | C: CO-2814 (fixed F-13) |',
    '| 3.124.H 20% quality reduction | C: CO-3508, CO-1287, CO-3002; see F-22 |':
    '| 3.124.H 20% quality reduction | C: CO-3508 (Low-Income and Colorado Works only; fixed F-22), CO-1287, CO-3002 |',
    '| 3.124.R FPG and SMI per 3.111.H; update at redetermination | C: CO-3007; see F-26 |':
    '| 3.124.R FPG and SMI per 3.111.H; update at redetermination | C: CO-3007, CO-4052 (noted, F-26) |',
    '| Q, Q.1-6 minimum twelve-month eligibility and its closed list of reasons | C: CO-989, CO-993, CO-505, CO-984, CO-4055, CO-3906; see F-05, F-06 |':
    '| Q, Q.1-6 minimum twelve-month eligibility and its closed list of reasons | C: CO-989, CO-993, CO-505, CO-984, CO-4055, CO-3906; CO-2107, CO-4056, CO-4060 (fixed F-05, F-06) |',
    '| EE, EE.1.a-e, EE.2 changes acted on during the period | C: CO-3307 (`change_during_eligibility_period`); see F-06 |':
    '| EE, EE.1.a-e, EE.2 changes acted on during the period | C: CO-3307 (`change_during_eligibility_period`), CO-4462 (fixed F-06) |',
    '| FF new child: align the redetermination | GAP: see F-18 |':
    '| FF new child: align the redetermination | NA: redetermination scheduling, out of scope (F-18); the added child is tested as new (CO-4462) |',
    '| GG, GG.1-4 move to another county during the period | GAP: see F-05. GG.1 provider agreements NA; GG.3 receiving county\'s activities OQ-162 |':
    '| GG, GG.1-4 move to another county during the period | C: CO-2107 (fixed F-05). GG.1 provider agreements NA; GG.3 receiving county\'s activities OQ-162 |',
    '| OO Head Start alignment | GAP: see F-18 |':
    '| OO Head Start alignment | NA: redetermination scheduling, out of scope (F-18) |',
    '| C thirty days for documents | GAP: see F-24 |':
    '| C thirty days for documents | GAP: not modeled, recorded in docs/colorado-notes.md (F-24, deferred P2) |',
    '| 3.133.A.4 ATS non-cooperation closure | GAP: see F-19 |':
    '| 3.133.A.4 ATS non-cooperation closure | OQ: OQ-162 (county policy, blocked; F-19) |',
}
for a, b in R.items():
    assert s.count(a) == 1, a
    s = s.replace(a, b)
open(P, 'w', encoding='utf-8').write(s)
print(len(R))
