# Receipt spike: metamorphic tests

## Property relations over every translated household

| Relation | Households | Violations |
|---|---|---|
| MA-1 split | 449 | 0 |
| MA-2 order | 449 | 0 |
| MA-3 month | 449 | 0 |
| MA-4 residual | 449 | 0 |
| MO-1 residual | 28 | 0 |
| MB-1 residual | 13 | 0 |

### F1: $900 of monthly child support and a $3,000 one-time crime victim compensation payment on 2026-11-03

Rule: LEAP household income 2900, SNAP unearned 900, AF deemable unearned 900 (3.752.23.G; 4.405.A.27 and E; 3.520.786.J)

| Statement | leap_household_income | snap_person_unearned_income | af_relative_deemable_unearned_income |
|---|---|---|---|
| today: crime_victim_compensation_received 3000 (in other nontaxable) | 2900 | 900 | 900 |
| today: + lump_sum_received 3000 + thirty-day lump 3000 (the same money; CO-4960 says it is both) | 2900 | 0 | 900 |
| today: the same + named_source_receipts_in_lump_sum_prior_thirty_days 3000 | 2900 | 0 | 900 |
| today: lump and crime victim facts, parent not raised (part > parent; nothing rejects it) | 2000 | 0 | 0 |
| A: {child_support, 900} and {crime_victim_compensation, 3000, once, 2026-11-03} | 2900 | 900 | 900 |
| A: the same, the payment stated by month only | 2900 | 900 | 900 |
| A: the same, the payment stated as recurring (frequency left at its default) | 2900 | 900 | 900 |
| B: child support 900, crime_victim_compensation_received 3000 (the only statement the partition permits) | 2900 | 900 | 900 |
| B: mis-stated as one_time_payment_not_otherwise_named 3000 + window 3000 (forbidden by its meaning; no check can see it) | 5900 | 900 | 3900 |

### F2: a $2,000 one-time child support arrears payment on 2026-10-25 (inside the period)

Rule: LEAP household income 4000 (3.752.21; 3.752.22.A)

| Statement | leap_household_income |
|---|---|
| today: lump_sum_received 2000 in October (in other nontaxable) + thirty-day lump 2000 | 4000 |
| today: child_support_received 2000 in October | 2000 |
| A: {child_support_arrears, 2000, once, 2026-10-25} | 4000 |
| B: child_support_received 2000 in October (the partition's only place for child support) | 2000 |
| B: as a one-time payment not otherwise named (forbidden: child support is named) | 4000 |

### F3: unemployment $100 a week (five payments in February) and a $300 quarterly dividend paid in February

Rule: SNAP unearned 100 × 4.3 + 300 × 0.333333 = 529.9999 (4.402.A.2)

| Statement | snap_person_unearned_income |
|---|---|
| today: the periodic facts can state one income per person (the weekly one); the dividend is counted as received | 730 |
| A: two receipts, each with its own frequency | 529.9999 |
| B: as today (the partition has no per-receipt frequency) | 730 |

### F4: $100 of $300 set aside under a PASS

Rule: the same answer whether the $300 is Social Security or a pension

| Statement | leap_household_income | snap_person_unearned_income | af_relative_deemable_unearned_income |
|---|---|---|---|
| today: Social Security 300, PASS 100 | 2200 | 200 | 200 |
| today: pension 300, PASS 100 | 2200 | 200 | 200 |
| A: {social_security, 300, pass_set_aside 100} | 2200 | 200 | 200 |
| A: {pension, 300, pass_set_aside 100} | 2200 | 200 | 200 |
| B: Social Security 300, PASS 100 (part of the group) | 2200 | 200 | 200 |
| B: pension 300, PASS 100 | 2200 | 200 | 200 |
