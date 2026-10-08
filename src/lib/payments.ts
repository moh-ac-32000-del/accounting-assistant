export type CreatePaymentInput = {
  workspaceId: string;
  debtId: string;
  currency: "TRY" | "USD";
  amountMinor: number;
  idempotencyKey: string;
};

export type Payment = {
  id: string;
  schemaVersion: 1;
  workspaceId: string;
  debtId: string;
  customerId: string;
  currency: "TRY" | "USD";
  amountMinor: number;
  createdByUid: string;
  createdAt: unknown;
};
