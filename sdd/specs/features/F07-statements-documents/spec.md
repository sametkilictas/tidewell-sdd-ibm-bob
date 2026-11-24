---
id: F07
title: Statements and Documents
status: Approved
version: 1.0.0
priority: P2
phase: 5
depends-on: [F00, F01, F03, SPEC-03]
skills: [domain-rules, carbon-ui]
requirement-prefix: STMT
contract-tags: [statements, documents]
---

# F07 — Statements and Documents

## 1. Summary
Monthly e-statements, custom-period statements, balance certificates and account-details
letters generated as professional, bilingual, reconciled PDFs from the ledger.

## 2. Business rules
| ID | Rule |
|---|---|
| BR-STMT-01 | Monthly statements generated on the 1st at 02:00 local for the previous calendar month for every ACTIVE/FROZEN/DORMANT deposit and credit-card account; seed provides the last 12 months. |
| BR-STMT-02 | Statement figures: opening balance + Σ credits − Σ debits = closing balance (must reconcile to the ledger; generation fails loudly otherwise). |
| BR-STMT-03 | Custom statements: any range within the last 24 months, span ≤ 12 months, end ≤ today. |
| BR-STMT-04 | PDFs: A4, IBM Plex fonts embedded, page "x of y", document ID (`doc_…`) and SHA-256 fingerprint in footer, diagonal "DEMO — NOT A REAL DOCUMENT" watermark, language per preference (Arabic PDFs fully RTL). |
| BR-STMT-05 | Generated documents retained 24 months; regenerated on demand if storage is missing (deterministic content except generation timestamp). |
| BR-STMT-06 | Downloads stream with `Content-Disposition: attachment; filename="Tidewell-Statement-<masked>-<YYYY-MM>.pdf"`. |

## 3. Functional requirements

#### STMT-001 — Statement list
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL list available monthly statements per account, filterable by year, showing period, opening/closing balance and a Download action.
- **Acceptance criteria:**
  - **STMT-001-AC1** Sara's Current account shows 12 statements for the past 12 months.

#### STMT-002 — Monthly statement content
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL render statements containing: bank header, customer name and address, account name/number/IBAN/currency, period, summary box (opening, total credits, total debits, closing), transaction table (date, value date, description, reference, debit, credit, balance), FX details for foreign transactions, fees summary, and regulatory-style footer text marked as demo.
- **Acceptance criteria:**
  - **STMT-002-AC1** Parsing the PDF text in a test yields opening + credits − debits = closing (BR-STMT-02).

#### STMT-003 — Statement generation job
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the statement job runs, THE SYSTEM SHALL create statement records idempotently (one per account per period), store the PDF, and emit `documents.statement_ready`.
- **Acceptance criteria:**
  - **STMT-003-AC1** Running the job twice for the same period creates no duplicates.

#### STMT-004 — Custom statement
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer requests a custom statement (BR-STMT-03), THE SYSTEM SHALL generate and download it within 5 s for up to 2,000 transactions, showing progress.
- **Acceptance criteria:**
  - **STMT-004-AC1** A 13-month range is blocked client-side and server-side (`STATEMENT_RANGE_INVALID`).

#### STMT-005 — Balance certificate
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer requests a balance certificate for an account with "To whom it may concern" or a named addressee (≤ 60 chars) and language (en/ar), THE SYSTEM SHALL generate a letter stating the account holder, masked IBAN, currency and ledger balance as of end of the previous business day.
- **Acceptance criteria:**
  - **STMT-005-AC1** Letter shows the as-of date and document ID; it is listed in Documents.

#### STMT-006 — Account details letter
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer requests an account details letter, THE SYSTEM SHALL generate a PDF with account holder, full IBAN, account number, BIC, bank name and address (for salary transfers).
- **Acceptance criteria:**
  - **STMT-006-AC1** Full IBAN appears in the PDF but never in logs.

#### STMT-007 — Documents centre
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL list all generated documents (statements, certificates, letters, receipts, data exports) with type, account, date, and Download, newest first.
- **Acceptance criteria:**
  - **STMT-007-AC1** Downloading is audited `STATEMENT_DOWNLOADED` / `DOCUMENT_GENERATED`.

#### STMT-008 — Statement ready notification
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN a monthly statement is generated, THE SYSTEM SHALL notify the customer per their alert preferences with a deep link to download it.
- **Acceptance criteria:**
  - **STMT-008-AC1** Notification text: "Your November statement for Current ••4821 is ready."

## 4. UI specification
| Route | Screen |
|---|---|
| `/statements` | Tabs: **Statements** (account selector + year filter + list) · **Request a document** (custom statement, balance certificate, account details letter forms) · **All documents** |

## 5. API operations
`listStatements`, `downloadStatement`, `createCustomStatement`, `createBalanceCertificate`,
`createAccountDetailsLetter`, `listDocuments`, `downloadDocument`.

## 6. Test plan
Integration: reconciliation property test (random ledgers → statement totals), job
idempotency, Arabic PDF smoke (text extraction contains Arabic run). E2E: J8.
