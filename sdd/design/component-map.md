# Component map and skeletons — Tidewell Bank

The shared components of this worked example and their contracts, used through the generic
**carbon-ui** skill. Banking patterns from the original UI guidance:

- **Money**: `<MoneyAmount value={money} signed? emphasis? />`; it respects the `hideBalances` preference (renders `••••`, label "Balance hidden").
- **IBANs and references**: `<IbanText>` (LTR-isolated, copy without spaces).
- **Step-up**: `withStepUp(requestFn, purpose)` opens `StepUpDialog` on `STEP_UP_REQUIRED` and retries with the token.
- **Money-moving submit buttons**: `InlineLoading`, disabled until the response.
- **Visual check**: `en`/`ar` × `white`/`g100` at 1440 and 375 px.

## Shared components to create in F00 (apps/web/src/components)
| Component | Built from | Contract |
|---|---|---|
| `MoneyAmount` | `<span>` + `formatMoney` | props: `value: Money`, `signed?`, `emphasis?: 'hero'\|'body'`, `hideable = true`; `aria-label` spoken form |
| `IbanText` | `<bdi dir="ltr">` + optional `CopyButton` | grouped display, copy without spaces |
| `StatusTag` | `Tag` + Carbon icon | status → type/icon/label from SPEC-05 §6 |
| `EmptyState` | Carbon pictogram + heading + body + `Button` | |
| `PageHeader` | `Breadcrumb` + `h1` (focus target) + actions slot | |
| `ErrorPanel` | `InlineNotification kind="error"` + Retry `Button` | shows `traceId` short |
| `OtpInput` | single `TextInput` (`inputMode="numeric"`, `autoComplete="one-time-code"`, maxLength 6) | paste-friendly |
| `SessionTimeoutModal` | `Modal` passive→danger | countdown live region per SPEC-05 §7 |
| `StepUpDialog` | `ComposedModal` + `RadioButtonGroup` + `OtpInput` | purpose-specific title |
| `WizardLayout` | `ProgressIndicator` + `Grid` + sticky footer `ButtonSet` | |
| `ReceiptLayout` | pictogram + `StructuredList` + actions | |
| `DemoBanner` | `ActionableNotification`-styled static banner (`role="status"`) | not dismissible |

## Skeleton — MoneyAmount
```tsx
export function MoneyAmount({ value, signed, emphasis = 'body', hideable = true }: Props) {
  const intl = useIntl();
  const { hideBalances } = usePreferences();
  if (hideable && hideBalances) {
    return <span className={cx('hb-money', emphasis)} aria-label={intl.formatMessage({ id: 'money.hidden' })}>••••</span>;
  }
  const text = formatMoney(value, intl.locale, { signed });          // string math only
  const spoken = spokenMoney(value, intl);                            // "minus 125.00 UAE dirhams"
  return <bdi dir="ltr" className={cx('hb-money', emphasis)} aria-label={spoken}>{text}</bdi>;
}
```

## Skeleton — data view states
```tsx
const q = useQuery(accountQueries.transactions(accountId, filters));
if (q.isPending) return <DataTableSkeleton columnCount={5} rowCount={8} />;
if (q.isError) return <ErrorPanel error={q.error} onRetry={q.refetch} />;
if (q.data.items.length === 0) return <EmptyState titleId="transactions.empty.title" bodyId="transactions.empty.body" />;
return <TransactionsTable data={q.data} />;
```

## Skeleton — step-up wrapper
```ts
export async function withStepUp<T>(run: (token?: string) => Promise<T>, purpose: StepUpPurpose, payload?: unknown): Promise<T> {
  try { return await run(); }
  catch (e) {
    if (!(e instanceof ApiError) || e.code !== 'STEP_UP_REQUIRED') throw e;
    const token = await stepUpDialog.open({ purpose, payloadHash: payload ? await sha256Canonical(payload) : undefined });
    if (!token) throw new StepUpCancelled();
    return run(token);
  }
}
```

## Carbon gotchas
- Import styles once: `@use '@carbon/react';` in `styles/index.scss` with theme tokens overridden before.
- `DataTable` needs stable `id`s per row; pass `useZebraStyles={false}` for finance readability.
- `DatePicker` range: set `locale` (`ar` uses Arabic month names) and `dateFormat="d/m/Y"`; value is a JS Date → convert to business date string via domain helper, never `toISOString()` (time zone shift).
- `Toggle` requires `labelText` even when visually hidden (`hideLabel`).
- RTL: verify `SideNav` placement and `ProgressIndicator` direction; set `dir` on `<html>`, not on a wrapper.
