# ADR-0008 — Contract-first OpenAPI 3.1 with codegen and response validation

- **Status:** Accepted · **Date:** 2026-11-18

## Context
An AI agent implementing many endpoints will drift from intent unless a machine-checkable
contract exists.

## Decision
- `sdd/contracts/openapi.yaml` is written/updated **before** code (Spec Architect mode only).
- `pnpm contracts:lint` (Redocly CLI recommended ruleset + custom rules: every operation
  has `operationId`, `x-requirements`, `security` or explicit `security: []`, problem
  responses; every unsafe op documents `X-CSRF-Token`).
- `pnpm contracts:gen` → `packages/contracts/src/generated.ts` (openapi-typescript).
- Fastify validates requests with the contract's schemas; in test mode **responses** are
  validated too, and any mismatch fails the test.
- Web API client is typed from generated types (`openapi-fetch`).

## Consequences
- ✅ Contract drift is a red test. Traceability from requirement → operation via `x-requirements`.
- ⚠️ Contract edits are gated (Builder mode cannot edit `sdd/contracts/`), which is intentional.
