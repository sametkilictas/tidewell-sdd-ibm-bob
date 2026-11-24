---
id: NFR-A11Y
title: Accessibility and Internationalisation Requirements
status: Approved
version: 1.0.0
depends-on: [SPEC-00, SPEC-05]
standards: [WCAG 2.2 AA, WAI-ARIA 1.2, "Unicode Bidi (UAX 9)"]
---

# NFR — Accessibility and Internationalisation

## 1. Accessibility (WCAG 2.2 AA)

#### NFR-A11Y-001 — Automated accessibility gate
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL have zero axe-core violations of impact `serious` or `critical` on every route in `sdd/design/screen-inventory.md`, in light and dark themes, in `en` and `ar`.
- **Acceptance criteria:**
  - **NFR-A11Y-001-AC1** `e2e/a11y.spec.ts` visits every route (data-driven from the inventory) × 2 themes × 2 locales and asserts no serious/critical violations.
- **Verification:** E2E

#### NFR-A11Y-002 — Keyboard operability
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL make every interactive element reachable and operable by keyboard in a logical order with a visible focus indicator (≥ 2 px, 3:1 contrast) and no keyboard traps, except modal dialogs which trap focus until closed and return focus to the invoker.
- **Acceptance criteria:**
  - **NFR-A11Y-002-AC1** Journeys J2, J3 and J4 complete in Playwright using only `keyboard.press`/`type`.
- **Verification:** E2E

#### NFR-A11Y-003 — Screen-reader semantics
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL provide accessible names for all controls, landmarks (`header`, `nav`, `main`, `footer`), one `h1` per page, table headers for data tables, and SHALL announce asynchronous outcomes (form errors, toast results, transfer status changes) via ARIA live regions.
- **Acceptance criteria:**
  - **NFR-A11Y-003-AC1** Money amounts expose full spoken form through `aria-label` (e.g. "minus 125.00 UAE dirhams").
  - **NFR-A11Y-003-AC2** Manual NVDA + VoiceOver smoke script in `sdd/reports/verification/a11y-manual.md` signed off at phase 7.
- **Verification:** component tests + manual

#### NFR-A11Y-004 — Timing adjustable
- **Priority:** P1 · **Type:** State-driven
- **EARS:** WHILE a session is within 60 s of idle expiry, THE SYSTEM SHALL show a modal allowing the user to extend the session with a single action, and SHALL NOT expire FX quotes without showing a refresh action.
- **Acceptance criteria:**
  - **NFR-A11Y-004-AC1** See AUTH-031 acceptance criteria.
- **Verification:** E2E (fake timers)

#### NFR-A11Y-005 — Reflow, zoom and target size
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL support 400 % zoom / 320 CSS px width without horizontal scrolling (except data tables, which scroll within their container), text spacing overrides, and interactive targets ≥ 24 × 24 CSS px (WCAG 2.5.8).
- **Acceptance criteria:**
  - **NFR-A11Y-005-AC1** Playwright at 320 × 640 viewport: no document-level horizontal scroll on all customer routes.
- **Verification:** E2E

#### NFR-A11Y-006 — Accessible authentication
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL allow paste into password and OTP fields, support password managers (`autocomplete` attributes), and SHALL NOT use CAPTCHA puzzles (WCAG 3.3.8).
- **Acceptance criteria:**
  - **NFR-A11Y-006-AC1** OTP field has `autocomplete="one-time-code"` and paste of 6 digits completes entry.
- **Verification:** E2E

#### NFR-A11Y-007 — Charts have text alternatives
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL provide a visually-hidden or toggleable data table equivalent for every chart.
- **Acceptance criteria:**
  - **NFR-A11Y-007-AC1** Spending donut has a "View as table" toggle exposing the same values.
- **Verification:** component test

#### NFR-A11Y-008 — Reduced motion & contrast
- **Priority:** P2 · **Type:** State-driven
- **EARS:** WHILE `prefers-reduced-motion: reduce` is set, THE SYSTEM SHALL disable non-essential animation; and THE SYSTEM SHALL meet contrast ratios of 4.5:1 for text and 3:1 for UI components in both themes.
- **Acceptance criteria:**
  - **NFR-A11Y-008-AC1** Playwright with `reducedMotion: 'reduce'` shows no balance count-up animation.
- **Verification:** E2E

## 2. Internationalisation

#### NFR-I18N-001 — Bilingual UI
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL provide every user-facing string in English and Arabic via ICU message catalogs, with no hard-coded literals in components.
- **Acceptance criteria:**
  - **NFR-I18N-001-AC1** `pnpm i18n:check` reports zero missing keys between `en.json` and `ar.json` and zero unused keys.
  - **NFR-I18N-001-AC2** ESLint `formatjs/no-literal-string-in-jsx` passes.
- **Verification:** CI script + lint

#### NFR-I18N-002 — RTL layout
- **Priority:** P1 · **Type:** State-driven
- **EARS:** WHILE the locale is `ar`, THE SYSTEM SHALL render with `dir="rtl"`, mirror layout and directional icons, and isolate LTR tokens (IBAN, account numbers, amounts, references) per SPEC-05 §8.
- **Acceptance criteria:**
  - **NFR-I18N-002-AC1** Visual regression snapshots for Dashboard, Transfer review, Transactions in `ar` are approved and stored in `e2e/__snapshots__`.
- **Verification:** E2E visual snapshots

#### NFR-I18N-003 — Locale-aware formatting
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL format dates, times, numbers and currencies with `Intl` APIs for the active locale while using Western digits for monetary amounts and identifiers, and SHALL use the currency's exact exponent (AED 3, USD 2, JPY 0).
- **Acceptance criteria:**
  - **NFR-I18N-003-AC1** Unit tests: `formatMoney({amount:"1250.5", …})` is rejected (wrong exponent); `formatMoney("12505.00","AED","en")` → `AED 12,505.00`; `ar` → `‏12,505.00 د.ك.‏` or the agreed pattern documented in the content guide.
- **Verification:** unit

#### NFR-I18N-004 — Language persistence
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer switches language, THE SYSTEM SHALL apply it immediately without reload, persist it to the profile, and use it for emails, SMS, PDFs and notifications.
- **Acceptance criteria:**
  - **NFR-I18N-004-AC1** After switching to Arabic, a newly generated receipt PDF is in Arabic with RTL layout.
- **Verification:** integration + E2E

#### NFR-I18N-005 — Time zones and business calendar
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL store timestamps in UTC, evaluate cut-offs, business days (Mon–Fri) and holidays in `BUSINESS_TIMEZONE`, and display times in the customer's browser time zone with the zone abbreviation on receipts.
- **Acceptance criteria:**
  - **NFR-I18N-005-AC1** A domestic transfer submitted Friday 14:05 Asia/Dubai gets execution date next Monday (unless holiday).
- **Verification:** unit (business calendar)
