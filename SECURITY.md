# Security policy

This repository is a teaching kit: specifications, guardrail scripts and Bob configuration for a
fictional bank. It holds no real data and no application code yet, but its guardrails are meant to be
copied into real projects, so a weakness in them matters.

## Reporting a vulnerability

Please report privately through GitHub: **Security → Report a vulnerability** on this repository.
Do not open a public issue for:

- a way to get past a guardrail — sign-off verification, the step guard in Bob's hook, the commit
  rules G1–G10, the locked human gates in `sdd/scripts/policy.mjs`, or the GitHub workflows;
- anything that looks like a real credential committed to the repository (it should not exist: every
  secret-looking value here is a documented fake in `sdd/governance/secrets-allowlist.json`).

You will get an answer within a few working days. Fixes are released as a new tag, with credit if
you want it.

## Supported versions

Only the latest release on `main` is maintained.

## Scope notes

- The kit is written for IBM Bob V2. Bob itself is IBM's product; report Bob vulnerabilities to IBM.
- Tokens and keys belong in environment variables or your CI's secret store, never in files. If you
  fork the kit, keep it that way.
