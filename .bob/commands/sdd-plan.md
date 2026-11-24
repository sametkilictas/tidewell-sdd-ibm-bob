---
description: Write the implementation plan for a feature and request approval (📐 Spec Architect)
argument-hint: "<F##>"
---
Write the implementation plan for feature $1.

Mode: **📐 Spec Architect** (`spec-architect`); switch if needed.

0. **Start the step:** run `node sdd/scripts/step.mjs start plan $1 --mode spec-architect`. If it refuses, relay its message to me verbatim and stop — it names the right mode/command.
1. Read `sdd/specs/features/$1-*/spec.md` (and its `depends-on`), `sdd/specs/02-architecture.md`,
   `sdd/specs/03-domain-model.md`, `sdd/specs/04-api-guidelines.md`, `sdd/specs/05-design-system.md`,
   `sdd/specs/90-testing-strategy.md`, the ADRs, and the worked example
   `sdd/specs/features/F00-foundation/plan.md`.
2. If the spec's Clarifications log is empty and you find blocking ambiguity, run the clarify
   protocol first.
3. Create `sdd/specs/features/$1-*/plan.md` from `sdd/specs/templates/plan.template.md`, following
   `.bob/rules-spec-architect/02-plan-and-tasks.md`.
4. Apply the contract changes listed in the plan to `sdd/contracts/openapi.yaml` (and error codes),
   then run `node sdd/scripts/validate-specs.mjs`.
5. Commit as `spec($1): plan …` (contract/ADR/design edits are only allowed in planning commits of a
   not-yet-approved feature — git rule G9). Set `status: Ready for approval`, finish the step, and **stop**: show me the Constitution check,
   the requirement mapping summary, new dependencies and risks. The sign-off belongs to the business owner (after the
   architect and analyst review): on GitHub they comment `/approve-plan $1` on the phase pull request; in a
   terminal-only repository they run `node sdd/scripts/approve.mjs plan $1` (the [SDD STATE] block
   says which). Either way it is bound to the hashes of plan.md **and** spec.md — any later edit to either voids
   it, and later spec changes need a change request. Never mark the plan Approved yourself, never post the comment.
**Finish:** run `node sdd/scripts/step.mjs finish --outcome done` (or `--outcome blocked --note "<why>"`).
