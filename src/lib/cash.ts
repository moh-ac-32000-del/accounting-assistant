import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { firebaseAuth, firestoreDb } from "@/lib/firebase";

export type CashDirection = "in" | "out";
export type CashCurrency = "TRY" | "USD";
export type CreateCashMovementInput = { workspaceId: string; direction: CashDirection; currency: CashCurrency; amountMinor: number; reason: string; idempotencyKey: string; };
export type CashMovement = { id: string; schemaVersion: 1; workspaceId: string; direction: CashDirection; currency: CashCurrency; amountMinor: number; reason: string; createdByUid: string; createdAt: unknown; };
export type CashBalance = { currency: CashCurrency; balanceMinor: number; updatedAt: unknown; };

function requireUid() { if (!firebaseAuth.currentUser?.uid) throw new Error("unauthenticated"); }

export async function listCashMovements(workspaceId: string): Promise<CashMovement[]> {
  requireUid();
  const snapshot = await getDocs(query(collection(firestoreDb, "workspaces", workspaceId, "cashMovements"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as CashMovement));
}
export async function getCashBalance(workspaceId: string, currency: CashCurrency): Promise<CashBalance> {
  requireUid();
  const snapshot = await getDoc(doc(firestoreDb, "workspaces", workspaceId, "cashBalances", currency));
  return snapshot.exists() ? (snapshot.data() as CashBalance) : { currency, balanceMinor: 0, updatedAt: null };
}
