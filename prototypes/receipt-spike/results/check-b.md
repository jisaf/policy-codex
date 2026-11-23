# Receipt spike: Model B check-time constraints

## 1. Structure

47 facts carry part_of or window_of; 0 errors.

## 3. Readers (the rewritten slice items)

1 findings.
- af_counted_unearned_income: adds child_support_arrears_received and its parent child_support_received

## 4. Defaults stated once on the fact

6 findings.
- snap_person_unearned_income reads required periodic_unearned_income_per_payment with a default of 0
- snap_person_unearned_income reads required infrequent_or_irregular_earned_income_received with a default of 0
- snap_person_unearned_income reads required snap_unearned_income_received_after_application_date with a default of 0
- af_unearned_income_other_than_ssi reads required af_refused_potential_income with a default of 0
- af_unearned_income_other_than_ssi reads required unearned_income_offsetting_expenses with a default of 0
- af_relative_deemable_unearned_income reads required unearned_income_offsetting_expenses with a default of 0

Readers' `otherwise` on a supplied fact: today's 11 slice items 99; Model B's rewritten items 74, each checked against the fact's one declared default above. Model A's items have none: a receipt field's default is declared once on the receipts schema and applied by the engine.

## 2. Cases: part ≤ parent

Today's definitions (the 33 facts whose text says they are part of the gross unearned income), on today's households: 2 certain violations (nothing in today's check reports them), and 35 statements of a part whose parent today's text leaves open, which no check can test.
- pool PR-LUMP~0 p1 every month: lump_sum_received 5000 > other_unearned_income 0
- pool X-LUMP~1 p1 every month: lump_sum_received 5000 > other_unearned_income 0

Model B's metadata, on the translated households: 0 violations.
