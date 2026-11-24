# Traceability Matrix

> **Generated** by `pnpm specs:trace` (sdd/scripts/validate-specs.mjs). Do not edit by hand.
> A requirement is *Covered* when at least one test title contains its tag, e.g. `[XFER-021]`.

## Summary
| Priority | Requirements | Covered | % |
|---|---|---|---|
| P1 | 117 | 0 | 0 % |
| P2 | 73 | 0 | 0 % |
| P3 | 22 | 0 | 0 % |
| **Total** | **212** | **0** | |

Acceptance criteria defined: **287** · Contract operations: **116**

## Matrix
| Requirement | Title | Spec | Pri | ACs | Contract operations | Tests | Status |
|---|---|---|---|---|---|---|---|
| ACCT-001 | Accounts list | F03 | P1 | 1 | `listAccounts` | — | ⬜ Not covered |
| ACCT-002 | Balance breakdown | F03 | P1 | 1 | `getAccount` | — | ⬜ Not covered |
| ACCT-003 | Account identifiers | F03 | P1 | 2 | `getAccount` | — | ⬜ Not covered |
| ACCT-004 | Nickname | F03 | P2 | 1 | `updateAccount` | — | ⬜ Not covered |
| ACCT-005 | Product panels | F03 | P1 | 1 | `getAccount` | — | ⬜ Not covered |
| ACCT-010 | History list | F03 | P1 | 2 | `listTransactions` | — | ⬜ Not covered |
| ACCT-011 | Search, filter and sort | F03 | P1 | 3 | `listTransactions` | — | ⬜ Not covered |
| ACCT-012 | Transaction detail | F03 | P1 | 2 | `getTransaction` | — | ⬜ Not covered |
| ACCT-013 | Re-categorise | F03 | P2 | 1 | `updateTransaction` | — | ⬜ Not covered |
| ACCT-014 | Pagination | F03 | P1 | 1 | `listTransactions` | — | ⬜ Not covered |
| ACCT-015 | Export | F03 | P2 | 2 | `exportTransactions` | — | ⬜ Not covered |
| ACCT-016 | Report a problem | F03 | P3 | 1 | `createThread` | — | ⬜ Not covered |
| AUTH-001 | Password sign-in | F01 | P1 | 3 | `login` | — | ⬜ Not covered |
| AUTH-002 | Lockout | F01 | P1 | 2 | `login` | — | ⬜ Not covered |
| AUTH-003 | SMS one-time passcode | F01 | P1 | 3 | `verifyMfa`, `resendMfa` | — | ⬜ Not covered |
| AUTH-004 | Authenticator app (TOTP) | F01 | P2 | 1 | `verifyMfa` | — | ⬜ Not covered |
| AUTH-005 | Recovery codes | F01 | P2 | 1 | `verifyMfa` | — | ⬜ Not covered |
| AUTH-006 | Remember this device | F01 | P1 | 1 | `verifyMfa` | — | ⬜ Not covered |
| AUTH-007 | Sign-in confirmation and new-device alert | F01 | P1 | 1 | — | — | ⬜ Not covered |
| AUTH-010 | Verify identity to enrol | F01 | P1 | 1 | `startEnrolment`, `verifyEnrolment` | — | ⬜ Not covered |
| AUTH-011 | Create credentials | F01 | P1 | 2 | `completeEnrolment` | — | ⬜ Not covered |
| AUTH-012 | Optional authenticator setup and recovery codes | F01 | P2 | 1 | `startTotpSetup`, `confirmTotpSetup` | — | ⬜ Not covered |
| AUTH-020 | Request reset | F01 | P1 | 1 | `requestPasswordReset` | — | ⬜ Not covered |
| AUTH-021 | Complete reset | F01 | P1 | 1 | `verifyPasswordReset`, `completePasswordReset` | — | ⬜ Not covered |
| AUTH-030 | Session establishment | F01 | P1 | 1 | `verifyMfa`, `getAuthSession` | — | ⬜ Not covered |
| AUTH-031 | Idle timeout warning | F01 | P1 | 2 | `refreshSession` | — | ⬜ Not covered |
| AUTH-032 | Absolute timeout | F01 | P1 | 1 | — | — | ⬜ Not covered |
| AUTH-033 | Sign out and cross-tab sync | F01 | P1 | 1 | `logout` | — | ⬜ Not covered |
| AUTH-034 | Return to intended destination | F01 | P2 | 1 | — | — | ⬜ Not covered |
| AUTH-040 | Step-up challenge | F01 | P1 | 2 | `startStepUp`, `verifyStepUp`, `createBeneficiary` | — | ⬜ Not covered |
| AUTH-041 | Token binding | F01 | P1 | 1 | `verifyStepUp` | — | ⬜ Not covered |
| AUTH-050 | Demo OTP bypass | F01 | P1 | 1 | `listDevOutbox` | — | ⬜ Not covered |
| BILL-001 | Browse and search billers | F05 | P2 | 1 | `listBillers`, `getBiller` | — | ⬜ Not covered |
| BILL-002 | Save a biller | F05 | P2 | 2 | `listSavedBillers`, `createSavedBiller` | — | ⬜ Not covered |
| BILL-003 | Amount due inquiry | F05 | P2 | 1 | `listSavedBillers`, `inquireSavedBiller` | — | ⬜ Not covered |
| BILL-004 | Pay a bill now | F05 | P2 | 2 | `createBillPayment` | — | ⬜ Not covered |
| BILL-005 | Prepaid top-up | F05 | P2 | 1 | `createBillPayment` | — | ⬜ Not covered |
| BILL-006 | Schedule and auto-pay | F05 | P2 | 1 | `createBillPayment` | — | ⬜ Not covered |
| BILL-007 | Bill payment history | F05 | P2 | 1 | `listBillPayments`, `getBillPayment` | — | ⬜ Not covered |
| BILL-008 | Biller unavailable | F05 | P2 | 1 | `inquireSavedBiller`, `createBillPayment` | — | ⬜ Not covered |
| BILL-009 | Remove saved biller | F05 | P2 | 1 | `deleteSavedBiller` | — | ⬜ Not covered |
| CARD-001 | Cards overview | F06 | P2 | 1 | `listCards`, `getCard` | — | ⬜ Not covered |
| CARD-002 | Freeze and unfreeze | F06 | P2 | 2 | `freezeCard`, `unfreezeCard` | — | ⬜ Not covered |
| CARD-003 | Card controls | F06 | P2 | 1 | `updateCardControls` | — | ⬜ Not covered |
| CARD-004 | Spending limits | F06 | P2 | 1 | `updateCardLimits` | — | ⬜ Not covered |
| CARD-005 | Reveal card details | F06 | P2 | 2 | `revealCard` | — | ⬜ Not covered |
| CARD-006 | Report lost or stolen | F06 | P2 | 2 | `reportCard` | — | ⬜ Not covered |
| CARD-007 | Activate a card | F06 | P2 | 1 | `activateCard` | — | ⬜ Not covered |
| CARD-008 | Card transactions | F06 | P2 | 1 | `getCard` | — | ⬜ Not covered |
| DASH-001 | Personalised greeting and last sign-in | F02 | P1 | 1 | `getDashboardSummary` | — | ⬜ Not covered |
| DASH-002 | Account tiles | F02 | P1 | 2 | `getDashboardSummary` | — | ⬜ Not covered |
| DASH-003 | Totals per currency | F02 | P1 | 2 | `getDashboardSummary` | — | ⬜ Not covered |
| DASH-004 | Hide balances | F02 | P1 | 1 | `updatePreferences` | — | ⬜ Not covered |
| DASH-005 | Recent activity | F02 | P1 | 1 | `getDashboardSummary` | — | ⬜ Not covered |
| DASH-006 | Upcoming payments | F02 | P1 | 2 | `getDashboardSummary` | — | ⬜ Not covered |
| DASH-007 | Quick actions | F02 | P1 | 1 | — | — | ⬜ Not covered |
| DASH-008 | Spending insights | F02 | P2 | 2 | `getSpendingInsights` | — | ⬜ Not covered |
| DASH-009 | Needs attention | F02 | P2 | 1 | `getDashboardSummary` | — | ⬜ Not covered |
| DASH-010 | Independent widget states | F02 | P1 | 1 | `getDashboardSummary` | — | ⬜ Not covered |
| DASH-011 | Live updates | F02 | P2 | 1 | `streamNotifications` | — | ⬜ Not covered |
| DASH-012 | New-customer state | F02 | P1 | 1 | — | — | ⬜ Not covered |
| DASH-013 | Global search | F02 | P2 | 1 | `search` | — | ⬜ Not covered |
| FND-001 | Monorepo workspace and scripts | F00 | P1 | 2 | — | — | ⬜ Not covered |
| FND-002 | Pinned toolchain | F00 | P1 | 1 | — | — | ⬜ Not covered |
| FND-003 | Local infrastructure | F00 | P1 | 1 | — | — | ⬜ Not covered |
| FND-004 | Configuration validation | F00 | P1 | 2 | — | — | ⬜ Not covered |
| FND-005 | API platform skeleton | F00 | P1 | 3 | — | — | ⬜ Not covered |
| FND-006 | Structured logging and trace propagation | F00 | P1 | 1 | — | — | ⬜ Not covered |
| FND-007 | Health, readiness and version | F00 | P1 | 1 | `getHealthLive`, `getHealthReady`, `getVersion` | — | ⬜ Not covered |
| FND-008 | Database baseline, migrations, seed runner | F00 | P1 | 2 | — | — | ⬜ Not covered |
| FND-009 | Money and currency domain | F00 | P1 | 3 | `listCurrencies` | — | ⬜ Not covered |
| FND-010 | Identifier validators | F00 | P1 | 2 | — | — | ⬜ Not covered |
| FND-011 | Business calendar | F00 | P1 | 2 | `getBusinessCalendar` | — | ⬜ Not covered |
| FND-012 | Web application shell | F00 | P1 | 2 | — | — | ⬜ Not covered |
| FND-013 | Theming and i18n infrastructure | F00 | P1 | 2 | — | — | ⬜ Not covered |
| FND-014 | Typed API client and server-state layer | F00 | P1 | 1 | `getAuthSession` | — | ⬜ Not covered |
| FND-015 | Demo affordances | F00 | P1 | 1 | `listDevOutbox`, `runDevJob`, `setDevFaults`, `setDevClock` | — | ⬜ Not covered |
| FND-016 | Platform primitives: audit, idempotency, outbox | F00 | P1 | 2 | — | — | ⬜ Not covered |
| FND-017 | Job runner | F00 | P1 | 1 | `runDevJob` | — | ⬜ Not covered |
| FND-018 | Test infrastructure | F00 | P1 | 1 | — | — | ⬜ Not covered |
| FND-019 | Quality gate and CI | F00 | P1 | 1 | — | — | ⬜ Not covered |
| FND-020 | Spec tooling | F00 | P1 | 1 | — | — | ⬜ Not covered |
| FND-021 | SDD governance wiring | F00 | P1 | 2 | — | — | ⬜ Not covered |
| MSG-001 | Inbox | F10 | P3 | 1 | `listThreads` | — | ⬜ Not covered |
| MSG-002 | New message | F10 | P3 | 1 | `createThread`, `uploadAttachment` | — | ⬜ Not covered |
| MSG-003 | Conversation view | F10 | P3 | 1 | `getThread`, `postMessage`, `downloadAttachment` | — | ⬜ Not covered |
| MSG-004 | Close and reopen | F10 | P3 | 1 | `postMessage`, `closeThread` | — | ⬜ Not covered |
| MSG-005 | Dispute a transaction | F10 | P3 | 1 | `createThread` | — | ⬜ Not covered |
| MSG-006 | Help centre | F10 | P3 | 1 | — | — | ⬜ Not covered |
| NFR-A11Y-001 | Automated accessibility gate | NFR-A11Y | P1 | 1 | — | — | ⬜ Not covered |
| NFR-A11Y-002 | Keyboard operability | NFR-A11Y | P1 | 1 | — | — | ⬜ Not covered |
| NFR-A11Y-003 | Screen-reader semantics | NFR-A11Y | P1 | 2 | — | — | ⬜ Not covered |
| NFR-A11Y-004 | Timing adjustable | NFR-A11Y | P1 | 1 | — | — | ⬜ Not covered |
| NFR-A11Y-005 | Reflow, zoom and target size | NFR-A11Y | P1 | 1 | — | — | ⬜ Not covered |
| NFR-A11Y-006 | Accessible authentication | NFR-A11Y | P1 | 1 | — | — | ⬜ Not covered |
| NFR-A11Y-007 | Charts have text alternatives | NFR-A11Y | P2 | 1 | — | — | ⬜ Not covered |
| NFR-A11Y-008 | Reduced motion & contrast | NFR-A11Y | P2 | 1 | — | — | ⬜ Not covered |
| NFR-I18N-001 | Bilingual UI | NFR-A11Y | P1 | 2 | — | — | ⬜ Not covered |
| NFR-I18N-002 | RTL layout | NFR-A11Y | P1 | 1 | — | — | ⬜ Not covered |
| NFR-I18N-003 | Locale-aware formatting | NFR-A11Y | P1 | 1 | — | — | ⬜ Not covered |
| NFR-I18N-004 | Language persistence | NFR-A11Y | P2 | 1 | `updatePreferences` | — | ⬜ Not covered |
| NFR-I18N-005 | Time zones and business calendar | NFR-A11Y | P1 | 1 | — | — | ⬜ Not covered |
| NFR-OBS-001 | Structured logs with correlation | NFR-OBS | P1 | 1 | — | — | ⬜ Not covered |
| NFR-OBS-002 | Metrics endpoint | NFR-OBS | P3 | 1 | — | — | ⬜ Not covered |
| NFR-OBS-010 | Audit coverage | NFR-OBS | P1 | 1 | — | — | ⬜ Not covered |
| NFR-OBS-011 | Tamper evidence | NFR-OBS | P2 | 1 | `opsSearchAudit` | — | ⬜ Not covered |
| NFR-OBS-012 | Customer-visible activity | NFR-OBS | P2 | 1 | `listSecurityActivity` | — | ⬜ Not covered |
| NFR-PERF-001 | API latency | NFR-PERF | P2 | 1 | — | — | ⬜ Not covered |
| NFR-PERF-002 | Transaction history at scale | NFR-PERF | P1 | 1 | `listTransactions` | — | ⬜ Not covered |
| NFR-PERF-003 | Front-end performance budgets | NFR-PERF | P2 | 1 | — | — | ⬜ Not covered |
| NFR-PERF-004 | Perceived performance | NFR-PERF | P1 | 1 | — | — | ⬜ Not covered |
| NFR-PRIV-001 | Data minimisation | NFR-OBS | P1 | 1 | `getDashboardSummary` | — | ⬜ Not covered |
| NFR-PRIV-002 | Synthetic data only | NFR-OBS | P1 | 1 | — | — | ⬜ Not covered |
| NFR-PRIV-003 | Data export (subject access) | NFR-OBS | P3 | 1 | `requestDataExport` | — | ⬜ Not covered |
| NFR-PRIV-004 | Retention | NFR-OBS | P2 | 1 | — | — | ⬜ Not covered |
| NFR-PRIV-005 | Consent records | NFR-OBS | P3 | 1 | `updateConsents` | — | ⬜ Not covered |
| NFR-REL-001 | Ledger invariants hold | NFR-PERF | P1 | 1 | — | — | ⬜ Not covered |
| NFR-REL-002 | Concurrency safety | NFR-PERF | P1 | 1 | — | — | ⬜ Not covered |
| NFR-REL-003 | Idempotent money movement | NFR-PERF | P1 | 1 | `createTransfer` | — | ⬜ Not covered |
| NFR-REL-004 | Atomicity | NFR-PERF | P1 | 1 | — | — | ⬜ Not covered |
| NFR-REL-005 | Graceful degradation | NFR-PERF | P2 | 1 | `setDevFaults` | — | ⬜ Not covered |
| NFR-REL-006 | Health and readiness | NFR-PERF | P1 | 1 | `getHealthLive`, `getHealthReady` | — | ⬜ Not covered |
| NFR-REL-007 | Job safety | NFR-PERF | P2 | 1 | — | — | ⬜ Not covered |
| NFR-REL-008 | Deterministic reset | NFR-PERF | P1 | 1 | — | — | ⬜ Not covered |
| NFR-SEC-001 | Password storage | NFR-SEC | P1 | 2 | — | — | ⬜ Not covered |
| NFR-SEC-002 | Password policy | NFR-SEC | P1 | 3 | `completeEnrolment`, `completePasswordReset`, `changePassword` | — | ⬜ Not covered |
| NFR-SEC-003 | Credential stuffing & brute force resistance | NFR-SEC | P1 | 2 | `login` | — | ⬜ Not covered |
| NFR-SEC-004 | Session security | NFR-SEC | P1 | 3 | `logout` | — | ⬜ Not covered |
| NFR-SEC-005 | CSRF protection | NFR-SEC | P1 | 1 | — | — | ⬜ Not covered |
| NFR-SEC-010 | Object-level authorization (anti-IDOR) | NFR-SEC | P1 | 2 | `getAccount` | — | ⬜ Not covered |
| NFR-SEC-011 | Role-based access for operations | NFR-SEC | P3 | 1 | — | — | ⬜ Not covered |
| NFR-SEC-012 | Mass assignment protection | NFR-SEC | P1 | 1 | `updateAccount` | — | ⬜ Not covered |
| NFR-SEC-020 | Input validation | NFR-SEC | P1 | 1 | — | — | ⬜ Not covered |
| NFR-SEC-021 | Injection prevention | NFR-SEC | P1 | 2 | — | — | ⬜ Not covered |
| NFR-SEC-022 | Security headers and CSP | NFR-SEC | P1 | 2 | — | — | ⬜ Not covered |
| NFR-SEC-023 | Rate limiting | NFR-SEC | P1 | 1 | — | — | ⬜ Not covered |
| NFR-SEC-024 | File upload safety | NFR-SEC | P3 | 2 | `uploadAttachment` | — | ⬜ Not covered |
| NFR-SEC-030 | Encryption of sensitive fields at rest | NFR-SEC | P2 | 1 | `revealCard` | — | ⬜ Not covered |
| NFR-SEC-031 | Log redaction | NFR-SEC | P1 | 1 | — | — | ⬜ Not covered |
| NFR-SEC-032 | Secrets management | NFR-SEC | P1 | 2 | — | — | ⬜ Not covered |
| NFR-SEC-033 | Demo-only capabilities are fenced | NFR-SEC | P1 | 1 | — | — | ⬜ Not covered |
| NFR-SEC-040 | Dependency hygiene | NFR-SEC | P2 | 1 | — | — | ⬜ Not covered |
| NFR-SEC-041 | Static analysis | NFR-SEC | P2 | 1 | — | — | ⬜ Not covered |
| NFR-SEC-042 | External scan gates promotion to testing | NFR-SEC | P1 | 4 | — | — | ⬜ Not covered |
| NFR-SEC-043 | Tidewell Bank quality gate | NFR-SEC | P1 | 3 | — | — | ⬜ Not covered |
| NFR-SEC-044 | Dependency vulnerabilities (CVEs) block testing | NFR-SEC | P1 | 4 | — | — | ⬜ Not covered |
| NFR-SEC-045 | Bob findings are advisory and portable | NFR-SEC | P2 | 3 | — | — | ⬜ Not covered |
| NFR-SEC-046 | Scan integrity | NFR-SEC | P1 | 5 | — | — | ⬜ Not covered |
| NFR-SEC-050 | Fraud rule engine (simulated) | NFR-SEC | P2 | 1 | `createTransfer` | — | ⬜ Not covered |
| NFR-SEC-051 | Security notifications are mandatory | NFR-SEC | P2 | 1 | — | — | ⬜ Not covered |
| NOTF-001 | Notification centre | F08 | P2 | 1 | `listNotifications` | — | ⬜ Not covered |
| NOTF-002 | Read state | F08 | P2 | 1 | `markNotificationRead`, `markAllNotificationsRead` | — | ⬜ Not covered |
| NOTF-003 | Real-time delivery | F08 | P2 | 1 | `streamNotifications` | — | ⬜ Not covered |
| NOTF-004 | Alert preferences | F08 | P2 | 1 | `getAlertRules`, `updateAlertRules` | — | ⬜ Not covered |
| NOTF-005 | Rule evaluation | F08 | P2 | 1 | `updateAlertRules` | — | ⬜ Not covered |
| NOTF-006 | Email and SMS rendering | F08 | P2 | 1 | — | — | ⬜ Not covered |
| NOTF-007 | Mandatory security notifications | F08 | P2 | 1 | `verifyContactChange` | — | ⬜ Not covered |
| OPS-001 | Ops sign-in and shell | F11 | P3 | 1 | — | — | ⬜ Not covered |
| OPS-002 | Customer search | F11 | P3 | 1 | `opsSearchCustomers` | — | ⬜ Not covered |
| OPS-003 | Customer 360 with justification | F11 | P3 | 1 | `opsGetCustomer` | — | ⬜ Not covered |
| OPS-004 | Unlock customer | F11 | P3 | 1 | `opsUnlockUser` | — | ⬜ Not covered |
| OPS-005 | Held payments queue (maker) | F11 | P3 | 1 | `opsListHeldPayments`, `opsRecommendHeldPayment` | — | ⬜ Not covered |
| OPS-006 | Approve / reject (checker) | F11 | P3 | 2 | `opsDecideHeldPayment` | — | ⬜ Not covered |
| OPS-007 | Messaging queue | F11 | P3 | 1 | `opsListThreads`, `opsPostMessage`, `opsCloseThread` | — | ⬜ Not covered |
| OPS-008 | Audit search | F11 | P3 | 1 | `opsSearchAudit` | — | ⬜ Not covered |
| PROF-001 | Personal details | F09 | P2 | 1 | `getProfile` | — | ⬜ Not covered |
| PROF-002 | Change email | F09 | P2 | 1 | `startContactChange`, `verifyContactChange` | — | ⬜ Not covered |
| PROF-003 | Change mobile number | F09 | P2 | 1 | `startContactChange`, `verifyContactChange` | — | ⬜ Not covered |
| PROF-010 | Preferences | F09 | P1 | 1 | `getProfile`, `updatePreferences` | — | ⬜ Not covered |
| PROF-020 | Change password | F09 | P1 | 1 | `changePassword` | — | ⬜ Not covered |
| PROF-021 | Authenticator app management | F09 | P2 | 1 | `startTotpSetup`, `removeTotp`, `confirmTotpSetup` | — | ⬜ Not covered |
| PROF-022 | Recovery codes | F09 | P2 | 1 | `regenerateRecoveryCodes` | — | ⬜ Not covered |
| PROF-023 | Trusted devices | F09 | P1 | 1 | `listTrustedDevices`, `revokeTrustedDevice` | — | ⬜ Not covered |
| PROF-024 | Sessions | F09 | P1 | 1 | `listSessions`, `revokeSessions` | — | ⬜ Not covered |
| PROF-030 | Security activity | F09 | P2 | 1 | `listSecurityActivity` | — | ⬜ Not covered |
| PROF-040 | Consents | F09 | P3 | 1 | `updateConsents` | — | ⬜ Not covered |
| PROF-050 | Data export | F09 | P3 | 1 | `downloadDocument`, `requestDataExport` | — | ⬜ Not covered |
| STMT-001 | Statement list | F07 | P2 | 1 | `listStatements` | — | ⬜ Not covered |
| STMT-002 | Monthly statement content | F07 | P2 | 1 | `downloadStatement` | — | ⬜ Not covered |
| STMT-003 | Statement generation job | F07 | P2 | 1 | — | — | ⬜ Not covered |
| STMT-004 | Custom statement | F07 | P2 | 1 | `createCustomStatement` | — | ⬜ Not covered |
| STMT-005 | Balance certificate | F07 | P2 | 1 | `createBalanceCertificate` | — | ⬜ Not covered |
| STMT-006 | Account details letter | F07 | P2 | 1 | `createAccountDetailsLetter` | — | ⬜ Not covered |
| STMT-007 | Documents centre | F07 | P2 | 1 | `downloadStatement`, `listDocuments`, `downloadDocument` | — | ⬜ Not covered |
| STMT-008 | Statement ready notification | F07 | P2 | 1 | — | — | ⬜ Not covered |
| XFER-001 | Transfer between own accounts | F04 | P1 | 2 | `createTransfer` | — | ⬜ Not covered |
| XFER-002 | Own-account FX transfer | F04 | P1 | 3 | `createFxQuote`, `createTransfer`, `listCurrencies` | — | ⬜ Not covered |
| XFER-003 | Credit card repayment | F04 | P1 | 1 | `createTransfer` | — | ⬜ Not covered |
| XFER-010 | Beneficiary list | F04 | P1 | 1 | `listBeneficiaries`, `getBeneficiary` | — | ⬜ Not covered |
| XFER-011 | Add internal beneficiary | F04 | P1 | 1 | `createBeneficiary` | — | ⬜ Not covered |
| XFER-012 | Add domestic beneficiary | F04 | P1 | 2 | `createBeneficiary`, `lookupBank` | — | ⬜ Not covered |
| XFER-013 | Add international beneficiary | F04 | P2 | 2 | `createBeneficiary`, `lookupBank` | — | ⬜ Not covered |
| XFER-014 | Confirmation of payee (simulated) | F04 | P1 | 2 | `checkBeneficiaryName` | — | ⬜ Not covered |
| XFER-015 | Cooling-off for new beneficiaries | F04 | P1 | 1 | `createBeneficiary` | — | ⬜ Not covered |
| XFER-016 | Manage beneficiary | F04 | P2 | 1 | `updateBeneficiary`, `deleteBeneficiary` | — | ⬜ Not covered |
| XFER-017 | Duplicate prevention | F04 | P2 | 1 | `createBeneficiary` | — | ⬜ Not covered |
| XFER-020 | Transfer wizard | F04 | P1 | 2 | `quoteTransfer` | — | ⬜ Not covered |
| XFER-021 | Limits enforcement | F04 | P1 | 2 | `quoteTransfer` | — | ⬜ Not covered |
| XFER-022 | Cut-off and dates | F04 | P1 | 1 | `quoteTransfer`, `getBusinessCalendar` | — | ⬜ Not covered |
| XFER-023 | Future-dated transfer | F04 | P1 | 1 | `setDevClock`, `createTransfer` | — | ⬜ Not covered |
| XFER-024 | Standing orders | F04 | P2 | 2 | `createTransfer`, `listStandingOrders` | — | ⬜ Not covered |
| XFER-025 | Review step | F04 | P1 | 1 | `quoteTransfer` | — | ⬜ Not covered |
| XFER-026 | Submission | F04 | P1 | 2 | `createTransfer` | — | ⬜ Not covered |
| XFER-027 | Receipt | F04 | P1 | 1 | `getTransferReceipt` | — | ⬜ Not covered |
| XFER-028 | Status tracking | F04 | P1 | 1 | `getTransfer`, `streamNotifications` | — | ⬜ Not covered |
| XFER-029 | Transfer history | F04 | P1 | 1 | `listTransfers`, `getTransfer`, `listStandingOrders` | — | ⬜ Not covered |
| XFER-030 | Cancel | F04 | P1 | 1 | `cancelTransfer`, `cancelStandingOrder` | — | ⬜ Not covered |
| XFER-031 | Repeat transfer | F04 | P2 | 1 | — | — | ⬜ Not covered |
| XFER-032 | International transfer specifics | F04 | P2 | 2 | `quoteTransfer`, `createTransfer`, `listPurposeCodes` | — | ⬜ Not covered |
| XFER-033 | Held for review | F04 | P2 | 1 | — | — | ⬜ Not covered |
| XFER-034 | Failure and return handling | F04 | P1 | 1 | — | — | ⬜ Not covered |
| XFER-035 | Limits management | F04 | P2 | 1 | `getLimits`, `updateLimits` | — | ⬜ Not covered |
