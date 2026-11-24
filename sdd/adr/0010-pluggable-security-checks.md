# ADR-0010 — Pluggable security checks: the same control at every stage

- **Status:** Accepted · **Date:** 2026-11-24 · **Amends:** [ADR-0009](0009-external-security-scan-sonarqube.md)
- **Related:** Constitution Article XI · NFR-SEC-042..046 · `sdd/governance/checks.json` · `sdd/scripts/checks.mjs` · `sdd/docs/CHECKS.md`

## Context
ADR-0009 made SonarQube the gate before testing. Two things pushed us further:

1. **Shift left is about *where* a control runs, not *which* product runs it.** A bank already owns
   security controls (secret scanning, SAST, dependency policy, vulnerability management). The value is
   running the same control as early as possible — while Bob writes, at commit — and again in the pipeline
   where it cannot be switched off. Bob brings checks of its own; the organisation brings the rest.
2. **Labs and small teams need to run the loop without a server.** Requiring a SonarQube instance, a
   quality gate and tokens before anyone can practise hid the idea behind set-up work.

## Decision
1. **One list of checks, one place:** `sdd/governance/checks.json` (governance file, code-owner review).
   Each check has a `run` (a built-in check, or a `command` for an organisation tool), the `stages` it runs
   in (`bob`, `commit`, `scan`, `pipeline`) and `onFinding` (`block` or `warn`).
2. **Built-in checks need only Node:** secrets (also commit rule G10), risky code patterns, dependency
   rules with a deny-list. Bob's hook runs them on every write; the git pre-commit hook on what is staged.
3. **Organisation tools plug in as commands**, e.g. IBM detect-secrets, HashiCorp Vault Radar, OSV-Scanner,
   or a Bob Shell review in the pipeline (advisory). A tool that is switched on but missing fails closed.
4. **The scanner is a setting:** `"scanner": "builtin"` (the configured checks give the verdict; the kit's
   default) or `"sonarqube"` (ADR-0009 unchanged, with the checks still running alongside). Either way
   `scan.mjs` writes the evidence, bound to the code fingerprint and, for built-in, to the checks file.
5. **Modes follow the checks:** the scan step's mode is renamed 🔐 Check Runner (`check-runner`, formerly 📡 Scan
   Runner); it runs and explains the checks and cannot change them. The advisory `bob-review` check runs Bob Shell
   (`bob run --mode sdd-pr-reviewer`, with `BOB_API_KEY`) in the read-only 🔎 SDD PR Reviewer mode, so the pipeline
   review is the same review people get in the IDE. Bob V2's built-in modes (Agent, Plan, Ask) are overridden in
   Bob IDE to read and route only. The hand-review mode is 🛡️ Security Reviewer (`security-reviewer`), and its
   checklist is split: a general ASVS L2 skill in `.bob/`, the domain's abuse cases in `sdd/specs/domain/`.
6. **Locked:** the built-in secrets check cannot be switched off or downgraded (`checks.mjs --validate`,
   run in the pipeline's policy stage).

## Consequences
- ✅ The loop runs end to end with no server; teams add their own tools by editing one file.
- ✅ The audience sees shift left as a pattern: one control, four places, the earliest one cheapest.
- ⚠️ The built-in checks are deliberately simple (pattern checks, a deny-list). They are a floor, not a
  replacement for a full SAST or SCA tool; a bank sets `"scanner": "sonarqube"` or switches its own tools on.
