---
description: Interrogate a feature spec for ambiguity and record decisions (📐 Spec Architect)
argument-hint: "<F##>"
---
Clarify feature $1 before planning.

Mode: **📐 Spec Architect** (`spec-architect`); switch if needed.

0. **Start the step:** run `node sdd/scripts/step.mjs start clarify $1 --mode spec-architect`. If it refuses, relay its message to me verbatim and stop — it names the right mode/command.
1. Locate `sdd/specs/features/$1-*/spec.md`. Read it, every spec in its `depends-on`, the contract
   operations named in its "API operations" section, `sdd/specs/91-seed-data.md` and relevant ADRs.
2. Activate the `spec-grill` and `ears-requirements` skills.
3. Find gaps: undefined values, conflicting rules, missing error/empty/edge states, untestable
   acceptance criteria, missing contract fields/codes, unclear UI behaviour, a11y/i18n gaps,
   security gaps.
4. Ask me at most 8 questions, one or two at a time, each with 2–4 options and your recommendation.
5. Record every decision in the spec's Clarifications log; update requirements/ACs only where a
   decision changes behaviour and bump the spec version.
6. Run `node sdd/scripts/validate-specs.mjs`; fix structural errors.
7. Commit as `spec($1): clarify …`. Finish with: decisions made, files changed, and "Ready for /sdd-plan $1" (or what blocks it).
   (After the plan is approved, clarify is refused: the spec is locked and changes need a change request.)
**Finish:** run `node sdd/scripts/step.mjs finish --outcome done` (or `--outcome blocked --note "<why>"`).
