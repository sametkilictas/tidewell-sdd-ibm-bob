# Rule 02 — Domain invariants

Every product has a few rules that must never break: what counts as a valid amount, which state
changes are allowed, what must happen in one transaction, what may never be shown or stored. They
are the rules an AI most often gets subtly wrong, so in this repository they are written down once,
as specs, and treated as hard requirements.

- **Where they live:** `sdd/specs/domain/` — start at `sdd/specs/domain/README.md`, which lists the
  invariant files and what each covers — plus the MUST rules of `sdd/specs/00-constitution.md` and
  the domain model `sdd/specs/03-domain-model.md`.
- **Before you write or review code that touches them**, activate the **domain-rules** skill. It tells
  you which domain file applies to the code in front of you.
- **Never weaken one to make a task pass.** If an invariant blocks the task, the spec is wrong or the
  task is: raise a change request (`/sdd-change-request`); do not work around it.
- **Prove them.** Every invariant that can be tested has a test tagged with its requirement ID, and the
  domain's own checks (named in `sdd/specs/domain/README.md`) run after seeds and in integration tests.
- **Synthetic data only** (SPEC-91): no real organisation names, people, account or card numbers.

Changing this rule, or the files it points to, is a governance change (`chore(SDD): …`, reviewed by
the code owners), like any other file in `.bob/` and `sdd/specs/`.
