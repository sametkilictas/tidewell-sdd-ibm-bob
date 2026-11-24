# sdd/workflows — the SDD loop as workflows

IBM Bob 2.x has **workflows**: a fixed sequence of steps that Bob runs from the **Start Workflow** button or a
slash command, where each step is plain code, AI work (often in subagents) or a human gate where a person
picks the next action. Today only Bob's built-in workflows (review, pull requests) and the Premium Package
workflows (Java, IBM i, IBM Z, DevSecOps) exist; IBM has not yet opened workflow authoring to customers, and
there is no documented file format for one.

So this kit describes its loop in the same terms, as data, and runs it on the pieces Bob documents today:

| Bob workflow concept | Here |
|---|---|
| A named workflow with ordered steps | `feature-delivery.json`, `change-request.json`, `phase-gate.json` |
| Deterministic step (plain code, no tokens) | `"kind": "deterministic"` — a script decides: `scan.mjs`, `validate-specs.mjs`, the CI checks |
| AI step (agentic, may use subagents) | `"kind": "ai"` — one SDD mode runs one slash command inside a step started by `step.mjs` |
| Human gate ("Select action") | `"kind": "human-gate"` — a named role signs: a pull-request comment (`/approve-plan F04`) or `approve.mjs` |
| Start Workflow / slash command | `/sdd-workflow [F##]` in Bob; `/sdd status` on a pull request |
| Workflow state | derived from files and `sdd/state/approvals.json` by `sdd/scripts/workflow.mjs` |
| Nested workflows | `"then"`: feature-delivery → phase-gate; change-request → feature-delivery |
| Workflow guard rails | `.bob/settings.json` hooks (`SessionStart`, `UserPromptSubmit`, `PreToolUse`), mode `fileRegex`, git and CI checks |

## One definition, four readers
- **Bob** — `sdd/scripts/lib.mjs` builds the step table (which mode, which command) from these files; the
  hook injects the workflow position into every prompt; `/sdd-workflow` walks it and offers the next step.
- **Terminal** — `node sdd/scripts/workflow.mjs list | show <id> | status [F##] | next`.
- **GitHub** — `sdd-gates` writes the status table to its job summary; `/sdd status` answers on the pull
  request; the sign-off and Bob workflows read the gates and the implement step from here.
- **People** — the Atlas site and the lab guide draw the same steps.

## Format (`"schema": "sdd-workflow/1"`)
```json
{
  "id": "feature-delivery", "title": "…", "summary": "…",
  "target": "feature",                      // feature (F##) | cr (CR-###) | phase (N)
  "steps": [
    { "id": "plan", "kind": "ai", "title": "Plan the build", "mode": "spec-architect", "command": "/sdd-plan",
      "responsible": "architect", "does": "…", "writes": ["…"] },
    { "id": "approve-plan", "kind": "human-gate", "title": "Owner signs the plan", "decision": "plan",
      "approver": "business-owner", "reviewers": ["architect"], "github": "/approve-plan F##",
      "terminal": "node sdd/scripts/approve.mjs plan F##" },
    { "id": "scan", "kind": "deterministic", "run": "node sdd/scripts/scan.mjs F##", "onFail": "implement" }
  ],
  "then": "phase-gate"
}
```
Step IDs of `ai`/`deterministic` steps that name a mode and a command are the `step.mjs` steps; renaming one
renames the step everywhere. Roles are those of `sdd/docs/ROLES.md`; who holds them is
`sdd/governance/approvers.json`.

## When Bob opens workflow authoring
Each step already says what kind it is, who does it, which mode and command run it, and what decides it.
Porting means writing one native workflow per file: deterministic steps call the same scripts, AI steps run
the same mode and command (implement can fan out task groups to subagents), and human gates become Bob's
"select action" gate backed by the same sign-off. Until then, nothing here depends on an undocumented format.

Governance-protected: changes need review by the SDD approvers (CODEOWNERS) and commit scope `SDD`.
`prompts/` holds the prompts Bob gets when it runs headless on GitHub (`pr-review.md`, `pr-fix.md`).
