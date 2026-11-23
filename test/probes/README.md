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
