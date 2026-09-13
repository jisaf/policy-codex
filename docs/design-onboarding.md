# Policy Codex, phase 3: onboarding and comprehension

Date: 2026-09-13. Status: approved in conversation; binding for phase 3.

## Goal

A first-time visitor understands what the codex is and gets to the one thing
they came for within a minute, without losing anything an expert uses today.

## Doors

A landing screen (`#/mwr/start`, shown on first visit and reachable from the
brand link) offers four doors. Each sets a mode and a starting view:

- Check how a household is decided (program administrator): Cases, with an
  example household one click away.
- Read the rules for a program (anyone): Programs.
- Change a rule or fact (subject-matter expert): edit mode on, Programs.
- Implement the rules (engineer): the Handoff view, then item decision records
  back to statute.

## Reader mode

The app opens in reader mode: New item, Tray, Rename, Settings, and the editor
are hidden. A single control turns edit mode on; the choice persists in the
browser. Every reader view and URL behaves exactly as before.

## Navigation

Primary: Programs, Cases, Search (plus Handoff in the engineer door). Browse:
Table, Graph, Sources, Documents. Programs is the home view. The Graph keeps
a "Whole ledger" option: the view opens on a cone when an item is in focus
and on the whole graph when asked; the whole-graph view is never removed.

## Names first

Lists and headers show the item's name first, with id and identifier in small
type. Kinds and scopes carry plain-language labels with the technical term as
an alias: supplied "a fact we are told", derived "a rule", parameter "a number
set by policy"; person-month "per person, per month", and so on. The same
words are used in the docs.

## Narrative traces

The evaluator marks which children decided a value: the first false input of
`all`, the first true input of `any`, the arm a `case` took and its
condition, the side an `otherwise` used, both operands of a comparison. The
trace view leads with a story built from the decisive path ("Not exempt,
because: not pregnant; no dependent child; age 30 is inside 19 to 64") and
keeps the full tree behind "show everything".

## Explain-first item page and the decision record

The item page leads with one sentence from the derivation and one worked
example from its tests; type, scope, program, tests, dependencies, and the
Approach A projection sit in collapsible sections. A "Decision record"
section is the engineer's path back to source: rationale, sources with their
documents and excerpts, open questions with the assumption taken, the
implementation locator, and the file's change history (commits and pull
requests, fetched anonymously from GitHub when reachable, omitted when not).

## Handoff view

`#/mwr/handoff` renders the engineer handoff in the app, offers downloads of
`handoff.md` and the conformance suite, and lists every rule with its
implementation locator and a link to its decision record.

## Guided first run, hints, help

A five-step tour on first visit walks one real example (a program, a case, an
outcome, its story). The new-household form has "Try an example" that fills
a case's facts, and when an outcome is unknown it names the unanswered facts
in its trace and focuses their inputs. A "?" on each view opens the matching
section of the docs in a side panel.

## Editor wizard

New items start with search (unchanged), then "What are you adding?": a fact
we are told, a rule, a number set by policy. The form shows only that kind's
fields; the derivation builder appears for rules. Text and AI surfaces move
under "Advanced". Existing items open as before.

## Non-goals

No change to the engine's results, the ledger format, governance rules, or
the conformance contract. No new dependencies.
