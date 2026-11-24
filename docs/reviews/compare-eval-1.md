# Three-way UI comparison: eval-1

I compared the main app (**App**) with the two blind prototypes, **Blind A** ("Rulebook", Desk / Households / Questions / Changes) and **Blind B** ("Rulebook", a sidebar with My desk / Programs / Households / Questions / Figures / Law / Changes). All three read the Colorado volume at HEAD (80f2e9e). I built each one as its README says and served them on ports 4331, 4332 and 4333. I drove them with Playwright (Chromium, 1280×900, deviceScaleFactor 1, a persistent profile for each persona and UI) and stopped every server at the end. Screenshots are in `/tmp/claude-0/compare/<persona>/<ui>/`, where `<ui>` is `app`, `a` or `b`.

I played two personas, staying in character as non-technical staff:

- **Dana**, an HCPF Medicaid analyst, used the UIs in the order App, then Blind A, then Blind B.
- **Priya**, an assistant attorney general, used them in the order Blind B, then Blind A, then the App.

I judged usability and information architecture, not completeness. Where something was stubbed, I scored whether it had an obvious home.

How to read the tables:

- **Clicks** count deliberate actions to reach the first useful screen. Typing a query counts as one action, and so does pressing Enter.
- **Time** is my estimate for a first-time human reader. Agent wall-clock time is not meaningful.
- Scores run from 1 (poor) to 5 (good). **U** is how well I understood what I saw. **C** is my confidence in the answer. **N** is navigation clarity. **H** is how natural a home the UI gives the capability.

---

## Dana, HCPF Medicaid analyst

### D1. Check that a 2026 figure (the children's Medicaid income limit) matches the rule text

| UI | Found | Clicks / time | U | C | N | H | Friction or delight |
|---|---|---|---|---|---|---|---|
| App | yes | 2 (query + Enter goes straight to CO-191) / ~20 s to the value; ~1 min to the text | 4 | 4 | 3 | 3 | **Delight:** "Monthly income at 142% of FPL, by household size, under the guideline in force on November 22, 2026" shows the 2026 dollar table, the only UI that does. **Friction:** the source chips "(S638, S641, S675, S676)" are plain text, not links. The verbatim rule text sits inside the last fold, "Decision record", after "For implementers: Approach A projection". An analyst would not look there. `dana/app/t1-04-source.png`, `t1-05-allopen.png` |
| Blind A | yes | 2 (search, result) / ~15 s | 5 | 5 | 4 | 5 | **Delight:** "Each version beside the text it was taken from … Numbers from the version are highlighted where they appear in its source excerpt" puts 142% in yellow inside § 8.100.4.G.2, with "1 of 1 number found in the excerpt". This is exactly the check Dana wants to make. `dana/a/t1-02-item.png` |
| Blind B | yes | 4 (Figures, filter, retype, open) / ~45 s | 5 | 5 | 3 | 5 | Same highlight idea ("142% was 133%", with the numbers highlighted in the excerpt). **Friction:** the figure filter matches phrases, so "children income limit" gave "No figure matches" and only "children" worked. On the figure page the sidebar highlights **Programs** while the breadcrumb says **Figures**. `dana/b/t1-02-find.png`, `t1-04-figure.png` |

### D2. Understand which rules decide a teenager's Medicaid category

| UI | Found | Clicks / time | U | C | N | H | Friction or delight |
|---|---|---|---|---|---|---|---|
| App | yes | 2 (Programs, then "Medicaid: MAGI covered group") / ~30 s | 4 | 3 | 4 | 4 | Readable plain-English if/otherwise list. Clicking a condition opens a popover with its meaning, its uses, "Open definition" and "Trace to source". **Friction:** the popover text uses raw identifiers ("under ma_magi_child_age_limit (19)"). Nothing on the page ties the rule to a real 16-year-old; for that you need the separate Walkthrough place. `dana/app/t2-02-magi.png`, `t2-03-child.png` |
| Blind A | yes | 3 (search, result, choose household CO-05) / ~1 min | 4 | 4 | 4 | 4 | **Delight:** "Step by step … values from household CO-05" puts each sub-rule beside the value for p1, p2 and p3. For the 16-year-old, "child is in a continuous eligibility period: p3 yes" answers the teenager question concretely. **Friction:** searching "Medicaid category" did not rank MAGI covered group in the first screen of 54 results. The steps appear in a different order from the rule's priority order. `dana/a/t2-03-step.png` |
| Blind B | yes | 4 (Programs, Medicaid, MAGI covered group, "Explain step by step") / ~1 min | 4 | 4 | 5 | 5 | Numbered steps, each with "Asks the household", "Uses the figures: … (19) … (65)", "Law:", and a choice of depth (main steps / two / three levels / every rule) plus "Print for a training". **Friction:** the steps follow evaluation order, not the if/else order. Nested "ALL OF THE FOLLOWING ARE TRUE: • ANY OF …" bullets render with empty bullets. You cannot prune the steps to a 15-year-old here. `dana/b/t2-04-explain.png` |

