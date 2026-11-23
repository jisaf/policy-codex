# Reviewer probe households (raw material)

Copied on 2026-11-23 from the session scratchpad (`/tmp/claude-0/.../scratchpad/`), where the coverage, final and
fix-round reviewers built them, so they survive a cleared /tmp (restructure proposal step 1; review
docs/reviews/restructure-proposal-review.md, R9 and change I). Nothing here is read by the engine, `npm run check`
or the tests: the stored, checked form of each probe is a case in `volumes/co/tests/cases.yaml` (the ones promoted
in the probe-preservation round are CO-300 and up; each names its probe). Text only: full copies of the repository and of
cases.yaml were not copied; from each scratch repo copy only the cases it added are extracted, verbatim with their
comments, into `<origin>/...cases-added.yaml`. Byte-identical files and extracts whose every case appears in another file
here were kept once. Scripts keep the absolute scratch paths they were written with and are not runnable as they stand.

Facts in these files are as of the day each probe was written; several were retired since (see the promoted cases
for the translation to current facts).

## Origins

| Directory | Built by | Cited by |
|---|---|---|
| `afcov/` | Adult Financial coverage pass 1 fix round | coverage-adult-financial.md (PR-ABS, PR-ISM, PR-PNA, PR-APART, PR-PTC, PR-RENT, PR-IMD, PR-SPON, PR-LUMP; probes3 adds PR-RENT2, PR-LUMP2) |
| `c2fix/` | CCCAP coverage pass 2 fix round | coverage2-cccap.md fix section (cases-new.yaml: CO-199 .. CO-201 as promoted) |
| `c2tools/` | CCCAP coverage pass 2 reviewer | coverage2-cccap.md (mk2.py builds Q-* and Z-* from base.py) |
| `c3/` | CCCAP coverage pass 3 reviewer (repo copy) | coverage3-cccap.md (scripts/run-probes.ts) |
| `c3fix/` | CCCAP coverage pass 3 fix round | coverage3-cccap.md fix section (extra.yaml: Y-1j, Y-1jr, Y-7s; mkcases.py promoted CO-215, CO-216) |
| `c3sf/` | SNAP financial coverage pass 3 reviewer (repo copy) | coverage3-snap-financial.md (scripts/evm.ts: overrides on stored cases given on the command line) |
| `c3tools/` | CCCAP coverage pass 3 reviewer | coverage3-cccap.md (y.yaml, y2.yaml: Y-1 .. Y-9a, Y-8b, Y-8c, Y-1c; mk3*.py) |
| `cases/` | final Medicaid / CHP+ review 1 | final-medicaid-chp.md (hpe.yaml X-HPE, pp.yaml X-PP) |
| `cccapfix/` | CCCAP coverage pass 1 fix round | coverage-cccap.md fix section (probes4.json: RV-B2 and other re-probes; cases_new.json: CO-170 .. CO-174 as promoted) |
| `cf3/` | SNAP coverage pass 3 fix round (financial and non-financial) | coverage3-snap-financial.md (probes.json, probes2.json: overrides on CO-115) and coverage3-snap-nonfinancial.md (zz-c3nf.yaml ZZ-M1, ZZ-M2, ZZ-D0 .. ZZ-D4; cases-spec.json CO-217 .. CO-223) |
| `cov/` | CCCAP coverage pass 1 reviewer | coverage-cccap.md (RV-A1 .. RV-O: probes*.json, the households gen/mk.py built; repo-cases-added.yaml is what it appended to its scratch copy) |
| `cov-leap/` | LEAP / SUN Bucks coverage pass 1 reviewer (repo copy) | coverage-leap-sunbucks.md (RV-L0 .. RV-L4, RV-S1) |
| `cov2magi/` | MAGI / CHP+ coverage pass 2 reviewer | coverage2-medicaid-magi-chp.md (gen/s*.json specs, gen/mk.py, tools/cmp.py; repo-cases-added.yaml RV2-*) |
| `cov2nm/` | Medicaid non-MAGI coverage pass 2 reviewer | coverage2-medicaid-nonmagi.md (gen/s1-s4.yaml: Y-VAAA, Y-FAMALLOW, Y-CBWD19, Y-CBWD18, Y-DEPREL) |
| `cov2sf/` | SNAP financial coverage pass 2 reviewer (repo copy) | coverage2-snap-financial.md (scripts/eval-mod.ts: overrides on CO-115 given on the command line) |
| `cov3fix/` | MAGI / CHP+ coverage pass 3 fix round | coverage3-medicaid-magi-chp.md fix section (runall.ts; newcases.yaml CO-226 .. CO-228) |
| `cov3magi/` | MAGI / CHP+ coverage pass 3 reviewer | coverage3-medicaid-magi-chp.md (gen/all.json, gen/s*.json, gen/mk.py; repo-cases-added.yaml RV3-*) |
| `cov3nm/` | Medicaid non-MAGI coverage pass 3 reviewer | coverage3-medicaid-nonmagi.md (gen/z*.yaml: Z-ADM .. Z-BDEED40; chk.py) |
| `covfix/` | Medicaid MAGI / CHP+ coverage pass 1 fix round | coverage-medicaid-magi-chp.md (probes.yaml: RV-GM, RV-PP, RV-INM, RV-SE, RV-65, RV-SPA, RV-CHPB, RV-SE2, RV-C5, RV-SP) |
| `covfix-magi/` | MAGI / CHP+ coverage pass 2 fix round | coverage2-medicaid-magi-chp.md fix section (newcases.yaml CO-202 .. CO-205) |
| `covfixls/` | LEAP / SUN Bucks coverage pass 3 fix round | coverage2-leap-sunbucks.md and coverage3-leap-sunbucks.md (PR3-L1 .. PR3-L4) |
| `cw/` | Colorado Works coverage pass 1 reviewer (repo copy) | coverage-colorado-works.md (ZZ-1 .. ZZ-4, CWZ-5 .. CWZ-18) |
| `cw2/` | Colorado Works coverage pass 2 reviewer (repo copy) | coverage2-colorado-works.md (ZQ-1 .. ZQ-3, ZR-1 .. ZR-3) |
| `cw2fix/` | Colorado Works coverage pass 2 fix round | coverage2-colorado-works.md fix section (cases_new.yaml CO-190, CO-191) |
| `cw2tools/` | Colorado Works coverage pass 2 reviewer | coverage2-colorado-works.md (mk*.py) |
| `cw3fix/` | Colorado Works coverage pass 3 fix round | coverage3-colorado-works.md (probes.yaml: ZT-1 .. ZT-8, ZT-1b, ZT-2b and the earlier ZQ/ZZ/CWZ re-run set) |
| `cw3tools/` | Colorado Works coverage pass 3 reviewer | coverage3-colorado-works.md (mk*.py build ZT-*) |
| `cwfix/` | Colorado Works coverage pass 1 fix round | coverage-colorado-works.md fix section (probes.yaml re-run set; newcases.yaml CO-160 .. CO-164) |
| `cwreview/` | Colorado Works coverage pass 1 reviewer | coverage-colorado-works.md (spec*.json are the override specs mkcase_cw.py expanded into ZZ-*/CWZ-*) |
| `gen/` | MAGI coverage pass 1 reviewer / cash phase | coverage-medicaid-magi-chp.md (p1.yaml RV-GM, mk.py); case122.yaml, cases_new.yaml are the cash fix round drafts of CO-120 .. CO-122 |
| `lsfix/` | LEAP / SUN Bucks coverage pass 2 fix round | coverage2-leap-sunbucks.md (RV2-L0 .. RV2-L3, RV2-S0 .. RV2-S2) |
| `nm/` | Medicaid non-MAGI coverage pass 1 reviewer and fix round | coverage-medicaid-nonmagi.md (x2.yaml X-*; mkcases.py/finalcases.py promoted CO-185 .. CO-189) |
| `nmfix/` | Medicaid non-MAGI coverage pass 2 fix round | coverage2-medicaid-nonmagi.md (frag.yaml, new.yaml CO-212 .. CO-214) |
| `p1fix-cash/` | final cash fix rounds | final2-cash.md fix section (p_cw2.yaml, p_cw3.yaml, new-cases.yaml) |
| `p1med/` | final Medicaid / CHP+ P1 fix round | final-medicaid-chp.md fix section (cases/co110 .. co114.yaml drafts) |
| `probe/` | final cash review 1 | final-cash.md FC-4 (oapcouple.json), FC-5 (andso.json) |
| `rv-cash/` | final cash reviews | final-cash.md, final2-cash.md, final-verification.md (probe/p_*.yaml) |
| `rv-cccap/` | final CCCAP / LEAP / SUN Bucks review 2 | final2-cccap-leap-sebt.md (gen/mk.py builds RV-S1, RV-S2, RV-S4 .. RV-S8) |
| `rv-medicaid/` | final Medicaid / CHP+ review 2 | final2-medicaid-chp.md (x-retro.yaml, snapx-cases-added.yaml: X-RETRO, X-NOSTART) |
| `rv-snap/` | final SNAP reviews | final-snap.md, final2-snap.md (zz*.yaml: phase-10 households) |
| `rv2/` | final CCCAP / LEAP / SUN Bucks review 2 (re-run) | final2-cccap-leap-sebt.md (rv.yaml RV-S*) |
| `rv3-medicaid/` | final Medicaid / CHP+ review 3 | final3-medicaid-chp.md (snap-cases-added.yaml: X-CBWD, X-CHPDIS, X-CHPSSI, X-19, X-19U, X-19B, X-TMA) |
| `snapfin-scripts/` | SNAP financial coverage pass 1 fix round | coverage-snap-financial.md (scen*.json: the CF-* overrides on CO-115; cases-spec.json CO-155 .. CO-159) |
| `top-level/` | scratchpad root | several: cov2af-probes.yaml and cov3af-probes.yaml cited by coverage2/coverage3-adult-financial; x-cases-nonmagi.yaml by coverage-medicaid-nonmagi; coverage-nonfinancial-zz-cases.yaml and zzA1.yaml by coverage-snap-nonfinancial; coverage2-nonfinancial-zz-cases.yaml by coverage2-snap-nonfinancial; probes.yaml (Q-*, Z-*) by coverage2-cccap; rv2l1.yaml by coverage2-leap-sunbucks (RV2-L1); probe.yaml (CO-175 draft) by the LEAP coverage fix; probe-b.ts is a household runner |

