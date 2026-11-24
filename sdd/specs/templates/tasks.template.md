---
feature: F##
title: Tasks — <Feature>
status: Draft            # Draft → Approved → In progress → Done
version: 0.1.0
plan: ./plan.md
legend: "[P] = parallelisable · Req = requirement IDs · DoD = task-level done check"
---

# Tasks — F## <Feature>

> Rules: 1–4 h per task; each task lists Req, Files and a verifiable DoD; tests are written
> in the same task as the code they prove; commit per task:
> `feat(F##): T0NN <title> [REQ-ID,...]`.

## Group A — Contract & domain
- [ ] **T001** <title>
  Req: XXXX-001 · Files: `…` · DoD: <command or test that proves it>

## Group B — API
- [ ] **T0NN** …

## Group C — Web
- [ ] **T0NN** …

## Group D — E2E, a11y, docs
- [ ] **T0NN** Journey test `e2e/journeys/J#.spec.ts` …

## Group E — Close-out
- [ ] **T0NN** `/sdd-verify F##` → `sdd/reports/verification/F##.md`; `/sdd-secure F##` → `sdd/reports/security/F##.md`; regenerate traceability.