### D3. Find the items she must sign off, and sign one

| UI | Found | Clicks / time | U | C | N | H | Friction or delight |
|---|---|---|---|---|---|---|---|
| App | yes | 3 (Approvals, type name, Approve) / ~40 s | 4 | 4 | 4 | 4 | **Delight:** each card shows "Figure today", "What changed: New, never approved", "Affects … How?", the sources and "Why you sign". Signing without a name is blocked ("Type your name first: it goes on the signature."). Afterwards the page explains the next step. **Friction:** the role page says "1,156 items waiting on your sign-off" while Approvals says 881 for the Medicaid policy owner; the difference is explained, but she has to read it. The next step, "Download this change … Send that file to the Colorado codex's Data steward", is heavy for policy staff. The banner reads "1 draft change that are not shown". `dana/app/t3-03-signed.png` |
| Blind A | yes | 2 (tick on the Desk, "Sign off selected") / ~10 s | 4 | 3 | 5 | 5 | The fastest path: the Desk opens on her sign-off list. **Friction:** the list rows carry only a name, an ID and the roles; there is no meaning or value. It is easy to sign without reading what you sign, and no name is asked for. Feedback is good: an "In your proposal" tag and a Changes counter. `dana/a/t3-01-desk.png` |
| Blind B | yes | 4 (Open the whole queue, chapter, tick, "Review and send") / ~40 s | 4 | 4 | 4 | 5 | Queue rows carry the meaning and "You sign because …". **Friction:** the proposal page then says only "Signatures (1) As Medicaid policy owner, 1 item" without naming the item. `dana/b/t3-02-signed.png` |

### D4. Answer an open question she owns

| UI | Found | Clicks / time | U | C | N | H | Friction or delight |
|---|---|---|---|---|---|---|---|
| App | yes | 2 (Questions, Answer) / ~1 min including writing | 5 | 4 | 4 | 5 | **Delight:** the question page leads with "The reading in force until it is answered", then the rule text, then "Stored households, if it were answered the other way". The form is structured: a decision type, the decision, a citation, an optional "Agency notified", Decided by, the role and the date. The staged message is explicit: "OQ-50 is retitled 'Resolved: …' … and it leaves the open list." `dana/app/t4-02-answer.png`, `t4-03-staged.png` |
| Blind A | yes | 2 ("Questions you own" card, OQ-50) / ~1 min | 3 | 4 | 4 | 4 | **Friction:** only the OQ number is a link, not the title. The page opens with a dense history paragraph, and the assumption in force is buried in a "Class: … Assumption: …" line. The form is a Policy answer / Legal opinion radio, one textarea and a "This settles the question" box; there is no citation field. `dana/a/t4-02-q.png`, `t4-03-answered.png` |
| Blind B | yes | 4 (Questions, owner filter, OQ-50, "Answer it") / ~1 min | 4 | 4 | 4 | 5 | The form has an answer ("in a sentence a county worker could apply"), the authority relied on, and an Effect choice; afterwards the page shows "Answer from Medicaid policy owner in your proposal". **Friction:** the "Open questions you own" list on the Desk starts with OQ-550 and OQ-612, which the Questions list says are "owned by Legal, CHP+ policy owner" and by the CDEC and LEAP owners. Ownership is defined two ways. `dana/b/t4-04-added.png`, `dana/b/00-landing.png` |

### D5. Confirm the October 2026 federal immigrant restriction is in, and see which stored households it changes