## Files

### afcov/

- `afcov/evalp.ts`: probe runner (vite-node)
- `afcov/matrix.py`: generator / helper script
- `afcov/mkcases.py`: generator / helper script
- `afcov/mkd300.py`: generator / helper script
- `afcov/newcases.yaml`: probe households: CO-165, CO-166, CO-167, CO-168, CO-169
- `afcov/probes.yaml`: probe households: PR-ABS, PR-ISM, PR-PNA, PR-APART, PR-PTC, PR-RENT, PR-IMD, PR-SPON, PR-LUMP
- `afcov/probes2.yaml`: probe households: PR-ABS, PR-ISM, PR-PNA, PR-APART, PR-PTC, PR-RENT, PR-IMD, PR-SPON, PR-LUMP, CO-165, CO-166, CO-167, CO-168, CO-169
- `afcov/probes3.yaml`: probe households: PR-ABS, PR-ISM, PR-PNA, PR-APART, PR-PTC, PR-RENT2, PR-IMD, PR-SPON, PR-LUMP2

### c2fix/

- `c2fix/cases-new.yaml`: probe households: CO-199, CO-200, CO-201
- `c2fix/mkcases.py`: generator / helper script

### c2tools/

- `c2tools/base.py`: generator / helper script
- `c2tools/mk2.py`: generator / helper script

### c3/

- `c3/scripts/run-probes.ts`: probe runner (vite-node)

### c3fix/

- `c3fix/extra.yaml`: probe households: Y-1j, Y-1jr, Y-7s
- `c3fix/mkcases.py`: generator / helper script
- `c3fix/mkextra.py`: generator / helper script
- `c3fix/probe.sh`: shell runner
- `c3fix/run-probes.ts`: probe runner (vite-node)

### c3sf/

- `c3sf/scripts/evm.ts`: probe runner (vite-node)

### c3tools/

- `c3tools/mk3.py`: generator / helper script
- `c3tools/mk3b.py`: generator / helper script
- `c3tools/y.yaml`: probe households: Y-1, Y-1r, Y-2, Y-2b, Y-3, Y-3b, Y-4, Y-5, Y-6, Y-7, Y-8, Y-9, Y-9a
- `c3tools/y2.yaml`: probe households: Y-8b, Y-8c, Y-1c

### cases/

- `cases/hpe.yaml`: probe households: X-HPE
- `cases/pp.yaml`: probe households: X-PP

### cccapfix/

- `cccapfix/cases_new.json`: household specs: CO-170, CO-171, CO-172, CO-173, CO-174
- `cccapfix/emitcases.py`: generator / helper script
- `cccapfix/matrix.py`: generator / helper script
- `cccapfix/mk2.py`: generator / helper script
- `cccapfix/mkcases.py`: generator / helper script
- `cccapfix/probe.ts`: probe runner (vite-node)
- `cccapfix/probes4.json`: household specs: RV-B2, RV-D2, RV-G2, RV-M2, RV-N1, RV-N2, RV-O, RV-O2

### cf3/

- `cf3/ZZ-D3.yaml`: probe households: ZZ-D3
- `cf3/ZZ-M1.yaml`: probe households: ZZ-M1
- `cf3/cases-spec.json`: overrides on CO-115, CO-195, ZZ-D3, ZZ-M1: CO-217, CO-218, CO-219, CO-220, CO-221, CO-222, CO-223
- `cf3/mkcases.py`: generator / helper script
- `cf3/newcases.yaml`: probe households: CO-217, CO-218, CO-219, CO-220, CO-221, CO-222, CO-223
- `cf3/probes.json`: overrides on CO-115: C31-allowance, C31-vista, C32-recert-allow, C32-recert-ctrl, C33-othercharges, C34-weekly-ui, C35-liquid, C37-boarder-q, CF1-cvc, CF2-rent, C21-weekly, C22-able, N3P22-age60-quit, N3P22-age40-quit
- `cf3/probes2.json`: overrides on CO-115: C34-weekly-ui-conv, C35-liquid-held, C31-allowance-zz
- `cf3/run.sh`: shell runner
- `cf3/snap.ts`: probe runner (vite-node)
- `cf3/zz-c3nf.yaml`: probe households: ZZ-M1, ZZ-M2, ZZ-D0, ZZ-D1, ZZ-D2, ZZ-D3, ZZ-D4

### cov/

