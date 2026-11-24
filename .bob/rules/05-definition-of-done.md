# Rule 05 — Definition of Done

## Task (tasks.md checkbox)
- [ ] Code implements exactly the task's requirement IDs — no extra scope.
- [ ] Tests written/updated with `[REQ-ID]` tags; they fail without the change and pass with it.
- [ ] `pnpm lint && pnpm typecheck` clean; affected package tests green.
- [ ] i18n keys added in **both** `en.json` and `ar.json` (if UI).
- [ ] Contract-valid responses (contract tests green) (if API).
- [ ] No new warnings, no skipped tests, no lowered thresholds.
- [ ] Task DoD line satisfied; checkbox ticked; committed with Conventional Commit message.

## Feature (all tasks done)
- [ ] `sdd/reports/scan/F##.json` **PASS** and fresh (fingerprint matches the code) — before verification starts.
- [ ] `pnpm verify` green.
- [ ] Every acceptance criterion in spec.md maps to ≥ 1 passing tagged test (`pnpm specs:trace`).
- [ ] Journey E2E(s) for the feature green in Chromium, Firefox and WebKit.
- [ ] axe: 0 serious/critical on the feature's routes (en/ar × light/dark).
- [ ] `sdd/reports/verification/F##.md` (PASS) and `sdd/reports/security/F##.md` (no open High/Critical).
- [ ] Screen inventory / seed data / content guide updated if the feature changed them (via Architect).

## Phase
- [ ] Phase checklist in `sdd/specs/92-delivery-plan.md` complete and **human approval recorded**.