| UI | Found | Clicks / time | U | C | N | H | Friction or delight |
|---|---|---|---|---|---|---|---|
| App | yes | 2 plus a long scroll (role page, "dated changes" card) / ~2 min | 4 | 4 | 2 | 3 | The answer is good once found: "10 stored results in 1 household would change (worked out) … CO-75 Person 1 … Eligible → Emergency only". **Friction:** the card links to `?show=changes` but does not scroll; the section sits below the whole "Your programs" grid. Directly under the worked-out count sits a second, different count: "67 stored results in 7 households rest on it (not worked out)". Searching "immigrant restriction October 2026" jumps to the CO-3034 item, whose page has no impact list. `dana/app/t5-02-changes.png` |
| Blind A | yes | 3 (search, CO-3034, "Compare the stored households with the previous version") / ~1 min | 5 | 5 | 3 | 3 | A clear before/after table: "10 results change, for 3 people in 1 household". **Friction:** Changes, then "This month", lists repository edits (148 change sets), not effective dates. "Takes effect soon" only looks forward, so a change that took effect in October has no home and search is the only way in. New values are shown in green ("emergency only"), which reads as "good". `dana/a/t5-02-month.png`, `t5-06-compare.png` |
| Blind B | yes | 5 (Changes, "What took effect", month Oct 2026, Medicaid, "Compare those 7 with and without this change") / ~1 min | 5 | 5 | 4 | 5 | The Desk already says "October 2026 was the big month: 24 figures and rules, including the federal limits of H.R.1." (not a link). The comparison names people by age and uses plain outcome labels ("Person 1 (34) … Eligible … → Emergency Medicaid carries the code"). **Friction:** global search for "immigrant restriction October 2026" returns 0 results. "→ cannot determine" for family planning looks alarming without an explanation. `dana/b/t5-04-compare.png` |

---

## Priya, assistant attorney general

### P1. Find every place the codex follows federal statute over Colorado rule text, with the reasoning

| UI | Found | Clicks / time | U | C | N | H | Friction or delight |
|---|---|---|---|---|---|---|---|
| Blind B | yes | 1 (Law) / ~10 s | 5 | 4 | 5 | 5 | **Delight:** "Federal law over Colorado's rule (14)", filterable by program. Each entry has the override sentence, then "The reasoning", which unfolds into the meaning as written, the working assumption, the questions it hangs on, and "The texts, word for word". **Friction:** "SNAP ABAWD maximum age … Decides: CHP+: eligibility status · Medicaid: Breast and Cervical Cancer …" A lawyer will not understand why a SNAP age reaches BCCP. `priya/b/t1-01-law.png`, `t1-02-reasoning.png` |
| Blind A | yes | 1 (the "Statute over rule" card on the Desk) / ~10 s | 4 | 4 | 4 | 4 | The same 14, each with its sentence, questions, statute excerpts and "The reasoning recorded on the item". **Friction:** the excerpt titles run together without separators ("…sec. 10102.Pub. L. 119-21…"). The list is reachable only through a Desk card, not from the nav. `priya/a/00-desk.png` |
| App | yes | 2 (Questions, then the "Departures (14)" tab); the role-page card scrolls nowhere / ~1–2 min | 5 | 4 | 2 | 2 | **Delight:** the Departures tab has the best structure of the three: "The codex follows / Colorado rule it departs from / Reasoning / Open questions / Agency notified: Not recorded. Record it with Legal's decision." **Friction:** it has two homes. The card on the Legal role page links to `?show=departures`, which renders the list after about 600 lines of "Figures in force" without scrolling to it. The other home is a tab under "Open questions", which is not where a lawyer would look. `priya/app/t1-02-dep.png`, `t1-03-qdep.png` |

### P2. Trace one rule's citation to the verbatim regulation

