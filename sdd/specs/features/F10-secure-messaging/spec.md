---
id: F10
title: Secure Messaging, Help and Disputes
status: Approved
version: 1.0.0
priority: P3
phase: 6
depends-on: [F00, F01, F03, F08]
skills: [carbon-ui, security-review]
requirement-prefix: MSG
contract-tags: [messaging, attachments]
---

# F10 — Secure Messaging, Help and Disputes

## 1. Summary
An authenticated inbox to converse with the bank (answered by ops users in F11), with
attachments, categories (including transaction disputes), and a small searchable help
centre (static FAQ).

## 2. Business rules
| ID | Rule |
|---|---|
| BR-MSG-01 | Categories: GENERAL, CARD_ISSUE, DISPUTE_TRANSACTION, TECHNICAL, UPDATE_PERSONAL_DETAILS, COMPLAINT. |
| BR-MSG-02 | Subject 3–80 chars; body 1–2,000 chars plain text (no HTML; URLs rendered as text, not links, for bank → customer safety except bank-authored allow-listed internal links). |
| BR-MSG-03 | Attachments: ≤ 3 per message, ≤ 5 MB each, PDF/PNG/JPEG by magic bytes, EICAR rejected (NFR-SEC-024); stored outside web root; downloads via authorised endpoint with `Content-Disposition: attachment`. |
| BR-MSG-04 | Thread states per SPEC-03 §6.5; customer can reopen closed thread within 14 days; ops auto-reply "We've received your message — typical reply time 1 business day". |
| BR-MSG-05 | Dispute threads require a linked transaction and reason (UNRECOGNISED, DUPLICATE, WRONG_AMOUNT, GOODS_NOT_RECEIVED, CANCELLED_SUBSCRIPTION, OTHER). |
| BR-MSG-06 | Max 20 new threads per customer per day. |

## 3. Functional requirements

#### MSG-001 — Inbox
- **Priority:** P3 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL list threads with subject, category tag, status, last message preview (first 80 chars), last activity time and unread indicator, filterable by status.
- **Acceptance criteria:**
  - **MSG-001-AC1** Threads with unread bank replies are bold and counted in the nav badge.

#### MSG-002 — New message
- **Priority:** P3 · **Type:** Event-driven
- **EARS:** WHEN the customer composes a new message (category, subject, body, attachments), THE SYSTEM SHALL validate per BR-MSG-01..03, create the thread, show it with the auto-reply, and notify ops queue.
- **Acceptance criteria:**
  - **MSG-002-AC1** Upload progress per file; failed scan shows the file with an error and excludes it.

#### MSG-003 — Conversation view
- **Priority:** P3 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL display messages chronologically with sender (You / Tidewell team member first name), timestamp, attachments, and a reply composer unless the thread is closed beyond 14 days.
- **Acceptance criteria:**
  - **MSG-003-AC1** Message bodies are rendered as text (an `<a>` tag in body is shown literally).

#### MSG-004 — Close and reopen
- **Priority:** P3 · **Type:** Event-driven
- **EARS:** WHEN the customer marks a thread resolved, THE SYSTEM SHALL close it; WHEN they reply within 14 days, THE SYSTEM SHALL reopen it.
- **Acceptance criteria:**
  - **MSG-004-AC1** Replying after 14 days → `THREAD_CLOSED` with "Start a new message" CTA pre-filled with a link to the old thread reference.

#### MSG-005 — Dispute a transaction
- **Priority:** P3 · **Type:** Event-driven
- **EARS:** WHEN started from a transaction (ACCT-016), THE SYSTEM SHALL pre-fill category DISPUTE_TRANSACTION and the transaction summary, require a reason (BR-MSG-05), and for card transactions offer "Freeze this card now" as an optional checkbox.
- **Acceptance criteria:**
  - **MSG-005-AC1** Ticking "Freeze this card now" freezes the card on submit and the thread records it (J11).

#### MSG-006 — Help centre
- **Priority:** P3 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL provide a searchable FAQ (≥ 20 entries, en/ar, static JSON) grouped by topic with "Still need help? Send us a message".
- **Acceptance criteria:**
  - **MSG-006-AC1** Search "cut-off" returns the transfer cut-off FAQ.

## 4. UI specification
| Route | Screen |
|---|---|
| `/messages` | Inbox (List template) + New message button |
| `/messages/new?category=&transactionId=` | Compose |
| `/messages/:threadId` | Conversation |
| `/help` | Help centre |

## 5. API operations
`listThreads`, `createThread`, `getThread`, `postMessage`, `closeThread`,
`uploadAttachment`, `downloadAttachment`.

## 6. Test plan
Integration: attachment validation matrix, IDOR on threads/attachments, rate limit.
E2E: J11. Security: stored XSS attempts in subject/body/filename.
