# UX retest: assistant attorney general (phase 13)

Persona: Priya, the same assistant attorney general as in `ux-legal-aag.md`. I advise HCPF and CDHS, I read statutes
and rules all day, and I have no GitHub account. I redid my five tasks from the first walkthrough with the new views
(Approvals, Questions with its Departures tab, Walkthrough, By role, By outcome), then tried one new task they were
meant to enable. Where I state a fact about the ledger, I checked it in the app and, where needed, in the files.

Scope I kept in mind (plan Phase 13 note): the app defines policy and is not a rules engine. There is no intake, and
"what changes" compares stored test households before and after a staged change.

Screenshots are in `/tmp/claude-0/ux-retest/legal-aag/`. A `.txt` file next to a screenshot holds that page's text.
I edited nothing except this file and committed nothing.

## How the app was run

- **Build and serve.** I ran `npm run build -- --outDir <scratch>/dist-retest`, then
  `npx vite preview --outDir <same> --port 4311 --strictPort`, per the README's "Running against the local tree".
- **No GitHub interception.** The header read "working tree (ccr-9d19bf4c-wmnwcl @ fa11e8a)".
- **Browser.** Playwright Chromium at 1366×900, deviceScaleFactor 1.
- **Server.** Stopped at the end.

The first page now opens on **Colorado** and asks "What brings you here today?". It has a **Legal — Attorney
General's office** door: "Questions that need a legal opinion, statute-over-rule departures and unverified figures."
My L10 (no door for legal work, wrong volume first) is fixed. The door opens **By role → Legal**
(`01-legal-home.png`), with four cards:
- **215** items waiting on your sign-off;
- **27** open questions you own;
- **7** statute-over-rule departures;
- **8** dated changes in the next year.

---

## Task 1: Every place the codex follows a federal statute over Colorado's own rule text

**What I did**

1. **The departures card.** "7 statute-over-rule departures" jumps to a list further down my role page
   (`53-roles-figures-asof-2025-06-01.png` shows it). Each entry is in a red box, with the rule text and open
   questions.
2. **Questions → Departures (7)** (`10-departures.png`) is the view I asked for. It opens: "Each item below follows a
   statute where a Colorado rule, not yet amended, says otherwise. Each is a decision for Legal: whether the statute
   governs, from when, and whether the agency has been told." Each entry gives:
   - **The codex follows**: the statute or federal source;
   - **Colorado rule it departs from**: the paragraph, with its excerpt title;
   - **Reasoning**;
   - **Open questions**, or "None: Legal has not been asked";
   - **Stored households**;
   - a **Record Legal's decision (OQ-n)** button.
3. **Item pages.** CO-308 now shows a red **Statute over rule** box under the sign-off line
   (`11-item-CO-308.png`). It reads "Federal law overrides 10 CCR 2506-1 4.305: since Pub. L. 119-21 sec. 10108 took
   effect on enactment ...".
4. **Search.** "federal law overrides" now finds 6 results and "statute over rule" 23
   (`13-search-federal-law-overrides.png`).
5. **The seven departures listed:**
   - CO-119, the SNAP E/D resource limit;
   - CO-166 and CO-412, the ABAWD age;
   - CO-1243, the heating/cooling allowance;
   - CO-308, SNAP non-citizens;
   - CO-414, the ABAWD exemptions;
   - CO-929, OAP citizenship under C.R.S. 26-2-111.

   They are the same seven as last time.
6. **Medicaid is still missing.**
   - CO-509, "Medicaid: meets the citizenship requirement" (`12-item-CO-509.png`), applies 1396b(v)(5) from
     October 1, 2026 over § 8.100.3.G.1.g, which still admits refugees and asylees. Its page has **no**
     statute-over-rule box.
   - It is not in Departures.
   - OQ-518 says exactly this and is classed **"Needs Legal"**, but the Departures tab does not include it.
   - CO-1190 (student loans, 26 U.S.C. 108(f)(5) over § 8.100.4.C.1.b.xv) is also absent.
   - The HCPF role page shows **"0 statute-over-rule departures"**.

**Finished?** For the seven the codex marks, yes, in about 10 minutes (half a day last time). The list is **not
complete**, and nothing on the page warns me. I know about the Medicaid departures only from my first review.
**Confidence:** medium.

**Improved**
- L1 is fixed: the override note is on the item, in the walkthrough, in search and in the print.
- L6 is fixed for departures: they have their own view, with a decision action.

**Still wrong**