- `cov/probes.json`: household specs: RV-A1, RV-A2, RV-B, RV-C, RV-D, RV-E, RV-F, RV-G, RV-H, RV-I, RV-J
- `cov/probes2.json`: household specs: RV-K1, RV-K2, RV-K3
- `cov/probes3.json`: household specs: RV-L, RV-M
- `cov/repo-cases-added.yaml`: cases added to a scratch repo copy: RV-A1, RV-A2, RV-B, RV-C, RV-D, RV-E, RV-F, RV-G, RV-H, RV-I, RV-J, RV-K1, RV-K2, RV-K3, RV-L, RV-M
- `cov/gen/mk.py`: generator / helper script
- `cov/scripts/eval-mod.ts`: probe runner (vite-node)

### cov-leap/

- `cov-leap/cases-added.yaml`: cases added to a scratch repo copy: RV-L1, RV-L2, RV-L3, RV-L4, RV-L0, RV-S1

### cov2magi/

- `cov2magi/repo-cases-added.yaml`: cases added to a scratch repo copy: RV2-MEC, RV2-NB, RV2-DSP, RV2-RC, RV2-RCB, RV2-65, RV2-CHPB, RV2-ELE
- `cov2magi/gen/mk.py`: generator / helper script
- `cov2magi/gen/s1.json`: household specs: RV2-MEC, RV2-MECY
- `cov2magi/gen/s2.json`: household specs: RV2-MEC, RV2-NB
- `cov2magi/gen/s3.json`: household specs: RV2-MEC, RV2-NB, RV2-DSP
- `cov2magi/gen/s4.json`: household specs: RV2-MEC, RV2-NB, RV2-DSP, RV2-RC, RV2-RCB
- `cov2magi/gen/s5.json`: household specs: RV2-MEC, RV2-NB, RV2-DSP, RV2-RC, RV2-RCB, RV2-65, RV2-CHPB
- `cov2magi/gen/s6.json`: household specs: RV2-MEC, RV2-NB, RV2-DSP, RV2-RC, RV2-RCB, RV2-65, RV2-CHPB, RV2-ELE
- `cov2magi/tools/cmp.py`: generator / helper script
- `cov2magi/tools/show.py`: generator / helper script

### cov2nm/

- `cov2nm/show.py`: generator / helper script
- `cov2nm/w-cases-added.yaml`: cases added to a scratch repo copy: X-BURIAL, X-IRA, X-REFUSE, X-COURT, X-DWB, X-PASS, X-DEEM, X-WAWDHCBS, X-QI, X-FORSALE, X-LUMP, Y-VAAA, Y-FAMALLOW, Y-CBWD19, Y-CBWD18, Y-DEPREL
- `cov2nm/gen/mk.py`: generator / helper script
- `cov2nm/gen/s1.json`: household specs: Y-VAAA
- `cov2nm/gen/s1.yaml`: probe households: Y-VAAA
- `cov2nm/gen/s2.yaml`: probe households: Y-FAMALLOW
- `cov2nm/gen/s3.yaml`: probe households: Y-CBWD19, Y-CBWD18
- `cov2nm/gen/s4.yaml`: probe households: Y-DEPREL

### cov2sf/

- `cov2sf/scripts/eval-mod.ts`: probe runner (vite-node)

### cov3fix/

- `cov3fix/mkcases.py`: generator / helper script
- `cov3fix/newcases.yaml`: probe households: CO-226, CO-227, CO-228
- `cov3fix/runall.ts`: probe runner (vite-node)

### cov3magi/

- `cov3magi/repo-cases-added.yaml`: cases added to a scratch repo copy: RV3-FPA, RV3-FPM, RV3-STEP, RV3-STEPN, RV3-NB1, RV3-FPRC, RV3-FPRCB, RV3-FPH, RV3-R2NB, RV3-R265, RV3-R2CHPB, RV3-R2ELE, RV3-CPB
- `cov3magi/show.py`: generator / helper script
- `cov3magi/gen/all.json`: household specs: RV3-FPA, RV3-FPM, RV3-STEP, RV3-STEPN, RV3-NB1, RV3-FPRC, RV3-FPRCB, RV3-FPH, RV3-R2NB, RV3-R265, RV3-R2CHPB, RV3-R2ELE, RV3-CPB
- `cov3magi/gen/mk.py`: generator / helper script
- `cov3magi/gen/s1.json`: household specs: RV3-FPA, RV3-FPM, RV3-FPRC, RV3-STEP, RV3-STEPN, RV3-NB1
- `cov3magi/gen/s2.json`: household specs: RV3-FPRC, RV3-FPRCB, RV3-FPH

### cov3nm/

- `cov3nm/chk.py`: generator / helper script
- `cov3nm/gen/mk.py`: generator / helper script
- `cov3nm/gen/z.yaml`: probe households: Z-ADM, Z-DACIRWE, Z-DACSTU, Z-WAWDSTU
- `cov3nm/gen/z2.yaml`: probe households: Z-NONCOOP, Z-ONSET
- `cov3nm/gen/z3.yaml`: probe households: Z-ADOPT, Z-ADOPT2
- `cov3nm/gen/z4.yaml`: probe households: Z-BDEED, Z-BDEED40

### covfix/

- `covfix/cases-new.yaml`: probe households: CO-180, CO-181, CO-182, CO-183, CO-184
- `covfix/mkcases.py`: generator / helper script
- `covfix/probe.ts`: probe runner (vite-node)
- `covfix/probes.yaml`: probe households: RV-GM, RV-PP, RV-INM, RV-SE, RV-65, RV-SPA, RV-CHPB, RV-SE2, RV-C5, RV-SP
- `covfix/run.sh`: shell runner

### covfix-magi/

- `covfix-magi/mkcases.py`: generator / helper script
- `covfix-magi/newcases.yaml`: probe households: CO-202, CO-203, CO-204, CO-205

### covfixls/

- `covfixls/mkcases.py`: generator / helper script
- `covfixls/pr3.yaml`: probe households: PR3-L1, PR3-L2, PR3-L3, PR3-L4
- `covfixls/probes.yaml`: probe households: RV2-L0, RV2-L1, RV2-S1, RV2-S0, RV2-L2, RV2-L3, RV2-S2, PR3-L1, PR3-L2, PR3-L3, PR3-L4
- `covfixls/snap.ts`: probe runner (vite-node)

### cw/

- `cw/cases-added.yaml`: cases added to a scratch repo copy: ZZ-1, ZZ-2, ZZ-3, ZZ-4, CWZ-5, CWZ-6, CWZ-7, CWZ-8, CWZ-9, CWZ-10, CWZ-11, CWZ-12, CWZ-13, CWZ-14, CWZ-15, CWZ-16, CWZ-17, CWZ-18

### cw2/

- `cw2/cases-added.yaml`: cases added to a scratch repo copy: ZQ-1, ZQ-2, ZQ-3, ZR-1, ZR-2, ZR-3
- `cw2/show.py`: generator / helper script

### cw2fix/

- `cw2fix/cases_new.yaml`: probe households: CO-190, CO-191
- `cw2fix/mkcases.py`: generator / helper script

### cw2tools/

- `cw2tools/mk.py`: generator / helper script
- `cw2tools/mk2.py`: generator / helper script

### cw3fix/

- `cw3fix/addprobes.py`: generator / helper script
- `cw3fix/cmp.py`: generator / helper script
- `cw3fix/mkcases.py`: generator / helper script
- `cw3fix/probes.yaml`: probe households: ZQ-1, ZQ-2, ZQ-3, ZT-1, ZT-2, ZT-3, ZT-6, ZT-4, ZT-5, ZT-7, ZZ-1, ZZ-2, ZZ-3, ZZ-4, CWZ-6, CWZ-7, CWZ-8, CWZ-9, CWZ-10, CWZ-11, CWZ-18, ZT-1b, ZT-2b, ZT-8

