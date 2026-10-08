import { collection, getDocs } from "firebase/firestore";
import { firestoreDb } from "@/lib/firebase";

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

export async function listDebts(workspaceId: string): Promise<Debt[]> {
  const snapshot = await getDocs(collection(firestoreDb, "workspaces", workspaceId, "debts"));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() } as Debt))
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
}

// Financial writes are intentionally exposed through the trusted backend only.