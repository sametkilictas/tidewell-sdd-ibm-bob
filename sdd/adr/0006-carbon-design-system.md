# ADR-0006 — IBM Carbon Design System for UI

- **Status:** Accepted · **Date:** 2026-11-18

## Context
The prototype must look professional immediately, be accessible (WCAG 2.2 AA) and support
RTL. It is built with IBM Bob, and Carbon is IBM's open-source design system with mature
React components, data tables, UI shell, charts and accessibility guidance.

## Decision
Use `@carbon/react` (v11), `@carbon/icons-react`, `@carbon/pictograms-react`,
`@carbon/charts-react`. Brand applied only via token overrides (SPEC-05 §2). No other
component library. Custom components (MoneyAmount, StatusTag, OtpInput, IbanText,
SessionTimeoutModal, EmptyState) compose Carbon primitives.

## Consequences
- ✅ Consistent, accessible, enterprise look; less custom CSS for Bob to get wrong.
- ⚠️ Bundle size — mitigate with route-level code splitting and per-component imports.
- ⚠️ RTL needs care in custom CSS (logical properties only).

## Alternatives
MUI, Chakra, Tailwind + headless UI — all viable, but Carbon gives the strongest
enterprise/a11y baseline and IBM alignment.