### cw3tools/

- `cw3tools/mk.py`: generator / helper script
- `cw3tools/mk2.py`: generator / helper script

### cwfix/

- `cwfix/mkcases.py`: generator / helper script
- `cwfix/mkexcerpts.py`: generator / helper script
- `cwfix/newcases.yaml`: probe households: CO-160, CO-161, CO-162, CO-163, CO-164
- `cwfix/probe.ts`: probe runner (vite-node)
- `cwfix/probes.yaml`: probe households: CO-86, ZZ-1, ZZ-2, ZZ-3, ZZ-4, CWZ-6, CWZ-7, CWZ-8, CWZ-9, CWZ-10, CWZ-11, CWZ-18
- `cwfix/showcase.py`: generator / helper script

### cwreview/

- `cwreview/mkcase_cw.py`: generator / helper script
- `cwreview/spec1.json`: household specs: ZZ-1, ZZ-2
- `cwreview/spec2.json`: household specs: ZZ-3, ZZ-4
- `cwreview/spec3.json`: household specs: CWZ-5
- `cwreview/spec4.json`: household specs: CWZ-6, CWZ-7
- `cwreview/spec5.json`: household specs: CWZ-8
- `cwreview/spec6.json`: household specs: CWZ-9, CWZ-10, CWZ-11
- `cwreview/spec7.json`: household specs: CWZ-12, CWZ-13, CWZ-14, CWZ-15, CWZ-16
- `cwreview/spec8.json`: household specs: CWZ-17
- `cwreview/spec9.json`: household specs: CWZ-18

### gen/

- `gen/case122.yaml`: probe households: CO-122
- `gen/cases_new.yaml`: probe households: CO-120, CO-121
- `gen/mk.py`: generator / helper script
- `gen/p1.yaml`: probe households: RV-GM
- `gen/run.sh`: shell runner

### lsfix/

- `lsfix/newcases.yaml`: probe households: CO-209, CO-210, CO-211
- `lsfix/probes.yaml`: probe households: RV2-L0, RV2-L1, RV2-S1, RV2-S0, RV2-L2, RV2-L3, RV2-S2
- `lsfix/snap.ts`: probe runner (vite-node)

### nm/

- `nm/finalcases.py`: generator / helper script
- `nm/mkcases.py`: generator / helper script
- `nm/mkx2.py`: generator / helper script
- `nm/show.py`: generator / helper script
- `nm/show.sh`: shell runner
- `nm/x.sh`: shell runner
- `nm/x2.yaml`: probe households: X-BURIAL, X-IRA, X-REFUSE, X-COURT, X-DWB, X-PASS, X-DEEM, X-WAWDHCBS, X-QI, X-FORSALE, X-LUMP
- `nm/xeval.ts`: probe runner (vite-node)

### nmfix/

- `nmfix/dir.yaml`: probe households: DIR1, DIR2
- `nmfix/evalp.ts`: probe runner (vite-node)
- `nmfix/frag.yaml`: probe households: CO-212, CO-213, CO-214
- `nmfix/matrix.py`: generator / helper script
- `nmfix/mkcases.py`: generator / helper script
- `nmfix/new.yaml`: probe households: CO-212, CO-213, CO-214
- `nmfix/snap.ts`: probe runner (vite-node)

### p1fix-cash/

- `p1fix-cash/probe/new-cases.yaml`: probe households: CO-130, CO-131
- `p1fix-cash/probe/p_cw2.yaml`: probe households: S7-nh60-no-reason, S5-oos
- `p1fix-cash/probe/p_cw3.yaml`: probe households: S6-nh60-child-away, S8-nh60-child-away-no-reason
- `p1fix-cash/probe/probe2.ts`: probe runner (vite-node)

### p1med/

- `p1med/cases/co110.yaml`: probe households: CO-110
- `p1med/cases/co111.yaml`: probe households: CO-111
- `p1med/cases/co112.yaml`: probe households: CO-112
- `p1med/cases/co113.yaml`: probe households: CO-113
- `p1med/cases/co114.yaml`: probe households: CO-114
- `p1med/cases/pp.yaml`: probe households: X-PP
- `p1med/tools/cases1.py`: generator / helper script
- `p1med/tools/cases2.py`: generator / helper script
- `p1med/tools/mk.py`: generator / helper script

### probe/

- `probe/andso.json`: household: PROBE-ANDSO
- `probe/oapcouple.json`: household: PROBE-OAPCOUPLE
- `probe/probe.ts`: probe runner (vite-node)

### rv-cash/

- `rv-cash/probe/base120.yaml`: probe households: CO-120
- `rv-cash/probe/base121.yaml`: probe households: CO-121
- `rv-cash/probe/base122.yaml`: probe households: CO-122
- `rv-cash/probe/p_cs.yaml`: probe households: PCS
- `rv-cash/probe/p_cw.yaml`: probe households: S0, S1-strike, S2-jail, S3-cs, S4-nh60, S5-oos, S6-nh60-child-away
- `rv-cash/probe/p_fc.yaml`: probe households: FC2-GA, FC2-arrears, FC3-revmort, FC6-twfc, FC9-otherstate, FC10-disaster
- `rv-cash/probe/p_imm.yaml`: probe households: IMM-trafficking_victim, IMM-ukrainian_humanitarian_parolee, IMM-afghan_humanitarian_parolee, IMM-refugee, IMM-iraqi_afghan_special_immigrant
- `rv-cash/probe/p_life.yaml`: probe households: PA, PB
- `rv-cash/probe/p_ver.yaml`: probe households: PV
- `rv-cash/probe/probe.ts`: probe runner (vite-node)
- `rv-cash/probe/probe2.ts`: probe runner (vite-node)

### rv-cccap/

- `rv-cccap/ev.sh`: shell runner
- `rv-cccap/repo-cases-added.yaml`: cases added to a scratch repo copy: RV-S1, RV-S2, RV-S4, RV-S5, RV-S6, RV-S7, RV-S8
- `rv-cccap/gen/fill.py`: generator / helper script
- `rv-cccap/gen/mk.py`: generator / helper script

### rv-medicaid/

- `rv-medicaid/extra.py`: generator / helper script
- `rv-medicaid/mkx.py`: generator / helper script
- `rv-medicaid/snapx-cases-added.yaml`: cases added to a scratch repo copy: X-RETRO, X-NOSTART
- `rv-medicaid/x-retro.yaml`: probe households: X-RETRO

### rv-snap/

- `rv-snap/zz1.yaml`: probe households: ZZ-1
- `rv-snap/zz2.yaml`: probe households: ZZ-2, ZZ-3, ZZ-3b, ZZ-4, ZZ-5
- `rv-snap/zz3.yaml`: probe households: ZZ-6, ZZ-7, ZZ-8
- `rv-snap/zz9.yaml`: probe households: ZZ-9, ZZ-10

### rv2/

- `rv2/ev.sh`: shell runner
- `rv2/rv.yaml`: probe households: RV-S1, RV-S2, RV-S4, RV-S5, RV-S6, RV-S7, RV-S8

### rv3-medicaid/

- `rv3-medicaid/ev.sh`: shell runner
- `rv3-medicaid/extra.py`: generator / helper script
- `rv3-medicaid/mkx.py`: generator / helper script
- `rv3-medicaid/snap-cases-added.yaml`: cases added to a scratch repo copy: X-CBWD, X-CHPDIS, X-CHPSSI, X-19, X-19U, X-19B, X-TMA

