---
description: Progress report — phases, features, requirement coverage, open defects and change requests
---
Produce a progress report without changing source files.

1. If you can execute commands, run `node sdd/scripts/validate-specs.mjs --trace` (regenerates
   `sdd/traceability/matrix.md`); otherwise read the existing matrix.
2. Read `sdd/specs/92-delivery-plan.md` (gate table), every `sdd/specs/features/*/tasks.md` (checked vs
   unchecked), `sdd/reports/verification/*.md`, `sdd/reports/security/*.md`, `sdd/specs/change-requests/*.md`.
3. Reply with:
   - Phase table: `Phase | Features | Gate status`
   - Feature table: `Feature | Tasks done/total | Verification | Security | Open CRs`
   - Coverage: P1/P2/P3 covered % from the matrix summary
   - Top 5 risks or blockers, and the next recommended command.
