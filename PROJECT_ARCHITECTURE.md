# Architecture V2

## 1. Product

**Accounting Assistant** is a cloud-first accounting application for small retail businesses.

The application must support Android and iOS, with Web considered where technically useful.

The legacy project is a reference only. New code must not inherit its Replit/runtime architecture.

## 2. Source of truth

### Authoritative

Firebase / Google Cloud is authoritative for:

- Workspace identity and membership
- Store profile
- Customers
- Debts
- Payments
- Cash movements
- Journal entries
- Daily closing
- Archive records
- Reminders and notification state where server persistence is required
- Audit/operation receipts

### Non-authoritative local data

Local device storage may contain:

- UI preferences
- Cache
- Temporary drafts
- Other explicitly non-authoritative presentation state

Financial data must never silently fall back to local storage when the cloud operation fails.

## 3. Identity model

```
Firebase Auth
    |
    v
User
    |
    v
Membership
    |
    v
Workspace
    |
    +-- Store Profile
    +-- Members
    +-- Customers
    +-- Debts
    +-- Payments
    +-- Cash
    +-- Journal
    +-- Daily Closing
    +-- Archive
    +-- Reminders
```

A Firebase Auth UID is independent from the Workspace ID.

The Workspace is the security and data boundary.

For the current MVP, one Workspace represents one store. The model must not prevent future shared Workspaces.

## 4. Financial mutation pattern

Sensitive financial operations must follow:

```
Client
  |
  v
Trusted Cloud Function / backend command
  |
  v
Input validation
  |
  v
Authentication
  |
  v
Workspace membership + role authorization
  |
  v
Business invariants
  |
  v
Firestore transaction
  |
  v
Operation receipt / result
```

Screens must not implement sensitive multi-document financial mutations as a chain of independent client writes.

## 5. Domain boundaries

Each domain owns its contracts, validation, persistence access, and tests.

Initial domains:

1. Auth
2. Workspace
3. Store Profile
4. Customers
5. Debts
6. Payments
7. Cash
8. Journal
9. Daily Closing
10. Archive
11. Reminders
12. Notifications
13. WhatsApp integration
14. Backup / Restore
15. Security / Audit

Domains should not directly reach into another domain's persistence implementation without an explicit service/command contract.

## 6. Data integrity

Financial values require an explicit precision and rounding policy before financial mutation code is finalized.

Every financial command must consider:

- duplicate submission
- retry after network failure
- double tap
- concurrent devices
- invalid Workspace
- invalid membership
- currency consistency
- amount validation
- transaction atomicity
- immutable identity fields
- auditability

Idempotency keys should be used for commands where retries can repeat a mutation.

## 6.1 Financial amount representation

Financial amounts are stored as integer minor units, never floating-point major-unit values.

- TRY: 1 TRY = 100 minor units (kuruş).
- USD: 1 USD = 100 minor units (cents).
- Commands accept positive safe integers for monetary amounts.
- Derived balances are calculated from integer minor units.
- Display formatting converts minor units to the selected currency representation only at the presentation boundary.

This policy is the baseline for Debts and Payments and may be extended explicitly if a future currency requires a different minor-unit scale.

## 7. Offline behavior

The application may remain usable for cached reads and drafts.

Financial mutations require successful trusted backend confirmation.

There is no silent local-first financial Outbox in V2 unless a future architecture decision explicitly introduces one.

## 8. Security

Firestore Rules protect direct document access.

Cloud Functions must independently enforce:

- authenticated caller
- UID from `request.auth.uid`
- Workspace membership
- membership status
- role/authorization
- business invariants
- transaction boundaries
- idempotency where applicable

Admin SDK access must never be treated as permission to skip application-level authorization.

## 9. Testing strategy

Each domain is expected to have:

- unit tests for validation and calculations
- persistence tests where applicable
- authorization tests
- idempotency/retry tests for commands
- emulator/integration tests for Firestore Rules and trusted functions
- manual device verification for UI and platform-specific behavior

Release-critical financial behavior must not rely only on textual code review.

## 10. Evolution

New features must first define:

- data ownership
- source of truth
- authorization boundary
- mutation pattern
- failure behavior
- migration requirements
- tests

Only then should implementation begin.
