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
