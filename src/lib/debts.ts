import { collection, getDoc, getDocs, orderBy, query, doc } from "firebase/firestore";
import { firebaseAuth, firestoreDb } from "@/lib/firebase";

export type DebtStatus = "open" | "settled";
export type Debt = {
  id: string; schemaVersion: 1; workspaceId: string; customerId: string;
  currency: "TRY" | "USD"; amountMinor: number; paidMinor: number; remainingMinor: number;
  status: DebtStatus; createdByUid: string; createdAt: unknown; updatedAt: unknown;
};

function requireUid() {
  const uid = firebaseAuth.currentUser?.uid;
  if (!uid) throw new Error("unauthenticated");
}

export async function getDebt(workspaceId: string, debtId: string): Promise<Debt | null> {
  requireUid();
  const snapshot = await getDoc(doc(firestoreDb, "workspaces", workspaceId, "debts", debtId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Debt) : null;
}

export async function listDebts(workspaceId: string, status?: DebtStatus): Promise<Debt[]> {
  requireUid();
  const base = collection(firestoreDb, "workspaces", workspaceId, "debts");
  const q = status
    ? query(base, queryStatus(status), orderBy("createdAt", "desc"))
    : query(base, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Debt));
}

function queryStatus(status: DebtStatus) {
  return requireFirestoreWhere("status", "==", status);
}

function requireFirestoreWhere(field: string, op: "==", value: unknown) {
  return { type: "where", field, op, value } as never;
}
