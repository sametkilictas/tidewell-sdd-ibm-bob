# Error Code Catalog

Every problem+json response carries one of these `code` values. The web app maps each code
to an i18n key `errors.<CODE>` (en + ar). New codes are added here **and** in
`sdd/contracts/openapi.yaml#/components/schemas/ErrorCode` in the same change.

| Code | HTTP | Meaning | Customer message (en) — tone per content guide | Retry? |
|---|---|---|---|---|
| `VALIDATION_FAILED` | 400 | Request does not match schema; see `errors[]` | "Some details need your attention." (+ field messages) | after fix |
| `UNAUTHENTICATED` | 401 | No/invalid session | "Please sign in to continue." | sign in |
| `SESSION_EXPIRED` | 401 | Idle or absolute timeout | "For your security, you were signed out after a period of inactivity." | sign in |
| `INVALID_CREDENTIALS` | 401 | Username/password wrong (same for unknown user) | "The username or password is incorrect." | yes |
| `MFA_CODE_INVALID` | 401 | Wrong OTP/TOTP | "That code isn't right. Check it and try again." | yes (≤3) |
| `MFA_CODE_EXPIRED` | 401 | Challenge expired | "That code has expired. We've sent you a new one." | resend |
| `MFA_ATTEMPTS_EXCEEDED` | 401 | 3 wrong codes | "Too many incorrect codes. Please start again." | restart |
| `FORBIDDEN` | 403 | Role not permitted | "You don't have access to this." | no |
| `CSRF_TOKEN_INVALID` | 403 | Missing/mismatched CSRF | (generic) "Something went wrong. Please refresh and try again." | refresh |
| `STEP_UP_REQUIRED` | 403 | Sensitive action needs step-up | (triggers OTP dialog) | after step-up |
| `STEP_UP_TOKEN_INVALID` | 403 | Expired/used/mismatched step-up token | "Please verify again to continue." | yes |
| `NOT_FOUND` | 404 | Unknown or not-owned resource | "We couldn't find that." | no |
| `IDEMPOTENCY_IN_PROGRESS` | 409 | Same key still processing | (silent retry by client after 1 s) | auto |
| `CONFLICT_STATE` | 409 | Action invalid for current state (e.g. cancel completed) | "This can't be done anymore — its status has changed." | no |
| `PRECONDITION_FAILED` | 412 | ETag mismatch | "This was updated elsewhere. We've loaded the latest version." | reload |
| `IDEMPOTENCY_KEY_REUSED` | 422 | Key reused with different payload | (generic) | new key |
| `INSUFFICIENT_FUNDS` | 422 | Available < amount + fees | "Your available balance isn't enough for this payment, including fees." | no |
| `LIMIT_EXCEEDED_DAILY` | 422 | Daily external limit | "This would exceed your daily transfer limit of {limit}. Remaining today: {remaining}." | no |
| `LIMIT_EXCEEDED_PER_TRANSACTION` | 422 | Per-transaction max | "The maximum for a single transfer is {limit}." | no |
| `LIMIT_EXCEEDED_NEW_BENEFICIARY` | 422 | Cooling-off limit | "New payees have a lower limit for the first 24 hours ({limit})." | later |
| `ACCOUNT_NOT_ELIGIBLE` | 422 | Account type/status cannot be debited/credited | "This account can't be used for this payment." | no |
| `SAME_ACCOUNT` | 422 | From = To | "Choose two different accounts." | fix |
| `CURRENCY_NOT_SUPPORTED` | 422 | Currency not allowed for this route | "This currency isn't available for this payment." | fix |
| `FX_QUOTE_EXPIRED` | 422 | Quote older than 30 s | "The exchange rate has been refreshed. Please review the new amount." | requote |
| `FX_UNAVAILABLE` | 503 | FX feed down | "Currency exchange is temporarily unavailable." | later |
| `CUTOFF_PASSED` | 422 | Requested same-day after cut-off (only when customer insists on today) | "Today's cut-off has passed. The earliest date is {date}." | fix |
| `EXECUTION_DATE_INVALID` | 422 | Past date, > 365 days ahead, or non-business day for scheduled | "Choose a business day within the next year." | fix |
| `IBAN_INVALID` | 422 | Checksum/length/country | "This IBAN doesn't look right. Check it and try again." | fix |
| `BIC_INVALID` | 422 | BIC format/unknown | "We couldn't recognise this SWIFT/BIC code." | fix |
| `BENEFICIARY_DUPLICATE` | 409 | Same account already saved | "You've already saved this payee as {name}." | no |
| `BENEFICIARY_LIMIT_REACHED` | 422 | > 200 beneficiaries | "You've reached the maximum number of saved payees." | no |
| `PURPOSE_CODE_REQUIRED` | 422 | International without purpose | "Select the purpose of this payment." | fix |
| `PASSWORD_TOO_SHORT` | 422 | < 12 chars | "Use at least 12 characters." | fix |
| `PASSWORD_TOO_COMMON` | 422 | In breached list | "This password is too common. Try a longer phrase." | fix |
| `PASSWORD_CONTAINS_PERSONAL_INFO` | 422 | Contains username/customer no. | "Don't include your username or customer number." | fix |
| `PASSWORD_REUSED` | 422 | Same as current or last 5 | "Choose a password you haven't used recently." | fix |
| `ENROLMENT_DETAILS_MISMATCH` | 422 | Customer number/DOB mismatch (generic) | "We couldn't verify those details." | yes (rate-limited) |
| `USERNAME_TAKEN` | 409 | Username exists | "That username is taken." | fix |
| `ACCOUNT_TEMPORARILY_LOCKED` | 423 | 5 failures | "Too many attempts. Try again in {minutes} minutes or reset your password." | later |
| `ACCOUNT_LOCKED` | 423 | 10 failures / ops lock | "Your online banking is locked. Please contact us." | no |
| `CARD_STATE_INVALID` | 409 | e.g. freeze a blocked card | "This card can't be changed in its current state." | no |
| `CARD_ACTIVATION_FAILED` | 422 | last4/expiry mismatch | "Those card details don't match." | yes (≤3) |
| `BILLER_REFERENCE_INVALID` | 422 | Fails biller regex | "Check the {referenceLabel} format: {example}." | fix |
| `BILLER_REFERENCE_NOT_FOUND` | 422 | Biller says unknown | "{biller} couldn't find this reference." | fix |
| `BILLER_UNAVAILABLE` | 503 | Biller network down | "{biller} isn't responding right now." | later |
| `BILL_AMOUNT_NOT_ALLOWED` | 422 | Partial/over payment not allowed | "{biller} only accepts the full amount due." | fix |
| `STATEMENT_RANGE_INVALID` | 422 | > 12 months / future | "Choose a range of up to 12 months, ending today or earlier." | fix |
| `EXPORT_TOO_LARGE` | 422 | > 5,000 rows | "That's too many transactions to export. Narrow the date range." | fix |
| `ATTACHMENT_TOO_LARGE` | 422 | > 5 MB | "Files must be 5 MB or smaller." | fix |
| `ATTACHMENT_TYPE_NOT_ALLOWED` | 422 | Not PDF/PNG/JPEG | "Attach a PDF, PNG or JPG." | fix |
| `ATTACHMENT_MALWARE_DETECTED` | 422 | Scanner hit | "We couldn't accept this file." | no |
| `THREAD_CLOSED` | 409 | Post to closed thread > 14 days | "This conversation is closed. Start a new message." | no |
| `ACCESS_REASON_REQUIRED` | 400 | Ops view without reason | (ops) "Enter a reason for accessing this customer." | fix |
| `MAKER_CHECKER_VIOLATION` | 403 | Same user recommends & approves | (ops) "A different supervisor must approve this." | no |
| `RATE_LIMITED` | 429 | Bucket exceeded | "Too many requests. Please wait a moment." | after Retry-After |
| `DEPENDENCY_UNAVAILABLE` | 503 | Generic adapter outage | "This service is temporarily unavailable." | later |
| `INTERNAL_ERROR` | 500 | Unhandled | "Something went wrong on our side. Reference: {traceId}." | later |
