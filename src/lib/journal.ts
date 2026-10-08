import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { firebaseAuth, firestoreDb } from "@/lib/firebase";
export type JournalDirection = "in" | "out";
export type JournalCurrency = "TRY" | "USD";
export type JournalEntry = { id:string; schemaVersion:1; workspaceId:string; direction:JournalDirection; currency:JournalCurrency; amountMinor:number; reason:string; createdByUid:string; createdAt:unknown; };
export async function listJournalEntries(workspaceId:string):Promise<JournalEntry[]> {
 if(!firebaseAuth.currentUser?.uid) throw new Error("unauthenticated");
 const ref=collection(firestoreDb,"workspaces",workspaceId,"journalEntries");
 const snapshot=await getDocs(query(ref,orderBy("createdAt","desc")));
 return snapshot.docs.map(item=>({id:item.id,...item.data()} as JournalEntry));
}
