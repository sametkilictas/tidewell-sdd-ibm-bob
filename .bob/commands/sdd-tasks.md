---
description: Break an approved plan into ordered, testable tasks (📐 Spec Architect)
argument-hint: "<F##>"
---
Generate the task list for feature $1.

Mode: **📐 Spec Architect** (`spec-architect`).

0. **Start the step:** run `node sdd/scripts/step.mjs start tasks $1 --mode spec-architect`. If it refuses, relay its message to me verbatim and stop — it names the right mode/command.
1. The step script already verified that a human approved the current plan.md (hash match).
2. Create `sdd/specs/features/$1-*/tasks.md` from `sdd/specs/templates/tasks.template.md`, matching the
   granularity of `sdd/specs/features/F00-foundation/tasks.md` and the rules in
   `.bob/rules-spec-architect/02-plan-and-tasks.md`.
3. Verify every requirement ID of the feature appears in at least one task's `Req:` line; list
   any deferred P3 IDs explicitly at the top.
4. Reply with the number of tasks per group, the critical path, and "Ready for /sdd-implement $1".
**Finish:** run `node sdd/scripts/step.mjs finish --outcome done` (or `--outcome blocked --note "<why>"`).
