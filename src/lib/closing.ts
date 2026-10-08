import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { firebaseAuth, firestoreDb } from "@/lib/firebase";
export type DailyClosing = { id:string; schemaVersion:1; workspaceId:string; closingDate:string; balances:Partial<Record<"TRY"|"USD",number>>; closedByUid:string; closedAt:unknown; };
export async function listDailyClosings(workspaceId:string):Promise<DailyClosing[]> {
 if(!firebaseAuth.currentUser?.uid) throw new Error("unauthenticated");
 const ref=collection(firestoreDb,"workspaces",workspaceId,"dailyClosings");
 const snapshot=await getDocs(query(ref,orderBy("closedAt","desc")));
 return snapshot.docs.map(item=>({id:item.id,...item.data()} as DailyClosing));
}
