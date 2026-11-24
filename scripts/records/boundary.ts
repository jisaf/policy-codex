// The boundary lint between receipts (CO-5000) and earnings (CO-5100)
// (docs/design-earned-and-resource-records.md 2.3, risk 1): the same money
// stated in both lists is a double count no single counting table can see.
// A person is flagged who states, in the same month, a receipt and an
// earnings record of the same amount under a boundary pair: a receipt kind
// that is pay for service, or that a program may count as earned, beside the
// earnings kind the same money would be if it were pay.
//
// The receipt kinds that were earnings (special pay, payments for meals or a
// room only; design 2.3, OQ-1020) were stated in both lists from step E0, the
// earnings record written by the translator from the receipt, and the lint
// knew such a pair as a copy, not a finding. The translator went in step E2
// (docs/reviews/records-e2-h2.md); the last copies and the three receipt kinds
// went in the E2/H2 leftovers round, so every pair is now a finding.

type Rec = Record<string, unknown>;

/** [receipt kinds, earnings kinds, what the pair is]. */
export const BOUNDARY_PAIRS: ReadonlyArray<readonly [readonly string[], readonly string[], string]> = [
  [["dvsa_title_i_volunteer_payment"], ["wages", "subsidized_employment"], "a VISTA (DVSA Title I) payment"],
  [["americorps"], ["wages", "subsidized_employment"], "an AmeriCorps allowance"],
  [["vocational_training_allowance", "workforce_program_payment"], ["wages", "wioa_on_the_job_training", "subsidized_employment", "summer_youth_employment"], "a training allowance or WIOA payment"],
  [["other_taxable", "other_nontaxable", "rental_income"], ["boarder_payments"], "boarder payments"],
];

/** The months a record is in: its month, its date's month, or every month. */
const monthOf = (r: Rec): string | null => (typeof r.month === "string" ? r.month : typeof r.date === "string" ? r.date.slice(0, 7) : null);
const overlap = (a: Rec, b: Rec) => { const x = monthOf(a), y = monthOf(b); return x === null || y === null || x === y; };

export interface BoundaryFinding { pair: string; receipt: string; earning: string; amount: number; month: string | null }

/** One person's boundary pairs. */
export function lintPerson(receipts: unknown, earnings: unknown): BoundaryFinding[] {
  if (!Array.isArray(receipts) || !Array.isArray(earnings)) return [];
  const out: BoundaryFinding[] = [];
  for (const r of receipts as Rec[]) {
    if (typeof r.amount !== "number" || r.amount === 0) continue;
    for (const [rk, ek, what] of BOUNDARY_PAIRS) {
      if (!rk.includes(String(r.kind))) continue;
      for (const e of earnings as Rec[]) {
        if (!ek.includes(String(e.kind)) || e.amount !== r.amount || !overlap(r, e)) continue;
        out.push({ pair: what, receipt: String(r.kind), earning: String(e.kind), amount: r.amount, month: monthOf(r) ?? monthOf(e) });
      }
    }
  }
  return out;
}
