# ADR-0001 — TypeScript pnpm monorepo, Fastify API, React SPA

- **Status:** Accepted · **Date:** 2026-11-18 · **Deciders:** Lead Architect, Product Owner

## Context
The prototype must be built quickly by an AI agent (IBM Bob) under human supervision, be
easy to run on a laptop, share types between client and server, and still look and behave
like a professional banking system.

## Decision
- One **pnpm workspace** monorepo: `apps/web`, `apps/api`, `packages/domain`,
  `packages/contracts`, `packages/config`, `e2e/`.
- **TypeScript strict** end-to-end; Node.js current LTS; Fastify 5 for the API; React 19 +
  Vite for the SPA; PostgreSQL + Prisma; Vitest + Playwright.
- Pure domain logic (money, IBAN, calendars, state machines, limits, fees) in
  `packages/domain`, shared by API and web.

## Consequences
- ✅ One language, shared types and Zod schemas; fast agent iteration; single `pnpm verify`.
- ✅ Domain package is trivially unit-testable (no I/O).
- ⚠️ Banks commonly run Java/Kotlin cores; the API is a *prototype* and ports/adapters keep
  a later move to Spring Boot / Quarkus feasible (the OpenAPI contract is the seam).
- ⚠️ Node's `number` is dangerous for money → mitigated by ADR-0002 and lint rules.

## Alternatives considered
| Option | Why not (for the prototype) |
|---|---|
| Spring Boot API + React | Two toolchains, slower agent loops, duplicated types |
| Next.js full-stack | Server components blur API contract boundary we want to demo |
| NestJS | More ceremony than needed; Fastify + modules is sufficient |

## Resolved versions
_Bob fills this table during F00 (FND-002) with exact versions from `pnpm-lock.yaml`._

| Package | Version |
|---|---|
| node | |
| pnpm | |
| typescript | |
| fastify | |
| prisma | |
| react | |
| vite | |
| @carbon/react | |
| vitest | |
| @playwright/test | |
