# Unified UI spec (proposal, awaiting product-owner approval)

Status: approved by the product owner on 2026-11-22 (all four decisions, with one change: the graph stays for policy staff, rebuilt as the Map; see below). Sources: docs/reviews/compare-eval-1.md (Dana, Priya) and compare-eval-2.md (Marcus, Rosa), the phase 13 retests, and the two blind prototypes (prototypes/blind-a, prototypes/blind-b).

## Why
Two independent evaluators, four personas, twenty tasks. Both ranked the information architecture Blind B > Blind A > App, and usability B or A ahead of the App. The App won only on completeness. Its problems are structural, not cosmetic:
- **One object, several homes.** A household lives in Cases, Walkthrough and "By outcome › Household view". Departures sit under Questions and on the role page. Change impact appears only in the approver's inbox.
- **Too many places.** About 12 top-level places in three navigation rows. The role page is a long container whose cards don't scroll to their sections.
- **Counts disagree,** inside the App and across UIs (Medicaid-owned questions: 24 or 49 in the App, 37 in A, 39 in B; households reading CO-276: 6 or 4).

The fix is a single information architecture with one canonical page per object, built **inside the existing app** (engine, helpers, personas, change tray, local and bundled ledger sources, tests). The prototypes are pattern sources, not codebases to adopt.

## Principles
1. **Seven places, one sidebar.** Every task starts from one of them. The role picker appears once, in the sidebar.
2. **One canonical page per object.** Every other mention is a link to it, never a second rendering.
3. **One definition per number.** Every count shown anywhere ("owns", "reaches", "households that read", "unverified upstream", due dates) comes from one module (`src/ui/counts.ts`, extended), with a unit test pinning its definition against the co volume.
4. **Plain words first.** Identifiers are small and secondary. Rule text is visible on the page, never under a "Decision record" or "Precision" fold.
5. **Policy definition only.** No intake and no live calculation for arbitrary households. Stored households, what-if on a stored household, and before/after on a proposed change stay in scope.
6. **Implementer tools stay out of the way.** Table, projection, conformance, handoff and the whole-ledger graph move to a secondary "For implementers" menu. The focused Map (below) stays in the policy staff's view.

## Top-level places

| Place | What it is for | Replaces in the App | Main pattern source |
|---|---|---|---|
| **Desk** | My role's work: items to sign, questions I own, my proposal, what takes effect soon in my programs, statute-over-rule and unverified tiles. Each card links to the canonical list, filtered. | Start doors, By role, Inbox as a place | A (tiles), App (approval card content) |
| **Programs** | What each program decides, then its outcome rules, then "explain step by step" at a chosen depth, with print for a training. | Program view, By outcome | B |
| **Figures** | Every dated figure with an "in force on [date]" picker and filters (new version soon, source not verified, no value on this date). Word-match filter, not phrase. | Table view for figures | B |
| **Households** | Stored households, one page each with tabs. | Cases, Walkthrough, By-outcome household view | B (tabs, grid), A (names, "Why, in short"), App (budget, documents) |
| **Questions** | The decision queue, sortable, "only mine". | Questions view, departures under Questions | App (cards), A (sort) |
| **Law** | Statute over Colorado rule (with reasoning and "agency notified"), unverified and missing figures and what depends on them, sources and documents. | Departures, Sources, Documents, provenance icons | B (place), App (departure fields), A ("no version loaded") |
| **Changes** | "What took effect" by month, past and future, with compare; "My proposal"; "Edits to the codex" (repository history, kept separate). | Tray (as a page), change sections of the role page | B (month view), A (editor), App (no-GitHub path) |

**Search** is a results page grouped by type (A), never a jump to the first hit.

## Canonical pages

### Item: `/item/CO-n` (rule, figure or fact)
Top to bottom:
1. Meaning.
2. How it is decided, in the App's plain-English renderer, with definition popovers (no raw identifiers in the sentence).
3. The law, word for word: excerpts visible, each with "read it in the full document" (B).
4. For figures: figures over time, a dated bar with "today" (A), each version beside its excerpt with the number highlighted (A), and the gap message "From [date] no figure; a household then gets 'cannot determine'" (B). Legislative history (for example the grant-standard freeze) shows here, not under Precision. The 2026 dollar table for poverty-level figures stays (App).
5. Values in stored households (A).
6. What it affects: the downstream rules and outcomes, and "Compare stored households" (A).
7. Questions it rests on.
8. A right rail: sign-off panel (figure today, what changed, what it affects, sources, why you sign, name required; App content in B's layout), "Propose a change", "Ask a question".

### Household: `/households/CO-n`, with tabs
- **Results and aid codes:** persons as columns (B) with named descriptors ("p1 Grandmother, 79", A). Fits at 1280px.
- **Documents still needed:** per document, per program, with the due date and a "before today" flag (App), as a tab, not a fold.
- **What if:** "+$100 … +$1000" chips (B) and "Find the tipping point" with its step-change table (A).
- **What the case states:** the supplied facts, with relationships in readable sentences (fix: "Person 4 is the gave birth to of Person 5").

### Determination: `/households/CO-n/p/outcome`
1. A client-language sentence ("Your household's countable income, $410, is above the $331 limit for a family of two"). None of the three UIs has this yet.
2. "Why, in short" (A).
3. "The budget" for any money result (App), citing the rule text on each line.
4. Step by step with "This is why" (App), federal-over-state banners (B), as-of date.
5. Print for a training (B, with depth) and Print for an appeal file (App).

### Question: `/questions/OQ-n`
The App's card: reading in force meanwhile, rule text it turns on, items carrying it, households that change if answered the other way. Two actions: "Answer it" (App's decision types plus citation) and "Record a legal opinion" (B: conclusion, authority, effect), both with "agency notified". The owner shown always agrees with the active filter.