| Finding | Severity |
|---|---|
| The Medicaid H.R.1 sec. 71109 departure (CO-509/CO-2400 over § 8.100.3.G.1.g) and CO-1190 are not marked, so Departures and the HCPF card ("0") give a wrong answer if trusted (L3, unchanged) | **blocks** |
| "Since" is shown on only 3 of 7 departures (CO-1243, CO-308, CO-412 "since 2025-07-04"). CO-119, CO-166, CO-414 and CO-929 have no date | slows |
| "Whether the agency has been told" is promised in the heading but recorded nowhere. CO-119 and CO-929 say "None: Legal has not been asked" | slows |
| CO-119's departure says "No stored household result rests on it". The role page's "What changed" for the same item says "Stored households that read it: CO-01, CO-02, CO-03, CO-83, CO-87, CO-88" | annoyance (contradiction) |
| The departures list on the role page does not follow the "As of" date. At 2025-06-01 it still shows the ABAWD departure, which began July 4, 2025 | annoyance |

---

## Task 2: One Medicaid rule, traced to the verbatim regulation and its source document

**What I did**

1. **CO-509 → Decision record** (`20-co509-decision-record.png`). Each excerpt now has two links:
   - the excerpt (`#/co/source/S656?excerpt=S656`);
   - "where this sits in the document" (`#/co/document/D-65?excerpt=S656`).
2. **The document link** lands about 17,700 px down § 8.100, with **paragraph iv) highlighted in yellow**
   (`22-D65-S656-landing.png`). Last time I landed at the top of a 216,000 px page and used Ctrl-F.
3. **The excerpt link** opens the Sources page scrolled to S656 (`23-source-S656-landing.png`).
4. **Labels.** Excerpts are now labelled by kind ("Regulation", "Statute", "Guidance", "Memo"), not "Statute text".
   The Sources header now says the text is quoted word for word "except the 2 marked 'Unverified — not a quotation'".
5. **CO-509 at the top** reads "Draft · Needs sign-off from Medicaid policy owner, Legal, CHP+ policy owner (0 of 3
   signed)". It still opens on the rule with no departure note.

**Finished?** Yes. **Time:** about 10 minutes (40 last time). **Confidence in the chain:** high.

**Improved**
- L7 is fixed: links scroll to the paragraph and highlight it.
- L13 is fixed: excerpts are labelled by kind.

**Still wrong**

| Finding | Severity |
|---|---|
| CO-509 still does not say, at the top, that it departs from § 8.100.3.G.1.g from 2026-10-01 (see Task 1) | slows (hearing risk) |
| The highlight covers only the lead line of iv), not the numbered sub-items 1) to 7) it governs | annoyance |
| There is still no printable "authority for this rule" page for an item (rule, conditions, paragraph and text, version dates). The walkthrough's print covers a case, not a rule | slows |

---

## Task 3: What Legal must approve, the questions that need a legal opinion, and recording my opinion

**What I did**

1. **"215 items waiting on your sign-off" → Approvals?role=Legal** (`36-legal-inbox.png`). The inbox explains the count:

   > Needs the Legal: every item tagged legal review, state election and immigration status. That is 215 items in
   > all. Why: it is tagged immigration status (126) · it is tagged legal review (57) · it is tagged state election (48).
   > ... The Table's "Legal sign-off is required" warning is an older editor check ... and is not this definition.

   That settles my L5 (57 / 191 / 200): one definition, named and explained.
2. **"27 open questions you own" → Questions?persona=legal** (`30-legal-questions.png`). It shows **28**, grouped by
   primary owner:
   - Medicaid 13, CHP+ 2, SNAP 3, Cash 3, LEAP 1, CDEC 1;
   - **Legal 5**, listed last.

   "Kind of question = Needs Legal" gives 5: OQ-1, 138, 251, 518 and 533 (`31-legal-questions-needs-legal.png`).
3. **Recording an opinion.** From the ABAWD departure I pressed **"Record Legal's decision (OQ-533)"**
   (`32-oq-533-from-departure.png`). The question page's form (`33-oq-533-answer-form.png`) offers:
   - "Keep the reading in force";
   - "Adopt the other reading: Apply Colorado's SNAP rule as written ... ends at age 54, not 64";
   - "Something else";
   - fields for the decision, citation and decided by;
   - "In the role of", preset to **Legal**;
   - the date.
