# Design system

> **Archived:** this describes the original app, archived on 2026-11-24 in archive/main-app/ (see archive/README.md). The Colorado Rulebook (prototypes/blind-b) is the only UI.

The unified UI (docs/design-unified-ui.md) is seven places built by six tracks. This page is how they stay one product: the shared components and tokens, and the rules every page follows. A new page, or a change to one, reads this first.

## Rules every page follows

1. **One canonical page per object.** An item lives at `/item/CO-n`, a household at `/households/CO-n`, a question at `/questions/OQ-n`, an excerpt at `/law/sources/S-n`, a document at `/law/doc/D-n?at=S-n`. Everywhere else the object is a link to that page, never a second rendering of it. A task has one editor: "Propose a change" on the item page links to Changes › My proposal with the item chosen (`proposal.ts proposeHref`); it does not open a form of its own.
2. **Every number comes from `src/ui/counts.ts`.** A page never counts inline. A new number gets a function there, a sentence in `COUNT_DEFINITIONS` / `DESK_DEFINITIONS` / `QUESTION_LAW_DEFINITIONS`, and a test in `test/ui/` pinned against the Colorado volume. When two pages show "the same" number, they call the same function: the program outcomes an item reaches are `outcomesAffected` on the item page and on the Map (`mapCounts.readBy.outcomes`).
3. **"Your programs" means one thing.** `counts.ts inPrograms`: the role's programs plus what every program shares. A Desk tile that links to a list passes the same scope (`?programs=Medicaid,CHP`), and the list shows a `ScopeNote` with the way back to every program, so the tile and the list agree.
4. **Plain words first; identifiers small and last.** A name, never an identifier, is the link text. The id follows in `IdSmall`. Identifiers (`cw_grant_standard`) appear only on implementer pages and in the item page's header line.
5. **Definitions behind "How this is counted",** never in a card's body. Card copy is one short line.
6. **Rule text is visible,** in plain sentences (`plain.ts`, rendered by `Present.tsx PlainRule`). A line longer than `LONG_LINE` (150 characters) breaks into bulleted clauses: a long sum is "the total of:" with a term a line; a long floor or cap heads what it bounds; a group of people reads who is joined, then who is kept.
7. **No page blocks a click.** Anything that runs the stored households (the resting index, `changedBy`) is built after the first paint and in steps: `useResting.ts` (`useRestingReady`, `useRestingIndex`). A page shows "Working out…" meanwhile. Never call `restingIndex` before `restingReady` says it is built.
8. **1280px and 390px.** No sideways page scroll at 390px; a wide table scrolls inside its own box. Keyboard reachable, visible focus.

## Shared components (`src/ui/kit.tsx`)

| Component | Use it for |
|---|---|
| `ItemRef` | An item anywhere: plain name, a link to its page, `IdSmall` after it. `views/parts.tsx ItemLink` renders the same. |
| `HouseholdRef`, `HouseholdRefs` | A stored household: its title's first clause, shortened, id small; a list shows four, the rest behind "and N more" (a disclosure, so every name stays on the page). `mark` puts a household first and highlights it. |
| `Prose` | Ledger prose (a meaning, an assumption, a reasoning, a note): every identifier or id it names becomes the item's name, linked; excerpt, document and question ids are small links. The item page, question cards, Law, the sign-off list, Programs and the Map's centre box all use it. Clip with `roles.ts firstSentence` before passing the text. |
| `HowCounted` | The "How this is counted" disclosure. |
| `PageTabs` / `nav.pagetabs` | A page's own tabs (item, program, household, Law, Changes). Links; the address names the tab; `aria-current="page"` on the current one. |
| `ScopeNote` | A list narrowed to the reader's programs. |
| `UnverifiedBadge` | The one wording for an unverified source: an excerpt "Unverified: not a quotation"; an item citing one "Unverified source"; something resting on one "Rests on an unverified source" (`UNVERIFIED_WORDS`). |
| `StagedBadge` | "In your proposal". |
| `places/PlaceHeader.tsx` | A place's heading and its one line of purpose. |

Presentation helpers stay where they were: `present.ts` (money `formatMoney` "$1,031.00", percent `formatPercent` "142%", FPL "142% of FPL", dates `formatDate` "October 1, 2026", option codes `optionLabel`, persons "Person 1"), `Present.tsx` (`Value`, `ValueTable`, `PlainRule`, `FplFigures`). Never format a value by hand.

## Page anatomy

- **A place** (`/desk`, `/programs`, …): breadcrumb, `PlaceHeader` (h1 = the place's name, one line of purpose), then its tabs or filters, then content.
- **An object's page** (item, question, household, excerpt): breadcrumb ending in the object's plain name (never its id); a kicker saying what it is ("A figure set by policy · Medicaid", "An open question", "An excerpt of the law"); the h1, its plain name; a meta line of badges with the id small and last; then tabs, then content; actions in a right rail at 1280px that stacks under the content at 390px.
- Pages sit on the page background. Boxes (`.card`) are for groups inside a page, not around it.

## Tokens and classes (`src/ui/design.css`)

`design.css` is loaded last (`src/main.tsx`), after every page's own stylesheet. It owns the shared classes; a page's stylesheet lays out what is particular to it and does not restyle these: `.view.place` (no outer box), `.placehead`/`.itemhead`/`.qhead` (h1 22px, `.eyebrow`, `.meta`), `small.idsmall`, `a.itemref`, `a.hhref`, `nav.pagetabs`, `.chips` and `.chip` (one on: blue tint, bold), `.card`, `ul.desktiles .tile` and `ul.countcards .countcard` (a number that opens its list), `details.howcounted`, `.scopenote`, `.overlaynote`, `.tag` and `.flag`.

Colours are the tokens in `styles.css :root` plus the status tokens in `design.css :root`, chosen by meaning:

| Meaning | Token | Used for |
|---|---|---|
| Bad, needs attention | `--st-bad-*` | Statute over rule, open question, blocks certification, past due, no figure |
| Caution | `--st-warn-*` | Unverified source, partly settled |
| Done and good | `--st-ok-*` | Resolved, approved, signed |
| Pending, yours | `--st-info-*` | In your proposal, takes effect soon, the proposal pill, a ticked item |
| Awaiting signature | `--st-draft-*` | Draft, awaiting approval |

**Never green for a worse result**, and never green for something merely staged. A changed result is bold, not coloured (`changes.css`).

## Overlays and counts on the Map

The Map's overlays use the same badges as every other page. An overlay rings what it singles out; when more than half the boxes shown would carry it (Awaiting approval while the volume is in Draft), it becomes a count with a note (`.overlaynote`) instead of a ring on everything.

## Checking a change

- `npm test`: the counts pins (`test/ui/counts.test.ts`, `desk.test.tsx`, `questions-law-counts.test.ts`), the plain renderer (`plain-long.test.ts`), responsiveness (`responsive.test.ts`).
- `npm run e2e`: each place at 1280 and 390.
- Screenshots of every page at both widths before and after (`/tmp/claude-0/unified/design/`).
