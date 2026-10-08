import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { firebaseAuth, firestoreDb } from "@/lib/firebase";

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

function requireUid() {
  if (!firebaseAuth.currentUser?.uid) throw new Error("unauthenticated");
}

export async function listPaymentsForDebt(workspaceId: string, debtId: string): Promise<Payment[]> {
  requireUid();
  const ref = collection(firestoreDb, "workspaces", workspaceId, "payments");
  const snapshot = await getDocs(query(ref, where("debtId", "==", debtId), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Payment));
}
