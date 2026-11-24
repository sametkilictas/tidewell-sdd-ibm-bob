# Domain Events and Audit Actions

Domain events are published **in-process after commit** via a transactional outbox table
(`outbox_events`) and dispatched by the job runner (at-least-once; handlers idempotent by
`eventId`). Notifications (F08), SSE, metrics and the ops console subscribe to them.

## 1. Domain events
| Event | Producer | Payload (besides `eventId`, `occurredAt`, `customerId`) | Consumers |
|---|---|---|---|
| `identity.login_succeeded` | identity | userId, deviceId, newDevice:boolean, ipCountry | notifications (new device alert), audit view |
| `identity.login_failed` | identity | usernameHash, reason | metrics |
| `identity.account_locked` | identity | userId, lockType (TEMP/HARD) | notifications, ops |
| `identity.password_changed` | identity | userId | notifications (mandatory) |
| `identity.mfa_changed` | identity | userId, change (TOTP_ADDED/TOTP_REMOVED/RECOVERY_REGENERATED) | notifications (mandatory) |
| `identity.device_revoked` | identity | deviceId | notifications |
| `customer.contact_changed` | customers | field (EMAIL/MOBILE) | notifications (mandatory, to old AND new contact) |
| `payments.beneficiary_added` | payments | beneficiaryId, type, maskedAccount | notifications (mandatory) |
| `payments.order_created` | payments | orderId, kind, amount, status | SSE, metrics |
| `payments.order_status_changed` | payments | orderId, from, to, failureCode? | notifications, SSE |
| `payments.order_held` | payments | orderId, ruleIds[] | ops queue, notifications |
| `accounts.balance_changed` | ledger | accountId, available, ledger | SSE (dashboard refresh), alert evaluation (low balance) |
| `accounts.transaction_posted` | ledger | accountId, transactionId, amount, direction, channel | alert evaluation (large txn, international card) |
| `cards.status_changed` | cards | cardId, from, to, reason | notifications |
| `cards.controls_changed` | cards | cardId, changes | audit view |
| `cards.replacement_ordered` | cards | oldCardId, newCardId | notifications |
| `bills.payment_completed` | bills | billPaymentId, billerId, amount | notifications |
| `documents.statement_ready` | documents | statementId, accountId, period | notifications |
| `messaging.message_received` | messaging | threadId, from (BANK/CUSTOMER) | notifications, ops queue |
| `privacy.export_ready` | customers | exportId | notifications |

## 2. Audit actions (every one is written with outcome SUCCESS or FAILURE)
`LOGIN`, `LOGOUT`, `LOGIN_MFA`, `ENROLMENT_STARTED`, `ENROLMENT_COMPLETED`,
`PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_COMPLETED`, `PASSWORD_CHANGED`,
`STEP_UP_REQUESTED`, `STEP_UP_VERIFIED`, `MFA_TOTP_ENROLLED`, `MFA_TOTP_REMOVED`,
`RECOVERY_CODES_REGENERATED`, `DEVICE_TRUSTED`, `DEVICE_REVOKED`, `SESSIONS_REVOKED_ALL`,
`CONTACT_CHANGED`, `PREFERENCES_CHANGED`, `ACCOUNT_NICKNAME_CHANGED`,
`TRANSACTION_CATEGORY_CHANGED`, `TRANSACTIONS_EXPORTED`, `BENEFICIARY_CREATED`,
`BENEFICIARY_UPDATED`, `BENEFICIARY_DELETED`, `NAME_CHECK_PERFORMED`, `FX_QUOTE_CREATED`,
`TRANSFER_CREATED`, `TRANSFER_CANCELLED`, `STANDING_ORDER_CREATED`,
`STANDING_ORDER_CANCELLED`, `LIMITS_CHANGED`, `BILLER_SAVED`, `BILLER_REMOVED`,
`BILL_PAYMENT_CREATED`, `CARD_FROZEN`, `CARD_UNFROZEN`, `CARD_CONTROLS_CHANGED`,
`CARD_REPORTED`, `CARD_DETAILS_REVEALED`, `CARD_ACTIVATED`, `STATEMENT_DOWNLOADED`,
`DOCUMENT_GENERATED`, `ALERT_RULES_CHANGED`, `MESSAGE_SENT`, `ATTACHMENT_UPLOADED`,
`DATA_EXPORT_REQUESTED`, `CONSENT_CHANGED`, `AUTHZ_DENIED`,
`OPS_CUSTOMER_VIEWED`, `OPS_USER_UNLOCKED`, `OPS_PAYMENT_RECOMMENDED`,
`OPS_PAYMENT_APPROVED`, `OPS_PAYMENT_REJECTED`, `OPS_MESSAGE_SENT`, `OPS_AUDIT_SEARCHED`.