### snapfin-scripts/

- `snapfin-scripts/cases-spec.json`: overrides on CO-115, CO-83: CO-155, CO-156, CO-157, CO-158, CO-159
- `snapfin-scripts/gen_supplied.py`: generator / helper script
- `snapfin-scripts/matrix.py`: generator / helper script
- `snapfin-scripts/mkcases.py`: generator / helper script
- `snapfin-scripts/newcases.yaml`: probe households: CO-155, CO-156, CO-157, CO-158, CO-159
- `snapfin-scripts/scen1.json`: overrides on CO-115: base, CF1 crime victim 500, CF1 WIOA 500, CF1 reverse mortgage 400, CF1 AmeriCorps 300, CF1 PASS 300, CF1 irregular 20, CF1 irregular 20 + 20 earlier in quarter (counted), CF2 rent 1000 costs 600, CF2 control net rent 400 stated, CF3 weekly 250 five paydays, CF3 control 1075, CF9 striker, CF10 child excluded wages 200, CF11 recert child support 300 vs 280
- `snapfin-scripts/scen2.json`: overrides on CO-115: CF1 irregular 20 in Feb only, CF1 irregular 20 in Feb and 20 in Jan (counted), CF9 striker not eligible day before, CF10 base pending count, CF11 recert unchanged 300
- `snapfin-scripts/scen3.json`: overrides on CO-115, CO-83: CF4 CO-83 base, CF4 CO-83 earner p2 pays 300, CF4 CO-83 no-income p1 pays 300, CF5 child born 2009-02-05 earns 400, CF5 child born 2009-02-15 earns 400, CF5 child born 2009-02-05 earns 400, March, CF6 disabled p1, $100 medical verified, no meals, CF6 same, household feeds the attendant, CF7 land 1200 equity, CF8 joint account 3000 + 3000 other owner
- `snapfin-scripts/scen4.json`: overrides on CO-115, CO-83: 155, 156 Feb, 156 Jan, 157, 157 Oct, 158, 159 Feb, 159 Mar

### top-level/

- `top-level/cov2af-probes.yaml`: probe households: PZ-1, PZ-2, PZ-2B, PZ-4, PZ-3, PZ-3H, PZ-5, PR-IMD, PR-PTC, PR-RENT, PZ-5C
- `top-level/cov3af-probes.yaml`: probe households: QZ-1, QZ-1C, QZ-2, QZ-2C, QZ-2K
- `top-level/coverage-nonfinancial-zz-cases.yaml`: probe households: ZZ-A1, ZZ-A2, ZZ-A2b, ZZ-A3, ZZ-A4, ZZ-A4b, ZZ-A5
- `top-level/coverage2-nonfinancial-zz-cases.yaml`: probe households: ZZ-F1, ZZ-F2, ZZ-S1
- `top-level/probe-b.ts`: probe runner (vite-node)
- `top-level/probe.yaml`: probe households: CO-175
- `top-level/probes.yaml`: probe households: Q-A1, Q-A2, Q-B2, Q-C, Q-D2, Q-E, Q-F, Q-G2, Q-H, Q-I, Q-J, Q-K1, Q-K3, Q-L, Q-M2, Q-N1, Z-1, Z-1b, Z-2, Z-2b, Z-3, Z-3b, Z-4, Z-5, Z-5b
- `top-level/rv2l1.yaml`: probe households: RV2-L1
- `top-level/x-cases-nonmagi.yaml`: probe households: X-BURIAL, X-IRA, X-REFUSE, X-COURT, X-DWB, X-PASS, X-DEEM, X-WAWDHCBS, X-QI, X-FORSALE, X-LUMP
- `top-level/zzA1.yaml`: probe households: ZZ-A1

## Inventory (probe-preservation round, 2026-11-23)

158 probe households added as CO-300 to CO-457; 101 already stored (named in a stored case as its probe); 20 lines of skipped probes below. Duplicates by facts (the same household copied into several files) are counted once.

### Added

