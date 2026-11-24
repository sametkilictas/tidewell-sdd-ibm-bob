---
name: security-review
description: Security review procedure, general OWASP ASVS L2 checklist and severity guide for a feature - authentication, sessions, access control, business-logic abuse, sensitive data, injection, files, logging and configuration - followed by the project's own checklist in sdd/specs/domain/security-checklist.md. Use for /sdd-secure, before phase gates, or whenever code handles authentication, sessions, permissions, personal data, money or uploads.
---

# Security review skill

The procedure and the general checklist are the same for any product. What is special about this
product — its abuse cases and exact values — is in the project's own checklist,
`sdd/specs/domain/security-checklist.md` (for this repository's worked example: a bank).

## Procedure
1. Identify the slice: routes (contract tags), modules, screens, seed data, jobs.
2. Threat-model with STRIDE in 5–10 bullets (who could abuse what, and how).
3. Walk every applicable section of `checklist.md` (general), then the project's checklist. For each
   item record Pass / Fail / N/A with evidence (file:line, test name, command output).
4. Run the automated evidence the project names in `sdd/specs/nfr/NFR-security.md` and
   `sdd/specs/90-testing-strategy.md` (dependency audit, secret scan, authorization and CSRF matrix
   tests, log-capture test).
5. Rate findings with `severity-levels.md`. Use ASVS IDs (e.g. V4.2.1) as references.
6. Write the report from `sdd/specs/templates/security-report.template.md`.

## Failure patterns to hunt (any product)
- **IDOR** via nested IDs: `/parents/{mine}/children/{theirs}` — the child must be scoped by the parent *and* the owner.
- **Re-authentication bypass**: a step-up or confirmation token not bound to what it approved, so the request can change after verification.
- **Race conditions**: check-then-act on a balance, quota or limit without locks.
- **Idempotency key scoping**: keys global instead of per user ⇒ cross-user replay or data leak.
- **Enumeration**: different messages or timings for unknown users, enrolment details or reset requests.
- **Session fixation**: session ID not rotated on login, step-up or password change.
- **Sensitive data in client state**: revealed values kept in caches or stores after masking.
- **Open redirects** through `returnTo` after login.
- **Demo or test leakage**: bypasses, dev routes or demo markers active outside demo mode.
- **Stored XSS** in user-supplied names and text rendered to other users or to staff.
- **Back-office privilege**: missing access reason, the maker approving their own request, a customer reaching staff routes.

The project's checklist adds the abuse cases of its own domain.
