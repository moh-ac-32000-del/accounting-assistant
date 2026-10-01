# Development Workflow

## Goal

Build Accounting Assistant in controlled, reviewable phases without Replit and without mixing unfinished architectural decisions into production code.

## Repository

GitHub repository:

`moh-ac-32000-del/accounting-assistant`

Default branch:

`main`

## Phase order

### Phase 0 — Foundation
- Architecture V2
- project documentation
- Expo project skeleton
- TypeScript
- lint/test foundation
- environment strategy

### Phase 1 — Cloud foundation
- Firebase project/environment selection
- Firebase Auth
- Workspace model
- Firestore schema contracts
- Firestore Rules
- trusted Cloud Functions foundation
- emulator/integration tests

### Phase 2 — Core business domains
Implement one domain at a time:

1. Store Profile
2. Customers
3. Debts
4. Payments
5. Cash
6. Journal
7. Daily Closing
8. Archive

### Phase 3 — Supporting features
- Reminders
- Push Notifications
- WhatsApp actions
- Backup / Restore
- multi-device behavior

### Phase 4 — Hardening
- security audit
- financial integrity tests
- concurrency/retry tests
- performance checks
- release configuration
- Android/iOS testing

## Task protocol

Every implementation task must state:

1. What changes.
2. Why it changes.
3. Files/components affected.
4. What is explicitly not being changed.
5. Tests to run.
6. Manual checks required from the user.

Then implement the smallest coherent scope.

## Change discipline

- No unrelated refactors.
- No dependency additions without justification.
- No Replit configuration.
- No local financial fallback.
- No direct multi-write financial mutation from screens.
- No beta Expo SDK.
- No migration of old code unless explicitly approved.
- No destructive changes to Firebase production data during development.

## Verification

After implementation:

- inspect the diff
- run TypeScript checks
- run relevant tests
- review security-sensitive code
- verify architecture boundaries
- commit with a focused message

Device/UI checks are performed manually by the user when needed.

## Git strategy

Small coherent commits are preferred.

The main branch should remain usable.

For risky changes, use a feature branch and pull request.

## Legacy project

The old `My-app` repository is reference material only.

Do not copy its Replit configuration, local-first financial authority, or unresolved hybrid behavior into Accounting Assistant.
