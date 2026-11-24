---
name: spec-grill
description: Grill a specification before planning — systematically surface ambiguity, contradictions, missing states and untestable criteria, then ask the developer focused multiple-choice questions with a recommended option and record the decisions. Use for /sdd-clarify or whenever a spec feels underspecified.
---

# Spec grill skill

Goal: remove every ambiguity that would force the builder to guess, with the fewest questions.

## 1. Sweep (silently, before asking anything)
Check the spec against these lenses and note candidate issues with requirement IDs:
| Lens | Ask yourself |
|---|---|
| Values | Are all limits, timeouts, formats, lengths, currencies, defaults stated (BR table)? |
| States | Loading, empty, error, partial, disabled, frozen/blocked, expired, offline — all covered? |
| Edges | Zero, max, boundary dates (cut-off, holiday, month-end), concurrency, retries, duplicates? |
| Errors | Each failure mapped to an error code in `sdd/contracts/error-codes.md` and user copy? |
| Contract | Every behaviour has the fields/operations it needs in `openapi.yaml`? |
| Security | AuthZ, step-up, idempotency, audit, rate-limit, data masking stated? |
| A11y/i18n | Keyboard, focus, announcements, right-to-left languages, translated copy, number formats? |
| Testability | Can each AC be asserted automatically with seed data? |
| Conflicts | Does anything contradict the constitution, NFRs, foundational specs, or another feature? |

## 2. Prioritise
Score each issue: *impact if guessed wrong* (financial or safety / security / UX / cosmetic) × *likelihood of a wrong
guess*. Keep the top 8. Fold minor issues into your recommendations instead of asking.

## 3. Ask (one or two at a time)
Format each question as:
```
Q3 · ORD-023 (scheduled orders) — What happens if the delivery date becomes a holiday after scheduling?
  A) Move to the next business day and notify (recommended — matches BR-ORD-05 for repeat orders)
  B) Keep the date; the carrier delivers next business day silently
  C) Fail the order and ask the customer to reschedule
Impact: changes a job rule and one notification template.
```
Wait for the answer before asking the next question.

## 4. Record
Add a row to the spec's Clarifications log for each decision. If behaviour changes, edit the
requirement/AC text, bump the spec version (minor) and mention the change in the log row.
Finish with a summary: decisions, files changed, remaining risks (if any).
