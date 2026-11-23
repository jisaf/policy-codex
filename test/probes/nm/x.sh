#!/bin/bash
# x.sh <case> idents [month]
W=/home/user/policy-codex/.claude/worktrees/agent-a0a7c9a6a0ee8e589
S=/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad
cd $W && ROOT=$W npx vite-node $S/nm/xeval.ts ${XF:-$S/x-cases-nonmagi.yaml} "$@" 2>&1 | grep -v "^$"
