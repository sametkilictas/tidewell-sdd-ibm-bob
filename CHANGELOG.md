# Changelog

All notable changes to this kit. Versions follow [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-11-24

First public release.

- **The kit:** a fully specified worked example (Tidewell Bank: 12 features, 212 requirements,
  287 acceptance criteria, 116 API operations) with everything that makes the specs binding.
- **IBM Bob V2 configuration:** ten modes, including overrides of the built-in Agent, Plan and Ask
  modes, fenced to their own files; rules, sixteen slash commands, skills and lifecycle hooks. The
  Bob layer is industry-agnostic: the domain lives in `sdd/specs/`.
- **Human sign-offs** bound to the exact files approved, by terminal command or pull-request comment,
  verified in the pipeline (four-eyes, roles, risk tiers).
- **The automation dial:** risk tiers decide who signs, the hand security review and how far Bob may
  run; locked human gates no setting can remove.
- **Shift-left security checks:** built-in checks (secrets, risky code, dependency deny-list) in
  Bob's hook, at commit, before testing and in the pipeline; your own tools plug in through
  `sdd/governance/checks.json` (examples from the IBM portfolio, SonarQube optional).
- **One pipeline gate for any CI:** `node sdd/scripts/ci.mjs pr`, with Jenkins, Azure DevOps, GitLab
  and GitHub Actions templates.
- **Evidence for auditors:** one command assembles a feature's evidence pack.
- **Learning material:** the interactive Atlas, a one-day lab guide, a presentation, an article and an
  explainer video, published on the project website.
