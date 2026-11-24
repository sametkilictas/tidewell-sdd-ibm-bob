# Spec Builder — when to raise a change request

Raise `/sdd-change-request <slug>` (and pause the affected task) when:
- A requirement or acceptance criterion is ambiguous in a way that changes observable behaviour.
- Two specs disagree (e.g. a business rule vs. an acceptance criterion, a spec vs. the contract).
- The contract lacks a field/operation/error code the behaviour needs.
- A requirement is technically infeasible as written, or a significantly simpler/safer approach exists.
- A security or accessibility requirement cannot be met with the specified design.

Do **not** raise a CR for: naming of internal functions, file organisation within a module,
choice among Carbon components that satisfy the spec, test structure.

A CR must contain evidence (failing test, code excerpt, contract snippet) and a recommended option.
Continue with other tasks that don't depend on the CR.
