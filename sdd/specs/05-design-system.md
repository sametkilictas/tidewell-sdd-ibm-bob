---
id: SPEC-05
title: Design System, Layout and Interaction Patterns
status: Approved
version: 1.0.0
depends-on: [SPEC-00, SPEC-01]
adrs: [ADR-0006]
skills: [carbon-ui]
related: [sdd/design/screen-inventory.md, sdd/design/wireframes.md, sdd/design/content-style-guide.md, sdd/specs/nfr/NFR-accessibility-i18n.md]
---

# 05 — Design System, Layout and Interaction Patterns

## 1. Foundation
- **IBM Carbon Design System v11** via `@carbon/react` (ADR-0006).
- Themes: `white` (light default), `g100` (dark). `system` preference follows
  `prefers-color-scheme`. The ops console always uses `g10` with a distinct header colour so
  staff never confuse it with the customer app.
- Fonts: **IBM Plex Sans** (Latin) and **IBM Plex Sans Arabic** (Arabic), self-hosted
  (no third-party font CDNs — CSP). Numerals: Western Arabic digits (0–9) in both locales
  for amounts, account numbers and IBANs (bank convention); dates follow locale.

## 2. Brand layer (fictional Tidewell brand)
Brand colours are applied **only** through Carbon token overrides in `apps/web/src/styles/theme.scss`.

| Token (override) | Light | Dark | Use |
|---|---|---|---|
| `$interactive` / `$button-primary` | `#0B5C6B` (Tidewell Teal 70) | `#3DB8C9` (Teal 40) | Primary actions, links |
| `$button-primary-hover` | `#084A57` | `#5FCAD8` | |
| `$focus` | `#0F62FE` (Carbon default) | `#FFFFFF` | Keep high-contrast focus |
| `$support-success` | Carbon default | Carbon default | Completed statuses |
| `$support-error` | Carbon default | Carbon default | Failed / debit warnings |
| Header background | `#0B2E36` | `#0B2E36` | UI Shell header (customer) |
| Ops header background | `#3D1F5C` | `#3D1F5C` | UI Shell header (ops) |

All text/background pairs must meet **WCAG 2.2 AA (4.5:1 body, 3:1 large text & UI)**.
The logo is a simple wordmark "Tidewell" with a wave glyph built from Carbon icon primitives —
no real bank marks.

## 3. Layout
### 3.1 Application shell (customer)
```
┌──────────────────────────────────────────────────────────────────────────┐
│ DEMO ENVIRONMENT — NO REAL MONEY (persistent banner, role=status)         │
├──────────────────────────────────────────────────────────────────────────┤
│ ☰  Tidewell           [Search ⌘K]          🔔3   EN|ع   👤 Sara ▾        │  ← Carbon Header
├────────────┬─────────────────────────────────────────────────────────────┤
│ Dashboard  │  Breadcrumb / Page title                     [Primary CTA]  │
│ Accounts   │  ─────────────────────────────────────────────────────────  │
│ Transfers  │                                                             │
│ Payments   │   Content (Carbon Grid, 16 columns ≥ lg, 8 md, 4 sm)        │
│ Cards      │                                                             │
│ Statements │                                                             │
│ Messages   │                                                             │
│ Settings   │                                                             │
│ ────────── │                                                             │
│ Sign out   │                                                             │
└────────────┴─────────────────────────────────────────────────────────────┘
```
- Side nav: Carbon `SideNav` (rail on `md`, overlay on `sm`, expanded on `lg+`).
- Max content width 1584 px; page padding per Carbon grid.
- Breakpoints: Carbon defaults (`sm` 320, `md` 672, `lg` 1056, `xlg` 1312, `max` 1584).
  Must work from **360 px** width (NFR-A11Y reflow).
- Skip link "Skip to main content" is the first focusable element.

### 3.2 Page templates
| Template | Used by | Structure |
|---|---|---|
| **Overview** | Dashboard | Greeting + last-login line; tiles grid; widgets with independent loading |
| **List** | Accounts, Transactions, Beneficiaries, Cards, Statements, Messages | Header + toolbar (search, filters, actions) + DataTable/StructuredList + pagination/infinite load |
| **Detail** | Account, Card, Transfer, Thread | Header with key facts (balance/status) + Tabs + side panel actions |
| **Wizard** | Transfer, Add beneficiary, Pay bill, Report card | Carbon `ProgressIndicator` (vertical on lg, horizontal on sm), one step per screen, sticky footer with Back / Continue; final **Review** step; **Receipt** page |
| **Settings** | Profile & security | Left `ContentSwitcher`/tabs + forms with inline save |
| **Auth** | Sign-in, MFA, Enrol, Reset | Centered card (max 480 px), brand panel on lg+, no side nav |

