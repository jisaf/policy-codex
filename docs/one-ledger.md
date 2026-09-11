# Approach B+: One Ledger, Machine-Checkable

Every fact, derived fact, and parameter in one ledger with one canonical form. Views are rendered, never hand-edited.

- `volumes/mwr/volume.yaml`: title, approval policy, types, scopes.
- `volumes/mwr/{supplied,parameters,medicaid,snap}/WR-nnn.yaml`: the ledger, one item per file, listed by chapter in `codex.json`. Each item's derivation is a nested list over the pattern catalog; each derived item carries its rule-level tests.
- The app renders the approver's view (pattern English) and the engineer's view (`handoff.md`, also written by `npm run handoff`).
- `volumes/mwr/tests/rule-tests.yaml`: every rule-level test, exported by the spike. `volumes/mwr/tests/cases.yaml`: 13 household-level cases. Data; the app does not run them yet.
- `scripts/codex_tool.py`: the original Python reference checker. Spike tooling, kept as a second opinion; it reads the retired chapter-file layout, so run it against a checkout of commit 4682996.

```
python3 scripts/codex_tool.py check                 # validate the ledger and run all tests
python3 scripts/codex_tool.py impact <identifier>   # everything downstream of one item
```

Current result: 138 items, 133 rule tests passing, 60 case expectations passing, no unresolved references, no cycles.

## Expression conventions

A derivation is a list whose first element is the operator. Bare strings are fact or parameter identifiers; strings that are not identifiers are enumeration literals; `YYYY-MM-DD` and `YYYY-MM` strings are dates and months. `[P]` is the person bound by `exists`, `exists_related`, or `of`. `[month]` is the month bound by `at`, `each`, `some_month`, `count_months`, or `avg`. `[det_date]` and `[det_month]` are the Determination Date and its month.

Unknown propagates. `all` is false if any input is false, else unknown if any is unknown. `any` is true if any input is true, else unknown if any is unknown. Comparisons and arithmetic with an unknown input are unknown. `otherwise` supplies an explicit default. `case` is unknown as soon as a condition is unknown.

## Test conventions

In a rule-level test, `given` may set supplied facts or stub derived facts. A scalar for a per-month fact in a test without a `month` applies to every month. `others` adds other persons; `relationships` is this person's relationships; `parameters` overrides State elections. `expect: unknown` asserts that the value cannot be determined.