4. **My opinion.** I wrote: sec. 10102 governs from enactment notwithstanding 4.000; the 64 rests on the FNS proposed
   rule, so revisit at the final rule; CDHS to be told. I staged it (`34-oq-533-answer-filled.png`,
   `35-oq-533-staged.png`). The page says: "Staged in the change tray. OQ-533 is retitled 'Resolved: ...' with your
   answer appended. Propose it from the tray to send it for review."
5. **Departures afterwards.** The ABAWD entry still says "Record Legal's decision (OQ-533)" and lists OQ-533 as open.
   There is no sign that an opinion is staged.

**Finished?** Partly.
- The list of what Legal must approve: yes, and I trust the count now.
- The questions that need me: yes.
- My opinion is written, with my name and the date, but only in this browser. It reaches the codex when someone with a
  GitHub token proposes it. The question page offers no download (the Approvals page does), and the app does not say
  who that someone is.

**Time:** about 15 minutes (an hour last time). **Confidence:** high in the lists, low that the opinion will reach the
codex without help.

**Improved**
- L5 is fixed.
- L2 is half fixed: there is a place to write and sign, without editing YAML.
- L12 is improved: an answer that changes no figure shows "No downstream items depend on the changed facts" in the
  tray, not 69 code names.

**Still wrong**

| Finding | Severity |
|---|---|
| Legal cannot put an opinion in the record without GitHub or an unnamed steward, and the question page has no download | **blocks** (for the record) |
| The only ways to answer are Keep, Adopt or Something else, and any answer retitles the question **"Resolved:"**. An opinion "with a caveat, revisit when the final rule issues" closes the question. There is no "opinion given, keep open" or "agency notified" | slows |
| A staged answer is invisible in Departures and in the queue: the question still reads Open with "Record Legal's decision" | annoyance |
| The counts disagree: the role card says 27 questions and the view shows 28 | annoyance |
| My own five "Legal" questions are listed last, after six other owners' groups | annoyance |
| Only 5 questions are classed "Needs Legal", though 28 involve Legal. OQ-518 is "Needs Legal" yet not a departure (Task 1) | annoyance |
| OQ-533's "reading in force" has a code word: "gives each a county-facing **statute_override** note" | annoyance |
| The inbox says "Needs the Legal" and "1 item: 1 figures" | annoyance |

---

## Task 4: "Unverified" figures and what depends on them

**What I did**

1. **The source page.** S1228 now carries the flag **"Unverified — not a quotation"** and the heading "Memo figures
   (not a quotation)" (`40-source-S1228.png`). The page header no longer claims everything is verbatim.
2. **The item page.** CO-832 reads "**Unverified source** This item cites S1228, which is not a verified quotation."
   under the sign-off line (`42-item-CO-832.png`).
3. **The inbox.** As Medicaid policy owner, "Cites unverified text (6)" lists:
   - the income-trust limits by region (CO-3022);
   - the transfer-penalty divisor (CO-832);
   - the institutional personal needs allowance (CO-887);
   - three rules.

   Each row says "Unverified: Cites S1228, which is not a quotation of the fetched text. It stays Draft whoever signs,
   until the excerpt is replaced by a verified quotation." (`41-inbox-unverified-medicaid-owner.png`). For Legal the
   same filter shows 1.
4. **The household.** Walkthrough → CO-01 → Person 1 (age 79) → Medicaid: patient payment
   (`43-walkthrough-CO01-p1-patient-payment.png`). It now shows:
   - **"Unverified source: This result rests on 4 rules or figures citing an excerpt that is not a verified
     quotation"**, followed by the four, each with its S-number;
   - a **budget** table listing the $110.36 allowance.

   The payment is now $0.00, not the $179.64 of my first report.

**Finished?** Yes. **Time:** about 10 minutes (45 last time). **Confidence:** high on which figures are unverified;
medium on what depends on them.

**Improved**
- L4 is fixed: the "not a quotation" status is visible, and it reaches the item, the inbox row and the case result.

**Still wrong**

| Finding | Severity |
|---|---|
| There is no single "everything that rests on OM 25-073" list. The inbox gives "Affects 12 outcomes" per figure. My role page promises "unverified figures" in its door text but has no unverified card or count | slows |
| "Affects" looks too broad: the transfer-penalty divisor "affects Medicaid: MAGI eligibility status" | annoyance (trust) |
| The same CO-01 patient-payment result shows **"Statute over rule step 36: Federal law overrides 10 CCR 2506-1 4.407.31.A.1.b ... Heating and Cooling Utility Allowance"**. That is a SNAP departure inside a Medicaid result, through the community spouse's utility allowance (open as OQ-560). The view surfaced a real legal question, which is good. But it gives no line saying why a SNAP rule bears on an MMMNA | slows |
| In the same budget, "Person 2: Shelter cost, monthly" cites "Pub. L. 119-21 sec. 10104", an odd authority for a rent figure | annoyance |