| UI | Found | Clicks / time | U | C | N | H | Friction or delight |
|---|---|---|---|---|---|---|---|
| Blind B | yes | 3 (search, CO-308, "Read it in the full document") / ~20 s | 5 | 5 | 5 | 5 | **Delight:** the item's section is headed "The law, word for word". The document opens scrolled to the passage, highlighted, with "the copy below was fetched and kept with the rulebook without editorial change". `priya/b/t2-02-word.png`, `t2-03-fulldoc.png` |
| Blind A | yes | 4 (item, expand the excerpt, "Open D-3 with this excerpt highlighted", "Jump to it") / ~30 s | 5 | 5 | 4 | 5 | "26 passages highlighted. Jump to it". The highlighting works, but the page does not scroll to the passage by itself. `priya/a/t2-02-excerpt.png`, `t2-03-doc.png` |
| App | yes | 4 (search, "Decision record" fold, the source link, "D-3: where this sits in the document") / ~1 min | 4 | 4 | 3 | 3 | The rule body shows the statute-over-rule note but no citation; the citations sit in the last fold. The source link lands in the list of every source, scrolled to S8. In the document only the first paragraph of the excerpt is highlighted. The page shows the repository path (`volumes/co/documents/D-3.md`). `priya/app/t2-03-sourcepage.png`, `t2-04-doc.png` |

### P3. Record a legal opinion on an open question

| UI | Found | Clicks / time | U | C | N | H | Friction or delight |
|---|---|---|---|---|---|---|---|
| Blind B | yes | 4 (Questions, owner Legal, OQ-518, "Record a legal opinion") / ~1 min | 5 | 4 | 5 | 5 | **Delight:** a separate opinion form with "State the conclusion first, then the reasoning", an authority field, and an Effect choice that includes "Federal statute governs over Colorado's text" and "Cannot be settled without rulemaking". The page confirms "Legal opinion from Legal in your proposal". `priya/b/t3-02-form.png` |
| Blind A | yes | 2 ("Questions you own", OQ-518) plus a radio / ~1 min | 4 | 3 | 4 | 4 | "Legal opinion" is a radio choice on the shared form: one textarea, with no authority or effect fields. The authority has to go into the prose. `priya/a/t3-02-added.png` |
| App | yes | 2 (Questions, Answer) / ~1 min | 4 | 4 | 4 | 4 | There is no "opinion" verb; the form is the shared answer form. Its middle option, "Opinion recorded, keep the question open (with a caveat)", is the closest match. It has a citation field and "Agency notified", which tie it to the Departures list. `priya/app/t3-03-staged.png` |

### P4. See which figures are unverified and what depends on them

| UI | Found | Clicks / time | U | C | N | H | Friction or delight |
|---|---|---|---|---|---|---|---|
| Blind B | yes | 2 (Law, "Unverified figures (2 sources)") / ~15 s | 5 | 4 | 5 | 5 | **Delight:** "In short: 6 items take a figure from an unverified source; 38 more rules rest on those." Each source says "This is not a quotation. hcpf.colorado.gov refuses automated requests…" and lists its figures, the rules downstream, the outcomes and 11 households. `priya/b/t4-01-unverified.png` |
| Blind A | yes | 1 (Desk card) / ~10 s | 5 | 4 | 4 | 4 | Equivalent, and it adds "Figures with no version loaded (4)". **Friction:** it lists 3 stored households (CO-01, CO-02, CO-06) where Blind B lists 11 for the same sources. A lawyer who saw both would lose trust in both numbers. `priya/a/t4-01-unverified.png` |
| App | partly | 4+ / ~3 min, then gave up on a complete list | 3 | 2 | 1 | 2 | There is no dedicated place. The Legal role page names "unverified figures" in its description but has no section for them. Searching "unverified" and pressing Enter jumped to an unrelated SNAP regulation (S812, "unverified deductible expenses"). The Approvals filter "Cites unverified text" shows only 1 item for Legal. Each item card is good ("Cites S1228, which is not a quotation … It stays Draft whoever signs"), but the overview is missing. `priya/app/t4-01-search.png`, `t4-02-approvals.png` |

### P5. Reconstruct why a stored household was denied, for an appeal

I used CO-87, a 58-year-old who is an ineligible SNAP member because he has used his three ABAWD months.

