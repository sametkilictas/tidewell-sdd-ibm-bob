# Rule 04 — Engineering standards

## TypeScript
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any` (use `unknown` + narrowing).
- Domain errors are `DomainError(code, params)` with codes from `sdd/contracts/error-codes.md`.
- Prefer pure functions in `packages/domain`; side effects only in application services/adapters.
- Module boundaries per SPEC-02 §5.1 — import other modules only via their `index.ts`.

## Naming & layout
- Files `kebab-case.ts`; React components `PascalCase.tsx`; tests next to code (`*.test.ts`) or
  in `apps/api/test/**/*.int.test.ts`; E2E in `e2e/journeys/J#-<slug>.spec.ts`.
- API route files mirror contract tags: `modules/<module>/routes/<tag>.routes.ts`.
- Handler names equal `operationId`s from the contract.

## Tests (see SPEC-90)
- Test titles carry requirement tags: `it('[<REQ-ID>] <behaviour>', …)`, e.g. `it('[XFER-021] rejects amount above daily limit', …)`.
- One `describe` per requirement or per unit; Given/When/Then wording in titles where useful.
- No `sleep`; use the fake `Clock` and polling helpers. No snapshot tests for logic.
- Use role-based queries (`getByRole`) in component and E2E tests.

## Web UI
- Carbon components only (activate the **carbon-ui** skill); brand via tokens, not ad-hoc CSS.
- Every string from i18n catalogs, every locale SPEC-05 lists updated together.
- Logical CSS properties only (`margin-inline-start`), never `left/right`.
- Every data view implements loading (skeleton), empty, error and partial states.
- Domain values and statuses only through the shared components in `sdd/design/component-map.md`.

## Git
- Conventional Commits: `feat(F04): T012 limits engine [XFER-021]`, `fix(F04): …`, `test(F04): …`.
- One task per commit; never commit secrets, `.env`, generated coverage or Playwright traces.
- Never push to `main`, never force-push, never rewrite published history.

## Commands (after F00)
`pnpm dev` · `pnpm test` · `pnpm test:e2e` · `pnpm lint` · `pnpm typecheck` · `pnpm verify` ·
`pnpm db:reset` · `pnpm contracts:gen` · `pnpm specs:check` · `pnpm specs:trace` · and the domain's checks
listed in `sdd/specs/domain/README.md`.