| Probe | Case | Finding | Known failure |
|---|---|---|---|
| PR-PTC | CO-300 | PR-PTC (Adult Financial coverage F-6) |  |
| PR-RENT2 | CO-301 | PR-RENT (Adult Financial coverage F-11) |  |
| PR-LUMP2 | CO-302 | PR-LUMP (Adult Financial coverage F-12) |  |
| PR-IMD | CO-303 | PR-IMD (Adult Financial coverage F-13) |  |
| PZ-2B | CO-304 | PZ-2B (Adult Financial coverage 2, control for G-2) |  |
| PZ-3H | CO-305 | PZ-3H (Adult Financial coverage 2, control for G-3) |  |
| PZ-4 | CO-306 | PZ-4 (Adult Financial coverage 2 G-4) |  |
| PZ-5 | CO-307 | PZ-5 (Adult Financial coverage 2 G-5) |  |
| PZ-5C | CO-308 | PZ-5C (Adult Financial coverage 2, control for G-5) |  |
| QZ-1 | CO-309 | QZ-1 (Adult Financial coverage 3 H-1) |  |
| QZ-1C | CO-310 | QZ-1C (Adult Financial coverage 3, control for H-1) |  |
| QZ-2 | CO-311 | QZ-2 (Adult Financial coverage 3 H-2) |  |
| QZ-2C | CO-312 | QZ-2C (Adult Financial coverage 3, control for H-2) |  |
| QZ-2K | CO-313 | QZ-2K (Adult Financial coverage 3, control for H-2) |  |
| RV-A1 | CO-314 | RV-A1 (CCCAP coverage F-03) |  |
| RV-A2 | CO-315 | RV-A2 (CCCAP coverage F-03) |  |
| RV-B2 | CO-316 | RV-B (CCCAP coverage F-04) |  |
| RV-C | CO-317 | RV-C (CCCAP coverage F-05) |  |
| RV-D2 | CO-318 | RV-D (CCCAP coverage F-06) |  |
| RV-E | CO-319 | RV-E (CCCAP coverage F-07) |  |
| RV-F | CO-320 | RV-F (CCCAP coverage F-08) |  |
| RV-G2 | CO-321 | RV-G (CCCAP coverage F-09) |  |
| RV-H | CO-322 | RV-H (CCCAP coverage F-11) |  |
| RV-I | CO-323 | RV-I (CCCAP coverage F-12) |  |
| RV-J | CO-324 | RV-J (CCCAP coverage F-14) |  |
| RV-K1 | CO-325 | RV-K1 (CCCAP coverage F-02) |  |
| RV-K2 | CO-326 | RV-K2 (CCCAP coverage F-02) |  |
| RV-K3 | CO-327 | RV-K3 (CCCAP coverage F-02) |  |
| RV-M2 | CO-328 | RV-M (CCCAP coverage F-13) |  |
| RV-N1 | CO-329 | RV-N1 (CCCAP coverage F-15) |  |
| RV-O2 | CO-330 | RV-O2 (CCCAP coverage F-21, control) |  |
| Z-1b | CO-331 | Z-1b (CCCAP coverage 2, control for C2-1) |  |
| Z-2b | CO-332 | Z-2b (CCCAP coverage 2, control for C2-2) |  |
| Z-3b | CO-333 | Z-3 (CCCAP coverage 2 C2-3) |  |
| Z-5 | CO-334 | Z-5 (CCCAP coverage 2 C2-4) |  |
| Z-5b | CO-335 | Z-5b (CCCAP coverage 2, control for C2-4) |  |
| Y-1r | CO-336 | Y-1r (CCCAP coverage 3, control for C3-1) |  |
| Y-1jr | CO-337 | Y-1jr (CCCAP coverage 3 fix, control for C3-1) |  |
| Y-1c | CO-338 | Y-1c (CCCAP coverage 3 C3-1) |  |
| Y-2 | CO-339 | Y-2 (CCCAP coverage 3 C3-3) |  |
| Y-2b | CO-340 | Y-2b (CCCAP coverage 3, control for C3-3) |  |
| Y-3 | CO-341 | Y-3 (CCCAP coverage 3 C3-4) |  |
| Y-4 | CO-342 | Y-4 (CCCAP coverage 3 C3-5) |  |
| Y-5 | CO-343 | Y-5 (CCCAP coverage 3 C3-7) |  |
| Y-6 | CO-344 | Y-6 (CCCAP coverage 3, control for the C2-1 fix) |  |
| Y-7 | CO-345 | Y-7 (CCCAP coverage 3 C3-6) |  |
| Y-7s | CO-346 | Y-7s (CCCAP coverage 3 C3-6) |  |
| Y-8 | CO-347 | Y-8 (CCCAP coverage 3 C3-2) |  |
| Y-8b | CO-348 | Y-8b (CCCAP coverage 3 C3-2) |  |
| Y-9 | CO-349 | Y-9 (CCCAP coverage 3, control for the C2-2 fix) |  |
| Y-9a | CO-350 | Y-9a (CCCAP coverage 3, control for the C2-2 fix) |  |
| ZZ-2 | CO-351 | ZZ-2 (Colorado Works coverage CW-1) |  |
| CWZ-7 | CO-352 | CWZ-7 (Colorado Works coverage CW-6) |  |
| CWZ-9 | CO-353 | CWZ-9 (Colorado Works coverage CW-9) |  |
| CWZ-10 | CO-354 | CWZ-10 (Colorado Works coverage CW-10) |  |
| CWZ-11 | CO-355 | CWZ-11 (Colorado Works coverage CW-8) |  |
| CWZ-12 | CO-356 | CWZ-12 (Colorado Works coverage, spot-check of final cash FC-1) |  |
| CWZ-13 | CO-357 | CWZ-13 (Colorado Works coverage, spot-check of final cash FC-1) |  |
| CWZ-14 | CO-358 | CWZ-14 (Colorado Works coverage, spot-check of final cash FC-2) |  |
| CWZ-15 | CO-359 | CWZ-15 (Colorado Works coverage, spot-check of final2 cash N-3) |  |
| CWZ-16 | CO-360 | CWZ-16 (Colorado Works coverage, spot-check of final cash FC-1) |  |
| ZQ-3 | CO-361 | ZQ-3 (Colorado Works coverage 2, control for CW2-2) |  |
| ZT-2b | CO-362 | ZT-2 (Colorado Works coverage 3 CW3-1) |  |
| ZT-3 | CO-363 | ZT-3 (Colorado Works coverage 3, control for CW3-1) |  |
| ZT-6 | CO-364 | ZT-6 (Colorado Works coverage 3, control for CW3-1) |  |
| ZT-5 | CO-365 | ZT-5 (Colorado Works coverage 3, control for CW3-2) |  |
| ZT-8 | CO-366 | ZT-8 (Colorado Works coverage 3 fix, CW3-2) |  |
| RV-L0 | CO-367 | RV-L0 (LEAP coverage, control for C-1) |  |
| RV-L2 | CO-368 | RV-L2 (LEAP coverage C-2) |  |
| RV2-L0 | CO-369 | RV2-L0 (LEAP coverage 2, control for N-4) |  |
| RV2-L1 | CO-370 | RV2-L1 (LEAP coverage 2 N-4) |  |
| RV2-S0 | CO-371 | RV2-S0 (SUN Bucks coverage 2, control for N-3) |  |
| RV2-S2 | CO-372 | RV2-S2 (SUN Bucks coverage 2 N-3) |  |
| PR3-L2 | CO-373 | PR3-L2 (LEAP coverage 3 F3-2) |  |
| PR3-L4 | CO-374 | PR3-L4 (LEAP coverage 3 F3-2) |  |
| RV-65 | CO-375 | RV-65 (MAGI coverage F-06) |  |
| RV-INM | CO-376 | RV-INM (MAGI coverage F-07) |  |
| RV-CHPB | CO-377 | RV-CHPB (MAGI coverage F-09) |  |
| RV-C5 | CO-378 | RV-C5 (MAGI coverage fix, F-05) |  |
| RV2-MECY | CO-379 | RV2-MECY (MAGI coverage 2, control for N-01) |  |
| RV2-RCB | CO-380 | RV2-RCB (MAGI coverage 2, control for N-04) |  |
| RV2-ELE | CO-381 | RV2-ELE (MAGI / CHP+ coverage 2 N-05) |  |
| RV3-FPA | CO-382 | RV3-FPA (MAGI coverage 3 C3-02) |  |
| RV3-FPM | CO-383 | RV3-FPM (MAGI coverage 3, control for C3-02) |  |
| RV3-FPRCB | CO-384 | RV3-FPRCB (MAGI coverage 3, control for C3-03) |  |
| RV3-STEPN | CO-385 | RV3-STEPN (MAGI coverage 3, control for C3-04) |  |
| RV3-NB1 | CO-386 | RV3-NB1 (MAGI coverage 3 C3-07) |  |
| RV3-CPB | CO-387 | RV3-CPB (MAGI / CHP+ coverage 3 C3-08) | MAGI/CHP+ coverage 3 C3-08 (OQ-810, open state policy choice) |
| X-REFUSE | CO-388 | X-REFUSE (non-MAGI coverage NM-14) |  |
| X-DWB | CO-389 | X-DWB (non-MAGI coverage NM-9) |  |
| X-PASS | CO-390 | X-PASS (non-MAGI coverage NM-7) |  |
| X-QI | CO-391 | X-QI (non-MAGI coverage NM-11) |  |
| X-LUMP | CO-392 | X-LUMP (non-MAGI coverage NM-6) |  |
| Y-CBWD19 | CO-393 | Y-CBWD19 (non-MAGI coverage 2 N2-3) |  |
| Y-CBWD18 | CO-394 | Y-CBWD18 (non-MAGI coverage 2, control for N2-3) |  |
| Z-ADM | CO-395 | Z-ADM (non-MAGI coverage 3 C3-1) | non-MAGI coverage 3 C3-1 |
| Z-NONCOOP | CO-396 | Z-NONCOOP (non-MAGI coverage 3 C3-2) | non-MAGI coverage 3 C3-2 |
| Z-ONSET | CO-397 | Z-ONSET (non-MAGI coverage 3 C3-2) | non-MAGI coverage 3 C3-2 |
| Z-DACIRWE | CO-398 | Z-DACIRWE (non-MAGI coverage 3 C3-3) | non-MAGI coverage 3 C3-3 |
| Z-DACSTU | CO-399 | Z-DACSTU (non-MAGI coverage 3 C3-3) | non-MAGI coverage 3 C3-3 |
| Z-ADOPT2 | CO-400 | Z-ADOPT2 (non-MAGI coverage 3 C3-4) | non-MAGI coverage 3 C3-4 |
| Z-ADOPT | CO-401 | Z-ADOPT (non-MAGI coverage 3 C3-4) | non-MAGI coverage 3 C3-4 |
| Z-BDEED | CO-402 | Z-BDEED (non-MAGI coverage 3 C3-5) | non-MAGI coverage 3 C3-5 |
| Z-BDEED40 | CO-403 | Z-BDEED40 (non-MAGI coverage 3 C3-5) | non-MAGI coverage 3 C3-5 |
| Z-WAWDSTU | CO-404 | Z-WAWDSTU (non-MAGI coverage 3 C3-6) | non-MAGI coverage 3 C3-6 (P2) |
| ZZ-F2 | CO-405 | ZZ-F2 (SNAP non-financial coverage 2 N2-1) |  |
| ZZ-D4 | CO-406 | ZZ-D4 (SNAP non-financial coverage 3, control for N3-2) |  |
| ZZ-D1 | CO-407 | ZZ-D1 (SNAP non-financial coverage 3 N3-2) |  |
| CF1 WIOA 500 | CO-408 | CF-1 (SNAP financial coverage) |  |
| CF1 reverse mortgage 400 | CO-409 | CF-1 (SNAP financial coverage) |  |
| CF1 PASS 300 | CO-410 | CF-1 (SNAP financial coverage) |  |
| CF1 irregular 20 in Feb only | CO-411 | CF-1 (SNAP financial coverage) |  |
| CF1 irregular 20 in Feb and 20 in Jan (counted) | CO-412 | CF-1 (SNAP financial coverage) |  |
| CF2 control net rent 400 stated | CO-413 | CF-2 control (SNAP financial coverage) |  |
| CF3 control 1075 | CO-414 | CF-3 control (SNAP financial coverage) |  |
| CF4 CO-83 earner p2 pays 300 | CO-415 | CF-4 (SNAP financial coverage) |  |
| CF5 child born 2009-02-15 earns 400 | CO-416 | CF-5 (SNAP financial coverage) |  |
| CF6 same, household feeds the attendant | CO-417 | CF-6 (SNAP financial coverage) |  |
| CF7 land 1200 equity | CO-418 | CF-7 (SNAP financial coverage) |  |
| CF8 joint account 3000 + 3000 other owner | CO-419 | CF-8 (SNAP financial coverage) |  |
| CF10 child excluded wages 200 | CO-420 | CF-10 (SNAP financial coverage) |  |
| CF11 recert child support 300 vs 280 | CO-421 | CF-11 (SNAP financial coverage) |  |
| C22-able | CO-422 | C2-2 (SNAP financial coverage 2) |  |
| C31-vista | CO-423 | C3-1 (SNAP financial coverage 3 fix) |  |
| C32-recert-ctrl | CO-424 | C3-2 control (SNAP financial coverage 3) |  |
| C37-boarder-q | CO-425 | C3-7 (SNAP financial coverage 3) |  |
| C2-3 (GED child) | CO-426 | C2-3 (SNAP financial coverage 2) |  |
| S4-nh60 | CO-427 | S4-nh60 (final cash 2, FC-1) |  |
| S5-oos | CO-428 | S5-oos (final cash 2 P2-7) |  |
| S6-nh60-child-away | CO-429 | S6 (final cash 2 P2-6) |  |
| S7-nh60-no-reason | CO-430 | S7 (final cash 2 fix, P2-6 control) |  |
| S8-nh60-child-away-no-reason | CO-431 | S8 (final cash 2 fix, P2-6) |  |
| FC2-arrears | CO-432 | FC2-arrears (final cash 2, FC-2) |  |
| FC3-revmort | CO-433 | FC3-revmort (final cash 2, FC-3) |  |
| FC6-twfc | CO-434 | FC6-twfc (final cash 2, FC-6) |  |
| FC9-otherstate | CO-435 | FC9-otherstate (final cash 2, FC-9) |  |
| FC10-disaster | CO-436 | FC10-disaster (final cash 2, FC-10) |  |
| PB | CO-437 | PB (final cash 2, control for N-1) |  |
| IMM-refugee | CO-438 | IMM-refugee (final cash 2 N-3) |  |
| IMM-iraqi_afghan_special_immigrant | CO-439 | IMM-iraqi_afghan_special_immigrant (final cash 2 N-3) |  |
| IMM-afghan_humanitarian_parolee | CO-440 | IMM-afghan_humanitarian_parolee (final cash 2 N-3) |  |
| IMM-ukrainian_humanitarian_parolee | CO-441 | IMM-ukrainian_humanitarian_parolee (final cash 2 N-3) |  |
| IMM-trafficking_victim | CO-442 | IMM-trafficking_victim (final cash 2 N-3) |  |
| ZZ-2 (final2-snap) | CO-443 | ZZ-2 (final SNAP 2, F-1) |  |
| ZZ-3 (final2-snap) | CO-444 | ZZ-3 (final SNAP 2, F-4) |  |
| ZZ-3b (final2-snap) | CO-445 | ZZ-3b (final SNAP 2, control for F-4) |  |
| ZZ-4 (final2-snap) | CO-446 | ZZ-4 (final SNAP 2, F-6) |  |
| ZZ-5 (final2-snap) | CO-447 | ZZ-5 (final SNAP 2, F-8) |  |
| ZZ-6 (final2-snap) | CO-448 | ZZ-6 (final SNAP 2, F-3) |  |
| ZZ-7 (final2-snap) | CO-449 | ZZ-7 (final SNAP 2, control for F-3) |  |
| ZZ-8 (final2-snap) | CO-450 | ZZ-8 (final SNAP 2, F-7) |  |
| ZZ-9 (final2-snap) | CO-451 | ZZ-9 (final SNAP 2, control for N-7) |  |
| X-CHPDIS | CO-452 | X-CHPDIS (final Medicaid / CHP+ 3, F3-2) |  |
| X-19B | CO-453 | X-19B (final Medicaid / CHP+ 3, control for F3-3) |  |
| RV-S5 | CO-454 | RV-S5 (final CCCAP 2, F-04) |  |
| RV-S7 | CO-455 | RV-S7 (final CCCAP 2, F-02) |  |
| RV-S8 | CO-456 | RV-S8 (final CCCAP 2 N-3) |  |
| N3P22-age60-quit | CO-457 | N3-P2-2 (SNAP non-financial coverage 3 fix) |  |

