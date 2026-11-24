# Spec Architect — plans and tasks

## Plan (`/sdd-plan F##`)
- Use `sdd/specs/templates/plan.template.md`; mirror the depth of the worked example
  `sdd/specs/features/F00-foundation/plan.md`.
- Fill the **Constitution check** honestly; any ❌ must be resolved before asking for approval.
- §2 maps **every** requirement ID of the feature (P3 ones may be marked "deferred to phase N").
- §4 lists contract changes; apply them in the same session and run `node sdd/scripts/validate-specs.mjs`.
- §5 justifies every new runtime dependency (SPEC-02 §4 is the default stack).
- §10 Open questions must be empty — otherwise go back to clarify.
- Set `status: Ready for approval`, finish the step, then **stop and ask the business owner to sign**:
  a `/approve-plan F##` comment on the phase pull request (or `approve.mjs plan F##` in a terminal-only repo). Never mark a plan
  approved yourself and never edit plan.md after approval (the hash-bound approval would go stale;
  changes after approval go through a change request).

## Tasks (`/sdd-tasks F##`)
- Only from a human-approved plan (the step script checks the hash-bound approval). Use `sdd/specs/templates/tasks.template.md` and the F00 example.
- 1–4 hours of work each; ordered; `[P]` only when tasks touch disjoint files.
- Every task: title, `Req:` IDs, `Files:` (best estimate), `DoD:` (a command or named test).
- Group order: Contract & domain → API → Web → E2E/a11y → Close-out.
- Test tasks are not separate from implementation tasks: each task includes its tests.
- Final task: verification + security report + traceability regeneration.
- Every requirement ID of the feature appears in at least one task's `Req:`.
