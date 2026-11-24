---
description: Apply a human-approved change request to the specs, contract, ADRs and design (📐 Spec Architect)
argument-hint: "<CR-###>"
---
Apply change request $1.

Mode: **📐 Spec Architect** (`spec-architect`); switch if needed.

0. **Start the step:** run `node sdd/scripts/step.mjs start apply-cr $1 --mode spec-architect`. If it
   refuses (for example, no human approval yet), relay its message verbatim and stop.
1. Read `sdd/specs/change-requests/$1-*.md` and the approved option recorded in `sdd/state/approvals.json`.
2. Apply exactly the approved option to the files listed in `affects`; bump each changed spec's
   `version`; add a Clarifications-log row referencing $1. The constitution may change only if the CR
   lists it under `affects`.
3. If a feature's **plan.md or spec.md** changes, its human plan approval becomes stale by design (spec
   lock) — tell me it needs a new plan sign-off from the business owner (`/approve-plan F##` on the pull request, or
   `approve.mjs plan F##` in a terminal-only repository). The sign-off accepts the changed spec because this CR
   was approved after the previous plan approval.
3b. Commit the changes as `spec($1): apply <short title>` — git rule G9 rejects approved-scope changes
   that don't cite an approved CR whose `affects` lists each changed file.
4. Run `node sdd/scripts/validate-specs.mjs`; fix structural errors.
5. Update the CR's front matter (`status: Approved`, `decision-by`, `decision-on`) and the table in
   `sdd/specs/change-requests/README.md`.

**Finish:** `node sdd/scripts/step.mjs finish --outcome done`, then list changed files and which
tasks/plans need rework.
