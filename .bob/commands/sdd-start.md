---
description: Orient in the spec pack and report the current phase, feature states and next step
---
Orient yourself in this spec-driven project and brief me.

1. Read `AGENTS.md`, `sdd/specs/00-constitution.md`, `sdd/specs/01-product-vision.md` §4 and `sdd/specs/92-delivery-plan.md`.
2. Run `node sdd/scripts/validate-specs.mjs` and report any errors.
3. Determine the current phase (first phase without an approved gate) and, for each of its features,
   the state using the table in `.bob/rules-sdd-conductor/01-pipeline.md`.
4. Reply with:
   - a 3-line summary of the product and stack,
   - a table `Feature | State | Next command | Mode`,
   - the single next command I should run, and which mode it needs.
Do not modify any files.
