export type CashDirection = "in" | "out";
export type CashCurrency = "TRY" | "USD";

export type CreateCashMovementInput = {
  workspaceId: string;
  direction: CashDirection;
  currency: CashCurrency;
  amountMinor: number;
  reason: string;
  idempotencyKey: string;
};

export type CashMovement = {
  id: string;
  schemaVersion: 1;
  workspaceId: string;
  direction: CashDirection;
  currency: CashCurrency;
  amountMinor: number;
  reason: string;
  createdByUid: string;
  createdAt: unknown;
};
