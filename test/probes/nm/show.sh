#!/bin/bash
# usage: show.sh ident... ; prints yaml minus tests/rationale
cd /tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/nm/volumes/co
for x in "$@"; do
  f=$(grep -l -E "^identifier: $x\$|^id: $x\$" */*.yaml | head -1)
  echo "=== $f"
  awk '/^tests:/{exit} /^rationale:/{skip=1;next} /^[a-z_]+:/{skip=0} !skip' "$f" | cut -c1-2500
done
