# Architecture Decision Records

ADRs capture *why* the prototype is built the way it is, so Bob (and humans) can make
consistent decisions later. Format: [MADR](https://adr.github.io/madr/)-lite.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-typescript-monorepo.md) | TypeScript pnpm monorepo, Fastify API, React SPA | Accepted |
| [0002](0002-money-integer-minor-units.md) | Money as integer minor units; decimal strings on the wire | Accepted |
| [0003](0003-double-entry-ledger.md) | Double-entry ledger as the only source of balances | Accepted |
| [0004](0004-server-sessions-cookie-csrf.md) | Server-side sessions, HttpOnly cookies, synchronizer CSRF tokens | Accepted |
| [0005](0005-idempotency-keys.md) | Idempotency keys on all money movement | Accepted |
| [0006](0006-carbon-design-system.md) | IBM Carbon Design System for UI | Accepted |
| [0007](0007-simulated-external-systems.md) | Simulated external systems behind ports/adapters | Accepted |
| [0008](0008-contract-first-openapi.md) | Contract-first OpenAPI 3.1 with codegen and response validation | Accepted |
| [0009](0009-external-security-scan-sonarqube.md) | SonarQube as the external security gate before testing; Bob findings advisory | Accepted, amended by 0010 |
| [0010](0010-pluggable-security-checks.md) | Pluggable security checks: the same control at every stage; your organisation's tools plug in | Accepted |

**Rules for Bob**
- Never edit an Accepted ADR's decision. To change direction, write a new ADR that
  *supersedes* it (status of the old one becomes `Superseded by ADR-xxxx`) via a Change Request.
- Bob may append to the "Resolved versions" or "Notes" sections during implementation.
- Template: `sdd/specs/templates/adr.template.md`.
