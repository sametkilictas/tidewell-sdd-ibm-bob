---
description: Prove every acceptance criterion of a feature and write the verification report (🔍 Spec Verifier)
argument-hint: "<F##>"
---
Verify feature $1.

Mode: **🔍 Spec Verifier** (`spec-verifier`); switch if needed. Promotion to testing requires a
fresh PASS in `sdd/reports/scan/$1.json`; `step.mjs` refuses otherwise and names `/sdd-scan $1`.

0. **Start the step:** run `node sdd/scripts/step.mjs start verify $1 --mode spec-verifier`. If it refuses, relay its message to me verbatim and stop — it names the right mode/command.

Then follow `.bob/rules-spec-verifier/01-verification-protocol.md`:
run `pnpm verify` → `pnpm specs:trace` → close test gaps for each acceptance criterion of $1 →
exploratory pass with the Playwright MCP (en/ar, light/dark, keyboard-only) → a11y sweep →
write `sdd/reports/verification/$1.md` from `sdd/specs/templates/verification-report.template.md`.

Reply with the result (PASS / PASS WITH WAIVERS / FAIL), coverage for $1's requirements, and the
defect list (with severity) if any.
**Finish:** run `node sdd/scripts/step.mjs finish --outcome done` (or `--outcome blocked --note "<why>"`).
