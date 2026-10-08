import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { firebaseAuth, firestoreDb } from "@/lib/firebase";

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

export async function listCashMovements(workspaceId: string): Promise<CashMovement[]> {
  if (!firebaseAuth.currentUser?.uid) throw new Error("unauthenticated");
  const ref = collection(firestoreDb, "workspaces", workspaceId, "cashMovements");
  const snapshot = await getDocs(query(ref, orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as CashMovement));
}
