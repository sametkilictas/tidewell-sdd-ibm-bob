# Screen Inventory (route table)

Single source for the router (`apps/web/src/app/routes.ts`), the a11y sweep
(`e2e/a11y.spec.ts`) and breadcrumbs. **Bob must keep this table and `routes.ts` in sync**;
`pnpm specs:check` warns if a route here has no matching entry in `routes.ts` (once it exists).

Legend — Auth: `public`, `customer`, `ops`, `demo` · Template per SPEC-05 §3.2.

| Route | Screen | Feature | Template | Auth | Phase | Title key |
|---|---|---|---|---|---|---|
| `/sign-in` | Sign in | F01 | Auth | public | 1 | `auth.signIn.title` |
| `/sign-in/verify` | Verify it's you | F01 | Auth | public | 1 | `auth.verify.title` |
| `/enrol` | Enrol (4 steps) | F01 | Auth/Wizard | public | 1 | `auth.enrol.title` |
| `/forgot-password` | Forgot password | F01 | Auth | public | 1 | `auth.forgot.title` |
| `/reset-password` | Reset password | F01 | Auth | public | 1 | `auth.reset.title` |
| `/signed-out` | Signed out | F01 | Auth | public | 1 | `auth.signedOut.title` |
| `/dashboard` | Dashboard | F02 | Overview | customer | 2 | `dashboard.title` |
| `/accounts` | Accounts | F03 | List | customer | 2 | `accounts.title` |
| `/accounts/:accountId` | Account detail + transactions | F03 | Detail | customer | 2 | `accounts.detail.title` |
| `/transfers` | Transfers hub | F04 | List | customer | 3 | `transfers.title` |
| `/transfers/new` | Transfer wizard | F04 | Wizard | customer | 3 | `transfers.new.title` |
| `/transfers/:transferId` | Transfer detail | F04 | Detail | customer | 3 | `transfers.detail.title` |
| `/transfers/:transferId/receipt` | Transfer receipt | F04 | Detail | customer | 3 | `transfers.receipt.title` |
| `/transfers/limits` | Limits | F04 | Settings | customer | 5 | `transfers.limits.title` |
| `/payees` | Beneficiaries | F04 | List | customer | 3 | `payees.title` |
| `/payees/new` | Add beneficiary | F04 | Wizard | customer | 3 | `payees.new.title` |
| `/payees/:beneficiaryId` | Beneficiary detail | F04 | Detail | customer | 3 | `payees.detail.title` |
| `/payments` | Payments hub | F05 | List | customer | 5 | `payments.title` |
| `/payments/billers` | Biller catalogue | F05 | List | customer | 5 | `payments.billers.title` |
| `/payments/billers/:billerId/save` | Save biller | F05 | Wizard | customer | 5 | `payments.save.title` |
| `/payments/saved/:savedBillerId` | Saved biller | F05 | Detail | customer | 5 | `payments.saved.title` |
| `/payments/pay` | Pay a bill | F05 | Wizard | customer | 5 | `payments.pay.title` |
| `/payments/top-up` | Prepaid top-up | F05 | Wizard | customer | 5 | `payments.topUp.title` |
| `/cards` | Cards | F06 | List | customer | 5 | `cards.title` |
| `/cards/:cardId` | Card detail | F06 | Detail | customer | 5 | `cards.detail.title` |
| `/cards/:cardId/report` | Report card | F06 | Wizard | customer | 5 | `cards.report.title` |
| `/cards/:cardId/activate` | Activate card | F06 | Wizard | customer | 5 | `cards.activate.title` |
| `/statements` | Statements & documents | F07 | List | customer | 5 | `statements.title` |
| `/notifications` | Notifications | F08 | List | customer | 4 | `notifications.title` |
| `/settings` | Settings overview | F09 | Settings | customer | 4 | `settings.title` |
| `/settings/profile` | Personal details | F09 | Settings | customer | 4 | `settings.profile.title` |
| `/settings/preferences` | Preferences | F09 | Settings | customer | 4 | `settings.preferences.title` |
| `/settings/security` | Security | F09 | Settings | customer | 4 | `settings.security.title` |
| `/settings/alerts` | Alerts | F08 | Settings | customer | 4 | `settings.alerts.title` |
| `/settings/privacy` | Privacy | F09 | Settings | customer | 4 | `settings.privacy.title` |
| `/messages` | Inbox | F10 | List | customer | 6 | `messages.title` |
| `/messages/new` | New message | F10 | Wizard | customer | 6 | `messages.new.title` |
| `/messages/:threadId` | Conversation | F10 | Detail | customer | 6 | `messages.thread.title` |
| `/help` | Help centre | F10 | List | customer | 6 | `help.title` |
| `/ops` | Ops home | F11 | Overview | ops | 6 | `ops.home.title` |
| `/ops/customers` | Customer search | F11 | List | ops | 6 | `ops.customers.title` |
| `/ops/customers/:customerId` | Customer 360 | F11 | Detail | ops | 6 | `ops.customer.title` |
| `/ops/payments/held` | Held payments | F11 | List | ops | 6 | `ops.held.title` |
| `/ops/messages` | Messaging queue | F11 | List | ops | 6 | `ops.messages.title` |
| `/ops/audit` | Audit search | F11 | List | ops | 6 | `ops.audit.title` |
| `/dev/outbox` | Dev outbox | F00 | List | demo | 0 | `dev.outbox.title` |
| `*` | Not found | F00 | Auth | public | 0 | `errors.notFound.title` |

## Global overlays
| Overlay | Feature | Trigger |
|---|---|---|
| Session timeout modal | F01 | 60 s before idle expiry |
| Step-up dialog | F01 | `403 STEP_UP_REQUIRED` |
| Global search (⌘K) | F02 | Shortcut / header search |
| Notifications panel | F08 | Header bell |
| Transaction detail panel | F03 | Row select / `?txn=` |
| Unsaved changes modal | F00 | Route blocker in wizards/forms |
