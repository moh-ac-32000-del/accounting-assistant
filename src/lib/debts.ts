export type DebtStatus = "open" | "settled";

export type Debt = {
  id: string;
  schemaVersion: 1;
  workspaceId: string;
  customerId: string;
  currency: "TRY" | "USD";
  amountMinor: number;
  paidMinor: number;
  remainingMinor: number;
  status: DebtStatus;
  createdByUid: string;
  createdAt: unknown;
  updatedAt: unknown;
};

export type CreateDebtInput = {
  workspaceId: string;
  customerId: string;
  currency: "TRY" | "USD";
  amountMinor: number;
  idempotencyKey: string;
};

export type CreateDebtResult = {
  ok: true;
  debt: Debt;
  replayed: boolean;
};

// Financial writes are intentionally exposed through the trusted backend only.
// This module contains the shared client-side contract, not a direct Firestore write path.
