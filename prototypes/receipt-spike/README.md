# Receipt spike (record)

The time-boxed spike behind docs/reviews/receipt-spike.md. The product owner adopted Model A (receipt
records) on 2026-11-23; migration phase 1 is docs/reviews/receipts-migration-1.md.

Kept here as the record: the two models' overlays (`model-a/`, `model-b/`), the engine and operator-doc
change as the spike wrote it (`engine-and-docs.patch`, superseded by the engine commit of migration
phase 1), and the spike's raw results (`results/`).

The spike's scripts moved: the harness, the translator, the generated households and the metamorphic
tests are `scripts/receipts/` (`npm run receipts:harness`, `npm run receipts:translate`), typechecked
and brought to the adopted kinds. The spike's own versions, and its Model B check, measurement and
reader scripts, are in git history at 41ec04b (`prototypes/receipt-spike/*.ts`).
