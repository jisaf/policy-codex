# Help

Short notes for the app's "?" panel, one section per view. Headings are keyed
by the view they answer for; the panel shows only the section that matches
where the reader currently is.

## start

Pick the door that fits what brought you here today; you can change it any
time from "change how you use this" in the header. The doors: check how a
household is decided, read the rules for a program, change a rule or fact,
or implement the rules.

## programs

Programs is the home view: it shows what each program decides, in plain
language, with the parameters currently in force, the household cases that
test it, and the open questions still outstanding.

## cases

Cases lists real households, evaluated end to end against every declared
program. Open one to see its facts and its expectations; any expectation
opens the trace behind its value. "New household" builds one from scratch,
including a "Try an example" fill from a household already in the ledger.

## search

Search finds items, sources, and open questions by name, identifier, or
excerpt text, from the box in the header. Press Enter to open the first
result, or browse every match grouped by kind on this page.

## item

Every item's page leads with one plain sentence and one worked example
before the technical detail: its type and scope, its tests, what it uses and
what uses it, and the Approach A projection. The "Decision record" section
is the path back to source: rationale, cited excerpts, open questions, and
the file's change history.

## table

Table is the complete ledger, one row per item: filter by kind, program,
scope, or open question, sort any column, and follow a row to its own page.

## graph

The graph draws the ledger's dependency structure. Focus on one item to see
its upstream and downstream cone, or choose "Whole ledger" to see everything
at once.

## sources

Sources are the verbatim excerpts of the governing text an item cites,
nothing interpreted. Each excerpt names the document it came from and every
item that cites it.

## documents

Documents are the governing texts themselves: statute, regulation, and
guidance in full, with the excerpts Sources draws from them linked back to
where they sit in the text.

## handoff

The handoff view is the engineer's door: it renders the handoff document in
the app, offers the same file and the conformance suite as downloads, and
lists every rule with its implementation locator and a link back to its
decision record.

## editing

Turning on edit mode adds New item, a Tray of staged changes, Rename, and
Settings. A new item starts with a search of the ledger (the fact you need
may already be here under another name), then asks what kind it is — a fact
we are told, a rule, or a number set by policy — before showing only that
kind's fields. Saving to the tray never fails; Propose checks governance
before it opens a pull request.