### Already stored before this round

| Probe | Case |
|---|---|
| PR-ABS | CO-165 |
| PR-ISM | CO-166 |
| PR-APART | CO-167 |
| PR-PNA | CO-168 |
| PR-SPON | CO-169 |
| PZ-1 | CO-196 |
| PZ-2 | CO-197 |
| PZ-3 | CO-198 |
| PROBE-OAPCOUPLE (final cash FC-4) | CO-120 |
| PROBE-ANDSO (final cash FC-5) | CO-121 |
| S0 (final verification V-2 / FC-12 base) | CO-122 |
| PA (final cash 2 N-1) | CO-130 |
| PV (final cash 2 N-2) | CO-130 |
| PCS (final cash 2 N-4) | CO-131 |
| RV-O | CO-170 |
| RV-L (CCCAP) | CO-173 |
| RV-N2 | CO-174 |
| Z-1 | CO-199 |
| Z-2 | CO-200 |
| Z-4 | CO-201 |
| Y-1 | CO-215 |
| Y-1j (Y-1 with CO-4910) | CO-215 |
| Y-8c | CO-216 |
| RV-S1 (final CCCAP 2) | CO-134 |
| RV-S2 | CO-136 |
| RV-S4 | CO-135 |
| RV-S6 | CO-133 |
| ZZ-1 (Colorado Works) | CO-160 |
| ZZ-3 (Colorado Works) | CO-161 |
| ZZ-4 (Colorado Works) | CO-162 |
| CWZ-8 | CO-163 |
| CWZ-18 | CO-164 |
| ZQ-1 | CO-190 |
| ZQ-2 | CO-191 |
| ZT-1 | CO-206 |
| ZT-1b (ZT-1 with CO-4830) | CO-206 |
| ZT-4 | CO-207 |
| ZT-7 | CO-208 |
| RV-L1 | CO-175 |
| RV-L3 | CO-176 |
| RV-L4 | CO-177 |
| RV-S1 (SUN Bucks coverage) | CO-178 |
| RV2-L2 | CO-209 |
| RV2-L3 | CO-210 |
| RV2-S1 | CO-211 |
| PR3-L1 | CO-224 |
| PR3-L3 | CO-225 |
| RV-GM | CO-180 |
| RV-SPA | CO-181 |
| RV-SE | CO-182 |
| RV-SE2 (RV-SE with the annual facts) | CO-182 |
| RV-SP | CO-183 |
| RV-PP | CO-184 |
| RV2-MEC | CO-202 |
| RV2-NB | CO-203 |
| RV2-DSP | CO-204 |
| RV2-RC | CO-205 |
| RV3-FPH | CO-226 |
| RV3-FPRC | CO-227 |
| RV3-STEP | CO-228 |
| X-BURIAL | CO-185 |
| X-FORSALE | CO-185 |
| X-DEEM | CO-186 |
| X-WAWDHCBS | CO-187 |
| X-COURT | CO-188 |
| X-IRA | CO-189 |
| Y-VAAA | CO-212 |
| Y-FAMALLOW | CO-213 |
| Y-DEPREL | CO-214 |
| X-PP | CO-110 |
| X-HPE | CO-111 |
| X-RETRO | CO-137 |
| X-NOSTART | CO-138 |
| X-CBWD | CO-145 |
| X-CHPSSI | CO-146 |
| X-19 | CO-147 |
| X-TMA | CO-148 |
| ZZ-A1 | CO-150 |
| ZZ-A5 | CO-151 |
| ZZ-A2b | CO-152 |
| ZZ-A3 | CO-153 |
| ZZ-A4b | CO-154 |
| ZZ-F1 | CO-192 |
| ZZ-S1 | CO-193 |
| ZZ-M1 | CO-217 |
| ZZ-D3 | CO-218 |
| CF-1/CF-2 (crime victim, AmeriCorps and rent; also CF1-cvc, CF2-rent re-runs) | CO-155 |
| CF-3 weekly pay (also C21 re-run of C2-1 is CO-194) | CO-156 |
| CF-4 (no-income stepparent pays) | CO-157 |
| CF-9 striker (both scen variants) | CO-158 |
| CF-5 born 2009-02-05 (Feb and Mar) | CO-159 |
| C2-1 ($20 odd job; C21-weekly) | CO-194 |
| C2-4 recertification | CO-195 |
| C3-1 (C31-allowance, -zz) | CO-219 |
| C3-2 (C32-recert-allow) | CO-220 |
| C3-3 (C33-othercharges) | CO-221 |
| C3-4 (C34-weekly-ui, -conv) | CO-222 |
| C3-5 (C35-liquid, -held) | CO-223 |
| ZZ-1 (final SNAP 2) | CO-141 |
| ZZ-10 (final SNAP 2) | CO-142 |
| CO-175 draft (top-level/probe.yaml) | CO-175 |

