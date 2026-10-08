import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "@/lib/firebase";

const functions = getFunctions(firebaseApp, "europe-west1");

export type BackendHealthResponse = {
  ok: boolean;
  uid: string;
  workspaceId: string;
  role: "owner" | "admin" | "staff";
};

export type CreateDebtInput = {
  workspaceId: string;
  customerId: string;
  currency: "TRY" | "USD";
  amountMinor: number;
  idempotencyKey: string;
};

export type Debt = {
  id: string;
  schemaVersion: 1;
  workspaceId: string;
  customerId: string;
  currency: "TRY" | "USD";
  amountMinor: number;
  paidMinor: number;
  remainingMinor: number;
  status: "open" | "settled";
  createdByUid: string;
  createdAt: unknown;
  updatedAt: unknown;
};

export async function checkBackendHealth(workspaceId: string): Promise<BackendHealthResponse> {
  const command = httpsCallable<{ workspaceId: string }, BackendHealthResponse>(
    functions,
    "backendHealth",
  );
  return (await command({ workspaceId })).data;
}

export type CreateCashMovementInput = {
  workspaceId: string;
  direction: "in" | "out";
  currency: "TRY" | "USD";
  amountMinor: number;
  reason: string;
  idempotencyKey: string;
};

export async function createCashMovement(input: CreateCashMovementInput) {
  const command = httpsCallable<CreateCashMovementInput, { ok: true; movement: unknown; replayed: boolean }>(functions, "createCashMovement");
  return (await command(input)).data;
}

export type CreatePaymentInput = {
  workspaceId: string;
  debtId: string;
  currency: "TRY" | "USD";
  amountMinor: number;
  idempotencyKey: string;
};

export async function createPayment(input: CreatePaymentInput) {
  const command = httpsCallable<CreatePaymentInput, { ok: true; payment: unknown; replayed: boolean }>(functions, "createPayment");
  return (await command(input)).data;
}

export async function createDebt(input: CreateDebtInput) {
  const command = httpsCallable<CreateDebtInput, { ok: true; debt: Debt; replayed: boolean }>(
    functions,
    "createDebt",
  );
  return (await command(input)).data;
}


export type CreateJournalEntryInput = {
  workspaceId: string;
  direction: "in" | "out";
  currency: "TRY" | "USD";
  amountMinor: number;
  reason: string;
  idempotencyKey: string;
};

export async function createJournalEntry(input: CreateJournalEntryInput) {
  const command = httpsCallable<CreateJournalEntryInput, { ok: true; entry: unknown; replayed: boolean }>(
    functions,
    "createJournalEntry",
  );
  return (await command(input)).data;
}

export type CloseDayInput = {
  workspaceId: string;
  closingDate: string;
  balances: Partial<Record<"TRY" | "USD", number>>;
  idempotencyKey: string;
};

export async function closeDay(input: CloseDayInput) {
  const command = httpsCallable<CloseDayInput, { ok: true; closing: unknown; replayed: boolean }>(
    functions,
    "closeDay",
  );
  return (await command(input)).data;
}


export type CreateReminderInput = {
  workspaceId: string;
  title: string;
  note: string;
  dueAtMs: number;
  idempotencyKey: string;
};

export async function createReminder(input: CreateReminderInput) {
  const command = httpsCallable<CreateReminderInput, { ok: true; reminder: unknown; replayed: boolean }>(
    functions,
    "createReminder",
  );
  return (await command(input)).data;
}

export type ArchiveRecordInput = {
  workspaceId: string;
  sourceType: string;
  sourceId: string;
  reason: string;
  idempotencyKey: string;
};

export async function archiveRecord(input: ArchiveRecordInput) {
  const command = httpsCallable<ArchiveRecordInput, { ok: true; archive: unknown; replayed: boolean }>(
    functions,
    "archiveRecord",
  );
  return (await command(input)).data;
}