---

## Task 5: A client appeals a SNAP decision (CO-87, the 58-year-old ABAWD)

**What I did**

1. **Walkthrough → CO-87** (`50-walkthrough-CO87-default.png`). It opens on Person 1, "SNAP: this person's
   participation: **Not eligible: member ABAWD time limit**", then "This is why step 10: ... time limit status is
   Limit reached". Then come two red banners:
   - "**Statute over rule** steps 11, 39, 44, 49: Federal law overrides the ABAWD definition of 10 CCR 2506-1 4.000,
     which still ends the age range at 54 ...";
   - the same for 4.311.1.

   My L1 complaint is gone. This is the first thing I would want before a hearing.
2. **The age-range step** shows the banner, "SNAP ABAWD maximum age 64 policy figure", and rule text that includes
   "**91 FR 72439 (Nov. 10, 2026) (proposed rule)**". So the weak point is visible, though I had to read the citation
   line to see it.
3. **"Print for an appeal file"** gives a 21-page document (`52-walkthrough-CO87-appeal-file.pdf`,
   `52-walkthrough-CO87-print-preview.png`). Its header gives:
   - "Determination date (as of): October 1, 2026";
   - the ledger and the full commit `fa11e8af...`;
   - the result;
   - both departure banners;
   - every step with its rule text.
4. **What the rule said on that date.**
   - The walkthrough is fixed to the case's determination date and has no "re-run as of" control.
   - By role and By outcome do have a **"Figures as of"** date. On 2025-06-01 By outcome honestly says "No figure
     before October ..." for figures that did not exist yet.
   - The figure line inside a step ("64 policy figure") does not show which version applied or that its only source is
     dated after the determination.

**Finished?** Yes. I can reconstruct the denial, print it with the version pinned, and show the departure. **Time:**
about 15 minutes (50 last time). **Confidence:** high on the why; medium on defending 64, which still rests on a
proposed rule published five weeks after the determination (L9, now visible but unchanged).

**Improved**
- L1 is fixed in the trace and in print.
- L8 is partly fixed: the commit and as-of date are printed, and the figure lists take an as-of date.
- The case page leads with the result, not facts.

**Still wrong**

| Finding | Severity |
|---|---|
| A step's figure does not show its version ("in force from 2025-07-04, source S1302, published 2026-11-10"). The postdating has to be read off a citation line | slows |
| No "as of" re-run in the walkthrough. The departures list ignores the as-of date | slows |
| "SNAP: is disqualified for refusing ... an SSN: Unknown not given" and "is a boarder: Unknown" still appear on a decided result without "did not matter" | annoyance |
| Case titles still read like a lab notebook: "CDHS review B-4: ...", "written for CDHS review B-4", "Engineering follow-up 8 (Corticon S-4)" | annoyance |

---

## New task: weigh a departure by its effect, then record Legal's decision

The views were meant to let Legal see what a departure does before ruling on it. On **OQ-533** (the ABAWD departure's
question), the page re-runs the stored households under the Colorado-rule reading (`32b-oq-533-full.png`):

> The other reading: Apply Colorado's SNAP rule as written until CDHS implements Pub. L. 119-21: the ABAWD time limit
> ends at age 54, not 64. ... Only the age limit is re-run. The exemptions sec. 10102 removed ... are not.
> Re-running the 29 stored households with that one change: 11 results in 2 households change.

For CO-87:
- Person 1 goes from "Limit reached" to "Not subject" and from "Not eligible: member ABAWD time limit" to "Eligible:
  member";
- his counted income goes from $300 to $0;
- the **allotment goes from $151 to $304**.

That is the advocate's argument, quantified, with the limits of the re-run stated honestly. I then recorded the
decision as in Task 3.

**Finished?** Yes (staged). **Time:** about 10 minutes. **Confidence:** high in the comparison.

| Finding | Severity |
|---|---|
| Only 5 of 80 open questions have a worked-out other reading. For the rest, including OQ-518 (247 results in 17 households) and OQ-517, the page says "not worked out", so I cannot do this for the Medicaid departure | slows |
| The re-run is on the question page but not on the departure card, where Legal decides | annoyance |

---

## Summary of the five tasks

