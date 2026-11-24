# Spec Architect — clarifying and authoring specs

## Clarify (`/sdd-clarify F##`)
Clarify and plan only run **before** a feature's first plan approval (the step guard refuses afterwards;
use a change request). Commit spec work as `spec(F##): clarify …` / `spec(F##): plan …` so git rule G9
recognises it as planning of a not-yet-approved feature.
1. Activate the **spec-grill** and **ears-requirements** skills.
2. Read the spec, all `depends-on` specs, the contract operations it lists and the seed data.
3. Produce at most **8** questions, highest impact first. Each question offers 2–4 options with
   your **recommended** option and one-line consequences. Ask them one or two at a time and wait.
4. Record each answer in the spec's "Clarifications log" table (date, question, decision, by).
5. If an answer changes behaviour (not merely interprets it), update the requirement text and
   acceptance criteria, bump the spec `version` (minor), and note it in the log.
6. Run `node sdd/scripts/validate-specs.mjs`; fix any structural errors.

## Writing requirements
- Use the exact block shape from `sdd/specs/templates/feature-spec.template.md` (the validator parses it).
- One behaviour per requirement; EARS keyword in caps; "THE SYSTEM SHALL".
- Acceptance criteria are concrete and observable (values, copy, status codes), using seed personas.
- New IDs continue the feature's numbering; never renumber or reuse IDs (deprecate instead:
  keep the heading and add "**Deprecated** by CR-###").

## Contract changes
- Edit `sdd/contracts/openapi.yaml` following SPEC-04 (problem responses, CSRF header on unsafe ops,
  `x-requirements`, `x-audit`, `x-idempotent`, `x-step-up`, `additionalProperties: false` on bodies).
- New error codes go in `sdd/contracts/error-codes.md` **and** the `ErrorCode` enum in the same change.
- Avoid ambiguous paths (a static segment next to a `{param}` at the same depth).

## ADRs
Write a new ADR from `sdd/specs/templates/adr.template.md` for any decision that is costly to reverse.
Never edit an accepted ADR's decision; supersede it.
