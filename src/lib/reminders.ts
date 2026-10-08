import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { firebaseAuth, firestoreDb } from "@/lib/firebase";
export type Reminder = { id:string; schemaVersion:1; workspaceId:string; title:string; note:string; dueAt:unknown; status:"pending"|"done"|"cancelled"; createdByUid:string; createdAt:unknown; updatedAt:unknown; };
export async function listReminders(workspaceId:string):Promise<Reminder[]> {
 if(!firebaseAuth.currentUser?.uid) throw new Error("unauthenticated");
 const ref=collection(firestoreDb,"workspaces",workspaceId,"reminders");
 const snapshot=await getDocs(query(ref,orderBy("dueAt","asc")));
 return snapshot.docs.map(item=>({id:item.id,...item.data()} as Reminder));
}
