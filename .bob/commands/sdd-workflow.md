---
description: Walk a feature (or the phase) through the SDD workflow — where it is, whose turn it is, and the next step
argument-hint: "[F## | phase | cr]"
---
Run the SDD workflow for $1 (if empty: the current phase). The workflows are defined in `sdd/workflows/`
(`feature-delivery`, `change-request`, `phase-gate`); every step is one of three kinds, like a Bob workflow:
🤖 **AI** (a Bob mode does it), ⚙️ **check** (plain code decides), ✍️ **sign-off** (a named person decides).

1. Run `node sdd/scripts/workflow.mjs status $1` (for "phase": `node sdd/scripts/workflow.mjs status`;
   for "cr": `node sdd/scripts/workflow.mjs show change-request`). If you cannot execute, use the
   injected [SDD STATE] block. Do not change any file.
2. Show me the steps as a compact list with the kind icon and ✔ / ▶ / ⏸ / ✖ / · status, then one line:
   **Next:** the single next action.
3. Offer the next action as a choice (use the ask-followup tool with buttons), like a workflow's
   "select action" gate:
   - next step is 🤖 or ⚙️ → "Switch to <mode> and run <command>" · "Show me the step first" · "Not now".
     When I pick the first, switch modes and run the command.
   - next step is ✍️ → name the person (role from `sdd/docs/ROLES.md`) and give the exact sign-off: on GitHub,
     the comment to type on the phase pull request (for example `/approve-plan F04`); in a terminal-only
     repository, the `approve.mjs` command. Offer: "Show what they should review first" · "Not now".
     You never sign, and you never post the comment for them.
   - something failed (✖) → explain the failure in one sentence and offer the step that fixes it.
4. If the feature runs on a pull request, remind me that GitHub re-checks every push (sdd-policy, signoffs,
   sonarqube) and that Bob's advisory review and `/bob fix` are available there.