## 4. Component mapping (use these; do not hand-roll)
| Need | Carbon component | Notes |
|---|---|---|
| Money display | custom `<MoneyAmount>` wrapping text | Uses `Intl.NumberFormat` + domain exponent; `aria-label` spells sign ("minus 125.00 UAE dirhams") |
| Balance tiles | `Tile`, `ClickableTile` | Show available (prominent) + ledger (secondary) |
| Lists of transactions | `DataTable` (sortable, with `TableToolbar`, `TableBatchActions` off) | Sticky header; amount column right-aligned (left in RTL) |
| Filters | `FilterableMultiSelect`, `DatePicker` (range), `NumberInput`, `Search`, `Tag` (dismissible active filters) | |
| Status | `Tag` (type per status table §6) + icon + text (never colour alone) | |
| Forms | `TextInput`, `Select`, `ComboBox`, `RadioButtonGroup`, `Toggle`, `Checkbox`, `FormGroup` | Inline validation on blur; summary of errors at top on submit (`InlineNotification` with links) |
| Wizard | `ProgressIndicator`, `ProgressStep` | |
| Confirmation of destructive action | `Modal` (danger) | Primary button names the action ("Freeze card") |
| Toasts | `ToastNotification` (auto-dismiss 6 s; never for errors requiring action) | Live region polite |
| Page-level errors | `InlineNotification` / `ActionableNotification` | |
| Loading | `SkeletonText`, `SkeletonPlaceholder`, `DataTableSkeleton`, `InlineLoading` on buttons | No full-page spinners after first paint |
| Charts | `@carbon/charts-react` `DonutChart`, `SimpleBarChart` | Provide data table alternative (a11y) |
| Copy | `CopyButton` | IBAN, account number, references |
| Session timeout | `Modal` (passive → danger) with countdown | F01 |
| OTP entry | 6 × `TextInput` group or single `TextInput` with `inputmode="numeric"` `autocomplete="one-time-code"` | Paste fills all |
| Empty states | Carbon empty-state pattern (pictogram + title + body + CTA) | |

## 5. Data display rules
1. **Money**: always via `<MoneyAmount>`; currency code shown (`AED 12,505.00`) unless the
   column header states currency. Debits shown with a leading minus sign **and** a "Debit"
   accessible label; credits with "+" in transaction lists only. Never colour-only.
2. **Masking**: account numbers `•••• 4821`; IBAN grouped in 4s (`AE55 9900 0000 …`) with
   reveal/copy; card numbers `•••• •••• •••• 1234`; email `s•••a@example.com`; mobile `+971 •• ••• 1234`.
3. **Dates**: relative for < 24 h in lists ("Today, 09:41"), absolute otherwise; full
   timestamp with time zone in details and receipts.
4. **Numbers** right-aligned in tables (logical `text-align: end` for RTL).
5. **Truncation**: descriptions ellipsize with full text in `Tooltip`/`Toggletip` and in detail view.

## 6. Status taxonomy (single source for colours/icons/copy)
| Domain status | Tag type | Icon | Customer label (en) |
|---|---|---|---|
| COMPLETED | green | CheckmarkFilled | Completed |
| PROCESSING | blue | InProgress | Processing |
| SCHEDULED | cool-gray | Calendar | Scheduled |
| HELD_FOR_REVIEW | purple | Time | Under review |
| FAILED / REJECTED | red | ErrorFilled | Failed / Not sent |
| CANCELLED | gray | Close | Cancelled |
| RETURNED | magenta | Undo | Returned |
| Pending card transaction | outline | Pending | Pending |
| Card FROZEN | teal | Snowflake | Frozen |
| Card BLOCKED | red | Locked | Blocked |

## 7. Interaction patterns
- **Review-then-confirm** for any money movement or irreversible action; the review screen
  shows: from, to (with CoP result), amount, FX rate & expiry countdown, fees, total debited,
  amount received, execution & value date, reference.
- **Receipt** page: success pictogram, reference with copy, status tag, summary, actions
  (Download PDF, Make another, Go to dashboard). Receipt also reachable from history.
- **Optimistic UI** only for non-financial toggles (mark notification read, favourite
  beneficiary). Never for money movement or card status.
- **Unsaved changes** guard on forms and wizards (route blocker + Modal).
- **Keyboard**: ⌘K / Ctrl+K opens global search (accounts, beneficiaries, transactions by
  reference, settings pages). `Esc` closes overlays. All flows operable without a mouse.
- **Focus management**: on route change, focus moves to `<h1>`; on wizard step change, to
  the step heading; on error summary, to the summary.
- **Motion**: Carbon productive motion; honour `prefers-reduced-motion` (no count-up
  animations of balances when reduced).
- **Session timeout**: warning modal 60 s before idle expiry with "Stay signed in" (primary)
  and "Sign out"; announces remaining time every 15 s via `aria-live="assertive"` at 30 s and 10 s only.

## 8. RTL specifics (Arabic)
- `<html lang="ar" dir="rtl">`; Carbon supports RTL via logical properties — use
  `margin-inline-start` etc. Never `left/right` in custom CSS (lint rule).
- Mirror directional icons (ArrowRight → ArrowLeft, chevrons) except media/progress icons
  that represent time and brand marks.
- Keep IBANs, account numbers, card numbers and amounts in LTR isolates (`<bdi dir="ltr">`).
- Charts mirror axes; DataTable column order mirrors.

## 9. Content
Tone, terminology and every error message pattern are defined in
`sdd/design/content-style-guide.md`. All user-facing strings live in `apps/web/src/i18n/*.json`;
no hard-coded strings in components (lint rule `formatjs/no-literal-string-in-jsx`).