| Task | First report | Retest | Time then → now | Confidence now |
|---|---|---|---|---|
| 1 Every statute-over-rule departure | Not reliably | The 7 marked, yes; **Medicaid still missing** | half a day → 10 min | Medium |
| 2 CO-509 to the verbatim regulation | Yes, with effort | **Yes** | 40 → 10 min | High |
| 3 Legal's queue; record an opinion | No | Lists yes; opinion staged, not in the record | 60 → 15 min | High / low |
| 4 Unverified figures and dependents | Partly | **Yes**, flagged through to results | 45 → 10 min | High / medium |
| 5 SNAP appeal (CO-87) | Why yes; date partly | **Yes**, departure shown, printable | 50 → 15 min | High / medium |
| New: weigh a departure, then decide | n/a | Yes (staged) | 10 min | High |

## My top 5 remaining problems

1. **The departure list looks complete and is not.** The Medicaid H.R.1 sec. 71109 departure (CO-509/CO-2400 over
   § 8.100.3.G.1.g) and CO-1190 are unmarked. HCPF's page says "0". OQ-518 is classed "Needs Legal" but is not a
   departure.
2. **A legal opinion still cannot enter the record without GitHub** or a steward nobody is named as. The question
   page offers no download.
3. **The answer form forces a resolution.** There is no "opinion with caveat, keep open", no "agency notified", and
   no staged marker afterwards in Departures or the queue.
4. **Dates are not carried to where I argue.**
   - "Since" is missing on 4 of 7 departures.
   - Step figures do not show their version or that their source postdates the determination.
   - The walkthrough has no "as of" re-run.
   - The departures list ignores the as-of date.
5. **"What changes" is worked out for only 5 of 80 questions.** Elsewhere the views count "rests on" or "reads it",
   and those counts contradict each other: CO-119 "no household rests on it" vs "6 households read it", and 27 vs 28
   questions.

## Does each view earn its place?

| View | Verdict | Why |
|---|---|---|
| **Questions** (with **Departures**) | **Yes: the most useful to Legal** | Departures with the paragraph departed from, the reasoning and a decision button is exactly what I asked for. It must include Medicaid and record "agency told". |
| **By role → Legal** | **Yes, as my home page** | The door and the four cards are the right front page. The counts must agree with the views they open. |
| **Walkthrough** | **Yes** | The departure banners, unverified flags, budget and "Print for an appeal file" with the commit pinned make it hearing-ready in a way the old trace was not. |
| **Approvals** | **Yes, for sign-off** | It finally gives one definition of "needs Legal" (215) and an Approve with my name. Signing still ends at GitHub. |
| **By outcome** | **Least useful to me, but keep** | Placeholder codes are clearly marked. Its "Figures as of" date was the only place I could ask "what was the figure then?" |

## What is now wrong or confusing in the views themselves

- **Owner and class on questions.**
  - Only 5 of 28 Legal questions are classed "Needs Legal".
  - OQ-518 is classed "Needs Legal" ("a statute and a Colorado rule point different ways") but is not in Departures.
  - Legal's own group is sorted last.
- **"Reading in force".** It still carries review history and code words:
  - "HCPF review B-1" (OQ-518);
  - "[K]" and "the HCPF reviewer's [K] statement" (OQ-517);
  - "a county-facing statute_override note" (OQ-533).

  It should be the current position in one sentence, with the history folded.
- **Counts.**
  - 27 vs 28 Legal questions.
  - HCPF "0 departures" while Legal has 7 and Medicaid has an unmarked one.
  - "Cites unverified text" is 1 for Legal and 6 for the Medicaid owner, with no Legal-wide unverified count anywhere.
  - CO-119: "No stored household result rests on it" vs "Stored households that read it: 6".
- **Labels.**
  - "Needs the Legal".
  - "1 item: 1 figures".
  - A SNAP "Statute over rule ... 10 CCR 2506-1" banner on a Medicaid patient-payment result, with no word on why.
- **Departure entries.** "Since" is missing on 4 of 7. Nothing records "agency told", though the tab's own heading says
  it is part of Legal's decision.
- **Budget table** (CO-01 patient payment). It is useful, but "Person 2: Shelter cost, monthly" cites Pub. L. 119-21
  sec. 10104. The SNAP utility allowance lines sit in a Medicaid budget without the OQ-560 question beside them.
- **Aid-code cells.** In the household grid, "Not known: a fact this needs is not stated" fills most cells for
  programs a case never tests. The placeholder marking is clear and correct.
- **Due dates.** Not tested in my tasks.
