#!/bin/bash
# usage: run.sh <out-name> [grep-regex]   (env ONLY=..., MISS=1)
D=/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/cf3
cd /home/user/policy-codex/.claude/worktrees/agent-ae199798264caf09d
npx vite-node $D/snap.ts $D/$1.txt
if [ -n "$2" ]; then grep -E "$2" $D/$1.txt; fi
