import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { firebaseAuth, firestoreDb } from "@/lib/firebase";
export type ArchiveRecord = { id:string; schemaVersion:1; workspaceId:string; sourceType:string; sourceId:string; reason:string; snapshot:unknown; archivedByUid:string; archivedAt:unknown; };
export async function listArchive(workspaceId:string):Promise<ArchiveRecord[]> {
 if(!firebaseAuth.currentUser?.uid) throw new Error("unauthenticated");
 const ref=collection(firestoreDb,"workspaces",workspaceId,"archive");
 const snapshot=await getDocs(query(ref,orderBy("archivedAt","desc")));
 return snapshot.docs.map(item=>({id:item.id,...item.data()} as ArchiveRecord));
}
