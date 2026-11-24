# Contributing

Thank you for helping. This kit practises what it preaches: specs first, small reviewed changes,
checks that run the same for everyone.

## Before you start

- **Questions and ideas** → open a GitHub issue (Discussions, if enabled).
- **Bugs in the guardrails** (a check that lets something through, or blocks something it shouldn't)
  → an issue with the exact command and output. Security weaknesses → [SECURITY.md](SECURITY.md).
- **New domains** → welcome. The Bob layer is industry-agnostic; a new example lives in its own
  `sdd/specs/` (see `sdd/specs/domain/README.md` for the shape).

## Making a change

1. Fork, then create a branch from `main`.
2. Turn on the local checks: `git config core.hooksPath sdd/scripts/hooks`.
3. Keep each commit to one change, with a Conventional Commit message the kit accepts. Changes to
   `.bob/`, `sdd/scripts/`, `sdd/governance/`, `sdd/workflows/` or `.github/` use the scope `SDD`:
   `chore(SDD): …` (rule G7).
4. Run the self-tests before you push:

   ```bash
   node sdd/scripts/validate-specs.mjs
   node sdd/scripts/policy.mjs check
   node sdd/scripts/checks.mjs --validate
   node sdd/tests/checks/run.mjs
   bash sdd/tests/terminal/run.sh
   python3 sdd/tests/github-e2e/e2e.py
   ```

5. Open a pull request. Describe *why*, not only *what*; link the issue.

Never commit tokens, keys or real personal data, and never add sign-offs to `sdd/state/approvals.json`
in a contribution: sign-offs are made by people, in their own commits.

## Licence of contributions

By contributing you agree that your code is licensed under the Apache License 2.0 and your
documentation and media under CC BY 4.0, as described in [NOTICE](NOTICE).

## Code of conduct

Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).
