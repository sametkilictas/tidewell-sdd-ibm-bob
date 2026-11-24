---
description: Start the prototype and walk the stakeholder demo script, reporting any step that fails
---
Prepare and rehearse the stakeholder demo.

1. Run `pnpm infra:up`, `pnpm db:reset`, then start `pnpm dev` in the background; wait for
   `http://localhost:5173` and `http://localhost:4000/api/v1/health/ready`.
2. Using the Playwright MCP, execute every step of the demo script in `sdd/design/user-flows.md` §5
   whose feature has passed its phase gate (skip the rest and list them as "not yet built").
   Use seeded personas from `sdd/specs/91-seed-data.md` and OTP `000000` (demo mode).
3. Capture a screenshot per step into `sdd/reports/verification/demo/` (the 🔍 Spec Verifier mode can
   write there; switch to it if needed).
4. Reply with a table `Step | Result | Notes` and any defects found. Do not fix code in this command.
