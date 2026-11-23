#!/bin/bash
# usage: ev.sh CASE idents...   (copies the worktree's volume and engine into a scratch repo with the RV probe cases appended)
S=/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/rv2
W=/home/user/policy-codex/.claude/worktrees/agent-af6ac8feae940d487
mkdir -p $S/repo
for d in volumes src scripts; do rm -rf $S/repo/$d; cp -r $W/$d $S/repo/$d; done
for f in package.json tsconfig.json codex.json vite.config.ts; do cp $W/$f $S/repo/$f; done
[ -e $S/repo/node_modules ] || ln -s /home/user/policy-codex/node_modules $S/repo/node_modules
cat $S/rv.yaml >> $S/repo/volumes/co/tests/cases.yaml
cd $S/repo && timeout 300 npx vite-node scripts/eval-case.ts co "$@" 2>&1 | sed -E 's/   missing:.*//'
