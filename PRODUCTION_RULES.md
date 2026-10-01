# Production Rules

These rules are mandatory unless an explicit architecture decision changes them.

## 1. No Replit

The new project must not depend on Replit.

Do not add:

- Replit environment variables
- Replit deployment configuration
- Replit connectors
- Replit runtime assumptions

## 2. Cloud is authoritative

Firebase / Google Cloud is the source of truth for business and financial data.

A failed cloud mutation must not be reported as successful because a local write succeeded.

## 3. Financial integrity

Financial operations must be atomic where multiple records must change together.

Use trusted backend commands and Firestore transactions for sensitive compound mutations.

## 4. Authorization

Never trust a client-provided UID or Workspace ID as authorization.

The backend derives the caller UID from authenticated context and verifies Workspace membership and role.

## 5. Idempotency

Commands that can be retried must have a deliberate duplicate-protection strategy.

A repeated request must not silently create a second payment, cash movement, settlement, or equivalent financial mutation.

## 6. Currency

Currency behavior must be explicit.

Do not mix currencies implicitly.

Precision and rounding rules must be documented before financial calculations become authoritative.

## 7. Dates and time zones

Dates must have an explicit semantic meaning.

Due dates, transaction timestamps, notification schedules, and daily closing boundaries must not rely on ambiguous device-local assumptions.

## 8. Deletion

Financial records should not be hard-deleted when doing so would destroy accounting history.

Soft deletion or a domain-specific archival policy must be used where appropriate.

## 9. Secrets

Never commit:

- Firebase Admin private keys
- service-account JSON
- passwords
- private API keys
- production secrets
- user authentication tokens

## 10. Testing

Release-critical behavior must be tested at the correct layer.

Firestore Rules must be tested with an emulator/integration environment rather than relying only on manual textual inspection.

## 11. Backup and restore

Backup/restore must preserve data integrity and Workspace boundaries.

A restore must not silently overwrite another Workspace.

## 12. Multi-device

The app must assume the same account may be used on multiple devices.

Server state and trusted transactions must resolve concurrency.

## 13. Release gates

Before production:

- authentication tested
- authorization tested
- financial commands tested
- duplicate/retry behavior tested
- Rules tested
- backup/restore tested
- notifications tested
- Android tested
- iOS tested
- crash/ANR behavior reviewed
- production configuration reviewed
