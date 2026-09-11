# scripts

- `test/fixtures/*.json` were generated once from the retired browser engine (`author/codex.js`) at commit 4682996. To regenerate, check out that commit's `scripts/gen-fixtures.mjs`, `author/` and `site/author/data.json` and run it; the ported engine must reproduce every file.
- `migrate-ledger.mjs` — the one-time split of the chapter files into `volumes/mwr/**`. Kept for the record; it is not needed again.
- `handoff.ts` — writes `handoff.md` from the checked-in ledger. Run `npm run handoff`.
- `codex_tool.py` — the original Python reference checker. Not used at runtime. `python3 scripts/codex_tool.py --help` (needs PyYAML) if you ever want a second opinion on the ledger.
