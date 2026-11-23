#!/bin/bash
# usage: ev.sh CASE idents...
cd /tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/rv-cccap/repo
timeout 300 npx vite-node scripts/eval-case.ts co "$@" 2>&1 | sed -E 's/   missing:.*//'
