#!/bin/bash
# regenerate scratch cases from all gen/p*.py and evaluate: run.sh CASE idents [month]
S=/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad
cp $S/gen/cases.orig.yaml $S/covmagi/volumes/co/tests/cases.yaml
for f in $S/gen/p*.py; do python3 $f $S/gen >> $S/covmagi/volumes/co/tests/cases.yaml; done
cd $S/covmagi && npx vite-node scripts/eval-case.ts co "$@" 2>&1 | sed -E 's/   missing: .*//'
