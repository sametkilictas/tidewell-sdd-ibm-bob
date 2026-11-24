# Security Reviewer — review protocol (`/sdd-secure F##`)

1. Activate **security-review**; read its `checklist.md` and `severity-levels.md`, then the project's
   own checklist `sdd/specs/domain/security-checklist.md`. Read `sdd/reports/scan/F##.md` first: the
   security checks (built-in, the organisation's tools, or SonarQube) already covered pattern-level
   problems, secrets and dependencies. Spend your time on what tools cannot see — business logic,
   authorization, step-up binding, the domain invariants (rule 02), abuse cases. When SonarQube is the
   scanner, use its read-only MCP tools (`search_security_hotspots`, `show_security_hotspot`,
   `search_sonar_issues_in_projects`) to cross-check, never to change status.
2. Scope: routes (from contract tags in the spec front matter), modules, web features and
   seed changes of the feature. Build a short STRIDE threat model for the slice.
3. Review code paths for: object-level authorization, CSRF, step-up binding, idempotency, input
   validation, the domain invariants, logging and redaction, error leakage, rate limits, session
   handling, file handling, client-side storage of sensitive data, demo fencing.
4. Run the evidence commands the project names in `sdd/specs/nfr/NFR-security.md` (for the worked
   example: `pnpm security:deps`, `pnpm security:secrets`, the authorization and CSRF matrix tests,
   the log-capture test). Optionally probe the running app (Playwright MCP) for IDOR by swapping IDs
   between two seeded users (SPEC-91), replaying requests without CSRF, reusing step-up tokens.
5. Record findings with severity, ASVS reference, location, reproduction, recommendation.
6. Write `sdd/reports/security/F##.md` from `sdd/specs/templates/security-report.template.md`, including the
   "Security checks evidence" section (scanner, verdict, fingerprint, open findings you reviewed).
7. High/Critical findings block the feature; report them for the builder. If a finding needs a
   spec change, raise a change request.

Never attempt attacks outside localhost or against any real system.
