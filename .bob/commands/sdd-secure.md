---
description: Security review of a feature against OWASP ASVS L2 and the project's own checklist (🛡️ Security Reviewer)
argument-hint: "<F##>"
---
Security-review feature $1.

Mode: **🛡️ Security Reviewer** (`security-reviewer`); switch if needed.

0. **Start the step:** run `node sdd/scripts/step.mjs start secure $1 --mode security-reviewer`. If it refuses, relay its message to me verbatim and stop — it names the right mode/command.

Then follow `.bob/rules-security-reviewer/01-review-protocol.md` and the `security-review`
skill. Write `sdd/reports/security/$1.md` from `sdd/specs/templates/security-report.template.md`.

Reply with: result, findings count by severity, the High/Critical findings in full, and whether
the feature may proceed to the phase gate.
**Finish:** run `node sdd/scripts/step.mjs finish --outcome done` (or `--outcome blocked --note "<why>"`).
