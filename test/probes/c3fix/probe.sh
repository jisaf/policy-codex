#!/bin/bash
# usage: probe.sh <tag>  -- runs all.yaml and extra.yaml probes into r-<tag>-*.txt
S=/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/c3fix
W=/home/user/policy-codex/.claude/worktrees/agent-a4851410316c48764
cd $W
node scripts/sync-manifest.mjs co >/dev/null
python3 -I $S/mkextra.py $S
for f in all extra; do
  npx vite-node $S/run-probes.ts $S/$f.yaml cccap_eligibility_status,cccap_household_income,cccap_household_size,cccap_parent_fee,cccap_verification_status > $S/r-$1-$f.txt 2>&1
done