| UI | Found | Clicks / time | U | C | N | H | Friction or delight |
|---|---|---|---|---|---|---|---|
| Blind B | yes | 4 (Households, CO-87, the SNAP cell, "Why?") / ~40 s | 5 | 5 | 5 | 5 | **Delight:** "Determination record · CO-87 · as of Oct 1, 2026". It reads top down; the branch taken is highlighted; each step shows "worked out by rule · 10 CCR 2506-1 4.304.4.A (version effective 2026-10-01)"; the federal-over-Colorado banner appears at the steps it governs; it goes down to "Date of birth Mar 3, 1968, stated in the case"; there is an as-of date and "Print this record". **Friction:** the label "Ineligible member abawd time limit" is machine English. `priya/b/t5-04-why.png` |
| Blind A | yes | 3 (Households, CO-87, the result) / ~30 s | 5 | 4 | 5 | 5 | Person descriptions ("p1 58, no work"), "Why, in short", "Every step", an as-of date with Re-run, "Print the record" and a tipping-point finder. **Friction:** "Why, in short" stops at "limit reached"; the age range and the statute-over-rule note appear only inside "Every step". `priya/a/t5-02-walk.png` |
| App | yes | 4 (Cases, CO-87, scroll about 200 rows of facts, the expectation row, "Show everything") / ~2 min | 3 | 4 | 2 | 3 | The case opens with a broken sentence ("Household: Person 1 is the buys prepares with of Person 2"), then a raw fact table with identifier columns. The trace is inline and complete, but its citations are bare "S19 S1810 S1812" with no titles, and it offers no print or as-of control. The same household also lives in **Walkthrough**, a second place for the same job. `priya/app/t5-02-co87.png`, `t5-04-everything.png` |

---

## Per-UI summary

### App (main app)

- **IA.** Top-level places are spread over three tiers:
  - the header: Programs, Cases, Search;
  - a Browse menu: Table, Graph, Sources, Documents;
  - a second row: Approvals, Questions, Walkthrough, By role, By outcome;
  - plus the edit-mode toggle and the ref selector.

  These do not match how Dana or Priya think about the work. Several places overlap:
  - Cases and Walkthrough cover the same households.
  - The Search link duplicates the search box.
  - Departures appear both as a tab under Questions and as a section of the role page.
  - Changes over time and figures in force exist only as sections of the role page.
  - Programs, By outcome and the role page's "Your programs" overlap.

  The role page is a long container whose card links do not scroll to their sections. The item page is a clear canonical home, but its law text is under "Decision record".
- **Consistency.** Counts differ between places: 1,156 versus 881 sign-offs, and 49 versus 24 questions. Each difference is explained in small print, but the reader still has to reconcile them. The same citation appears as an S-number chip, as a fold in the item page and as an entry in the list of every source.
- **Learnability in the first 10 minutes.** The opening "What brings you here today?" with a role door and a 10-step tour is welcoming. After that the reader has to learn three navigation tiers and that key lists sit low on the role page. Dana was productive within 10 minutes; Priya stalled on P4.
- **Heuristics:**
  - Visibility of status: **4**. There is a draft banner, staged-change messages and "0 of 4 signed".
  - Match with real-world words: **3**. The plain-English rule text is good, but the pages also show "Decision record", "For implementers: Approach A projection", "In the ledger's own words", identifier columns and S-numbers.
  - Recognition over recall: **3**. Popovers help, but the reader has to remember that the role page hides sections and which tab holds Departures.
  - Consistency: **3**. Counts change by place, and one household has two homes.
  - Error prevention: **4**. A name is required to sign, there is undo, and "(not worked out)" labels separate estimates from computed results.
- **Best idea to adopt.** The Approvals card: figure today, what changed, what it affects, sources and why you sign, with a name required. The structured answer form with "Agency notified" feeds the Departures list, which itself has the right fields. The 2026 FPL dollar table is a further small win.
- **Worst problem to avoid.** Using the role page as a container. Changes, departures and figures in force are buried below the fold behind cards that do not scroll, and search jumps to the first hit (P4 landed on an unrelated regulation).
- **Completeness (not scored).** The App is the most complete: real staging and download or PR flow, edit mode, graph, table, conformance and handoff views, and worked-out impacts.

### Blind A (Rulebook: Desk / Households / Questions / Changes)

- **IA.** There are four places plus a Desk whose cards open filtered lists: sign-offs, questions, statute over rule, unverified, takes effect soon. The item page is the single, rich home for every rule, figure and fact: meaning, figures over time beside their excerpts, sources, values in stored households, what it affects, sign-off. The household page and its walk-through are one home. The weaknesses:
  - the statute, unverified and "soon" lists live only on the Desk;
  - **Changes** mixes "This month" (repository edits) with "My proposal" (my queued work);
  - effective-date changes in the past have no home.