### Skipped

| Probe | Why |
|---|---|
| PR-RENT | superseded by the fix round's restatement PR-RENT2 (CO-301): no fact for the rental expenses existed when it was written |
| PR-LUMP | reading rejected: the Adult Financial fix round (F-12) showed the inheritance was stated only in lump_sum_received, which is part of the unearned income facts; the restated PR-LUMP2 is CO-302 |
| X-LUMP (reviewer original) | reading rejected: non-MAGI fix round NM-6 "Not P1 as stated", same reason; the restated form is CO-392 |
| Z-3 | reading rejected: the CCCAP pass-2 fix round (C2-3) defined receives_tanf_cash (CO-013) as true only for a member of the assistance unit, so the probe's statement (true on the payee grandmother) is not a valid household; Z-3b, stated under that meaning, is CO-333 |
| ZZ-M2 | states institution_entry_date for a student in a private dwelling, against CO-008's meaning (the reviewer says so); ZZ-M1 is CO-217 |
| RV-B, RV-D, RV-G, RV-M | superseded by the CCCAP fix round's restatements RV-B2, RV-D2, RV-G2, RV-M2 (CO-316, CO-318, CO-321, CO-328), which state the facts the fix added |
| ZT-2 | superseded by ZT-2b (CO-362), the same room-only payment stated in room_only_payments_received (CO-4830) |
| Y-3b | translated (retired CO-4454 into CO-4506) it is Y-3 (CO-341) |
| Q-A1 .. Q-N1 (16) | the CCCAP pass-2 reviewer's re-runs of the pass-1 households RV-* on its own generator (review section 5: "Holds"); one household per scenario is kept (CO-314 to CO-330) |
| ZR-1, ZR-2, ZR-3 | re-runs of ZZ-2, CWZ-9, CWZ-10 on CO-160 (Colorado Works pass 2, "Fixed"); kept as CO-351, CO-353, CO-354 |
| RV2-65, RV2-CHPB, RV3-R2NB, RV3-R265, RV3-R2CHPB, RV3-R2ELE | re-runs of RV-65, RV-CHPB, RV2-NB, RV2-ELE on the later generators ("the same"); kept as CO-375, CO-377, CO-203, CO-381 |
| S1-strike, S2-jail, S3-cs, FC2-GA (final cash 2) | re-run by the Colorado Works coverage reviewer as CWZ-12, CWZ-16, CWZ-13, CWZ-14 (CO-356, CO-360, CO-357, CO-358) |
| CWZ-5, CWZ-6, CWZ-17 | the Colorado Works reviewer's drafts, superseded by the cited ZZ-4, CWZ-8 and CWZ-18 (stored) and not cited by the review: no stated answer |
| ZZ-A2, ZZ-A4 | the SNAP non-financial reviewer's drafts, superseded by the cited ZZ-A2b and ZZ-A4b (CO-152, CO-154) |
| ZZ-D0, ZZ-D2 | N3-2 isolation variants with no stated answer in the review (the fix round says only "unchanged") |
| X-19U | an undocumented variant of X-19 (CO-147) not cited in the review: no stated answer |
| CF6 control ($100 medical, no meals), CF11 recert unchanged 300, N3P22-age40-quit, scen1 irregular $20 in every month | controls with no stated answer (N3P22-age40 also gives false on today's CO-115, so it isolates nothing); the scen1 irregular variants are the same household twice and give CO-412's answer |
| DIR1, DIR2 | the non-MAGI pass-2 fixer's relationship-direction checks of CO-889, not reviewer households; no stated answer |
| Fixer drafts of stored cases (gen/case122.yaml, gen/cases_new.yaml, p1med/cases/*, */newcases.yaml, cf3/cases-spec.json, snapfin-scripts/cases-spec.json, cccapfix/cases_new.json, CO-* entries in probe files) | drafts of cases already in cases.yaml, not probes |
| Adult Financial coverage 3 H-3, H-4, H-5 | no probe household exists (the review shows them from the derivations); nothing to keep |
