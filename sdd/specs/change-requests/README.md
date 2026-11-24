# Change Requests

Implementation never silently diverges from the specs (Constitution Art. I). When Bob (any
mode) or a human finds a gap, contradiction or better approach:

1. Run `/sdd-change-request <short-slug>` — Bob creates `CR-<nnn>-<slug>.md` here from
   `sdd/specs/templates/change-request.template.md`, fills Problem/Evidence/Options/Recommendation
   and the proposed diff, and **stops**.
2. A human records the decision in §6 of the CR.
3. On approval, the 📐 Spec Architect mode applies the changes to the affected specs,
   bumps their `version`, regenerates the contract if needed, and links the CR in the
   spec's Clarifications log.
4. The 🏗️ Spec Builder resumes from the updated tasks.

| CR | Title | Status | Affects |
|---|---|---|---|
| — | — | — | — |