- **Consistency.** Mostly consistent. The step lists run in a different order from the rule's priority order, and raw values such as "title xix emergency" show through.
- **Learnability.** Excellent. The Desk explains itself, and Dana signed something within a minute.
- **Heuristics:**
  - Visibility of status: **4**. The Changes badge and the "In your proposal" tags.
  - Match with real-world words: **4**. Desk, Households, "Where it comes from", "Figures over time".
  - Recognition over recall: **4**. Desk cards with counts.
  - Consistency: **3**. "Changes" means two things, and step order differs from the rule.
  - Error prevention: **3**. You can sign from a list without seeing the item, and no name is asked.
- **Best idea to adopt.** "Each version beside the text it was taken from" with the figure's numbers highlighted in the excerpt, and the rule page's "Show values from a stored household".
- **Worst problem to avoid.** Signing items from a bare list of names. Related: no home for "what took effect", so October 2026 could only be found by search.

### Blind B (Rulebook: sidebar with My desk / Programs / Households / Questions / Figures / Law / Changes)

- **IA.** This is the closest match to how both personas think: their own work (Desk), the law (Law), the numbers (Figures), the programs, the households, the questions, and what changed (Changes, with "What took effect" by month and "Your proposal"). **Law** is a natural home for statute over rule, unverified figures and all 880 excerpts, and it made Priya's work fast. Breadcrumbs show where you are. The overlaps:
  - Figure items are reachable from both Programs and Figures, and the sidebar then highlights the wrong place.
  - The Desk and Questions compute "owned" questions differently.
- **Consistency.** Rule text, values and citations look the same on item, step and determination pages. The exceptions are the question ownership split and search that behaves differently from the figure filter.
- **Learnability.** Very good. The sidebar labels say what each place is for, and the Desk prose ("October 2026 was the big month…") orients the reader.
- **Heuristics:**
  - Visibility of status: **4**. The proposal pill and the "in your proposal" notes, though the proposal page does not name signed items.
  - Match with real-world words: **5**. "The law, word for word", "Facts we are told", "What took effect", "Record a legal opinion".
  - Recognition over recall: **4**. A persistent sidebar and breadcrumbs.
  - Consistency: **3**. The sidebar highlight, question ownership, and search versus filter.
  - Error prevention: **4**. Unsignable items are named, and the queue shows what you sign.
- **Best idea to adopt.** **Law** as a top-level place, together with the determination record: top down, branch taken highlighted, figure version, federal-over-state banner, as-of date, print.
- **Worst problem to avoid.** Weak search. Global search returned 0 results for "immigrant restriction October 2026", and the figure filter matches phrases ("children income limit" found nothing).

---

## Rankings (usability and IA, separate from completeness)

**IA: 1. Blind B, 2. Blind A, 3. App.**

1. Blind B's seven sidebar places map onto the personas' own nouns (my work, programs, households, questions, figures, law, changes). Every task in this review had one obvious home, and Priya's three Law tasks were each one or two clicks.
2. Blind A has the leanest structure and the best item page, but it puts five important lists behind Desk cards and has no home for changes already in force.
3. The App has about a dozen top-level places in three tiers with real duplicates (Cases and Walkthrough; Departures under Questions and on the role page; the Search link and the search box). Its role page is a container that hides changes, departures and figures in force.

**Usability: 1. Blind B, 2. Blind A, 3. App** (narrowly behind A for Dana, clearly behind for Priya).

1. Blind B had the fewest dead ends and the best answers for the appeal and legal tasks. It lost points only on search and on a few labels.
2. Blind A was the fastest for Dana's sign-off and figure check. It lost points on signing without content and on October 2026.
3. The App's individual screens are often the most informative: the approval cards, the question page and the departures fields. Getting to them cost scrolling, folds and guesswork, and P4 had no path at all.

**Completeness (for the record, not ranked above).** The App is far ahead: staging with a download or PR flow, edit mode, graph and table, conformance, handoff, and worked-out impacts on the role page. Blind A and Blind B both run the engine live and compute before and after, but they only keep proposals in localStorage.

