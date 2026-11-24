---
description: Implement tasks for a feature test-first, one commit per task (🏗️ Spec Builder)
argument-hint: "<F##> [T0NN | group-letter]"
---
Implement feature $1, scope: $2 (if empty: all unchecked tasks in order). If `sdd/reports/scan/$1.md`
says FAIL, the scope is fixing its blocking findings first (rule: "Fixing external scan findings").

Mode: **🏗️ Spec Builder** (`spec-builder`); switch if needed.

0. **Start the step:** run `node sdd/scripts/step.mjs start implement $1 --mode spec-builder [--task $2 if $2 is a task ID]`. If it refuses, relay its message to me verbatim and stop — it names the right mode/command.
1. Read `sdd/specs/features/$1-*/tasks.md`, `plan.md`, `spec.md` and the skills in the spec's front matter.
2. Create a to-do list for the tasks in scope.
3. For each task, follow `.bob/rules-spec-builder/01-implementation-loop.md` exactly
   (failing tagged test → implement → run tests/lint/typecheck → self-review → tick → commit).
4. If you hit a spec gap, follow `.bob/rules-spec-builder/02-change-requests.md` and continue with
   independent tasks.
5. At the end of the scope run `pnpm verify` and reply with: tasks completed, commits, test summary,
   open CRs/defects, and the next command (`/sdd-scan $1` in 🔐 Check Runner when all tasks are
   checked — testing starts only after the external scan passes).
**Finish:** run `node sdd/scripts/step.mjs finish --outcome done` (or `--outcome blocked --note "<why>"`).
