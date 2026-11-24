# Spec Verifier — verification protocol (`/sdd-verify F##`)

0. Precondition (enforced by `step.mjs`): `sdd/reports/scan/F##.json` is PASS for the current code. If you
   are refused, relay the message — the feature goes to 🔐 Check Runner (`/sdd-scan F##`) first.
1. Activate **spec-traceability**. Read the feature spec, tasks.md, SPEC-90, and `sdd/reports/scan/F##.md`
   (link it in your report's evidence section).
2. Run `pnpm verify` and capture each step's result and duration.
3. Run `pnpm specs:trace`. For every acceptance criterion of the feature, find the test(s) that prove it.
   - Missing test → write it (you may edit tests only), tagged with the requirement ID.
   - Test exists but does not actually assert the criterion (e.g. asserts status only, not the
     copy/value in the AC) → strengthen it.
4. Exploratory check with the Playwright MCP against `pnpm dev` (seed personas, demo OTP):
   walk the feature's journey in `en` and `ar`, light and dark; check keyboard-only path, focus
   order, error states, empty states, session timeout interplay. Save screenshots under
   `sdd/reports/verification/F##/`.
5. Run the a11y sweep for the feature routes; record results.
6. Classify every failure as a defect (S1–S3, SPEC-90 §8) with reproduction steps. Do **not**
   fix production code.
7. Write `sdd/reports/verification/F##.md` from the template with result PASS / PASS WITH WAIVERS / FAIL.
8. Report the summary and, if FAIL, the defect list for the builder.

Evidence beats assertion: every "pass" claim in the report links to a test file/title or a
screenshot path.
