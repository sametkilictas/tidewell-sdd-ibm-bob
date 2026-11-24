---
description: Raise a change request when a spec is ambiguous, contradictory or infeasible, then pause that work
argument-hint: "<short-slug>"
---
Raise a change request named "$1". (No step is needed: any writing mode may create a CR file at any time.)

1. Find the next free number `NNN` in `sdd/specs/change-requests/` (start at 001).
2. Create `sdd/specs/change-requests/CR-NNN-$1.md` from `sdd/specs/templates/change-request.template.md`.
3. Fill Problem (quote requirement IDs and lines), Evidence (test output, code, contract snippet),
   2–3 Options with impact, your Recommendation, and the proposed spec diff.
4. Add a row to the table in `sdd/specs/change-requests/README.md`.
5. **Stop** work that depends on this CR and tell me exactly what decision you need. The business owner records
   it — on GitHub with a comment on the pull request (`/approve-cr CR-NNN option A` or `/reject-cr CR-NNN <reason>`),
   in a terminal-only repository with `node sdd/scripts/approve.mjs cr CR-NNN --decision approved|rejected --option A`.
   If the CR came from a GitHub issue (Change request form), link the issue in the CR file.
   After approval the 📐 Spec Architect applies it with `/sdd-apply-cr CR-NNN`.
