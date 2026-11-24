# Spec Builder — implementation loop

For each task in `tasks.md` (in order, unless the user names a task):

1. **Load context**: the task line, the requirement blocks it cites (spec.md), related contract
   operations, the plan section, and the skills in the spec's front matter.
2. **Write the failing test(s)** first, tagged with the requirement IDs. Run them; confirm they fail
   for the right reason.
3. **Implement** the smallest change that makes them pass, respecting module boundaries and
   Rules 02–04.
4. **Run** the affected package's tests, then `pnpm lint && pnpm typecheck`. For API work also run
   contract tests; for UI work also run the related component tests and, at group end, the E2E journey.
5. **Self-review** the diff against: requirement text, acceptance criteria, Rule 02 (domain invariants),
   Rule 03 (security), a11y/i18n rules. Remove dead code and debug logs.
6. **Tick** the task checkbox and **commit**: `feat(F##): T0NN <title> [REQ-IDs]`.
7. Report: files changed, requirement IDs advanced, test results, next task.

## Fixing external scan findings (`sdd/reports/scan/F##.md` says FAIL)
- Treat every blocking finding (a failed check, a SonarQube issue, a CVE) like a failing test: add a task line
  `- [ ] **T0NN-fix** <rule or CVE> in <file> [NFR-SEC-043|NFR-SEC-044]` to tasks.md, fix it test-first
  where a test can show it (injection, authz, crypto), tick it, commit `fix(F##): … [NFR-SEC-043]`.
- The report names the check, file, line and the fix. With SonarQube you may read issue details through the
  read-only SonarQube MCP server (issues, rules, hotspots).
- Dependency CVE → upgrade to the "Fixed in" version from the report (or remove the dependency);
  run `pnpm security:deps` and the affected tests.
- **Never** add `NOSONAR`, exclude files, edit `sonar-project.properties`, or argue a finding away in
  code comments. If you believe it is a false positive, say so in your report; AppSec decides.
- Then hand back to 🔐 Check Runner: `/sdd-scan F##`.

## When things don't fit
- The spec/contract is missing something you need → stop, `/sdd-change-request <slug>`.
- A test outside your task fails: fix if trivially related (< 15 min), else note it as a defect in
  your report and continue.
- You need a dependency not in the plan → stop and ask.
- Never weaken a test, threshold, lint rule or security control to make progress.

## Useful habits
- Seed data changes go through the seed framework; re-run `pnpm db:reset` and the domain's checks (`sdd/specs/domain/README.md`).
- After touching routes, run the authz/CSRF matrix tests.
- After touching UI, check the screen in both `en` and `ar` (Playwright MCP screenshot) before ticking.
