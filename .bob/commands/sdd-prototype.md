---
description: Build the whole product by executing the delivery plan phase by phase (needs 🎼 SDD Conductor mode)
argument-hint: "[start-phase]"
---
Build the product described in `sdd/specs/01-product-vision.md` by executing `sdd/specs/92-delivery-plan.md`.

Mode: this command must run in **🎼 SDD Conductor** (`sdd-conductor`). If the current mode is
different, switch to it first.

Start phase: $1 (if empty, detect it as the first phase without an approved gate).

Procedure:
1. Follow `.bob/rules-sdd-conductor/01-pipeline.md` exactly.
2. For each feature of the phase, run the per-feature loop by delegating subtasks:
   clarify → plan (stop: the business owner signs it) → tasks → implement (one task group per subtask) →
   **scan** (🔐 Check Runner, the security checks in `sdd/governance/checks.json`; FAIL goes back to implement) → verify → secure. F00 ships with a plan and tasks: once a human has approved its plan, start it at "implement".
3. Keep a to-do list mirroring the phase gate checklist.
4. When every feature in the phase is done, present the gate checklist with evidence links
   (reports, matrix summary, `pnpm verify` result) and **stop for my approval**.
5. The business owner signs the phase (`/approve-phase N` on the phase pull request, or `approve.mjs phase N`
   in a terminal-only repository); the next [SDD STATE] block will show the new phase — then continue.

Never skip a gate, never weaken tests, never edit the constitution.
