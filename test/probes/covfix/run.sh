#!/bin/bash
cd /home/user/policy-codex/.claude/worktrees/agent-a7af13f9abe4b2830 && PROBES=/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/covfix/probes.yaml npx vite-node /tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/covfix/probe.ts co "$@" 2>&1 | sed -E 's/   missing: .*//'
