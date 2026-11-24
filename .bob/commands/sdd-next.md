---
description: Tell me the single next action in the SDD cycle, who does it, and switch me to the right mode
---
Using the injected [SDD STATE] block (or `node sdd/scripts/state.mjs` if you can execute):

1. Reply with the orientation line (rule 06 §2).
2. State the **single** next action for the current phase:
   - if it's a Bob step: the mode and exact command (e.g. `🏗️ Spec Builder → /sdd-implement F04`),
   - if it's a human gate: who signs (role), the exact sign-off from the [SDD STATE] block (a pull-request
     comment such as `/approve-plan F04`, or an `approve.mjs` command in a terminal-only repository) and what
     they should review first. Never post or run it yourself.
   (`node sdd/scripts/workflow.mjs next` gives the same answer; `/sdd-workflow` shows the whole workflow.)
3. If anything else is waiting (other features in the phase, open change requests), list it in ≤ 3 bullets.
4. If the next action is a Bob step in a different mode than yours, ask: "Switch to <mode> now?" and
   switch when I agree.
Do not change any files.