**Data agreement across UIs.** The three disagree on derived counts:

- households reading CO-191: A 17 or 11, B 24;
- households downstream of the unverified sources: A 3, B 11;
- questions "owned" by the Medicaid policy owner: App 24 (filed) or 49, A 37, B 39.

A unified UI must define each count once, in one place, with its definition shown.

---

## Unified UI recommendation

### Top-level places (persistent sidebar, as in Blind B)

1. **My desk.** Role-scoped work: to sign (grouped, with meaning, as in Blind B's queue), questions I own, things taking effect, and things that need my attention. Use one definition of "owns". Each card links to the canonical list, never to a section of a long page.
2. **Programs.** What each program decides, then the outcome rule, then the step tree. Blind B's "Explain step by step" with depth levels and print, plus Blind A's "Show values from a stored household".
3. **Figures.** Every number, with dated versions. The filter should match words, not phrases.
4. **Households.** One home per stored case, merging the App's Cases and Walkthrough. It has the results grid with aid codes (Blind B), person descriptors (Blind A), the determination record (Blind B) headed by Blind A's "Why, in short", what-if and tipping point (Blind A), as-of date and print.
5. **Questions.** The decision queue (the App's list, which shows "reading in force", "rule text it turns on" and "if answered the other way").
6. **Law.** Federal over Colorado's rule (Blind B's list using the App's departure fields, including "Agency notified"), unverified and missing figures (Blind B plus Blind A's "no version loaded"), and sources and documents.
7. **Changes.** Three tabs:
   - "What took effect", by month, past and future, with a compare against the previous version (Blind B's month picker plus Blind A's table);
   - "What was edited", from the repository history (Blind A's "This month", renamed);
   - "My proposal", which lists each item by name, its approvers, the before and after, and the App's no-GitHub explanation.
8. **Search,** as a results page grouped by type (Blind A's), never a jump to the first hit.
9. **For implementers,** a secondary menu: the App's graph, table, Approach A projection, conformance and handoff. These stay out of the policy staff's way.

### Canonical page per object

| Object | Canonical page | Composed from |
|---|---|---|
| Rule, figure or fact | `/item/CO-n` | Meaning; plain-English rule (App) with definition popovers (App, minus raw identifiers); figures over time beside their excerpt with numbers highlighted (A); 2026 dollar table for FPL figures (App); "The law, word for word" with "Read it in the full document" (B); values in stored households (A); what a change affects and the compare (A/B); a sign-off side panel with "why you sign" and a required name (B layout, App rules); open questions. The citation must be visible on the page, not inside "Decision record". |
| Question | `/questions/OQ-n` | The App's header (reading in force, rule text, households if answered the other way). Two actions: "Answer it" (App's decision types plus citation) and "Record a legal opinion" (B's conclusion, authority and effect), both carrying "Agency notified". |
| Household | `/households/CO-n` | B's grid and record; A's "Why, in short", persons and tipping point; one place only. |
| Statute-over-rule departure | a row in Law that links to its item | The App's fields: follows, departs from, reasoning, questions, agency notified. |
| Source document | `/law/doc/D-n?at=S-n` | B's (opens scrolled to the passage and highlights all of it). |
| Proposal | Changes, then My proposal | Named entries (A), approvers with reasons (B), before and after (A/B), the App's download or PR explanation. |

### Take from each UI

- **From the App:** the approval card contents; a required name on signatures; the structured answer form with "Agency notified"; the departure fields; definition popovers; "(not worked out)" versus "(worked out)" labels, which should be shown once, not side by side.
- **From Blind A:** version beside excerpt with number highlighting; household values on the rule page; "Why, in short"; person descriptors; a search results page; the tipping-point finder.
- **From Blind B:** the sidebar IA, including **Law**; "What took effect" by month with compare; the determination record with federal-over-state banners and print; the legal-opinion form; step-by-step at chosen depth with print for training.

### Avoid

- The App's role page as a container, and search that jumps to the first hit.
- Blind A's signing from a list of bare names.
- Blind B's phrase-only search and filters, and a sidebar highlight that disagrees with the breadcrumb.
- In all three: derived counts that disagree between places.