### Map (what stems from what)
The product owner wants the graph kept as a quick way to grasp complexity and follow what stems from what; the current view is not helpful (evaluators: 54 boxes too small to read, program filter hard-coded to the old volume, a focus that showed the wrong program). The Map replaces it for policy staff:
- **Centered on one thing:** an item, an outcome or a program. A "Map" tab on the item page and the program page; "Open in the Map" from a household determination.
- **Reads left to right:** facts and figures on the left, rules in the middle, outcomes on the right. The centre item is large; upstream ("what it reads") to its left, downstream ("what reads it") to its right.
- **Readable at any size:** depth 1 by default, with a depth control (1–3) and click-to-expand on any node. Collapsed groups show a count ("+14 more facts", "+6 more rules"), never dozens of tiny boxes. Plain labels; identifiers small.
- **Path finder:** "How does this fact reach [outcome]?" highlights the chain and lists it as numbered steps beside the map.
- **Complexity at a glance:** on a program, each outcome shows how many facts, figures and rules feed it, and the map can switch to "biggest first".
- **Overlays (toggles):** open questions, unverified source, awaiting approval, statute over rule, changed by my proposal. Same badges as everywhere else.
- **Program filter from the volume,** never hard-coded.
- **Keyboard and phone:** at 390px the Map becomes the same structure as indented lists (reads / read by), with the same expand controls.
- The whole-ledger graph stays under "For implementers".

### Departure (statute over rule)
A row in Law (follows, departs from, reasoning, questions, agency notified) that links to its item. Not a page of its own.

### Source document: `/law/doc/D-n?at=S-n`
Opens scrolled to the passage, with the whole passage highlighted (B).

### Proposal: Changes › My proposal
- A structured editor (A): "Add a new dated version" or "Correct the version from …", with an excerpt picker that shows titles, not S-numbers. The App's text block stays only for implementers.
- Live effect on stored households, both intermediate and outcome changes, with one consistent "reach" number.
- Approvers and their reasons on the same screen, including the data steward.
- A proposal pill in the top bar (B).
- Refuse a change that changes nothing. Never offer "Approve" on your own staged change.
- Without GitHub: the App's download-and-send explanation.

## Defects to fix during the build (found by the evaluators)
- App: self-approval of one's own staged change; Enter in search opens the wrong item; relationship sentence grammar; aid-code table cut off at 1280px; rule text and dated versions hidden under folds.
- All: count disagreements (above); CO-92 document due dates differ between UIs (the App's are the computed ones; the others must read the same function).
- Avoid from the prototypes: raw HTML in panels (A), signing from a list of bare names (A), owner labels contradicting filters (B), phrase-only search (B), green for a worse result (A, B).

## Build plan
1. **Shell and routes:** sidebar, seven places, search results page, redirects from old routes so links keep working. Old views are removed once their content has a canonical home.
2. **Counts module:** one definition per number, with tests; every view reads it.
3. **Canonical pages,** in parallel by object: Item, Household and Determination, Question and Law, Changes and the proposal editor, Desk, Programs and Figures, the Map.
4. **One design owner** reviews every page against this spec for consistency (same object shown the same way everywhere).
5. **Gate:** rerun the same twenty persona tasks (both evaluators' method, screenshots, scores) on the unified app. Pass if it ranks at or above Blind B on IA and at or above Blind A on usability for every persona, with no count disagreement. Plus npm test, typecheck, e2e and check.

## Decisions (approved 2026-11-22)
1. Adopt the seven-place sidebar IA above (both evaluators converged on it independently).
2. Build it inside the existing app, not in a prototype codebase (keeps the engine integration, tests, tray, ledger sources and completeness).
3. Move table, projection, conformance, handoff and the whole-ledger graph to a secondary "For implementers" menu; keep a rebuilt, focused Map for policy staff.
4. Retire the role page, start doors, and the Cases/Walkthrough split once their content has its canonical home.
