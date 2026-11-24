---
id: F06
title: Card Management
status: Approved
version: 1.0.0
priority: P2
phase: 5
depends-on: [F00, F01, F03, NFR-SEC-030]
skills: [carbon-ui, security-review]
requirement-prefix: CARD
contract-tags: [cards]
---

# F06 — Card Management

## 1. Summary
Customers see their debit and credit cards, freeze/unfreeze instantly, control where cards
work, adjust spending limits, securely reveal card details, activate new cards and report
lost/stolen cards with a replacement. All state changes go through the simulated card
processor (ADR-0007) and the card state machine (SPEC-03 §6.2).

## 2. Business rules
| ID | Rule |
|---|---|
| BR-CARD-01 | PAN stored only encrypted in `card_vault` (NFR-SEC-030); API returns `last4` except on reveal. Seed PANs use test BINs (SPEC-91 §4) and pass Luhn. |
| BR-CARD-02 | Reveal shows PAN, expiry, CVC for **30 s** then re-masks; requires step-up `CARD_REVEAL`; max 5 reveals/day; audited `CARD_DETAILS_REVEALED`. Copy button for PAN only. |
| BR-CARD-03 | Controls: E-commerce, International (outside `HOME_COUNTRY`), Contactless, ATM withdrawals — each on/off; changes apply instantly. |
| BR-CARD-04 | Limits (daily, AED): ATM 0–10,000.00 (default 5,000.00), POS 0–50,000.00 (default 20,000.00), Online 0–30,000.00 (default 10,000.00); step 500.00; cannot exceed product maximum. |
| BR-CARD-05 | Freeze is reversible by the customer; BLOCKED (lost/stolen) is permanent. |
| BR-CARD-06 | Report lost/stolen requires step-up `CARD_REPORT`; replacement optional; delivery to an address on file (no new address entry in prototype); fee: first replacement per year free, then 50.00 AED (debited from linked account; shown on review). |
| BR-CARD-07 | Replacement card is `PENDING_ACTIVATION`, new last4 and expiry (+4 years), recurring merchant updates out of scope. |
| BR-CARD-08 | Activation: enter last4 + expiry (MM/YY); 3 failed attempts lock activation for 24 h. |

## 3. Functional requirements

#### CARD-001 — Cards overview
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL list cards as visual card tiles (generic Tidewell card art — no network logos copied; network shown as text) with cardholder name, kind, last4, expiry, status tag and linked account; credit cards also show available credit.
- **Acceptance criteria:**
  - **CARD-001-AC1** A FROZEN card tile shows a frost overlay with "Frozen" text (not colour only).

#### CARD-002 — Freeze and unfreeze
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer toggles "Freeze card", THE SYSTEM SHALL confirm the effect ("New purchases and withdrawals will be declined. Recurring payments may also be declined."), apply it via the card processor, update status immediately and send a notification.
- **Acceptance criteria:**
  - **CARD-002-AC1** Freeze → status FROZEN in < 1 s; unfreeze → ACTIVE; both audited.
  - **CARD-002-AC2** Freezing a BLOCKED card is impossible (`409 CARD_STATE_INVALID`).

#### CARD-003 — Card controls
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer changes a control (BR-CARD-03), THE SYSTEM SHALL apply and persist it with an `InlineLoading` state on the toggle and revert the toggle with an error if the processor fails.
- **Acceptance criteria:**
  - **CARD-003-AC1** With processor fault toggle on, toggling E-commerce reverts and shows "We couldn't update your card. Try again."

#### CARD-004 — Spending limits
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer edits limits (BR-CARD-04) using sliders paired with numeric inputs, THE SYSTEM SHALL validate ranges/steps and save all limits atomically.
- **Acceptance criteria:**
  - **CARD-004-AC1** Slider and input stay in sync; keyboard arrows move by AED 500.00.

#### CARD-005 — Reveal card details
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer selects "Show card details", THE SYSTEM SHALL require step-up, then display PAN, expiry and CVC per BR-CARD-02 with a visible 30-second countdown and automatic re-masking, and SHALL prevent the details being cached by the browser or stored in client state after masking.
- **Acceptance criteria:**
  - **CARD-005-AC1** After 30 s the DOM no longer contains the PAN (component test).
  - **CARD-005-AC2** The reveal response has `Cache-Control: no-store` and is never logged (log-capture test).

#### CARD-006 — Report lost or stolen
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer reports a card LOST, STOLEN or DAMAGED, THE SYSTEM SHALL (after review + step-up for LOST/STOLEN) block the card permanently (DAMAGED keeps it ACTIVE until the replacement is activated), optionally order a replacement (BR-CARD-06/07), debit any fee, show a receipt and notify.
- **Acceptance criteria:**
  - **CARD-006-AC1** Reporting STOLEN with replacement: old card BLOCKED, new card PENDING_ACTIVATION appears with "Arriving in 5–7 business days".
  - **CARD-006-AC2** The flow suggests reviewing recent transactions with a link filtered to that card.

#### CARD-007 — Activate a card
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer activates a PENDING_ACTIVATION card with matching last4 and expiry, THE SYSTEM SHALL set it ACTIVE and, if it replaced a DAMAGED card, block the old card.
- **Acceptance criteria:**
  - **CARD-007-AC1** 3 wrong attempts → `CARD_ACTIVATION_FAILED` and activation locked 24 h with explanation.

#### CARD-008 — Card transactions
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL show on card detail the last 10 transactions made with that card (from the linked account history filtered by card) with a link to full history.
- **Acceptance criteria:**
  - **CARD-008-AC1** Pending authorisations appear with "Pending" tag.

## 4. UI specification
| Route | Screen |
|---|---|
| `/cards` | Cards overview (tiles; pending activation banner) |
| `/cards/:cardId` | Card detail: tile, primary actions (Freeze toggle, Show details, Report a problem), sections Controls · Limits · Recent transactions · Card info (linked account, issued, expiry) |
| `/cards/:cardId/report` | Report wizard: reason → replacement? → review (fee) → step-up → receipt |
| `/cards/:cardId/activate` | Activation form |

## 5. API operations
`listCards`, `getCard`, `freezeCard`, `unfreezeCard`, `updateCardControls`,
`updateCardLimits`, `revealCard`, `reportCard`, `activateCard`.

## 6. Test plan
Unit: state machine transitions table-driven (all illegal transitions rejected).
Integration: vault encryption, reveal rate limit, fee posting, processor fault.
E2E: J6 (freeze → control → report stolen → activate replacement). Security: reveal leak tests.
